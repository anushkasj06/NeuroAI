/**
 * useEngagementAnalytics
 * ======================
 * Hooks that wrap the three analytics API surfaces.
 *
 * Exports:
 *   useSessionEngagement(sessionId)         — engagement for one session
 *   useUserEngagement(days, subjectSlug)    — user-level summary + trend
 *   useCourseEngagement(subjectSlug, days)  — course-level summary
 *   useDashboardEngagement()                — lightweight KPI block
 */

import { useState, useEffect, useCallback } from 'react';
import { analytics } from '../services/api';

// ── Generic fetch helper ──────────────────────────────────────────────────────
function useFetch(fetcher, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ── Session engagement ────────────────────────────────────────────────────────
export function useSessionEngagement(sessionId, recompute = false) {
  return useFetch(
    () => analytics.getSession(sessionId, recompute),
    [sessionId, recompute]
  );
}

// ── User-level summary ────────────────────────────────────────────────────────
export function useUserEngagement(days = 30, subjectSlug = null) {
  return useFetch(
    () => analytics.getUser(days, subjectSlug),
    [days, subjectSlug]
  );
}

// ── Course-level summary ──────────────────────────────────────────────────────
export function useCourseEngagement(subjectSlug, days = 30) {
  return useFetch(
    () => analytics.getCourse(subjectSlug, days),
    [subjectSlug, days]
  );
}

// ── Dashboard KPI ─────────────────────────────────────────────────────────────
export function useDashboardEngagement() {
  return useFetch(() => analytics.getDashboard(), []);
}
