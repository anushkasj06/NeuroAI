/**
 * useAttentionAnalytics
 *
 * Fetches and normalises attention analytics data from the backend.
 * Used in the AIDashboard and any analytics panel.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useAttentionAnalytics(7);
 */

import { useState, useEffect, useCallback } from 'react';
import { attention } from '../services/api';

export function useAttentionAnalytics(days = 7) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attention.getAnalytics(days);
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attention analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * useSessionAttention
 *
 * Fetches all AttentionSnapshots for a completed or active session.
 *
 * Usage:
 *   const { snapshots, summary, loading } = useSessionAttention(sessionId);
 */
export function useSessionAttention(sessionId) {
  const [snapshots, setSnapshots] = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await attention.getSessionAttention(sessionId);
      const d = res.data?.data || {};
      setSnapshots(d.snapshots || []);
      setSummary(d.summary   || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load session attention data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { snapshots, summary, loading, error, refetch: fetchData };
}
