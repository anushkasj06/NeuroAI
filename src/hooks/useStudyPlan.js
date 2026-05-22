import { useState, useEffect, useCallback } from 'react';
import { studyPlanApi } from '../services/studyPlanApi';

export function useStudyPlan() {
  const [plan, setPlan] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studyPlanApi.getDashboardAnalytics();
      setAnalytics(res.data.data);
    } catch (err) {
      // 404 means no plan yet — not an error
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivePlan = useCallback(async () => {
    try {
      const res = await studyPlanApi.getActivePlan();
      setPlan(res.data.data.plan);
    } catch {
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadActivePlan();
  }, [loadAnalytics, loadActivePlan]);

  const completeSession = async ({ planId, weekNumber, dayLabel, sessionId }) => {
    try {
      const res = await studyPlanApi.completeSession({ planId, weekNumber, dayLabel, sessionId });
      await loadActivePlan();
      await loadAnalytics();
      return res.data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to complete session');
    }
  };

  const generateRecommendations = async () => {
    try {
      const res = await studyPlanApi.generateRecommendations();
      await loadAnalytics();
      return res.data.data.recommendations;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to generate recommendations');
    }
  };

  const dismissRecommendation = async (id) => {
    await studyPlanApi.dismissRecommendation(id);
    setAnalytics((prev) =>
      prev
        ? {
            ...prev,
            recommendations: prev.recommendations.filter((r) => r._id !== id),
          }
        : prev
    );
  };

  return {
    plan,
    analytics,
    loading,
    error,
    loadAnalytics,
    loadActivePlan,
    completeSession,
    generateRecommendations,
    dismissRecommendation,
    refresh: () => { loadAnalytics(); loadActivePlan(); },
  };
}
