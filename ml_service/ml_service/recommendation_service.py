from __future__ import annotations

import json
import re
from typing import Iterable

from . import models
from .llm_client import call_llm
from .schemas import RecommendationResponseItem, RecommendationSourceBreakdown


def build_skills_text(skills: list[models.Skill]) -> str:
    return " ".join(
        f"{skill.name} {skill.level if skill.level is not None else ''}".strip()
        for skill in skills
        if skill.name and skill.name.strip()
    ).strip()


def compute_recommendations(
    profile: models.UserProfile,
    skills_text_override: str | None = None,
    alpha: float = 0.6,
) -> list[RecommendationResponseItem]:
    skills_text = skills_text_override or build_skills_text(profile.skills)
    interests_text = " ".join(
        value for value in [profile.interests_text or "", " ".join(profile.interests)] if value
    ).strip()

    # Cold-start handling: if the user's career transition record count is known and <5,
    # treat CF_score as 0 and redistribute its weight to the content/skill model by setting
    # alpha -> alpha + (1-alpha) so weights still sum to 1.0.
    transition_count = None
    try:
        # pydantic model may carry extra fields; try model dump first
        transition_count = getattr(profile, "transition_count", None) or profile.model_dump().get("transition_count")
    except Exception:
        transition_count = getattr(profile, "transition_count", None)

    if transition_count is not None:
        try:
            tc = int(transition_count)
            if tc < 5:
                alpha = 1.0
        except Exception:
            pass

    content_candidates = models.predict_top_k_careers(skills_text, interests_text, k=10)
    cf_candidates = models.similar_roles_for_user_skills(skills_text, top_n=10)

    content_map = {row.role: row.score for row in content_candidates}
    cf_map = {row.role: row.score for row in cf_candidates}
    all_roles = set(content_map.keys()) | set(cf_map.keys())

    rows = []
    for role_name in all_roles:
        content_score = float(content_map.get(role_name, 0.0))
        cf_score = float(cf_map.get(role_name, 0.0))
        base_score = (alpha * content_score) + ((1 - alpha) * cf_score)
        affinity_multiplier = _role_affinity_multiplier(profile, role_name)
        final_score = base_score * affinity_multiplier
        rows.append(
            RecommendationResponseItem(
                role_name=role_name,
                final_score=final_score,
                source_breakdown=RecommendationSourceBreakdown(
                    content_score=content_score,
                    cf_score=cf_score,
                ),
            )
        )

    rows.sort(key=lambda row: row.final_score, reverse=True)
    return rows[:10]


ROLE_KEYWORDS: dict[str, set[str]] = {
    "data scientist": {"python", "statistics", "machine learning", "pandas", "numpy", "sql", "data"},
    "data analyst": {"sql", "excel", "power bi", "tableau", "analytics", "data"},
    "ml engineer": {"machine learning", "deep learning", "tensorflow", "pytorch", "python", "ml"},
    "backend developer": {"java", "spring", "node", "api", "microservices", "sql", "backend"},
    "frontend developer": {"react", "javascript", "typescript", "css", "html", "frontend"},
    "full stack": {"react", "javascript", "java", "spring", "node", "sql", "api"},
    "cloud engineer": {"aws", "azure", "gcp", "docker", "kubernetes", "devops", "cloud"},
    "mobile developer": {"android", "ios", "flutter", "react native", "kotlin", "swift"},
}


def _normalize_text_tokens(value: str) -> set[str]:
    cleaned = re.sub(r"[^a-z0-9+#.\s]+", " ", value.lower())
    return {token.strip() for token in cleaned.split() if token.strip()}


def _role_affinity_multiplier(profile: models.UserProfile, role_name: str) -> float:
    profile_text = " ".join(
        [
            " ".join(skill.name for skill in profile.skills),
            profile.interests_text or "",
            " ".join(profile.interests),
            profile.branch or "",
        ]
    ).strip()
    profile_tokens = _normalize_text_tokens(profile_text)
    role_key = role_name.lower()

    matched_keywords: set[str] = set()
    for alias, keywords in ROLE_KEYWORDS.items():
        if alias in role_key:
            matched_keywords |= keywords

    if not matched_keywords:
        return 1.0

    hit_count = 0
    for keyword in matched_keywords:
        keyword_parts = _normalize_text_tokens(keyword)
        if keyword_parts and keyword_parts.issubset(profile_tokens):
            hit_count += 1

    coverage = hit_count / max(len(matched_keywords), 1)
    # Strongly down-rank mismatched role families; slight boost for high match.
    if coverage < 0.10:
        return 0.65
    if coverage < 0.20:
        return 0.80
    if coverage < 0.35:
        return 0.95
    if coverage > 0.60:
        return 1.10
    return 1.0


def generate_explanations(
    user_profile: models.UserProfile,
    recommendations: Iterable[RecommendationResponseItem],
) -> str:
    top = list(recommendations)[:3]
    if not top:
        return "No clear role signal yet. Add more skills and interests for stronger guidance."

    # Include projects and experience for richer context
    projects = getattr(user_profile, "projects", []) or []
    experience = getattr(user_profile, "experience", []) or []
    objective = getattr(user_profile, "objective", None) or ""

    context = {
        "profile": {
            "name": user_profile.name,
            "college": user_profile.college,
            "branch": user_profile.branch,
            "year": user_profile.year,
            "location_preference": user_profile.location_preference,
            "interests": user_profile.interests,
            "objective": objective,
        },
        "skills": [skill.name for skill in user_profile.skills],
        "projects": projects[:4],
        "experience": experience[:3],
        "interests_text": user_profile.interests_text,
        "top_roles": [
            {
                "role": item.role_name,
                "final_score": round(item.final_score, 3),
                "content_score": round(item.source_breakdown.content_score, 3),
                "cf_score": round(item.source_breakdown.cf_score, 3),
            }
            for item in top
        ],
    }
    prompt = (
        "You are an expert career strategist for Indian engineering students. "
        "Analyze this student's profile and explain why these roles were recommended.\n\n"
        "FORMAT YOUR RESPONSE WITH:\n"
        "1. A **comparison table** (Markdown table) showing each role with columns: Role | Fit Score | Key Strengths | Gaps to Close | Priority\n"
        "2. For the TOP role, provide:\n"
        "   - **Why it matches** (reference specific skills and projects from their profile)\n"
        "   - **What's missing** (be specific about skills/experience gaps)\n"
        "   - **3-step action plan** (numbered, with timeframes)\n"
        "3. A brief **confidence note** explaining the scoring methodology.\n\n"
        "Use Markdown formatting: bold for emphasis, tables for comparison, bullet points for lists. "
        "Be specific — reference the student's actual projects and skills by name. "
        "Keep it under 400 words but information-dense.\n\n"
        f"Data:\n{json.dumps(context, ensure_ascii=False)}"
    )
    return call_llm("Career mentor mode. Always use Markdown tables and structured formatting.", prompt, temperature=0.3)


def multi_agent_debate(
    user_profile: models.UserProfile,
    role: str,
    scores: dict[str, float],
) -> list[dict[str, str]]:
    prompt = (
        "Run a focused three-persona career conversation in JSON array format. "
        "Personas: Mentor, Recruiter, FutureYou. Each persona should speak in a distinct voice aligned to its role. "
        "Mentor: supportive, educational, detailed, action-oriented. Recruiter: market-driven, candid, hiring-focused. FutureYou: reflective, motivating, practical. "
        "Return 2 messages per persona max. Each object must have keys persona and message. "
        "Messages should be specific to the student profile and role, not generic.\n"
        f"profile={json.dumps({'name': user_profile.name, 'branch': user_profile.branch, 'college': user_profile.college, 'skills': [skill.name for skill in user_profile.skills], 'interests': user_profile.interests, 'interests_text': user_profile.interests_text}, ensure_ascii=False)}\n"
        f"role={role}, scores={scores}"
    )
    raw = call_llm("Structured debate generator.", prompt, temperature=0.4)
    try:
        return json.loads(raw)
    except Exception:
        return [
            {"persona": "Mentor", "message": f"{role} is strong long-term if you deepen fundamentals."},
            {"persona": "Recruiter", "message": f"{role} has near-term potential with focused project evidence."},
            {"persona": "FutureYou", "message": f"Pick {role} only if the work style matches your preferred life."},
        ]


def role_chat_response(
    user_profile: models.UserProfile,
    role: str,
    persona: str,
    message: str | None,
    history: list[dict[str, str]] | None = None,
) -> dict[str, str | list[str]]:
    persona_key = persona.strip().lower().replace(" ", "_")
    system_prompt = {
        "mentor": (
            "You are Mentor, a warm but rigorous senior career coach with 15+ years of experience guiding engineering students into tech roles. "
            "Your approach: (1) Acknowledge the student's current strengths with specific examples, (2) Identify the most impactful gaps to close, "
            "(3) Provide a concrete, time-bound action plan with specific resources, courses, or project ideas. "
            "Be encouraging but honest. Use structured formatting with bullet points. Always end with a clear next step the student can take THIS WEEK. "
            "Reference the student's actual skills and background in your advice. Never be generic."
        ),
        "recruiter": (
            "You are Recruiter, a senior technical hiring manager at a top-tier tech company. You've reviewed 10,000+ resumes and conducted 2,000+ interviews. "
            "Your approach: (1) Evaluate the candidate's profile against real hiring bar for the target role, (2) Identify what would make them stand out vs. other candidates, "
            "(3) Point out red flags or gaps that would cause rejection, (4) Suggest specific portfolio pieces, certifications, or experiences that hiring managers actually value. "
            "Be direct and market-focused. Don't sugarcoat. Tell them exactly what a hiring committee would say about their profile. "
            "Include specific salary ranges, company tiers they could target, and timeline to interview-readiness. "
            "You have access to current market data and live job listings. Use this data to give concrete, evidence-based advice about hiring trends and opportunities."
        ),
        "future_you": (
            "You are FutureYou - the student's future self who successfully landed and thrived in the target role 2 years from now. "
            "Your approach: (1) Share what the journey actually looked like - the decisions that mattered and the ones that didn't, "
            "(2) Be honest about tradeoffs - what you sacrificed, what surprised you, what you wish you'd known, "
            "(3) Give practical wisdom about the day-to-day reality of the role, (4) Help them avoid the mistakes you made. "
            "Speak in first person as their future self. Be reflective, practical, and occasionally vulnerable. "
            "Share specific anecdotes about what worked. Help them see the path is achievable but requires deliberate choices."
        ),
        "agent": (
            "You are CareerTwin AI Agent — a comprehensive career intelligence assistant that combines the expertise of a Mentor, Recruiter, and Future Self. "
            "You have full access to the student's profile, skills, projects, market trends, live job listings, and career recommendations. "
            "Your capabilities: (1) Answer ANY career-related question with depth and specificity, "
            "(2) Provide market intelligence — current job openings, demand trends, salary data, "
            "(3) Give strategic career advice combining mentorship, hiring insights, and future planning, "
            "(4) Help with skill gap analysis, learning roadmaps, interview prep, and portfolio strategy, "
            "(5) Navigate the student through their career dashboard — suggest which sections to explore. "
            "When the user asks to navigate or explore a feature, respond with actionable guidance AND include a navigation hint in your response like [NAV:overview], [NAV:recommendations], [NAV:simulation], [NAV:roadmap], or [NAV:advisors]. "
            "Be comprehensive, data-driven, and action-oriented. You are the student's all-in-one career AI partner."
        ),
    }.get(persona_key, "You are a role-specific career assistant.")

    payload = {
        "persona": persona,
        "role": role,
        "student_profile": {
            "name": user_profile.name,
            "college": user_profile.college,
            "branch": user_profile.branch,
            "year": user_profile.year,
            "location_preference": user_profile.location_preference,
            "salary_expectation": user_profile.salary_expectation,
            "remote_preference": user_profile.remote_preference,
            "skills": [{"name": skill.name, "level": skill.level, "category": skill.category} for skill in user_profile.skills],
            "interests": user_profile.interests,
            "interests_text": user_profile.interests_text,
            "objective": getattr(user_profile, "objective", None),
            "projects": getattr(user_profile, "projects", []) or [],
            "experience": getattr(user_profile, "experience", []) or [],
            "certifications": getattr(user_profile, "certifications", []) or [],
        },
        "user_message": message or "Give me your initial guidance for this role.",
        "conversation": history or [],
    }
    prompt = (
        "Respond as a chatbot. Be specific, structured, and helpful. "
        "Start with a direct answer, then add bullet points for gaps, strengths, and next steps when relevant. "
        "Reference the student's ACTUAL skills, college, projects, and background - never give generic advice. "
        "When appropriate, include a mini roadmap (numbered steps with timeframes) or action plan. "
        "Keep responses focused (200-400 words) but packed with actionable detail. "
        "If the user asks follow-ups, stay in-character, build on previous context, and avoid repeating the same wording. "
        "Always consider the student's career goal when giving advice. "
    )

    # Inject market data for recruiter and agent personas
    if persona_key in ("recruiter", "agent"):
        try:
            from .data_loader import load_candidate_roles
            from . import models as _models
            market_roles = sorted(_models.role_frequency_prior.items(), key=lambda x: x[1], reverse=True)[:6]
            market_context = "CURRENT MARKET DATA:\n"
            market_context += "Top roles by demand: " + ", ".join(f"{r} ({int(s*100)}%)" for r, s in market_roles) + "\n"
            # Try to get live jobs for the target role
            try:
                import urllib.request as _req
                adzuna_id = os.getenv("ADZUNA_APP_ID", "")
                adzuna_key = os.getenv("ADZUNA_APP_KEY", "")
                if adzuna_id and adzuna_key:
                    from urllib.parse import quote_plus as _qp
                    _url = f"https://api.adzuna.com/v1/api/jobs/in/search/1?app_id={adzuna_id}&app_key={adzuna_key}&results_per_page=5&what={_qp(role)}&content-type=application/json"
                    _rq = _req.Request(_url, headers={"User-Agent": "CareerTwin/1.0"})
                    with _req.urlopen(_rq, timeout=8) as _resp:
                        _jdata = json.loads(_resp.read().decode("utf-8"))
                    job_count = _jdata.get("count", 0)
                    market_context += f"Live job openings for '{role}' in India: {job_count}\n"
                    for _j in _jdata.get("results", [])[:3]:
                        _title = _j.get("title", "").replace("<strong>", "").replace("</strong>", "")
                        _company = _j.get("company", {}).get("display_name", "")
                        _loc = _j.get("location", {}).get("display_name", "")
                        market_context += f"  - {_title} at {_company} ({_loc})\n"
            except Exception:
                pass
            prompt += f"\n{market_context}\n"
        except Exception:
            pass

    prompt += f"\n\nContext:\n{json.dumps(payload, ensure_ascii=False)}"
    reply = call_llm(system_prompt, prompt, temperature=0.35)

    # Generate contextual follow-up suggestions based on persona and role
    if persona_key == "mentor":
        suggestions = [
            f"Create a 3-month learning roadmap for {role}",
            f"What projects would best demonstrate my {role} skills?",
            f"How do I balance depth vs breadth in my skill development?",
        ]
    elif persona_key == "recruiter":
        suggestions = [
            f"What would get me rejected for a {role} interview?",
            f"Which companies should I target with my current profile?",
            f"What does a strong {role} portfolio look like?",
        ]
    elif persona_key == "agent":
        suggestions = [
            f"Show me current job openings for {role}",
            f"What should I focus on this week to improve my profile?",
            f"Compare my readiness across all recommended roles",
        ]
    else:
        suggestions = [
            f"What was the hardest part of becoming a {role}?",
            f"What would you do differently if starting over?",
            f"How did you handle imposter syndrome in the role?",
        ]
    return {"role": role, "persona": persona, "reply": reply, "suggested_followups": suggestions}
