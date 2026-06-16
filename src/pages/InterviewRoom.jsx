/**
 * InterviewRoom.jsx — Light theme, real Vapi voice call
 *
 * Flow:
 *  1. /start → gets assistantConfig (inline) or vapiAssistantId
 *  2. "Start Interview" → new Vapi(PUBLIC_KEY) → vapi.start(config)
 *  3. Voice call begins — student speaks naturally, AI responds via speaker
 *  4. Live transcript streams in via 'message' events
 *  5. End → backend analyses transcript → navigate to /analysis
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MicrophoneIcon, SpeakerWaveIcon, PauseIcon, PlayIcon, StopIcon,
  ClockIcon, CheckCircleIcon, ChatBubbleLeftRightIcon, ArrowTrendingUpIcon,
  XCircleIcon, SignalIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview]       = useState(null);
  const [questions, setQuestions]       = useState([]);
  const [assistantId, setAssistantId]   = useState(null); // string ID or config object

  // 'idle'|'requesting_mic'|'connecting'|'active'|'muted'|'ended'|'error'
  const [callStatus, setCallStatus]     = useState('idle');
  const [muted, setMuted]               = useState(false);

  const [aiSpeaking, setAiSpeaking]     = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiVolume, setAiVolume]         = useState(0);

  const [transcript, setTranscript]     = useState([]);
  const [partialUser, setPartialUser]   = useState('');
  const [partialAi, setPartialAi]       = useState('');
  const transcriptEndRef                = useRef(null);

  const [questionIndex, setQuestionIndex]   = useState(0);
  const [topicsCovered, setTopicsCovered]   = useState([]);
  const [confidenceScore, setConfidenceScore] = useState(70);
  const [pauseCount, setPauseCount]         = useState(0);
  const [pauseStart, setPauseStart]         = useState(null);
  const [totalPauseMs, setTotalPauseMs]     = useState(0);

  const [elapsed, setElapsed]   = useState(0);
  const timerRef                = useRef(null);
  const animRef                 = useRef(null);
  const vapiRef                 = useRef(null);

  const [loading, setLoading]       = useState(true);
  const [endLoading, setEndLoading] = useState(false);
  const [error, setError]           = useState('');
  const [vapiError, setVapiError]   = useState('');
  const [endConfirm, setEndConfirm] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await interviewApi.start(id);
        const data = res.data.data;
        setInterview(data.interview);
        setQuestions(data.questions || []);
        setAssistantId(data.vapiAssistantId || data.assistantConfig || null);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load interview.');
        setLoading(false);
      }
    })();
    return () => { clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); };
  }, [id]);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript, partialUser, partialAi]);

  // ── Start call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setVapiError('VITE_VAPI_PUBLIC_KEY is missing from your root .env. Add it and restart Vite.');
      return;
    }
    if (!assistantId) {
      setVapiError('Interview configuration not loaded yet. Please refresh the page.');
      return;
    }

    setCallStatus('requesting_mic');
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch {
      setCallStatus('error');
      setVapiError('Microphone access denied. Please allow microphone in your browser and try again.');
      return;
    }

    setCallStatus('connecting');
    try {
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setCallStatus('active');
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      });
      vapi.on('call-end', () => {
        clearInterval(timerRef.current);
        setCallStatus('ended');
        setAiSpeaking(false);
        setUserSpeaking(false);
      });
      vapi.on('speech-start', () => { setAiSpeaking(true); setUserSpeaking(false); });
      vapi.on('speech-end',   () => { setAiSpeaking(false); setPartialAi(''); });
      vapi.on('volume-level', v => setAiVolume(v));

      vapi.on('message', msg => {
        if (msg.type === 'transcript') {
          const role    = msg.role === 'assistant' ? 'ai' : 'user';
          const text    = msg.transcript || '';
          const isFinal = msg.transcriptType === 'final';
          if (!text.trim()) return;

          if (isFinal) {
            const entry = { role, message: text.trim(), timestamp: new Date().toISOString() };
            setTranscript(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === role && last?.message === text.trim()) return prev;
              return [...prev, entry];
            });
            if (role === 'user') { setPartialUser(''); setUserSpeaking(false); }
            else setPartialAi('');

            interviewApi.appendTranscript(id, { role, message: text.trim(), timestamp: entry.timestamp }).catch(() => {});

            if (role === 'ai') {
              setQuestionIndex(qi => Math.min(qi + 1, questions.length - 1));
              if (interview?.topics) {
                const lower = text.toLowerCase();
                interview.topics.forEach(t => {
                  if (lower.includes(t.toLowerCase()))
                    setTopicsCovered(prev => [...new Set([...prev, t])]);
                });
              }
            }
            if (role === 'user') {
              const words = text.split(/\s+/).filter(Boolean).length;
              setConfidenceScore(prev => Math.min(95, prev + Math.min(words * 0.3, 5)));
              setUserSpeaking(true);
              setTimeout(() => setUserSpeaking(false), 1500);
            }
          } else {
            if (role === 'user') { setPartialUser(text); setUserSpeaking(true); }
            else setPartialAi(text);
          }
        }
      });

      vapi.on('error', err => {
        const msg = err?.error?.message || err?.message || JSON.stringify(err);
        setVapiError(`Voice error: ${msg}`);
        setCallStatus('error');
        clearInterval(timerRef.current);
      });
      vapi.on('call-start-failed', evt => {
        setVapiError(`Call failed: ${evt?.error || 'unknown'}. Check your Vapi key and OpenAI provider key in Vapi dashboard.`);
        setCallStatus('error');
      });

      await vapi.start(assistantId);
    } catch (err) {
      setVapiError(err.message || 'Failed to connect. Check console for details.');
      setCallStatus('error');
    }
  }, [assistantId, id, interview, questions]);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted;
    vapiRef.current.setMuted(next);
    setMuted(next);
    setCallStatus(next ? 'muted' : 'active');
  }, [muted]);

  const endInterview = useCallback(async () => {
    if (endLoading) return;
    setEndLoading(true);
    clearInterval(timerRef.current);
    if (vapiRef.current) try { vapiRef.current.stop(); } catch {}
    try {
      await interviewApi.end(id, {
        confidenceScore: Math.round(confidenceScore),
        pauseCount, totalPauseDurationMs: totalPauseMs,
      });
    } catch {}
    navigate(`/interview/${id}/analysis`);
  }, [id, confidenceScore, pauseCount, totalPauseMs, endLoading, navigate]);

  const retryCall = () => {
    if (vapiRef.current) try { vapiRef.current.stop(); } catch {}
    vapiRef.current = null;
    setVapiError('');
    setCallStatus('idle');
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQuestion = questions[questionIndex];
  const progress        = questions.length > 0 ? Math.round(((questionIndex + 1) / questions.length) * 100) : 0;
  const timeLimit       = (interview?.durationMinutes || 30) * 60;
  const isOverTime      = elapsed > timeLimit;

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <span className="block w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading interview room…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <XCircleIcon className="h-14 w-14 text-rose-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Cannot Enter Room</h2>
        <p className="text-rose-600 mb-6 text-sm">{error}</p>
        <button onClick={() => navigate('/interview')} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm">Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)' }}>

      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 flex flex-col gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            callStatus === 'active' || callStatus === 'muted' ? 'bg-emerald-500 animate-pulse' :
            callStatus === 'connecting' || callStatus === 'requesting_mic' ? 'bg-amber-400 animate-pulse' :
            callStatus === 'ended' ? 'bg-slate-400' :
            callStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'
          }`} />
          <span className="text-slate-800 font-semibold text-sm truncate">{interview?.title || 'AI Interview'}</span>
          <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full capitalize">{interview?.difficulty}</span>
          <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full capitalize">{interview?.interviewType}</span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:gap-5">
          <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${
            isOverTime ? 'text-rose-500' : elapsed > timeLimit * 0.8 ? 'text-amber-500' : 'text-slate-700'
          }`}>
            <ClockIcon className="h-4 w-4" />
            {(callStatus === 'active' || callStatus === 'muted' || callStatus === 'ended') ? formatTime(elapsed) : '--:--'}
            {(callStatus === 'active' || callStatus === 'muted') && (
              <span className="text-slate-400 font-normal"> / {formatTime(timeLimit)}</span>
            )}
          </div>
          {(callStatus === 'active' || callStatus === 'muted') && (
            <div className="flex items-center gap-1.5">
              <SignalIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Live</span>
            </div>
          )}
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-1.5 text-amber-500 text-xs">
              <span className="w-3.5 h-3.5 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />Connecting…
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">

        {/* LEFT: Avatar + Current Question */}
        <aside className="w-full flex-shrink-0 bg-white border-b border-slate-200 flex flex-col p-4 gap-4 overflow-y-auto lg:w-72 lg:border-b-0 lg:border-r">

          {/* AI Avatar */}
          <div className="text-center py-3">
            <div className={`relative mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-3 transition-all duration-200 ${
              aiSpeaking
                ? 'bg-blue-50 ring-4 ring-blue-300 shadow-lg shadow-blue-100'
                : 'bg-slate-100 ring-2 ring-slate-200'
            }`}>
              {aiSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full ring-4 ring-blue-300/40 animate-ping" />
                  <span className="absolute inset-0 rounded-full ring-8 ring-blue-200/20 animate-ping" style={{ animationDelay: '0.25s' }} />
                </>
              )}
              {aiSpeaking ? (
                <div className="flex items-end gap-[3px] h-8">
                  {[0.4,0.7,1,0.7,0.4].map((h, i) => (
                    <div key={i} className="w-[5px] bg-blue-500 rounded-full animate-pulse"
                      style={{ height: `${Math.max(4, h * (20 + aiVolume * 20))}px`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : (
                <SpeakerWaveIcon className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <p className="text-slate-800 font-semibold text-sm">AI Interviewer</p>
            <p className={`text-xs mt-1 font-medium ${
              aiSpeaking       ? 'text-blue-600' :
              userSpeaking     ? 'text-emerald-600' :
              callStatus === 'muted'      ? 'text-rose-500' :
              callStatus === 'active'     ? 'text-slate-400' :
              callStatus === 'connecting' ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {aiSpeaking           ? '🔊 Speaking…' :
               callStatus === 'muted'     ? '🔇 Your mic is muted' :
               userSpeaking              ? '🎙 Listening…' :
               callStatus === 'active'   ? 'Waiting for your answer…' :
               callStatus === 'connecting' ? 'Connecting…' :
               callStatus === 'ended'    ? '✅ Interview complete' :
                                            'Ready to start'}
            </p>
          </div>

          {/* Mic status */}
          {callStatus === 'active' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              userSpeaking ? 'bg-emerald-50 border-emerald-300' :
              muted        ? 'bg-rose-50 border-rose-200' :
                             'bg-slate-50 border-slate-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${userSpeaking ? 'bg-emerald-500 animate-pulse' : muted ? 'bg-rose-400' : 'bg-slate-300'}`} />
              <MicrophoneIcon className={`h-4 w-4 ${userSpeaking ? 'text-emerald-500' : muted ? 'text-rose-400' : 'text-slate-400'}`} />
              <span className={`text-xs font-medium ${userSpeaking ? 'text-emerald-700' : muted ? 'text-rose-600' : 'text-slate-500'}`}>
                {muted ? 'Muted' : userSpeaking ? 'Speaking…' : 'Microphone on'}
              </span>
            </div>
          )}

          {/* Current question */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex-1">
            <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold mb-2">Current Question</p>
            {currentQuestion ? (
              <>
                <p className="text-slate-800 text-sm leading-relaxed">{currentQuestion.question}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize font-medium">
                    {currentQuestion.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                    {currentQuestion.difficulty}
                  </span>
                </div>
                {currentQuestion.expectedConcepts?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-1">Key concepts:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentQuestion.expectedConcepts.slice(0, 4).map(c => (
                        <span key={c} className="text-xs text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm italic">
                {callStatus === 'idle' ? 'Press Start to begin.' : 'Interview complete.'}
              </p>
            )}
          </div>
        </aside>

        {/* CENTER: Transcript */}
        <main className="relative flex min-h-[60vh] flex-1 flex-col overflow-hidden bg-slate-50/50">

          {/* Error banner */}
          {vapiError && (
            <div className="flex-shrink-0 flex items-start gap-3 bg-rose-50 border-b border-rose-200 px-5 py-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-rose-700 text-sm">{vapiError}</p>
              <button onClick={retryCall} className="flex-shrink-0 text-xs text-rose-600 hover:text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1 rounded-lg transition font-medium">Retry</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 sm:p-6">
            {transcript.length === 0 && !partialAi && !partialUser && callStatus === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-slate-700 text-lg font-semibold mb-1">Ready to start</p>
                <p className="text-slate-400 text-sm max-w-xs">
                  Press <strong className="text-blue-600">Start Interview</strong> below. The AI will greet you and begin asking questions through your speakers.
                </p>
                <p className="text-slate-300 text-xs mt-3">Ensure your microphone and speakers are working.</p>
              </div>
            )}

            {transcript.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  msg.role === 'ai'
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {msg.role === 'ai' ? 'AI' : 'You'}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
                  msg.role === 'ai'
                    ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                    : 'bg-blue-600 text-white rounded-tr-sm'
                }`}>
                  {msg.message}
                  <p className={`text-[10px] opacity-50 mt-1 text-right ${msg.role === 'user' ? 'text-white' : 'text-slate-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Live AI caption */}
            {partialAi && (
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-600">AI</div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-blue-200 text-slate-600 text-sm italic shadow-sm sm:max-w-[70%]">
                  {partialAi}<span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Live user caption */}
            {partialUser && (
              <div className="flex gap-3 items-start flex-row-reverse">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-600">You</div>
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 bg-blue-500/90 text-white text-sm italic shadow-sm sm:max-w-[70%]">
                  {partialUser}<span className="inline-block w-1.5 h-4 bg-white ml-1 animate-pulse rounded-sm opacity-80" />
                </div>
              </div>
            )}

            {/* AI thinking dots */}
            {callStatus === 'active' && !aiSpeaking && transcript.length > 0 && !partialAi && !partialUser && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-600">AI</div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center h-10 shadow-sm">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Connecting overlay */}
          {(callStatus === 'connecting' || callStatus === 'requesting_mic') && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <span className="block w-12 h-12 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-800 font-semibold mb-1">
                  {callStatus === 'requesting_mic' ? 'Requesting microphone…' : 'Connecting to AI Interviewer…'}
                </p>
                <p className="text-slate-400 text-sm">
                  {callStatus === 'connecting' ? 'Establishing voice connection' : 'Allow microphone access in your browser'}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: Progress */}
        <aside className="w-full flex-shrink-0 bg-white border-t border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto lg:w-64 lg:border-l lg:border-t-0">

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Progress</p>
              <span className="text-xs text-slate-600 font-medium">{questionIndex + 1}/{questions.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Questions</p>
            <div className="space-y-1.5">
              {questions.map((q, idx) => {
                const done = idx < questionIndex, cur = idx === questionIndex;
                return (
                  <div key={q.id || idx} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                    done ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    cur  ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                           'text-slate-400'
                  }`}>
                    {done ? (
                      <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <span className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold ${
                        cur ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>{idx + 1}</span>
                    )}
                    <span className="truncate capitalize">{q.category?.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {topicsCovered.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Covered</p>
              <div className="flex flex-wrap gap-1">
                {topicsCovered.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Confidence</p>
              <span className="text-sm font-bold text-slate-700">{Math.round(confidenceScore)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-amber-400 to-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${confidenceScore}%` }} />
            </div>
          </div>

          {callStatus !== 'idle' && (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                <p className="text-lg font-bold text-slate-700">{transcript.filter(t => t.role === 'user').length}</p>
                <p className="text-[10px] text-slate-400">Responses</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                <p className="text-lg font-bold text-slate-700">{pauseCount}</p>
                <p className="text-[10px] text-slate-400">Pauses</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <footer className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-4 shadow-sm sm:px-6">
        <div className="flex max-w-xl flex-wrap items-center justify-center gap-3 mx-auto sm:gap-4">

          {callStatus === 'idle' && !vapiError && (
            <button onClick={startCall}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all text-base"
            >
              <MicrophoneIcon className="h-6 w-6" />
              Start Voice Interview
            </button>
          )}

          {callStatus === 'error' && (
            <button onClick={retryCall}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-8 py-3.5 rounded-2xl transition text-sm shadow-sm"
            >
              <MicrophoneIcon className="h-5 w-5" />Try Again
            </button>
          )}

          {(callStatus === 'connecting' || callStatus === 'requesting_mic') && (
            <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              {callStatus === 'requesting_mic' ? 'Requesting microphone…' : 'Connecting…'}
            </div>
          )}

          {(callStatus === 'active' || callStatus === 'muted') && (
            <>
              <button onClick={toggleMute}
                className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border-2 transition-all ${
                  muted
                    ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MicrophoneIcon className="h-5 w-5" />
                <span className="text-xs font-medium">{muted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* User speaking indicator */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  userSpeaking ? 'bg-emerald-50 border-emerald-400 shadow-sm shadow-emerald-100' :
                  muted        ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  {userSpeaking ? (
                    <div className="flex items-end gap-0.5 h-5">
                      {[12,20,12].map((h, i) => (
                        <div key={i} className="w-1 bg-emerald-500 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i*100}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <MicrophoneIcon className={`h-5 w-5 ${muted ? 'text-rose-400' : 'text-slate-400'}`} />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${userSpeaking ? 'text-emerald-600' : muted ? 'text-rose-500' : 'text-slate-400'}`}>
                  {userSpeaking ? 'Speaking' : muted ? 'Muted' : 'Mic on'}
                </span>
              </div>

              {!endConfirm ? (
                <button onClick={() => setEndConfirm(true)}
                  className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                >
                  <StopIcon className="h-5 w-5" />
                  <span className="text-xs font-medium">End</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
                  <span className="text-sm text-slate-600 mr-1">End interview?</span>
                  <button onClick={endInterview} disabled={endLoading}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 transition"
                  >{endLoading ? 'Ending…' : 'Yes, End'}</button>
                  <button onClick={() => setEndConfirm(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition"
                  >Cancel</button>
                </div>
              )}
            </>
          )}

          {callStatus === 'ended' && (
            <button onClick={endInterview} disabled={endLoading}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all"
            >
              {endLoading
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                : <><ArrowTrendingUpIcon className="h-5 w-5" />View My Analysis</>}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
