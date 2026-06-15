from __future__ import annotations

from collections import defaultdict, deque
import json
import os
import re
from typing import Dict, List, Tuple
from datetime import datetime

from .data_loader import load_career_reco
from .data_loader import load_candidate_roles
import httpx
import os
import time
import logging

logger = logging.getLogger(__name__)

GRAPH_CACHE = os.path.join(os.path.dirname(__file__), "..", "data", "career_graph.json")


def _parse_sequence_field(value: object) -> List[str]:
    if value is None:
        return []
    s = str(value).strip()
    if not s:
        return []
    # split on arrows or common separators
    parts = re.split(r"->|\||;|,", s)
    return [p.strip() for p in parts if p.strip()]


def build_graph_from_dataframe(df) -> Dict[str, Dict[str, float]]:
    """Build a directed weighted graph from a dataframe that contains career sequences.
    Returns adjacency dict: {from: {to: frequency}}
    """
    edge_counts: Dict[Tuple[str, str], int] = defaultdict(int)
    node_counts: Dict[str, int] = defaultdict(int)

    # Find candidate sequence columns
    seq_cols = [c for c in df.columns if any(keyword in c.lower() for keyword in ("sequence", "path", "transitions", "career"))]
    if not seq_cols:
        # fallback: try recommended career as single-node sequences
        for _, row in df.iterrows():
            role = str(row.get("recommended_career") or row.get("recommendedcareer") or "").strip()
            if role:
                node_counts[role] += 1
        # No edges to build
        adj: Dict[str, Dict[str, float]] = {}
        return adj

    for _, row in df.iterrows():
        for col in seq_cols:
            seq = row.get(col)
            parts = []
            if isinstance(seq, list):
                parts = [str(p).strip() for p in seq if str(p).strip()]
            else:
                parts = _parse_sequence_field(seq)
            if not parts:
                continue
            for i in range(len(parts) - 1):
                a = parts[i]
                b = parts[i + 1]
                edge_counts[(a, b)] += 1
                node_counts[a] += 1
                node_counts[b] += 0

    # Normalize to probabilities per source node
    adj: Dict[str, Dict[str, float]] = defaultdict(dict)
    outgoing_totals: Dict[str, int] = defaultdict(int)
    for (a, b), count in edge_counts.items():
        outgoing_totals[a] += count
    for (a, b), count in edge_counts.items():
        total = outgoing_totals.get(a, 1)
        adj[a][b] = float(count) / float(total)

    # Save cache
    try:
        os.makedirs(os.path.dirname(GRAPH_CACHE), exist_ok=True)
        with open(GRAPH_CACHE, "w", encoding="utf-8") as f:
            json.dump({k: v for k, v in adj.items()}, f)
    except Exception:
        pass

    return adj


def build_graph_by_skill_similarity(top_k: int = 10, similarity_threshold: float = 0.25) -> Dict[str, Dict[str, float]]:
    """Build a directed graph by computing skill-overlap similarity between roles in candidate roles dataset.
    This is a fallback when no sequence data is available.
    """
    df = load_candidate_roles()
    # Expect columns: job_role and skills
    roles = {}
    for _, row in df.iterrows():
        role = str(row.get("job_role") or row.get("role") or "").strip()
        skills = row.get("skills") or []
        if not role:
            continue
        if isinstance(skills, list):
            skills_set = set([s.strip().lower() for s in skills if s])
        else:
            skills_set = set([s.strip().lower() for s in str(skills).split(",") if s.strip()])
        roles.setdefault(role, set()).update(skills_set)

    adj: Dict[str, Dict[str, float]] = defaultdict(dict)
    role_list = list(roles.items())
    for i, (a, skills_a) in enumerate(role_list):
        sims = []
        for j, (b, skills_b) in enumerate(role_list):
            if a == b:
                continue
            inter = len(skills_a & skills_b)
            union = len(skills_a | skills_b) or 1
            jacc = inter / union
            if jacc >= similarity_threshold:
                sims.append((b, jacc))
        sims.sort(key=lambda x: x[1], reverse=True)
        for b, score in sims[:top_k]:
            adj[a][b] = float(score)

    # normalize outgoing weights to probabilities
    for a, nbrs in adj.items():
        total = sum(nbrs.values()) or 1.0
        for b in list(nbrs.keys()):
            adj[a][b] = nbrs[b] / total

    try:
        os.makedirs(os.path.dirname(GRAPH_CACHE), exist_ok=True)
        with open(GRAPH_CACHE, "w", encoding="utf-8") as f:
            json.dump({k: v for k, v in adj.items()}, f)
    except Exception:
        pass

    return adj


def load_graph() -> Dict[str, Dict[str, float]]:
    if os.path.exists(GRAPH_CACHE):
        try:
            with open(GRAPH_CACHE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {k: {k2: float(v2) for k2, v2 in v.items()} for k, v in data.items()}
        except Exception:
            return {}
    return {}


def compute_reachability(adj: Dict[str, Dict[str, float]], start_nodes: List[str], max_hops: int = 3) -> Dict[str, float]:
    """Compute reachability probabilities from any of start_nodes to all targets within max_hops.
    Uses breadth-first traversal multiplying edge probabilities along paths and summing path probabilities per target.
    Returns {target_node: probability}.
    """
    probs: Dict[str, float] = defaultdict(float)
    # queue of (node, prob, depth)
    q = deque()
    for s in start_nodes:
        q.append((s, 1.0, 0))

    while q:
        node, prob, depth = q.popleft()
        if depth >= max_hops:
            continue
        neighbors = adj.get(node, {})
        for nb, p in neighbors.items():
            path_prob = prob * float(p)
            probs[nb] += path_prob
            q.append((nb, path_prob, depth + 1))

    # Clip probabilities to [0,1]
    return {k: min(1.0, float(v)) for k, v in probs.items()}


def build_graph_from_available_data() -> Dict[str, Dict[str, float]]:
    df = load_career_reco()
    adj = build_graph_from_dataframe(df)
    if adj:
        return adj
    # fallback: build by skill similarity
    return build_graph_by_skill_similarity()


def persist_graph_to_api(adj: Dict[str, Dict[str, float]], api_url: str, cohort_id: str = None, auth_token: str | None = None) -> dict:
    """Persist adjacency into the API's career transitions endpoint.
    Expects api_url to be the full URL of the POST endpoint that accepts a JSON list of transitions.
    Each transition: {cohortId, fromRoleName, toRoleName, timeInMonths}
    """
    if not api_url:
        raise ValueError("api_url is required")

    payload = []
    default_months = 6
    for src, neighbors in adj.items():
        for dst, prob in neighbors.items():
            # convert probability into an approximate time weight; keep default
            payload.append(
                {
                    "cohortId": cohort_id or "auto",
                    "fromRoleName": src,
                    "toRoleName": dst,
                    "timeInMonths": int(default_months),
                }
            )

    try:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(api_url, json=payload, headers=headers)
            try:
                resp.raise_for_status()
            except Exception as exc:
                logger.warning("persist_graph_to_api HTTP error status=%s body=%s", resp.status_code, resp.text)
                return {"status": "error", "message": str(exc), "code": resp.status_code, "body": resp.text}
            try:
                return resp.json() if resp.content else {"status": "ok", "written": len(payload)}
            except Exception:
                return {"status": "ok", "written": len(payload)}
    except Exception as e:
        logger.exception("persist_graph_to_api exception")
        return {"status": "error", "message": str(e)}


def persist_graph_with_retries(adj: Dict[str, Dict[str, float]], api_url: str, cohort_id: str | None = None, auth_token: str | None = None, max_retries: int = 3, initial_delay: float = 2.0, backoff_factor: float = 2.0) -> dict:
    """Persist graph with retry/backoff and logging. Returns the final result dict."""
    attempt = 0
    delay = float(initial_delay)
    last_result = None
    while attempt <= max_retries:
        attempt += 1
        logger.info("persist_graph_with_retries attempt=%d/%d", attempt, max_retries)
        result = persist_graph_to_api(adj, api_url, cohort_id=cohort_id, auth_token=auth_token)
        last_result = result
        if isinstance(result, dict) and result.get("status") == "ok":
            logger.info("persist_graph_with_retries succeeded on attempt=%d", attempt)
            return result
        # failed — wait and retry if attempts remain
        if attempt > max_retries:
            break
        logger.warning("persist attempt %d failed: %s — retrying in %.1fs", attempt, result, delay)
        time.sleep(delay)
        delay *= backoff_factor

    logger.error("persist_graph_with_retries exhausted attempts; last_result=%s", last_result)
    return last_result or {"status": "error", "message": "unknown"}

