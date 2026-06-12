/**
 * useAssessmentMonitor
 * ====================
 * Data-fetching hooks for reading monitoring records from the backend.
 *
 * Exports:
 *   useMonitorRecord(attemptId)  — live record for a running attempt
 *   useMonitorHistory(limit)     — user's past monitoring records
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
      setError(err.response?.data?.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { data, loading, error, refetch: run };
}

export function useMonitorRecord(attemptId) {
  return useFetch(
    () => api.get(`/assessment-monitor/${attemptId}`),
    [attemptId]
  );
}

export function useMonitorHistory(limit = 20) {
  return useFetch(
    () => api.get('/assessment-monitor/history', { params: { limit } }),
    [limit]
  );
}
