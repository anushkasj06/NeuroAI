/**
 * InterviewPrepare.jsx — Light theme, matches app design system
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CpuChipIcon, MicrophoneIcon, SparklesIcon,
  CheckCircleIcon, XCircleIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import './AIDashboard.css';

const STEPS = [
  { key: 'fetch',     label: 'Loading interview details',         icon: CpuChipIcon },
  { key: 'questions', label: 'Generating AI interview questions', icon: SparklesIcon },
  { key: 'vapi',      label: 'Setting up voice interviewer',      icon: MicrophoneIcon },
  { key: 'done',      label: 'Everything is ready!',             icon: CheckCircleIcon },
];

export default function InterviewPrepare() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError]             = useState('');
  const [interview, setInterview]     = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [vapiReady, setVapiReady]     = useState(false);

  useEffect(() => { run(); }, [id]);

  const run = async () => {
    try {
      setError('');
      setCurrentStep(0);
      const fetchRes = await interviewApi.getOne(id);
      const iv = fetchRes.data.data.interview;
      setInterview(iv);

      if ((iv.status === 'ready' || iv.status === 'in_progress') && iv.vapiAssistantId) {
        setCurrentStep(3);
        setQuestionCount((iv.generatedQuestions || []).length);
        setVapiReady(true);
        setTimeout(() => navigate(`/interview/${id}/room`), 1500);
        return;
      }

      setCurrentStep(1);
      await new Promise(r => setTimeout(r, 300));
      setCurrentStep(2);

      const prepRes = await interviewApi.prepare(id);
      const { questionsCount, vapiReady: vr } = prepRes.data.data;
      setQuestionCount(questionsCount || 0);
      setVapiReady(vr);

      setCurrentStep(3);
      setTimeout(() => navigate(`/interview/${id}/room`), 1800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Preparation failed. Please try again.');
    }
  };

  return (
    <div className="ai-dashboard min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8 ai-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 mb-4">
            <CpuChipIcon className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Preparing Your Interview</h1>
          {interview && (
            <p className="text-sm ai-muted">
              <span className="text-teal-700 font-semibold">{interview.title}</span>
              {' · '}{interview.difficulty} · {interview.durationMinutes} min
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="ai-rail ai-fade-up mb-5" style={{ animationDelay: '0.05s' }}>
          <div className="ai-panel__body space-y-4">
            {STEPS.map(({ key, label, icon: Icon }, idx) => {
              const isDone    = idx < currentStep;
              const isCurrent = idx === currentStep && !error;
              const isFailed  = idx === currentStep && !!error;
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone    ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                    isCurrent ? 'bg-teal-50 border-teal-400 text-teal-600' :
                    isFailed  ? 'bg-rose-50 border-rose-400 text-rose-600' :
                                'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {isDone ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : isFailed ? (
                      <XCircleIcon className="h-4 w-4" />
                    ) : isCurrent ? (
                      <span className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      isDone    ? 'text-emerald-700' :
                      isCurrent ? 'text-slate-800' :
                      isFailed  ? 'text-rose-700' : 'text-slate-400'
                    }`}>{label}</p>
                    {isDone && idx === 2 && <p className="text-xs text-slate-400 mt-0.5">{vapiReady ? 'Voice AI ready' : 'Inline config ready'}</p>}
                    {isDone && idx === 1 && questionCount > 0 && <p className="text-xs text-slate-400 mt-0.5">{questionCount} questions generated</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm mb-4 ai-fade-up">
            <p className="font-semibold mb-1">Preparation failed</p>
            <p>{error}</p>
          </div>
        )}

        {error && (
          <div className="flex gap-3 ai-fade-up">
            <button onClick={run} className="ai-btn ai-btn--primary flex-1 justify-center">Retry</button>
            <button onClick={() => navigate('/interview')} className="ai-btn flex-1 justify-center">Dashboard</button>
          </div>
        )}

        {currentStep === 3 && !error && (
          <div className="text-center ai-fade-up">
            <p className="text-emerald-600 text-sm font-medium mb-3 flex items-center justify-center gap-1.5">
              <CheckCircleIcon className="h-4 w-4" /> Entering interview room…
            </p>
            <button onClick={() => navigate(`/interview/${id}/room`)} className="ai-btn ai-btn--primary">
              Enter Room <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
