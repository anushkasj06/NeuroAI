import json
import os
from datetime import datetime
from typing import List, Dict
from urllib.parse import quote_plus
from urllib import request as urllib_request

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(name: str) -> str:
    return os.path.join(CACHE_DIR, f"{name}.json")


def fetch_market_metrics() -> Dict[str, Dict]:
    """Fetch market metrics from configured providers (best-effort). Returns dict keyed by role."""
    # Placeholder implementation: derive from candidate_role dataset in models if available
    try:
        from .data_loader import load_candidate_roles
        df = load_candidate_roles()
        role_counts = df['job_role'].astype(str).str.strip().value_counts(normalize=True).to_dict()
        result = {}
        for role, frac in role_counts.items():
            result[role] = {
                'openings_per_month': int(frac * 100),
                'median_ctc_inr': 600000,
                'six_month_trend_pct': 0.0,
                'collected_at': datetime.utcnow().isoformat(),
            }
        path = _cache_path('market_metrics')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(result, f)
        return result
    except Exception:
        # fallback: return cached if present
        path = _cache_path('market_metrics')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}


def fetch_opportunity_listings(role: str = '', limit: int = 50) -> List[Dict]:
    """Fetch live opportunities using Remotive as a free source for demo purposes."""
    url = f"https://remotive.com/api/remote-jobs?search={quote_plus(role or '')}"
    try:
        with urllib_request.urlopen(url, timeout=20) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
        jobs = []
        for row in payload.get('jobs', [])[:limit]:
            jobs.append({
                'title': row.get('title'),
                'company': row.get('company_name'),
                'location': row.get('candidate_required_location'),
                'url': row.get('url'),
                'source': 'remotive',
            })
        path = _cache_path('opportunity_listings')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(jobs, f)
        return jobs
    except Exception:
        path = _cache_path('opportunity_listings')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
