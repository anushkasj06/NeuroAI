/**
 * InterviewAnalysisPage.jsx — Light theme, matches app design system
 * All logic unchanged — only styling converted from dark slate-900 to light theme.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon, TrophyIcon, ChartBarIcon, LightBulbIcon, BookOpenIcon,
  ArrowTrendingUpIcon, CheckCircleIcon, XCircleIcon, StarIcon,
  CalendarDaysIcon, ClockIcon, PrinterIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import './AIDashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const gradeColor = (g) => {
  if (!g) return 'text-slate-400';
  const u = g.toUpperCase();
  if (u.startsWith('A')) return 'text-emerald-600';
  if (u.startsWith('B')) return 'text-blue-600';
  if (u.startsWith('C')) return 'text-amber-600';
  return 'text-rose-600';
};

const scoreColor = (s) => {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-rose-600';
};

const scoreBorder = (s) => {
  if (s >= 80) return 'border-emerald-200 bg-emerald-50';
  if (s >= 60) return 'border-amber-200 bg-amber-50';
  return 'border-rose-200 bg-rose-50';
};

const verdictBadge = (v) => {
  switch (v) {
    case 'Strong Hire': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'Hire':        return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Weak Hire':   return 'bg-amber-100 text-amber-700 border-amber-300';
    default:            return 'bg-rose-100 text-rose-700 border-rose-300';
  }
};

const TOOLTIP_STYLE = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 8, color: '#0f172a', fontSize: 12,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function InterviewAnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis]   = useState(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [polling, setPolling]     = useState(false);
  const pollRef                   = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalysis = async () => {
    try {
      const res = await interviewApi.getAnalysis(id);
      if (res.status === 202) { setPolling(true); return false; }
      setAnalysis(res.data.data.analysis);
      setInterview(res.data.data.interview);
      setPolling(false);
      return true;
    } catch (err) {
      if (err.response?.status === 202) { setPolling(true); return false; }
      setError(err.response?.data?.message || 'Failed to load analysis.');
      return true;
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAnalysis().then((done) => {
      if (!done) {
        pollRef.current = setInterval(async () => {
          const d = await fetchAnalysis();
          if (d) clearInterval(pollRef.current);
        }, 4000);
      }
    });
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (polling && !analysis) return (
    <div className="ai-dashboard min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md ai-fade-up">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-teal-200 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-300 flex items-center justify-center">
            <ChartBarIcon className="h-10 w-10 text-teal-600 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysing Your Interview</h2>
        <p className="ai-muted mb-1">Our AI is evaluating your performance across all dimensions…</p>
        <p className="text-slate-400 text-sm">This usually takes 15–30 seconds.</p>
        <div className="mt-4 flex justify-center">
          <span className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="ai-dashboard min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md ai-fade-up">
        <XCircleIcon className="h-14 w-14 text-rose-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Not Available</h2>
        <p className="text-rose-600 mb-6 text-sm">{error}</p>
        <button onClick={() => navigate('/interview')} className="ai-btn ai-btn--primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (!analysis) return <LoadingScreen />;

  const radarData = [
    { subject: 'Technical',      score: analysis.scores?.technicalKnowledge?.score || 0 },
    { subject: 'Communication',  score: analysis.scores?.communication?.score || 0 },
    { subject: 'Readiness',      score: analysis.scores?.interviewReadiness?.score || 0 },
    { subject: 'Confidence',     score: analysis.behavioralInsights?.confidenceLevel === 'Very High' ? 90 : analysis.behavioralInsights?.confidenceLevel === 'High' ? 75 : analysis.behavioralInsights?.confidenceLevel === 'Moderate' ? 55 : 35 },
    { subject: 'Problem Solving',score: analysis.scores?.technicalKnowledge?.breakdown?.problemSolving || 0 },
  ];
  const topicData = (analysis.topicAnalysis || []).map((t) => ({ name: t.topic, score: t.score }));
  const TABS = ['overview', 'questions', 'behavioral', 'roadmap', 'resources'];

  return (
    <div className="ai-dashboard min-h-screen">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/interview')}
              className="text-slate-400 hover:text-slate-700 transition flex-shrink-0">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-slate-900 font-semibold text-sm truncate">{interview?.title || 'Interview Analysis'}</h1>
              <p className="text-slate-400 text-xs capitalize truncate">
                {interview?.interviewType} · {interview?.difficulty} · {interview?.topics?.join(', ')}
              </p>
            </div>
          </div>
          <button onClick={() => window.print()} className="ai-btn ai-btn--compact flex-shrink-0">
            <PrinterIcon className="h-4 w-4" /> Save / Print
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto mt-2 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >{tab}</button>
          ))}
        </div>
      </header>

      <div className="ai-shell space-y-6">

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 ai-fade-up">
            {/* Score hero */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className={`col-span-1 border rounded-2xl p-8 text-center ${scoreBorder(analysis.overallScore)}`}>
                <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider font-semibold">Overall Score</p>
                <p className={`text-7xl font-black ${scoreColor(analysis.overallScore)}`}>{analysis.overallScore}</p>
                <p className={`text-3xl font-bold ${gradeColor(analysis.grade)} mt-1`}>{analysis.grade}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-semibold border ${verdictBadge(analysis.verdict)}`}>
                  {analysis.verdict}
                </span>
                <p className="text-slate-500 text-xs mt-4 leading-relaxed">{analysis.executiveSummary}</p>
              </div>
              <div className="col-span-1 lg:col-span-2 ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title"><ChartBarIcon className="h-4 w-4 text-teal-600" />Performance Radar</span>
                </div>
                <div className="ai-panel__body">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(148,163,184,0.25)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <Radar name="Score" dataKey="score" stroke="#0f766e" fill="#0f766e" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(analysis.scores || {}).map(([key, s]) => (
                <div key={key} className={`border rounded-xl p-5 ${scoreBorder(s.score)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-600 text-sm font-semibold">{s.label}</p>
                    <span className={`text-2xl font-black ${scoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(s.breakdown || {}).map(([bk, bv]) => (
                      <div key={bk} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-28 capitalize">{bk.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex-1 bg-slate-200 rounded-full h-1">
                          <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${bv}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{bv}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 italic">{s.comment}</p>
                </div>
              ))}
            </div>

            {/* Topic bar chart */}
            {topicData.length > 0 && (
              <div className="ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title"><ChartBarIcon className="h-4 w-4 text-teal-600" />Topic-wise Performance</span>
                </div>
                <div className="ai-panel__body">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topicData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,118,110,0.06)' }} />
                      <Bar dataKey="score" fill="#0f766e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Topic details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analysis.topicAnalysis || []).map((ta) => (
                <div key={ta.topic} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-slate-800 font-semibold text-sm">{ta.topic}</h4>
                    <span className={`text-lg font-bold ${scoreColor(ta.score)}`}>{ta.score}</span>
                  </div>
                  {ta.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">Strengths</p>
                      <ul className="space-y-0.5">{ta.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                          <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                        </li>
                      ))}</ul>
                    </div>
                  )}
                  {ta.weaknesses?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-rose-600 font-semibold mb-1">Needs Work</p>
                      <ul className="space-y-0.5">{ta.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                          <XCircleIcon className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />{w}
                        </li>
                      ))}</ul>
                    </div>
                  )}
                  {ta.missingConcepts?.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-600 font-semibold mb-1">Missing Concepts</p>
                      <div className="flex flex-wrap gap-1">{ta.missingConcepts.map((c) => (
                        <span key={c} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">{c}</span>
                      ))}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <h3 className="text-emerald-700 font-semibold mb-3 flex items-center gap-2 text-sm">
                  <StarIcon className="h-4 w-4" />Top Strengths
                </h3>
                <ul className="space-y-2">{(analysis.strengths || []).map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                  </li>
                ))}</ul>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
                <h3 className="text-rose-700 font-semibold mb-3 flex items-center gap-2 text-sm">
                  <LightBulbIcon className="h-4 w-4" />Areas to Improve
                </h3>
                <ul className="space-y-2">{(analysis.weaknesses || []).map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />{w}
                  </li>
                ))}</ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: QUESTIONS ── */}
        {activeTab === 'questions' && (
          <div className="space-y-4 ai-fade-up">
            <h2 className="text-slate-900 font-bold text-lg">Question-by-Question Analysis</h2>
            {(analysis.questionEvaluations || []).map((qe, idx) => {
              const evalCls = {
                Excellent:    'text-emerald-700 bg-emerald-50 border-emerald-200',
                Good:         'text-blue-700 bg-blue-50 border-blue-200',
                Adequate:     'text-amber-700 bg-amber-50 border-amber-200',
                'Needs Work': 'text-orange-700 bg-orange-50 border-orange-200',
                'No Answer':  'text-rose-700 bg-rose-50 border-rose-200',
              };
              return (
                <div key={qe.questionId || idx} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 mr-1">Q{idx + 1}</span>
                      <span className="text-slate-800 font-medium text-sm">{qe.question}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${evalCls[qe.evaluation] || evalCls.Adequate}`}>{qe.evaluation}</span>
                      <span className={`text-lg font-bold ${scoreColor(qe.score)}`}>{qe.score}</span>
                    </div>
                  </div>
                  {qe.candidateAnswerSummary && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3 text-sm text-slate-500 italic">
                      "{qe.candidateAnswerSummary}"
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {qe.strengths?.length > 0 && (
                      <div>
                        <p className="text-emerald-600 mb-1 font-semibold">Did Well</p>
                        <ul className="space-y-0.5">{qe.strengths.map((s, i) => (
                          <li key={i} className="text-slate-600 flex gap-1">
                            <CheckCircleIcon className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                          </li>
                        ))}</ul>
                      </div>
                    )}
                    {qe.improvements?.length > 0 && (
                      <div>
                        <p className="text-amber-600 mb-1 font-semibold">Should Add</p>
                        <ul className="space-y-0.5">{qe.improvements.map((s, i) => (
                          <li key={i} className="text-slate-600 flex gap-1">
                            <ArrowTrendingUpIcon className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />{s}
                          </li>
                        ))}</ul>
                      </div>
                    )}
                    {qe.missedConcepts?.length > 0 && (
                      <div>
                        <p className="text-rose-600 mb-1 font-semibold">Missed Concepts</p>
                        <div className="flex flex-wrap gap-1">{qe.missedConcepts.map((c) => (
                          <span key={c} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">{c}</span>
                        ))}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: BEHAVIORAL ── */}
        {activeTab === 'behavioral' && (
          <div className="space-y-5 ai-fade-up">
            <h2 className="text-slate-900 font-bold text-lg">Behavioral Insights</h2>
            {analysis.behavioralInsights && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Nervousness',         value: analysis.behavioralInsights.nervousnessLevel },
                  { label: 'Confidence',          value: analysis.behavioralInsights.confidenceLevel },
                  { label: 'Communication Style', value: analysis.behavioralInsights.communicationStyle },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border border-slate-100 rounded-xl p-5 text-center shadow-sm">
                    <p className="text-slate-400 text-xs font-semibold uppercase mb-2">{label}</p>
                    <p className="text-slate-800 font-bold text-base capitalize">{value}</p>
                  </div>
                ))}
                {analysis.behavioralInsights.strongAreas?.length > 0 && (
                  <div className="col-span-2 md:col-span-3 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                    <p className="text-emerald-700 font-semibold mb-2 text-sm">Strong Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.behavioralInsights.strongAreas.map((s) => (
                        <span key={s} className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.behavioralInsights.overallPersonality && (
                  <div className="col-span-2 md:col-span-3 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-400 text-xs font-semibold uppercase mb-1">Overall Impression</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{analysis.behavioralInsights.overallPersonality}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ROADMAP ── */}
        {activeTab === 'roadmap' && analysis.improvementRoadmap && (
          <div className="space-y-5 ai-fade-up">
            <h2 className="text-slate-900 font-bold text-lg">Improvement Roadmap</h2>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
              <h3 className="text-rose-700 font-semibold mb-3 flex items-center gap-2 text-sm">
                <CalendarDaysIcon className="h-4 w-4" />This Week — Immediate Actions
              </h3>
              <ul className="space-y-2">{(analysis.improvementRoadmap.immediate || []).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-rose-500 font-bold flex-shrink-0">{i + 1}.</span>{item}
                </li>
              ))}</ul>
            </div>
            {analysis.improvementRoadmap.sevenDay && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-amber-700 font-semibold mb-1 flex items-center gap-2 text-sm">
                  <ClockIcon className="h-4 w-4" />7-Day Plan
                </h3>
                <p className="text-slate-500 text-sm mb-3 italic">{analysis.improvementRoadmap.sevenDay.goal}</p>
                <ul className="space-y-1">{(analysis.improvementRoadmap.sevenDay.tasks || []).map((t, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-1.5">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />{t}
                  </li>
                ))}</ul>
              </div>
            )}
            {analysis.improvementRoadmap.thirtyDay && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                <h3 className="text-indigo-700 font-semibold mb-1 flex items-center gap-2 text-sm">
                  <TrophyIcon className="h-4 w-4" />30-Day Mastery Plan
                </h3>
                <p className="text-slate-500 text-sm mb-3 italic">{analysis.improvementRoadmap.thirtyDay.goal}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(analysis.improvementRoadmap.thirtyDay.milestones || []).map((m, i) => (
                    <div key={i} className="bg-white border border-indigo-100 rounded-lg p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-400 mb-1 font-semibold">Week {i + 1}</p>
                      <p className="text-sm text-slate-700">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(analysis.practiceQuestions || []).length > 0 && (
              <div className="ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title"><BookOpenIcon className="h-4 w-4 text-teal-600" />Practice These Questions</span>
                </div>
                <div className="ai-panel__body space-y-3">
                  {analysis.practiceQuestions.map((pq, i) => (
                    <div key={i} className="border-l-2 border-teal-300 pl-4 py-1">
                      <p className="text-sm text-slate-800">{pq.question}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{pq.topic}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">{pq.difficulty}</span>
                      </div>
                      {pq.hint && <p className="text-xs text-teal-600 mt-1 italic">Hint: {pq.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RESOURCES ── */}
        {activeTab === 'resources' && (
          <div className="space-y-4 ai-fade-up">
            <h2 className="text-slate-900 font-bold text-lg">Recommended Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analysis.recommendedResources || []).map((r, i) => {
                const typeCls = {
                  book:     'bg-amber-50 text-amber-700',
                  course:   'bg-blue-50 text-blue-700',
                  video:    'bg-rose-50 text-rose-700',
                  practice: 'bg-emerald-50 text-emerald-700',
                  website:  'bg-violet-50 text-violet-700',
                };
                return (
                  <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-slate-800 font-semibold text-sm">{r.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold capitalize ${typeCls[r.type] || 'bg-slate-100 text-slate-500'}`}>{r.type}</span>
                    </div>
                    <p className="text-slate-500 text-sm mb-3">{r.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-semibold ${
                        r.priority === 'high'   ? 'bg-rose-50 text-rose-700' :
                        r.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                                                   'bg-slate-100 text-slate-500'
                      }`}>{r.priority} priority</span>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:text-teal-700 underline transition">
                          Open →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 flex gap-3 justify-center flex-wrap">
          <button onClick={() => navigate('/interview/schedule')} className="ai-btn ai-btn--primary">
            Schedule Next Interview
          </button>
          <button onClick={() => navigate('/interview')} className="ai-btn">
            View All Interviews
          </button>
        </div>

      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="ai-dashboard min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="block w-10 h-10 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading analysis…</p>
      </div>
    </div>
  );
}
