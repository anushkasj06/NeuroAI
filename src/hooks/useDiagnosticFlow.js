import { useState, useEffect, useCallback } from 'react';
import { diagnostic } from '../services/diagnosticApi';

const STEP_ORDER = ['onboarding', 'text', 'audio', 'video', 'interactive', 'analyze', 'report'];
const CONTENT_STEPS = ['text', 'audio', 'video', 'interactive', 'analyze'];

export function useDiagnosticFlow() {
  const [step, setStep] = useState('onboarding');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [assessmentContent, setAssessmentContent] = useState(null);
  const [report, setReport] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnostic.getStatus();
      const currentStep = res.data.data.step || 'onboarding';
      setStep(currentStep);
      setStatusData(res.data.data);

      // Fetch assessment content for all modality steps
      if (CONTENT_STEPS.includes(currentStep)) {
        try {
          const contentRes = await diagnostic.getAssessmentContent();
          setAssessmentContent(contentRes.data.data);
        } catch {
          // Content fetch failed — keep existing content if any
        }
      }

      if (currentStep === 'report') {
        const reportRes = await diagnostic.getReport();
        setReport(reportRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load diagnostic status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const goToStep = (next) => {
    if (STEP_ORDER.includes(next)) setStep(next);
  };

  /**
   * Called after a modality is submitted.
   * Re-fetches status (which also re-fetches content for the next step),
   * then overrides the step if a specific nextStep is provided.
   */
  const refreshAfterSubmit = async (nextStep) => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnostic.getStatus();
      const backendStep = res.data.data.step || 'onboarding';
      setStatusData(res.data.data);

      // Determine which step to show — prefer the explicitly passed nextStep
      const targetStep = nextStep || backendStep;

      // Always (re-)fetch content when moving to a modality step
      if (CONTENT_STEPS.includes(targetStep)) {
        try {
          const contentRes = await diagnostic.getAssessmentContent();
          setAssessmentContent(contentRes.data.data);
        } catch {
          // Keep existing content
        }
      }

      if (targetStep === 'report') {
        const reportRes = await diagnostic.getReport();
        setReport(reportRes.data.data);
      }

      setStep(targetStep);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refresh status');
      // Still advance the step so the user isn't stuck
      if (nextStep) setStep(nextStep);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      const reportRes = await diagnostic.getReport();
      setReport(reportRes.data.data);
      setStep('report');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    }
  };

  return {
    step,
    setStep,
    goToStep,
    loading,
    error,
    setError,
    statusData,
    assessmentContent,
    report,
    loadStatus,
    refreshAfterSubmit,
    loadReport,
  };
}
