import { useState, useEffect } from 'react';
import { useDiagnosticFlow } from '../hooks/useDiagnosticFlow';
import { diagnostic } from '../services/diagnosticApi';
import api, { getApiErrorMessage, API_BASE } from '../services/api';
import ProgressStepper from '../components/diagnostic/ProgressStepper';
import OnboardingForm from '../components/diagnostic/OnboardingForm';
import ModalityAssessment from '../components/diagnostic/ModalityAssessment';
import InteractiveAssessment from '../components/diagnostic/InteractiveAssessment';
import AssessmentAnalyzing from '../components/diagnostic/AssessmentAnalyzing';
import DiagnosticReportView from '../components/diagnostic/DiagnosticReportView';

function ContentLoadingPlaceholder({ label }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-600 font-medium">Loading {label}…</p>
    </div>
  );
}

export default function Diagnostic() {
  const {
    step,
    setStep,
    loading,
    error,
    setError,
    assessmentContent,
    report,
    refreshAfterSubmit,
    loadReport,
  } = useDiagnosticFlow();

  const [submitting, setSubmitting] = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleModalitySubmit = async (mode, payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const fn =
        mode === 'text'
          ? diagnostic.submitTextAssessment
          : mode === 'audio'
            ? diagnostic.submitAudioAssessment
            : mode === 'video'
              ? diagnostic.submitVideoAssessment
              : diagnostic.submitInteractiveAssessment;
      const res = await fn(payload);
      const next = res.data.data.nextStep;
      if (next === 'analyze') {
        setStep('analyze');
      } else {
        await refreshAfterSubmit(next);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit assessment'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            NeuroLearn Diagnostic Assessment
          </h1>
          <p className="text-gray-600 mt-2">
            Smart onboarding and multi-modal learning analysis
          </p>
        </div>

        <ProgressStepper currentStep={step} />

        {backendOk === false && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
            Cannot reach backend at <strong>{API_BASE}</strong>. Run{' '}
            <code className="bg-amber-100 px-1 rounded">cd backend && npm start</code>, then refresh.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {step === 'onboarding' && (
          <OnboardingForm
            onComplete={(nextStep) => refreshAfterSubmit(nextStep || 'text')}
            onError={setError}
          />
        )}

        {step === 'text' && (
          assessmentContent?.text ? (
            <ModalityAssessment
              mode="text"
              content={assessmentContent.text}
              loading={submitting}
              onSubmit={(p) => handleModalitySubmit('text', p)}
            />
          ) : (
            <ContentLoadingPlaceholder label="Text Assessment" />
          )
        )}

        {step === 'audio' && (
          assessmentContent?.audio ? (
            <ModalityAssessment
              mode="audio"
              content={assessmentContent.audio}
              loading={submitting}
              onSubmit={(p) => handleModalitySubmit('audio', p)}
            />
          ) : (
            <ContentLoadingPlaceholder label="Audio Assessment" />
          )
        )}

        {step === 'video' && (
          assessmentContent?.video ? (
            <ModalityAssessment
              mode="video"
              content={assessmentContent.video}
              loading={submitting}
              onSubmit={(p) => handleModalitySubmit('video', p)}
            />
          ) : (
            <ContentLoadingPlaceholder label="Video Assessment" />
          )
        )}

        {step === 'interactive' && (
          assessmentContent?.interactive ? (
            <InteractiveAssessment
              content={assessmentContent.interactive}
              loading={submitting}
              onSubmit={(p) => handleModalitySubmit('interactive', p)}
            />
          ) : (
            <ContentLoadingPlaceholder label="Interactive Assessment" />
          )
        )}

        {step === 'analyze' && (
          <AssessmentAnalyzing
            onComplete={loadReport}
            onError={setError}
          />
        )}

        {step === 'report' && report && <DiagnosticReportView data={report} />}

        {step === 'report' && !report && !loading && (
          <div className="text-center bg-white rounded-2xl p-8 shadow">
            <p className="text-gray-600 mb-4">No report yet. Complete all assessments.</p>
            <button
              type="button"
              onClick={() => setStep('onboarding')}
              className="text-indigo-600 font-medium"
            >
              Start diagnostic
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
