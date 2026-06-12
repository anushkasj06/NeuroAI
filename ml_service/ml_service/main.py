import base64
import ast
import json
import io
import os
import re
from collections import Counter
from typing import Any, List
from urllib.parse import quote_plus
from urllib import request as urllib_request

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .data_loader import load_candidate_roles
from .llm_client import call_llm, get_last_provider, _get_ollama_config
from .recommendation_service import compute_recommendations, generate_explanations, multi_agent_debate, role_chat_response
from .schemas import (
    RecommendationResponseItem,
    RecommendationResponse,
    MarketTrendRoleItem,
    MarketTrendSnapshot,
    MarketTrendsResponse,
    RecommendationSourceBreakdown,
    ResumeParseRequest,
    WhatIfRoleDelta,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
    LiveJobsResponse,
    LiveJobItem,
    RoleChatRequest,
    RoleChatResponse,
)
from .aggregator import fetch_market_metrics, fetch_opportunity_listings
from .career_graph import (
    build_graph_from_available_data,
    load_graph,
    compute_reachability,
    persist_graph_to_api,
    persist_graph_with_retries,
)
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import threading
from fastapi import Body

load_dotenv()

# In production, load secrets from AWS Secrets Manager (overrides .env)
from .aws_secrets import load_secrets
load_secrets()

candidate_role_df = load_candidate_roles()

app = FastAPI(title="ml_service", version="0.1.0")

# Build CORS allowed origins list
_cors_origins = []
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
for origin in _frontend_origin.split(","):
    origin = origin.strip()
    if origin:
        _cors_origins.append(origin)
# Always allow localhost for dev
if "http://localhost:5173" not in _cors_origins:
    _cors_origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https?://(.*\.(amazonaws\.com|elb\.amazonaws\.com)|(.+\.)?kirannandi\.me)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/llm-status")
def llm_status() -> dict:
    """Return the current LLM provider info."""
    last = get_last_provider()
    ollama = _get_ollama_config()
    return {
        "active_provider": last["name"],
        "active_model": last["model"],
        "ollama_enabled": True,
        "ollama_url": ollama["url"],
        "ollama_model": ollama["model"],
    }


@app.post("/recommend", response_model=RecommendationResponse, response_model_exclude_none=True)
def recommend(
    request: dict[str, Any],
    include_explanation: bool = False,
    include_debate: bool = False,
    skip_cache: bool = False,
) -> RecommendationResponse:
    from .cache import cache_get_json, cache_set_json, cache_delete, TTL_RECOMMENDATIONS

    profile = _coerce_user_profile(request)

    # Cache key based on skills + interests (the main inputs to recommendations)
    cache_key_parts = (
        sorted(s.name.lower() for s in profile.skills if s.name),
        sorted(profile.interests[:5]),
        include_explanation,
    )

    if not skip_cache:
        cached = cache_get_json("recs", *cache_key_parts)
        if cached:
            return RecommendationResponse(**cached)
    else:
        # Invalidate existing cache when user explicitly requests fresh content
        cache_delete("recs", *cache_key_parts)

    recommendations = compute_recommendations(profile)
    explanation = generate_explanations(profile, recommendations) if include_explanation else None
    debates = None
    if include_debate and recommendations:
        debates = {}
        for item in recommendations[:3]:
            debates[item.role_name] = multi_agent_debate(
                profile,
                item.role_name,
                {
                    "final_score": item.final_score,
                    "content_score": item.source_breakdown.content_score,
                    "cf_score": item.source_breakdown.cf_score,
                },
            )
    result = RecommendationResponse(recommendations=recommendations, explanation=explanation, debates=debates)

    # Cache the result
    cache_set_json("recs", result.model_dump(), TTL_RECOMMENDATIONS, *cache_key_parts)

    return result


@app.post("/simulate", response_model=WhatIfSimulationResponse)
def simulate(request: dict[str, Any]) -> WhatIfSimulationResponse:
    current_payload = request.get("current_profile") or request.get("currentProfile") or {}
    current_profile = _coerce_user_profile(current_payload)
    added_skills = request.get("added_skills") or request.get("addedSkills") or []
    removed_skills = request.get("removed_skills") or request.get("removedSkills") or []
    time_horizon = int(request.get("time_horizon_months") or request.get("timeHorizonMonths") or 6)

    # Validate time horizon
    valid_horizons = {3: 0.25, 6: 0.50, 12: 0.75, 18: 1.00}
    if time_horizon not in valid_horizons:
        raise HTTPException(status_code=400, detail=f"Invalid time_horizon_months. Allowed: {list(valid_horizons.keys())}")

    # Validate added skills count and lengths
    if not isinstance(added_skills, list):
        raise HTTPException(status_code=400, detail="added_skills must be a list")
    if len(added_skills) > 10:
        raise HTTPException(status_code=400, detail="added_skills count must be at most 10")
    for s in added_skills:
        if not isinstance(s, str) or not (1 <= len(s.strip()) <= 100):
            raise HTTPException(status_code=400, detail="Each skill name must be a string 1-100 characters long")

    # If no skills to add or remove, return empty result
    if len(added_skills) == 0 and len(removed_skills) == 0:
        raise HTTPException(status_code=400, detail="Provide at least one skill to add or remove")

    # Build known skills set from candidate_skill_vectorizer vocabulary and role keywords
    known_skills = set()
    try:
        vocab = getattr(models, 'candidate_skill_vectorizer', None)
        if vocab is not None:
            try:
                features = vocab.get_feature_names_out()
            except Exception:
                features = []
            known_skills.update([f.lower() for f in features if isinstance(f, str)])
    except Exception:
        pass
    # include ROLE_KEYWORDS and role_frequency_prior
    try:
        from .recommendation_service import ROLE_KEYWORDS
        for kws in ROLE_KEYWORDS.values():
            known_skills.update({k.lower() for k in kws})
    except Exception:
        pass
    try:
        known_skills.update({r.lower() for r in models.role_frequency_prior.keys()})
    except Exception:
        pass

    # Keep what-if usable: unknown skills should still be simulated rather than failing the whole request.
    unrecognized = [s for s in added_skills if s.strip().lower() not in known_skills]

    scalar = valid_horizons[time_horizon]

    before_text = _build_skills_text(current_profile.skills)
    after_skills = _apply_skill_changes(current_profile.skills, added_skills, removed_skills, scalar)
    after_text = _build_skills_text(after_skills)

    before_recommendations = compute_recommendations(current_profile, skills_text_override=before_text)
    after_recommendations = compute_recommendations(current_profile, skills_text_override=after_text)

    before_scores = {item.role_name: float(item.final_score) for item in before_recommendations}
    after_scores = {item.role_name: float(item.final_score) for item in after_recommendations}
    all_roles = sorted(set(before_scores) | set(after_scores))

    # Compute reachability using the causal career graph when available.
    graph = load_graph()
    hops_map = {3: 1, 6: 2, 12: 3, 18: 4}
    max_hops = hops_map.get(time_horizon, 2)
    # Choose start nodes from before_recommendations (top 1) as user's current position proxy
    start_nodes = [item.role_name for item in before_recommendations[:1]]
    reach_probs: dict = {}
    if graph and start_nodes:
        reach_probs = compute_reachability(graph, start_nodes, max_hops)

    deltas = []
    for role in all_roles:
        score_before = float(before_scores.get(role, 0.0))
        score_after = float(after_scores.get(role, 0.0))
        delta = score_after - score_before
        deltas.append(
            WhatIfRoleDelta(
                role_name=role,
                score_before=score_before,
                score_after=score_after,
                delta=delta,
            )
        )

    deltas.sort(key=lambda item: abs(item.delta), reverse=True)

    # Use reachability when present to enrich future work, but never hide the simulation result.
    if reach_probs:
        for delta in deltas:
            if reach_probs.get(delta.role_name, 0.0) > 0.05:
                delta.delta = delta.delta + 0.01

    if unrecognized:
        # Keep the API useful and visible instead of failing. The frontend can surface the warning.
        print(f"[simulate] ignoring unrecognized skills: {unrecognized}")

    return WhatIfSimulationResponse(roles=deltas[:10])


@app.post("/parse-resume", response_model=models.UserProfile, response_model_by_alias=True)
def parse_resume(request: ResumeParseRequest) -> models.UserProfile:
    resume_text = _extract_resume_text(request.resume_text, request.is_base64_encoded)
    resume_text = _truncate_text_for_llm(resume_text, max_chars=16000)
    baseline_data = _fallback_resume_parse(resume_text)
    parsed_data: dict = baseline_data
    try:
        prompt = _build_resume_prompt(resume_text)
        llm_response = call_llm(
            system_prompt="You are a resume parsing assistant.",
            user_prompt=prompt,
        )
        llm_data = _parse_llm_json(llm_response)
        if _looks_valid_resume_payload(llm_data):
            parsed_data = _merge_resume_payloads(baseline_data, llm_data)
    except Exception:
        parsed_data = baseline_data
    profile = _build_user_profile_from_resume(parsed_data)
    # Attach the raw resume text so downstream AI calls have full context.
    profile.resume_text = resume_text
    return profile


@app.get("/market-trends", response_model=MarketTrendsResponse)
def market_trends() -> MarketTrendsResponse:
    role_counts = Counter(candidate_role_df["job_role"].astype(str).str.strip())
    role_items = [
        MarketTrendRoleItem(
            role_name=role,
            demand_index=float(score),
            openings=int(round(score * 100)),
            median_score=float(score),
        )
        for role, score in sorted(models.role_frequency_prior.items(), key=lambda item: item[1], reverse=True)[:8]
    ]

    top_skills = [skill for skill, _count in _extract_top_skills(candidate_role_df, limit=10)]
    if not top_skills:
        top_skills = list(role_counts.keys())[:5]

    return MarketTrendsResponse(snapshot=MarketTrendSnapshot(top_skills=top_skills, roles=role_items))


@app.get("/live-jobs", response_model=LiveJobsResponse)
def live_jobs(role: str = "software engineer", location: str = "india", limit: int = 15) -> LiveJobsResponse:
    """Fetch live job listings using Adzuna API (India) with Remotive as fallback."""
    from .cache import cache_get_json, cache_set_json

    # Cache jobs for 2 hours to avoid hitting API limits
    cache_key_parts = (role.lower().strip(), location.lower().strip(), limit)
    cached = cache_get_json("livejobs", *cache_key_parts)
    if cached:
        return LiveJobsResponse(jobs=[LiveJobItem(**j) for j in cached])

    jobs: list[LiveJobItem] = []

    # Primary: Adzuna API (supports India with country code "in")
    adzuna_app_id = os.getenv("ADZUNA_APP_ID", "").strip()
    adzuna_app_key = os.getenv("ADZUNA_APP_KEY", "").strip()

    if adzuna_app_id and adzuna_app_key:
        try:
            jobs = _fetch_adzuna_jobs(role, location, limit, adzuna_app_id, adzuna_app_key)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Adzuna API failed: {e}")
            jobs = []

    # Fallback 1: JSearch via RapidAPI (aggregates LinkedIn + Indeed + Glassdoor, India-focused)
    if not jobs:
        try:
            jobs = _fetch_jsearch_jobs(role, location, limit)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"JSearch API failed: {e}")
            jobs = []

    # Fallback 2: India-specific job board search links (always works, no auth needed)
    if not jobs:
        jobs = _generate_job_search_links(role, location, limit)

    # Cache the results
    if jobs:
        from .cache import TTL_MARKET
        cache_set_json("livejobs", [j.model_dump() for j in jobs], TTL_MARKET, *cache_key_parts)

    return LiveJobsResponse(jobs=jobs)


def _fetch_adzuna_jobs(role: str, location: str, limit: int, app_id: str, app_key: str) -> list[LiveJobItem]:
    """Fetch jobs from Adzuna API. Supports India (in), UK (gb), US (us), etc."""
    # Map common location names to Adzuna country codes
    location_lower = location.lower().strip()
    country_code = "in"  # Default to India
    where_param = location_lower

    country_map = {
        "india": "in", "in": "in", "pune": "in", "mumbai": "in", "bangalore": "in",
        "bengaluru": "in", "hyderabad": "in", "delhi": "in", "chennai": "in",
        "noida": "in", "gurgaon": "in", "kolkata": "in",
        "us": "us", "usa": "us", "united states": "us",
        "uk": "gb", "united kingdom": "gb", "london": "gb",
    }

    for key, code in country_map.items():
        if key in location_lower:
            country_code = code
            # Extract city name for the where parameter
            if key in ("india", "in", "us", "usa", "uk", "united states", "united kingdom"):
                where_param = ""
            else:
                where_param = key
            break

    # Build Adzuna API URL
    search_query = quote_plus(role)
    page = 1
    results_per_page = min(limit, 20)
    url = (
        f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/{page}"
        f"?app_id={app_id}&app_key={app_key}"
        f"&results_per_page={results_per_page}"
        f"&what={search_query}"
        f"&content-type=application/json"
    )
    if where_param:
        url += f"&where={quote_plus(where_param)}"

    req = urllib_request.Request(url, headers={"User-Agent": "CareerTwin/1.0"})
    with urllib_request.urlopen(req, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))

    jobs: list[LiveJobItem] = []
    for row in payload.get("results", [])[:limit]:
        title = str(row.get("title", "Unknown Role")).replace("<strong>", "").replace("</strong>", "")
        company = str(row.get("company", {}).get("display_name", "Unknown Company"))
        job_location = str(row.get("location", {}).get("display_name", location))
        job_url = str(row.get("redirect_url", ""))
        salary_min = row.get("salary_min")
        salary_max = row.get("salary_max")

        # Build a salary hint if available
        salary_hint = None
        if salary_min and salary_max:
            salary_hint = f"₹{int(salary_min):,} - ₹{int(salary_max):,}"
        elif salary_min:
            salary_hint = f"₹{int(salary_min):,}+"

        jobs.append(
            LiveJobItem(
                title=title,
                company=company,
                location=job_location,
                url=job_url,
                source="adzuna",
                role_hint=role,
            )
        )

    return jobs


def _fetch_jsearch_jobs(role: str, location: str, limit: int) -> list[LiveJobItem]:
    """Fetch jobs from JSearch API (RapidAPI) — aggregates LinkedIn, Indeed, Glassdoor with India support."""
    rapidapi_key = os.getenv("RAPIDAPI_KEY", "").strip()
    if not rapidapi_key:
        return []

    location_hint = location.strip() if location.strip().lower() not in ("", "open") else "India"
    query = f"{role} in {location_hint}"

    # India city names for filtering out non-Indian results
    india_keywords = {
        "india", "pune", "mumbai", "bangalore", "bengaluru", "hyderabad", "delhi",
        "chennai", "noida", "gurgaon", "gurugram", "kolkata", "ahmedabad", "jaipur",
        "kochi", "coimbatore", "indore", "bhopal", "remote",
    }

    url = f"https://jsearch.p.rapidapi.com/search?query={quote_plus(query)}&page=1&num_pages=1&country=in"
    req = urllib_request.Request(
        url,
        headers={
            "X-RapidAPI-Key": rapidapi_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
    )

    with urllib_request.urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))

    jobs: list[LiveJobItem] = []
    for row in data.get("data", []):
        if len(jobs) >= limit:
            break
        title = str(row.get("job_title", "Unknown Role"))
        company = str(row.get("employer_name", "Unknown Company"))
        city = str(row.get("job_city") or "")
        country = str(row.get("job_country") or "")
        job_location = ", ".join(part for part in [city, country] if part) or location_hint
        job_url = str(row.get("job_apply_link") or row.get("job_google_link") or "")
        publisher = str(row.get("job_publisher") or "jsearch").lower()

        # Filter to India-only results
        loc_lower = job_location.lower()
        country_lower = country.lower()
        if country_lower and country_lower not in ("in", "india") and not any(k in loc_lower for k in india_keywords):
            continue

        if title and job_url:
            jobs.append(
                LiveJobItem(
                    title=title,
                    company=company,
                    location=job_location,
                    url=job_url,
                    source=publisher,
                    role_hint=role,
                )
            )

    return jobs


def _generate_job_search_links(role: str, location: str, limit: int) -> list[LiveJobItem]:
    """Last resort: generate direct search links to major job boards so the user always sees something useful."""
    encoded_role = quote_plus(role)
    encoded_location = quote_plus(location if location.lower() not in ("open", "") else "India")

    loc_display = location if location.lower() not in ("open", "") else "India"
    role_slug = encoded_role.replace("+", "-")
    loc_slug = encoded_location.replace("+", "-")

    search_links = [
        LiveJobItem(
            title=f"{role} jobs on Naukri",
            company="Naukri.com",
            location=loc_display,
            url=f"https://www.naukri.com/{role_slug}-jobs-in-{loc_slug}",
            source="naukri",
            role_hint=role,
        ),
        LiveJobItem(
            title=f"{role} jobs on LinkedIn India",
            company="LinkedIn",
            location=loc_display,
            url=f"https://www.linkedin.com/jobs/search/?keywords={encoded_role}&location={encoded_location}&f_TPR=r86400",
            source="linkedin",
            role_hint=role,
        ),
        LiveJobItem(
            title=f"{role} jobs on Indeed India",
            company="Indeed",
            location=loc_display,
            url=f"https://www.indeed.co.in/jobs?q={encoded_role}&l={encoded_location}",
            source="indeed",
            role_hint=role,
        ),
        LiveJobItem(
            title=f"{role} internships on Internshala",
            company="Internshala",
            location=loc_display,
            url=f"https://internshala.com/internships/{role_slug}-internship-in-{loc_slug}",
            source="internshala",
            role_hint=role,
        ),
        LiveJobItem(
            title=f"{role} jobs on Shine",
            company="Shine.com",
            location=loc_display,
            url=f"https://www.shine.com/job-search/{role_slug}-jobs-in-{loc_slug}",
            source="shine",
            role_hint=role,
        ),
        LiveJobItem(
            title=f"{role} jobs on Glassdoor India",
            company="Glassdoor",
            location=loc_display,
            url=f"https://www.glassdoor.co.in/Job/india-{role_slug}-jobs-SRCH_IL.0,5_IN115_KO6,{6 + len(role)}.htm",
            source="glassdoor",
            role_hint=role,
        ),
    ]

    return search_links[:limit]


@app.post("/admin/refresh-market")
def admin_refresh_market() -> dict:
    metrics = fetch_market_metrics()
    return {"status": "ok", "roles": len(metrics)}


@app.post("/admin/refresh-opportunities")
def admin_refresh_opportunities(role: str = "", limit: int = 50) -> dict:
    listings = fetch_opportunity_listings(role=role, limit=limit)
    return {"status": "ok", "listings": len(listings)}


@app.post("/admin/build-career-graph")
def admin_build_career_graph() -> dict:
    adj = build_graph_from_available_data()
    return {"status": "ok", "nodes": len(adj)}


@app.get("/admin/load-career-graph")
def admin_load_career_graph() -> dict:
    adj = load_graph()
    return {"status": "ok", "nodes": len(adj)}


@app.post("/admin/persist-career-graph")
def admin_persist_career_graph(cohort: str = None) -> dict:
    adj = load_graph()
    if not adj:
        adj = build_graph_from_available_data()
    api_url = os.environ.get("CAREER_API_TRANSITION_ENDPOINT")
    if not api_url:
        return {"status": "error", "message": "CAREER_API_TRANSITION_ENDPOINT not set"}
    auth_token = os.environ.get("CAREER_API_AUTH_TOKEN")
    result = persist_graph_to_api(adj, api_url, cohort_id=cohort, auth_token=auth_token)
    return {"status": "ok", "result": result}


def _scheduled_retrain():
    try:
        adj = build_graph_from_available_data()
        api_url = os.environ.get("CAREER_API_TRANSITION_ENDPOINT")
        if not api_url:
            logger = __import__("logging").getLogger(__name__)
            logger.info("scheduled retrain skipped: CAREER_API_TRANSITION_ENDPOINT not set")
            return
        auth_token = os.environ.get("CAREER_API_AUTH_TOKEN")
        # use retrying persistence with backoff
        persist_graph_with_retries(adj, api_url, cohort_id=f"scheduled-{int(threading.get_ident())}", auth_token=auth_token, max_retries=4, initial_delay=5.0)
    except Exception:
        pass


# Start scheduler: weekly rebuild on Monday 03:00 UTC by default. Will be no-op when env var absent.
try:
    scheduler = BackgroundScheduler()
    scheduler.add_job(_scheduled_retrain, CronTrigger(day_of_week="mon", hour="3", minute="0"))
    scheduler.start()
except Exception:
    scheduler = None


@app.post("/skill-gap")
def skill_gap(request: dict[str, Any] = Body(...), skip_cache: bool = False) -> dict:
    """Skill gap analysis with LLM-powered roadmap generation."""
    from .cache import cache_get_json, cache_set_json, cache_delete, TTL_SKILL_GAP
    from .roadmap_engine import generate_roadmap

    profile = _coerce_user_profile(request.get("profile") or request.get("user") or {})
    role = (request.get("role") or request.get("role_name") or request.get("roleName") or "").strip()
    goal = (request.get("goal") or request.get("career_goal") or request.get("careerGoal") or "").strip()
    if not role and not goal:
        raise HTTPException(status_code=400, detail="Missing role name or career goal")

    target = role or goal

    cache_key_parts = (
        sorted(s.name.lower() for s in profile.skills if s.name),
        target.lower(),
    )

    if not skip_cache:
        cached = cache_get_json("skillgap", *cache_key_parts)
        if cached:
            return cached
    else:
        cache_delete("skillgap", *cache_key_parts)

    user_skills = [{"name": s.name, "level": s.level, "category": s.category} for s in profile.skills if s.name]
    projects = getattr(profile, "projects", []) or []
    experience = getattr(profile, "experience", []) or []

    # Step 1: algorithmic base (instant)
    gap_result = generate_roadmap(
        target=target,
        goal=goal,
        user_skills=user_skills,
        user_projects=projects,
        user_experience=experience,
        user_name=profile.name or "Student",
        user_branch=profile.branch,
    )

    # Step 2: enrich roadmap phases with LLM
    llm_roadmap = None
    try:
        skill_list = ", ".join(s.get("name", "") for s in user_skills[:20] if s.get("name"))
        matched = ", ".join(gap_result.matched_skills[:8])
        missing = ", ".join(gap_result.missing_skills[:8])
        proj_text = "; ".join(projects[:3]) if projects else "none listed"

        llm_prompt = (
            f"Create a detailed, personalized 3-phase learning roadmap for {profile.name or 'a student'} "
            f"targeting the role: {target}.\n"
            f"Current skills: {skill_list or 'general programming background'}\n"
            f"Already matched skills for this role: {matched or 'none'}\n"
            f"Skills to learn: {missing or 'polish existing skills'}\n"
            f"Projects done: {proj_text}\n"
            f"Branch/background: {profile.branch or 'Engineering'}\n\n"
            "Return ONLY a JSON object with this structure (no markdown fences):\n"
            '{"phases": [{"phase": 1, "title": "string", "duration": "string", '
            '"skills": ["skill1"], "actions": ["action1", "action2", "action3"], '
            '"milestone": "string"}], '
            '"immediate_action": "string", '
            '"six_month_outcome": "string", '
            '"readiness_summary": "string"}'
        )

        llm_resp = call_llm(
            system_prompt="You are a career coach for Indian engineering students. Always respond with valid JSON only.",
            user_prompt=llm_prompt,
            temperature=0.3,
        )
        # Strip markdown fences if present
        cleaned = llm_resp.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip())
        parsed = json.loads(cleaned)
        if isinstance(parsed.get("phases"), list) and len(parsed["phases"]) >= 2:
            llm_roadmap = parsed
    except Exception:
        pass  # fall back to algorithmic roadmap

    final_roadmap = llm_roadmap or gap_result.roadmap

    result = {
        "role": gap_result.role,
        "goal": gap_result.goal,
        "readiness": gap_result.readiness,
        "matched_skills": gap_result.matched_skills,
        "missing_skills": gap_result.missing_skills,
        "roadmap": final_roadmap,
        "resources": gap_result.resources,
        "llm_powered": llm_roadmap is not None,
    }

    cache_set_json("skillgap", result, TTL_SKILL_GAP, *cache_key_parts)
    return result


@app.post("/debate-panel")
def debate_panel(request: dict[str, Any] = Body(...)) -> dict:
    """Generate three-persona debate for top roles. Accepts `profile` and optional `roles` list."""
    profile = _coerce_user_profile(request.get("profile") or {})
    roles = request.get("roles") or request.get("top_roles") or []
    if not roles:
        # derive top 2 recommendations
        recs = compute_recommendations(profile)
        roles = [item.role_name for item in recs[:2]]

    debates = {}
    for role in roles[:2]:
        debates[role] = multi_agent_debate(profile, role, {"final_score": 0.0})
    return {"debates": debates}


@app.post("/role-chat", response_model=RoleChatResponse)
def role_chat(request: dict[str, Any] = Body(...)) -> RoleChatResponse:
    profile_payload = request.get("profile") or {}
    profile = _coerce_user_profile(profile_payload)
    role = str(request.get("role") or "").strip() or "Software Engineer"
    persona = str(request.get("persona") or "mentor").strip()
    message = request.get("message") or None
    history_raw = request.get("history") or []
    history = [
        {"speaker": str(item.get("speaker") or ""), "message": str(item.get("message") or "")}
        for item in history_raw
        if isinstance(item, dict)
    ]

    reply = role_chat_response(profile, role, persona, message, history)
    return RoleChatResponse(
        role=str(reply["role"]),
        persona=str(reply["persona"]),
        reply=str(reply["reply"]),
        suggested_followups=list(reply.get("suggested_followups", [])),
    )



def _build_skills_text(skills: list[models.Skill]) -> str:
    return " ".join(
        f"{skill.name} {skill.level if skill.level is not None else ''}".strip()
        for skill in skills
        if skill.name and skill.name.strip()
    ).strip()


def _coerce_user_profile(payload: dict[str, Any]) -> models.UserProfile:
    # Normalize interests first - they may arrive as strings or as {interestCode, score} objects.
    raw_interests = payload.get("interests", []) or []
    normalized_interests: list[str] = []
    for item in raw_interests:
        if isinstance(item, str):
            cleaned = item.strip()
            if cleaned:
                normalized_interests.append(cleaned)
        elif isinstance(item, dict):
            code = item.get("interestCode") or item.get("interest_code") or item.get("name") or ""
            text = str(code).strip().replace("_", " ").lower()
            if text:
                normalized_interests.append(text)

    # Try the model directly only after we've normalized the interests, otherwise fall through.
    try:
        normalized_payload = dict(payload)
        normalized_payload["interests"] = normalized_interests
        return models.UserProfile.model_validate(normalized_payload)
    except Exception:
        pass

    skills_payload = payload.get("skills", []) or []
    mapped_skills = []
    for item in skills_payload:
        skill_name = item.get("name") or item.get("skillName") or item.get("skill_name")
        if not skill_name:
            continue
        mapped_skills.append(
            {
                "name": skill_name,
                "level": item.get("level"),
                "category": item.get("category"),
                "evidence": item.get("evidence"),
            }
        )

    constraints = payload.get("constraints", {}) or {}
    if isinstance(constraints, list):
        # Handle constraints as a list of {type, value}
        constraints_dict: dict[str, Any] = {}
        for entry in constraints:
            if isinstance(entry, dict):
                key = (entry.get("type") or "").lower()
                if key == "location":
                    constraints_dict["locationPreference"] = entry.get("value")
                elif key == "remote":
                    constraints_dict["remotePreference"] = entry.get("value")
        constraints = constraints_dict

    coerced = {
        "name": payload.get("name") or "Candidate",
        "email": payload.get("email"),
        "college": payload.get("college") or constraints.get("college"),
        "branch": payload.get("branch") or constraints.get("branch"),
        "year": payload.get("year") or constraints.get("year"),
        "locationPreference": payload.get("locationPreference") or constraints.get("locationPreference"),
        "salaryExpectation": payload.get("salaryExpectation") or constraints.get("salaryExpectation"),
        "remotePreference": payload.get("remotePreference") or constraints.get("remotePreference"),
        "interests": normalized_interests,
        "interests_text": payload.get("interests_text") or payload.get("interestsText") or " ".join(normalized_interests),
        "skills": mapped_skills,
        # Forward full resume context if provided by the client
        "resumeText": payload.get("resumeText") or payload.get("resume_text"),
        "projects": payload.get("projects", []) or [],
        "experience": payload.get("experience", []) or [],
        "certifications": payload.get("certifications", []) or [],
        "objective": payload.get("objective"),
    }
    return models.UserProfile.model_validate(coerced)


def _extract_resume_text(resume_text: str, is_base64_encoded: bool) -> str:
    if not is_base64_encoded:
        return resume_text.strip()

    try:
        decoded_bytes = base64.b64decode(resume_text, validate=True)
        if decoded_bytes.startswith(b"%PDF"):
            # Primary: PyMuPDF (fitz) — better layout reconstruction than pypdf
            try:
                import fitz
                document = fitz.open(stream=decoded_bytes, filetype="pdf")
                extracted_pages = [page.get_text("text") or "" for page in document]
                extracted_text = "\n".join(part.strip() for part in extracted_pages if part.strip())
                if len(extracted_text) > 100:
                    return extracted_text.strip()
            except Exception:
                pass
            # Fallback: pypdf
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(decoded_bytes))
                extracted_pages = [page.extract_text() or "" for page in reader.pages]
                extracted_text = "\n".join(part.strip() for part in extracted_pages if part.strip())
                if extracted_text:
                    return extracted_text.strip()
            except Exception:
                pass
        # DOCX support
        if decoded_bytes[:2] == b"PK":
            try:
                import docx
                doc = docx.Document(io.BytesIO(decoded_bytes))
                extracted_text = "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())
                if extracted_text:
                    return extracted_text.strip()
            except Exception:
                pass
        return decoded_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return resume_text.strip()


def _build_resume_prompt(resume_text: str) -> str:
    return (
        "Extract ALL structured information from the resume text below. "
        "Be thorough - capture every skill, project, experience, and detail mentioned. "
        "Return only valid compact JSON with these keys: "
        "name, email, technical_skills (array of ALL technical skills mentioned anywhere in the resume including in projects/experience), "
        "soft_skills (array), tools (array of tools/frameworks/platforms), "
        "projects (array of objects with 'name' and 'technologies' fields - extract EVERY project mentioned), "
        "education (array with degree, college, branch, year), "
        "experience (array of objects with 'role', 'company', 'duration', 'description'), "
        "certifications (array of certification names), "
        "objective (career objective or summary statement). "
        "IMPORTANT: Extract skills from EVERYWHERE in the resume - from the skills section, from project descriptions, "
        "from experience descriptions, from certifications. If a project uses React and Node.js, include those in technical_skills. "
        "Do not use markdown fences. Return ONLY the JSON object.\n"
        "Resume text:\n"
        f"{resume_text}"
    )


def _looks_valid_resume_payload(payload: dict) -> bool:
    name = str(payload.get("name") or payload.get("candidate_name") or "").strip()
    if name.startswith("%PDF"):
        return False
    if len(name) <= 2:
        return False
    return True


def _merge_resume_payloads(baseline: dict, llm_data: dict) -> dict:
    merged = dict(baseline)
    for key in ["name", "email", "objective"]:
        value = llm_data.get(key)
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()
    for key in ["technical_skills", "soft_skills", "tools", "projects", "education", "experience", "certifications"]:
        baseline_values = _normalize_resume_items(merged.get(key))
        llm_values = _normalize_resume_items(llm_data.get(key))
        combined = list(dict.fromkeys(baseline_values + llm_values))
        merged[key] = combined

    # Extract skills from projects if projects are objects with technologies
    projects_raw = llm_data.get("projects") or []
    if isinstance(projects_raw, list):
        for proj in projects_raw:
            if isinstance(proj, dict):
                techs = proj.get("technologies") or proj.get("tech_stack") or []
                if isinstance(techs, str):
                    techs = [t.strip() for t in re.split(r"[,;/|]+", techs) if t.strip()]
                if isinstance(techs, list):
                    existing = set(s.lower() for s in (merged.get("technical_skills") or []))
                    for tech in techs:
                        if isinstance(tech, str) and tech.strip() and tech.strip().lower() not in existing:
                            merged.setdefault("technical_skills", []).append(tech.strip())
                            existing.add(tech.strip().lower())

    return merged


def _truncate_text_for_llm(text: str, max_chars: int) -> str:
    compact = text.strip()
    if len(compact) <= max_chars:
        return compact
    head = compact[: max_chars // 2]
    tail = compact[-(max_chars // 2):]
    return f"{head}\n...\n{tail}"


def _parse_llm_json(response_text: str) -> dict:
    cleaned_text = response_text.strip()
    if cleaned_text.startswith("```"):
        cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
        cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

    try:
        parsed = json.loads(cleaned_text)
        if not isinstance(parsed, dict):
            raise ValueError("LLM response must be a JSON object")
        return parsed
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Invalid LLM resume JSON: {error}") from error


def _normalize_resume_items(items: object) -> list[str]:
    if items is None:
        return []
    if isinstance(items, list):
        values = [str(item).strip() for item in items if str(item).strip()]
    else:
        values = [part.strip() for part in re.split(r"[,;/|]+", str(items)) if part.strip()]
    return [value for value in values if not re.fullmatch(r"[A-Z][A-Z\s]{2,}", value)]


def _fallback_resume_parse(resume_text: str) -> dict:
    """Comprehensive regex-based extraction — runs even when LLM is unavailable."""
    normalized_text = re.sub(r"([a-z])([A-Z])", r"\1 \2", resume_text)
    normalized_text = re.sub(r"[ \t]+", " ", normalized_text)
    lines = [line.strip() for line in normalized_text.splitlines() if line.strip()]
    lowered = re.sub(r"\s+", " ", normalized_text.lower())

    # Greatly expanded skill dictionary covering most resume keywords
    known_skills = {
        # Languages
        "python", "java", "c++", "c#", "c", "javascript", "typescript", "go", "golang",
        "rust", "kotlin", "swift", "scala", "ruby", "php", "r", "matlab", "perl",
        "dart", "julia", "haskell", "elixir",
        # Web frameworks
        "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt.js",
        "node.js", "express", "express.js", "fastapi", "flask", "django",
        "spring", "spring boot", "spring framework", "spring mvc",
        "asp.net", ".net", "laravel", "rails", "ruby on rails", "graphql",
        "rest", "restful", "rest api", "restful services",
        # Databases
        "sql", "mysql", "postgresql", "mongodb", "redis", "cassandra", "oracle",
        "sqlite", "dynamodb", "firebase", "elasticsearch", "neo4j", "couchdb",
        # Cloud & DevOps
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
        "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "linux",
        "nginx", "apache", "microservices", "serverless",
        # ML & Data
        "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
        "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn",
        "nlp", "natural language processing", "computer vision", "opencv",
        "data science", "data analysis", "data analytics",
        "power bi", "tableau", "excel", "statistics",
        # CS Fundamentals
        "data structures", "algorithms", "dsa", "oop", "oops", "dbms",
        "object-oriented", "object oriented", "system design", "design patterns",
        "operating systems", "computer networks", "networking",
        # Tools
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "postman", "swagger", "vs code", "intellij", "eclipse", "maven", "gradle",
        # Soft skills
        "communication", "leadership", "teamwork", "problem solving", "agile",
        "scrum", "team player", "critical thinking", "analytical",
        # Other tech
        "html", "css", "sass", "bootstrap", "tailwind",
        "blockchain", "solidity", "web3", "android", "ios", "flutter", "react native",
        "selenium", "junit", "testing", "unit testing", "jwt", "oauth", "api",
    }

    detected_skills: list[str] = []
    # Match multi-word skills first (longest match wins)
    multi_word = sorted([s for s in known_skills if ' ' in s], key=len, reverse=True)
    single_word = [s for s in known_skills if ' ' not in s]

    remaining = lowered
    for skill in multi_word:
        if skill in remaining:
            detected_skills.append(skill)
            remaining = remaining.replace(skill, ' ')

    # Tokenize remaining for single-word skills
    tokens = set(re.split(r"[^a-z0-9.#+]+", remaining))
    for skill in single_word:
        if skill in tokens or skill in remaining:
            detected_skills.append(skill)

    # Also grab tokens from explicit skill-section lines (before/after a Skills header)
    skill_section_active = False
    for line in lines:
        if re.search(r'^(technical\s+)?skills?\s*:?\s*$|^key\s+(skills|expertise)\s*:?\s*$', line, re.IGNORECASE):
            skill_section_active = True
            continue
        if skill_section_active:
            if re.match(r'^[A-Z][A-Z\s]{5,}$', line):  # section header like EDUCATION
                skill_section_active = False
                continue
            # Split by common delimiters and collect tokens
            raw_tokens = re.split(r'[,|/•·\-–]+', line)
            for tok in raw_tokens:
                tok = tok.strip()
                if 1 < len(tok) <= 40 and tok not in detected_skills:
                    detected_skills.append(tok)

    detected_skills = list(dict.fromkeys(s.strip() for s in detected_skills if s.strip()))

    # Fuzzy email extraction
    fuzzy_emails = re.findall(
        r"[A-Za-z0-9._%+\-\s]{2,}@[A-Za-z0-9.\-\s]{2,}\.[A-Za-z\s]{2,6}(?![A-Za-z])",
        normalized_text,
    )
    emails = []
    for email in fuzzy_emails:
        cleaned = re.sub(r"\s+", "", email).strip(".,;:")
        if re.fullmatch(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", cleaned):
            emails.append(cleaned)

    name = _extract_candidate_name(lines, emails)

    education_hits = [
        line for line in lines
        if re.search(r"(b\.?tech|m\.?tech|bachelor|college|university|academy|institute|cgpa|b\.e\.|bsc|msc|diploma)", line, re.IGNORECASE)
        and len(line) <= 150
    ]
    project_hits = [
        line for line in lines
        if re.search(r"(project|built|developed|implemented|created|designed|deployed)", line, re.IGNORECASE)
        and len(line) > 15
    ]
    experience_hits = [
        line for line in lines
        if re.search(r"(intern|internship|experience|engineer|developer|worked|software|trainee)", line, re.IGNORECASE)
        and len(line) > 15
    ]
    cert_hits = [
        line for line in lines
        if re.search(r"(certif|certificate|certification|course|udemy|coursera|nptel|hackerrank|leetcode)", line, re.IGNORECASE)
        and len(line) <= 120
    ]

    # Extract objective/summary
    objective = ""
    summary_active = False
    for line in lines:
        if re.match(r'^(professional\s+)?summary|objective|profile', line, re.IGNORECASE):
            summary_active = True
            continue
        if summary_active:
            if re.match(r'^[A-Z][A-Z\s]{5,}$', line):
                break
            if len(line) > 30:
                objective = line
                break

    return {
        "name": name,
        "email": emails[0] if emails else None,
        "technical_skills": detected_skills,
        "soft_skills": [s for s in detected_skills if s in {"communication", "leadership", "teamwork", "agile", "scrum", "problem solving"}],
        "tools": [s for s in detected_skills if s in {"git", "github", "docker", "aws", "azure", "gcp", "jira", "postman"}],
        "projects": project_hits[:6],
        "education": education_hits[:4],
        "experience": experience_hits[:5],
        "certifications": cert_hits[:6],
        "objective": objective or "Aspiring engineering student aiming for high-impact software roles.",
    }


def _extract_candidate_name(lines: list[str], emails: list[str]) -> str:
    # 1) Direct "Name: ..." pattern.
    for line in lines[:20]:
        match = re.search(r"(name\s*:\s*)(.+)", line, flags=re.IGNORECASE)
        if match:
            candidate = match.group(2).strip()
            if candidate and len(candidate.split()) <= 5:
                return candidate

    # 2) All-caps name-like chunk often present in resumes.
    for line in lines:
        caps_chunks = re.findall(r"\b([A-Z]{3,}(?:\s+[A-Z]{2,}){1,3})\b", line)
        for chunk in caps_chunks:
            if chunk in {"KEY ACHIEVEMENTS", "PRO JECTS", "PROJECTS", "SUMMARY", "SKILLS"}:
                continue
            words = chunk.split()
            if 2 <= len(words) <= 4:
                return chunk

    # 3) Clean alphabetic title-like line near top.
    for line in lines[:25]:
        if re.search(r"(email|phone|linkedin|github|summary|education|skills?)", line, re.IGNORECASE):
            continue
        if re.match(r"^[A-Za-z][A-Za-z .'-]{4,60}$", line):
            return line.strip()

    # 4) Derive from email local-part.
    if emails:
        local = emails[0].split("@", 1)[0]
        local = re.sub(r"\d+", " ", local)
        local = re.sub(r"[._\-]+", " ", local)
        local = re.sub(r"\s+", " ", local).strip()
        if local:
            return " ".join(part.capitalize() for part in local.split())

    return "Unknown Candidate"


def _build_user_profile_from_resume(parsed_data: dict) -> models.UserProfile:
    technical_skills = _normalize_resume_items(parsed_data.get("technical_skills"))
    soft_skills = _normalize_resume_items(parsed_data.get("soft_skills"))
    tools = _normalize_resume_items(parsed_data.get("tools"))
    certifications_list = _normalize_resume_items(parsed_data.get("certifications"))
    education = _normalize_resume_items(parsed_data.get("education"))
    objective = str(parsed_data.get("objective") or "").strip()

    # Handle projects - can be strings or objects
    projects_raw = parsed_data.get("projects") or []
    projects: list[str] = []
    project_skills: list[str] = []
    if isinstance(projects_raw, list):
        for proj in projects_raw:
            if isinstance(proj, dict):
                proj_name = proj.get("name") or proj.get("title") or ""
                proj_techs = proj.get("technologies") or proj.get("tech_stack") or []
                if isinstance(proj_techs, str):
                    proj_techs = [t.strip() for t in re.split(r"[,;/|]+", proj_techs) if t.strip()]
                if proj_name:
                    projects.append(f"{proj_name} ({', '.join(proj_techs)})" if proj_techs else proj_name)
                project_skills.extend(proj_techs if isinstance(proj_techs, list) else [])
            elif isinstance(proj, str) and proj.strip():
                projects.append(proj.strip())
    else:
        projects = _normalize_resume_items(projects_raw)

    # Handle experience - can be strings or objects
    experience_raw = parsed_data.get("experience") or []
    experience_parts: list[str] = []
    if isinstance(experience_raw, list):
        for exp in experience_raw:
            if isinstance(exp, dict):
                role = exp.get("role") or exp.get("title") or ""
                company = exp.get("company") or ""
                duration = exp.get("duration") or ""
                desc = exp.get("description") or ""
                parts = [p for p in [role, company, duration] if p]
                exp_str = " at ".join(parts[:2]) if len(parts) >= 2 else " ".join(parts)
                if desc:
                    exp_str += f" - {desc}" if exp_str else desc
                if exp_str.strip():
                    experience_parts.append(exp_str.strip())
            elif isinstance(exp, str) and exp.strip():
                experience_parts.append(exp.strip())
    else:
        experience_parts = _normalize_resume_items(experience_raw)

    # Build comprehensive skill list from all sources
    skill_names: list[str] = []
    seen_lower: set[str] = set()
    for name in technical_skills + soft_skills + tools + certifications_list + project_skills:
        normalized_name = name.strip()
        if normalized_name and normalized_name.lower() not in seen_lower:
            skill_names.append(normalized_name)
            seen_lower.add(normalized_name.lower())

    skills = [models.Skill(name=skill_name) for skill_name in skill_names]

    # Build rich interests_text that captures the full resume context
    interests_parts: list[str] = []
    if objective:
        interests_parts.append(f"Objective: {objective}")
    if projects:
        interests_parts.append(f"Projects: {'; '.join(projects)}")
    if experience_parts:
        interests_parts.append(f"Experience: {'; '.join(experience_parts)}")
    if certifications_list:
        interests_parts.append(f"Certifications: {', '.join(certifications_list)}")
    interests_text = " | ".join(interests_parts) if interests_parts else None

    # Use projects + objective as recommendation interests
    interest_items: list[str] = []
    if objective:
        interest_items.append(objective)
    interest_items.extend(projects)

    college_value = _pick_college_line(education)
    branch_value = _extract_branch_from_education(education)
    year_value = _extract_year_from_education(education)

    return models.UserProfile(
        name=str(parsed_data.get("name") or parsed_data.get("candidate_name") or "Unknown Candidate").strip(),
        email=parsed_data.get("email"),
        college=college_value,
        branch=branch_value,
        year=year_value,
        location_preference=None,
        salary_expectation=None,
        remote_preference=None,
        interests_text=interests_text,
        preferred_location=None,
        interests=interest_items,
        skills=skills,
        projects=projects,
        experience=experience_parts,
        certifications=certifications_list,
        objective=objective or None,
    )


def _extract_branch_from_education(education_lines: list[str]) -> str | None:
    branch_keywords = [
        "computer science", "computer engineering", "information technology", "electronics",
        "mechanical", "civil", "electrical", "chemical", "data science", "artificial intelligence",
        "ai & ml", "ai and ml", "biotechnology", "instrumentation", "ece", "cse", "ai/ds", "aiml",
    ]
    for line in education_lines:
        lower = line.lower()
        for keyword in branch_keywords:
            if keyword in lower:
                # Extract a clean phrase
                idx = lower.find(keyword)
                end = min(len(line), idx + len(keyword) + 30)
                snippet = line[idx:end].split(",")[0].split("|")[0].strip()
                return snippet[:80]
    return None


def _extract_year_from_education(education_lines: list[str]) -> int | None:
    import datetime as _dt
    current = _dt.datetime.now().year
    years_found: list[int] = []
    for line in education_lines:
        for match in re.findall(r"\b(20\d{2})\b", line):
            try:
                years_found.append(int(match))
            except ValueError:
                continue
    if not years_found:
        return None
    # Use the latest year (likely graduation) and infer year of study
    grad_year = max(years_found)
    if grad_year >= current:
        diff = grad_year - current
        if diff <= 4:
            return max(1, 4 - diff)
    return None


def _pick_college_line(education_lines: list[str]) -> str | None:
    if not education_lines:
        return None
    for line in education_lines:
        if re.search(r"(academy|college|university|institute)", line, re.IGNORECASE):
            return _clean_education_line(line)
    return _clean_education_line(education_lines[0])


def _clean_education_line(line: str) -> str:
    cleaned = re.sub(r"^\s*\d{4}\s*[-–—]?\s*\d{4}\s*", "", line).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _extract_top_skills(frame, limit: int = 10) -> list[tuple[str, int]]:
    skill_counter: Counter[str] = Counter()
    for skills_text in frame["skills"].dropna().astype(str):
        parsed_skills: list[str]
        raw_value = skills_text.strip()
        if raw_value.startswith("[") and raw_value.endswith("]"):
            try:
                parsed = ast.literal_eval(raw_value)
                parsed_skills = [str(item).strip().lower() for item in parsed if str(item).strip()]
            except Exception:
                parsed_skills = []
        else:
            parsed_skills = [part.strip().lower() for part in re.split(r"[,;/|]+", raw_value) if part.strip()]

        for skill in parsed_skills:
            cleaned_skill = re.sub(r"\s+", " ", skill.strip().strip("[]'\"" )).strip()
            if cleaned_skill:
                skill_counter[cleaned_skill] += 1
    return skill_counter.most_common(limit)


def _apply_skill_changes(
    skills: list[models.Skill],
    added_skills: list[str],
    removed_skills: list[str],
    scalar: float = 1.0,
) -> list[models.Skill]:
    normalized_removed = {skill.strip().lower() for skill in removed_skills if skill.strip()}
    updated_skills = [skill for skill in skills if skill.name.strip().lower() not in normalized_removed]

    existing_names = {skill.name.strip().lower() for skill in updated_skills}
    for skill_name in added_skills:
        normalized_skill = skill_name.strip()
        if not normalized_skill:
            continue
        # Add the skill if not already present. To simulate partial maturity for time horizons,
        # add repeated entries proportionally to the scalar (3mo->0.25..18mo->1.0). Repeats boost TF-IDF signal.
        repeats = max(1, int(round(scalar * 4)))
        for _ in range(repeats):
            updated_skills.append(models.Skill(name=normalized_skill))
        existing_names.add(normalized_skill.lower())

    return updated_skills


def _combined_recommendations(
    request: models.UserProfile,
    skills_text_override: str | None = None,
) -> list[RecommendationResponseItem]:
    skills_text = skills_text_override if skills_text_override is not None else _build_skills_text(request.skills)

    interest_parts = [request.interests_text or "", " ".join(request.interests)]
    constraint_parts = [
        request.preferred_location or "",
        request.location_preference or "",
        request.remote_preference or "",
    ]
    interests_text = " ".join(part for part in interest_parts + constraint_parts if part).strip()

    content_candidates = models.predict_top_k_careers(
        user_skills_text=skills_text,
        user_interests_text=interests_text,
        k=10,
    )
    cf_candidates = models.similar_roles_for_user_skills(
        user_skills_text=skills_text,
        top_n=10,
    )

    content_scores = {item.role: item.score for item in content_candidates}
    cf_scores = {item.role: item.score for item in cf_candidates}
    all_roles = set(content_scores) | set(cf_scores)

    combined_results = [
        RecommendationResponseItem(
            role_name=role,
            final_score=(0.6 * float(content_scores.get(role, 0.0))) + (0.4 * float(cf_scores.get(role, 0.0))),
            source_breakdown=RecommendationSourceBreakdown(
                content_score=float(content_scores.get(role, 0.0)),
                cf_score=float(cf_scores.get(role, 0.0)),
            ),
        )
        for role in all_roles
    ]

    combined_results.sort(key=lambda item: item.final_score, reverse=True)
    return combined_results[:10]


def generate_recommendation_explanation(
    user_profile: models.UserProfile,
    recommendations: list[RecommendationResponseItem],
) -> str:
    top_recommendations = recommendations[:3]
    if not top_recommendations:
        return "No strong recommendations could be generated from the provided profile."

    profile_payload = user_profile.model_dump(by_alias=True)
    recommendations_payload = [
        {
            "role": item.role_name,
            "score": item.final_score,
            "content_score": item.source_breakdown.content_score,
            "cf_score": item.source_breakdown.cf_score,
        }
        for item in top_recommendations
    ]

    user_prompt = (
        "Explain the top 3 career recommendations for this student in a concise, practical way. "
        "For each role, include why it fits, which skills are already strong, which gaps to close, and 1-2 suggested learning actions. "
        "Keep the tone supportive and specific.\n\n"
        f"Profile:\n{json.dumps(profile_payload, ensure_ascii=False, indent=2)}\n\n"
        f"Ranked roles and scores:\n{json.dumps(recommendations_payload, ensure_ascii=False, indent=2)}"
    )

    return call_llm(
        system_prompt="You are a career mentor for Indian engineering students",
        user_prompt=user_prompt,
    ).strip()
