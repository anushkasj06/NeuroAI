/**
 * useContentAdaptation
 * ====================
 * Hooks for the Content Adaptation Engine.
 *
 * Exports:
 *   useContentAdaptDashboard()                      — latest rec per topic
 *   useContentAdaptTopic(subjectSlug, topic)         — rec for one topic
 *   useContentAdaptHistory(subjectSlug, limit)       — full history
 *   useContentAdaptStats(days)                       — format usage stats
 *   useContentAdaptRecommender()                     — { recommend, loading, result, error }
 */

import { useState, useEffect, useCallback } from 'react';
import { contentAdapt } from '../services/api';

// ── Shared fetch helper ───────────────────────────────────────────────────────
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
      setError(err.response?.data?.message || 'Failed to load content adaptation data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { data, loading, error, refetch: run };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useContentAdaptDashboard() {
  return useFetch(() => contentAdapt.getDashboard(), []);
}

// ── Single topic ──────────────────────────────────────────────────────────────
export function useContentAdaptTopic(subjectSlug, topic) {
  return useFetch(
    () => contentAdapt.getTopic(subjectSlug, topic),
    [subjectSlug, topic]
  );
}

// ── History ───────────────────────────────────────────────────────────────────
export function useContentAdaptHistory(subjectSlug = null, limit = 20) {
  return useFetch(
    () => contentAdapt.getHistory(subjectSlug, limit),
    [subjectSlug, limit]
  );
}

// ── Format stats ──────────────────────────────────────────────────────────────
export function useContentAdaptStats(days = 30) {
  return useFetch(() => contentAdapt.getStats(days), [days]);
}

// ── Imperative recommender ────────────────────────────────────────────────────
export function useContentAdaptRecommender() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const recommend = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await contentAdapt.recommend(payload);
      const rec = res.data?.data?.recommendation ?? null;
      setResult(rec);
      return rec;
    } catch (err) {
      const msg = err.response?.data?.message || 'Recommendation failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const apply   = useCallback(async (recordId) => {
    await contentAdapt.apply(recordId);
    setResult((prev) => prev?._id === recordId ? { ...prev, status: 'applied' } : prev);
  }, []);

  const dismiss = useCallback(async (recordId) => {
    await contentAdapt.dismiss(recordId);
    setResult((prev) => prev?._id === recordId ? { ...prev, status: 'dismissed' } : prev);
  }, []);

  return { recommend, apply, dismiss, loading, result, error };
}
