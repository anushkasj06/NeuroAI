/**
 * InterviewPrepare.jsx — Light theme
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CpuChipIcon, MicrophoneIcon, SparklesIcon,
  CheckCircleIcon, XCircleIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';

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
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg,#f0f9ff 0%,#ffffff 60%,#f1f5f9 100%)' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-blue-50 border border-blue-200 p-5 mb-5">
            <CpuChipIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Preparing Your Interview</h1>
          {interview && (
            <p className="text-slate-500 text-sm">
              <span className="text-blue-600 font-medium">{interview.title}</span>
              {' · '}{interview.difficulty} · {interview.durationMinutes} min
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 mb-6 shadow-sm">
          {STEPS.map(({ key, label, icon: Icon }, idx) => {
            const isDone    = idx < currentStep;
            const isCurrent = idx === currentStep && !error;
            const isFailed  = idx === currentStep && !!error;
            return (
              <div key={key} className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone    ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                  isCurrent ? 'bg-blue-50 border-blue-400 text-blue-600' :
                  isFailed  ? 'bg-rose-50 border-rose-400 text-rose-600' :
                              'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  {isDone ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : isFailed ? (
                    <XCircleIcon className="h-5 w-5" />
                  ) : isCurrent ? (
                    <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isDone    ? 'text-emerald-700' :
                    isCurrent ? 'text-slate-900' :
                    isFailed  ? 'text-rose-700' :
                                'text-slate-400'
                  }`}>{label}</p>
                  {isDone && idx === 2 && (
                    <p className="text-xs text-slate-400 mt-0.5">{vapiReady ? 'Voice AI ready' : 'Inline config ready'}</p>
                  )}
                  {isDone && idx === 1 && questionCount > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{questionCount} questions generated</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm mb-4">
            <p className="font-medium mb-1">Preparation failed</p>
            <p>{error}</p>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <button onClick={run} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm">Retry</button>
            <button onClick={() => navigate('/interview')} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition text-sm">Dashboard</button>
          </div>
        )}

        {currentStep === 3 && !error && (
          <div className="text-center">
            <p className="text-emerald-600 text-sm font-medium mb-3 flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-4 w-4" />Entering interview room…
            </p>
            <button onClick={() => navigate(`/interview/${id}/room`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm shadow-sm shadow-blue-200"
            >
              Enter Room <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
