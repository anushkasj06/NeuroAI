import { useState, useEffect, useCallback } from 'react';
import { diagnostic } from '../services/diagnosticApi';

const STEP_ORDER = ['onboarding', 'text', 'audio', 'video', 'analyze', 'report'];

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

      if (['text', 'audio', 'video', 'analyze'].includes(currentStep)) {
        const contentRes = await diagnostic.getAssessmentContent();
        setAssessmentContent(contentRes.data.data);
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

  const refreshAfterSubmit = async (nextStep) => {
    await loadStatus();
    if (nextStep) setStep(nextStep);
  };

  const loadReport = async () => {
    const reportRes = await diagnostic.getReport();
    setReport(reportRes.data.data);
    setStep('report');
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
