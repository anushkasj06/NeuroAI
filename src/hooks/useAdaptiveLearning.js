/**
 * useAdaptiveLearning
 * ===================
 * Hooks for the Adaptive Learning Engine.
 *
 * Exports:
 *   useAdaptiveDashboard()                          – latest record per topic
 *   useAdaptiveTopic(subjectSlug, topic)            – record for one topic
 *   useAdaptiveHistory(subjectSlug, limit)          – full history
 *   useAdaptiveEvaluator()                          – { evaluate, loading, result, error }
 */

import { useState, useEffect, useCallback } from 'react';
import { adaptive } from '../services/api';

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
      setError(err.response?.data?.message || 'Failed to load adaptive data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

// ── Dashboard: latest record per active topic ─────────────────────────────────
export function useAdaptiveDashboard() {
  return useFetch(() => adaptive.getDashboard(), []);
}

// ── Single topic record ───────────────────────────────────────────────────────
export function useAdaptiveTopic(subjectSlug, topic) {
  return useFetch(
    () => adaptive.getTopic(subjectSlug, topic),
    [subjectSlug, topic]
  );
}

// ── History ───────────────────────────────────────────────────────────────────
export function useAdaptiveHistory(subjectSlug = null, limit = 20) {
  return useFetch(
    () => adaptive.getHistory(subjectSlug, limit),
    [subjectSlug, limit]
  );
}

// ── Imperative evaluator (triggered manually after session complete) ───────────
export function useAdaptiveEvaluator() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const evaluate = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await adaptive.evaluate(payload);
      setResult(res.data?.data?.record ?? null);
      return res.data?.data?.record;
    } catch (err) {
      const msg = err.response?.data?.message || 'Evaluation failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const apply   = useCallback(async (recordId) => {
    await adaptive.apply(recordId);
    setResult((prev) => prev?._id === recordId ? { ...prev, status: 'applied' } : prev);
  }, []);

  const dismiss = useCallback(async (recordId) => {
    await adaptive.dismiss(recordId);
    setResult((prev) => prev?._id === recordId ? { ...prev, status: 'dismissed' } : prev);
  }, []);

  return { evaluate, apply, dismiss, loading, result, error };
}
