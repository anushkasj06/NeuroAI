/**
 * InterviewAnalysisPage.jsx
 * =========================
 * Displays the full AI-generated analysis and report after an interview.
 *
 * Sections:
 *  - Overall score + verdict
 *  - Radar chart (Technical / Communication / Readiness)
 *  - Topic-wise breakdown
 *  - Question evaluations
 *  - Strengths & Weaknesses
 *  - Behavioral insights
 *  - Improvement roadmap
 *  - Recommended resources
 *  - Practice questions
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrophyIcon,
  ChartBarIcon,
  LightBulbIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CalendarDaysIcon,
  ClockIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const gradeColor = (grade) => {
  if (!grade) return 'text-slate-400';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-emerald-400';
  if (g.startsWith('B')) return 'text-blue-400';
  if (g.startsWith('C')) return 'text-amber-400';
  return 'text-rose-400';
};

const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

const scoreBg = (score) => {
  if (score >= 80) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  if (score >= 60) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
  return 'from-rose-500/20 to-rose-500/5 border-rose-500/30';
};

const verdictBadge = (verdict) => {
  switch (verdict) {
    case 'Strong Hire': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'Hire':        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'Weak Hire':   return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    default:            return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function InterviewAnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalysis = async () => {
    try {
      const res = await interviewApi.getAnalysis(id);
      if (res.status === 202) {
        // Still processing
        setPolling(true);
        return false;
      }
      setAnalysis(res.data.data.analysis);
      setInterview(res.data.data.interview);
      setPolling(false);
      return true;
    } catch (err) {
      if (err.response?.status === 202) {
        setPolling(true);
        return false;
      }
      setError(err.response?.data?.message || 'Failed to load analysis.');
      return true;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis().then((done) => {
      if (!done) {
        // Poll every 4 seconds while analysis is processing
        pollRef.current = setInterval(async () => {
          const done = await fetchAnalysis();
          if (done) clearInterval(pollRef.current);
        }, 4000);
      }
    });
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Loading / Polling ──────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (polling && !analysis) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-400/20 animate-ping" />
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-2 border-indigo-400/40 flex items-center justify-center">
              <ChartBarIcon className="h-12 w-12 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Analysing Your Interview</h2>
          <p className="text-slate-400 mb-2">Our AI is evaluating your performance across all dimensions…</p>
          <p className="text-slate-500 text-sm">This usually takes 15-30 seconds.</p>
          <div className="mt-4 flex justify-center">
            <span className="w-5 h-5 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <XCircleIcon className="h-16 w-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Analysis Not Available</h2>
          <p className="text-rose-300 mb-6">{error}</p>
          <button onClick={() => navigate('/interview')} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return <LoadingScreen />;

  // ── Radar chart data ───────────────────────────────────────────────────────
  const radarData = [
    { subject: 'Technical', score: analysis.scores?.technicalKnowledge?.score || 0 },
    { subject: 'Communication', score: analysis.scores?.communication?.score || 0 },
    { subject: 'Readiness', score: analysis.scores?.interviewReadiness?.score || 0 },
    { subject: 'Confidence', score: analysis.behavioralInsights?.confidenceLevel === 'Very High' ? 90 : analysis.behavioralInsights?.confidenceLevel === 'High' ? 75 : analysis.behavioralInsights?.confidenceLevel === 'Moderate' ? 55 : 35 },
    { subject: 'Problem Solving', score: analysis.scores?.technicalKnowledge?.breakdown?.problemSolving || 0 },
  ];

  // Topic bar chart data
  const topicData = (analysis.topicAnalysis || []).map((t) => ({
    name: t.topic,
    score: t.score,
  }));

  const TABS = ['overview', 'questions', 'behavioral', 'roadmap', 'resources'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/interview')} className="text-slate-400 hover:text-white transition">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white font-semibold">{interview?.title || 'Interview Analysis'}</h1>
              <p className="text-slate-400 text-xs capitalize">
                {interview?.interviewType} · {interview?.difficulty} · {interview?.topics?.join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
          >
            <PrinterIcon className="h-4 w-4" /> Save / Print
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Score hero */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall score */}
              <div className={`col-span-1 bg-gradient-to-br ${scoreBg(analysis.overallScore)} border rounded-2xl p-8 text-center`}>
                <p className="text-slate-300 text-sm mb-2 uppercase tracking-wide">Overall Score</p>
                <p className={`text-7xl font-black ${scoreColor(analysis.overallScore)}`}>{analysis.overallScore}</p>
                <p className={`text-3xl font-bold ${gradeColor(analysis.grade)} mt-1`}>{analysis.grade}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium border ${verdictBadge(analysis.verdict)}`}>
                  {analysis.verdict}
                </span>
                <p className="text-slate-400 text-xs mt-4 leading-relaxed">{analysis.executiveSummary}</p>
              </div>

              {/* Radar chart */}
              <div className="col-span-1 lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Performance Radar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sub scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(analysis.scores || {}).map(([key, s]) => (
                <div key={key} className={`bg-gradient-to-br ${scoreBg(s.score)} border rounded-xl p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-300 text-sm font-medium">{s.label}</p>
                    <span className={`text-2xl font-black ${scoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  {/* breakdown mini bars */}
                  <div className="space-y-1.5">
                    {Object.entries(s.breakdown || {}).map(([bk, bv]) => (
                      <div key={bk} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-28 capitalize">{bk.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-1">
                          <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${bv}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-6 text-right">{bv}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 italic">{s.comment}</p>
                </div>
              ))}
            </div>

            {/* Topic bar chart */}
            {topicData.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Topic-wise Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topicData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                      cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                    />
                    <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Topic details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analysis.topicAnalysis || []).map((ta) => (
                <div key={ta.topic} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">{ta.topic}</h4>
                    <span className={`text-lg font-bold ${scoreColor(ta.score)}`}>{ta.score}</span>
                  </div>
                  {ta.strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-emerald-400 mb-1">Strengths</p>
                      <ul className="space-y-0.5">
                        {ta.strengths.map((s, i) => <li key={i} className="text-xs text-slate-300 flex gap-1.5"><CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {ta.weaknesses?.length > 0 && (
                    <div>
                      <p className="text-xs text-rose-400 mb-1">Needs Work</p>
                      <ul className="space-y-0.5">
                        {ta.weaknesses.map((w, i) => <li key={i} className="text-xs text-slate-300 flex gap-1.5"><XCircleIcon className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />{w}</li>)}
                      </ul>
                    </div>
                  )}
                  {ta.missingConcepts?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-400 mb-1">Missing Concepts</p>
                      <div className="flex flex-wrap gap-1">
                        {ta.missingConcepts.map((c) => <span key={c} className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded">{c}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <h3 className="text-emerald-300 font-semibold mb-3 flex items-center gap-2"><StarIcon className="h-4 w-4" />Top Strengths</h3>
                <ul className="space-y-2">
                  {(analysis.strengths || []).map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5">
                <h3 className="text-rose-300 font-semibold mb-3 flex items-center gap-2"><LightBulbIcon className="h-4 w-4" />Areas to Improve</h3>
                <ul className="space-y-2">
                  {(analysis.weaknesses || []).map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: QUESTIONS ── */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl mb-2">Question-by-Question Analysis</h2>
            {(analysis.questionEvaluations || []).map((qe, idx) => {
              const evalColors = {
                Excellent:   'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
                Good:        'text-blue-300 bg-blue-500/10 border-blue-500/30',
                Adequate:    'text-amber-300 bg-amber-500/10 border-amber-500/30',
                'Needs Work': 'text-orange-300 bg-orange-500/10 border-orange-500/30',
                'No Answer': 'text-rose-300 bg-rose-500/10 border-rose-500/30',
              };
              return (
                <div key={qe.questionId || idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <span className="text-xs text-slate-500 mr-2">Q{idx + 1}</span>
                      <span className="text-white font-medium text-sm">{qe.question}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${evalColors[qe.evaluation] || evalColors.Adequate}`}>{qe.evaluation}</span>
                      <span className={`text-lg font-bold ${scoreColor(qe.score)}`}>{qe.score}</span>
                    </div>
                  </div>

                  {qe.candidateAnswerSummary && (
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-sm text-slate-300 italic">
                      "{qe.candidateAnswerSummary}"
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {qe.strengths?.length > 0 && (
                      <div>
                        <p className="text-emerald-400 mb-1 font-medium">Did Well</p>
                        <ul className="space-y-0.5">{qe.strengths.map((s, i) => <li key={i} className="text-slate-300 flex gap-1"><CheckCircleIcon className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
                      </div>
                    )}
                    {qe.improvements?.length > 0 && (
                      <div>
                        <p className="text-amber-400 mb-1 font-medium">Should Add</p>
                        <ul className="space-y-0.5">{qe.improvements.map((s, i) => <li key={i} className="text-slate-300 flex gap-1"><ArrowTrendingUpIcon className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
                      </div>
                    )}
                    {qe.missedConcepts?.length > 0 && (
                      <div>
                        <p className="text-rose-400 mb-1 font-medium">Missed Concepts</p>
                        <div className="flex flex-wrap gap-1">{qe.missedConcepts.map((c) => <span key={c} className="px-1.5 py-0.5 bg-rose-500/10 text-rose-300 rounded">{c}</span>)}</div>
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
          <div className="space-y-6">
            <h2 className="text-white font-bold text-xl">Behavioral Insights</h2>
            {analysis.behavioralInsights && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Nervousness', value: analysis.behavioralInsights.nervousnessLevel },
                  { label: 'Confidence', value: analysis.behavioralInsights.confidenceLevel },
                  { label: 'Communication Style', value: analysis.behavioralInsights.communicationStyle },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
                    <p className="text-slate-400 text-sm mb-2">{label}</p>
                    <p className="text-white font-bold text-lg capitalize">{value}</p>
                  </div>
                ))}
                {analysis.behavioralInsights.strongAreas?.length > 0 && (
                  <div className="col-span-2 md:col-span-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                    <p className="text-emerald-300 font-semibold mb-2">Strong Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.behavioralInsights.strongAreas.map((s) => (
                        <span key={s} className="text-sm px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.behavioralInsights.overallPersonality && (
                  <div className="col-span-2 md:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-5">
                    <p className="text-slate-400 text-sm mb-1">Overall Impression</p>
                    <p className="text-white">{analysis.behavioralInsights.overallPersonality}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ROADMAP ── */}
        {activeTab === 'roadmap' && analysis.improvementRoadmap && (
          <div className="space-y-6">
            <h2 className="text-white font-bold text-xl">Improvement Roadmap</h2>

            {/* Immediate */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5">
              <h3 className="text-rose-300 font-semibold mb-3 flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4" />This Week (Immediate Actions)</h3>
              <ul className="space-y-2">
                {(analysis.improvementRoadmap.immediate || []).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-rose-400 font-bold flex-shrink-0">{i + 1}.</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 7-Day */}
            {analysis.improvementRoadmap.sevenDay && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                <h3 className="text-amber-300 font-semibold mb-1 flex items-center gap-2"><ClockIcon className="h-4 w-4" />7-Day Plan</h3>
                <p className="text-slate-300 text-sm mb-3 italic">{analysis.improvementRoadmap.sevenDay.goal}</p>
                <ul className="space-y-1">
                  {(analysis.improvementRoadmap.sevenDay.tasks || []).map((t, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-1.5"><ArrowTrendingUpIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 30-Day */}
            {analysis.improvementRoadmap.thirtyDay && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5">
                <h3 className="text-indigo-300 font-semibold mb-1 flex items-center gap-2"><TrophyIcon className="h-4 w-4" />30-Day Mastery Plan</h3>
                <p className="text-slate-300 text-sm mb-3 italic">{analysis.improvementRoadmap.thirtyDay.goal}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(analysis.improvementRoadmap.thirtyDay.milestones || []).map((m, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">Week {i + 1}</p>
                      <p className="text-sm text-white">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions */}
            {(analysis.practiceQuestions || []).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BookOpenIcon className="h-4 w-4" />Practice These Questions</h3>
                <div className="space-y-3">
                  {analysis.practiceQuestions.map((pq, i) => (
                    <div key={i} className="border-l-2 border-indigo-500/50 pl-4 py-1">
                      <p className="text-sm text-white">{pq.question}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{pq.topic}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded capitalize">{pq.difficulty}</span>
                      </div>
                      {pq.hint && <p className="text-xs text-indigo-300 mt-1 italic">Hint: {pq.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RESOURCES ── */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl">Recommended Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analysis.recommendedResources || []).map((r, i) => {
                const typeColors = {
                  book:     'bg-amber-500/20 text-amber-300',
                  course:   'bg-blue-500/20 text-blue-300',
                  video:    'bg-rose-500/20 text-rose-300',
                  practice: 'bg-emerald-500/20 text-emerald-300',
                  website:  'bg-violet-500/20 text-violet-300',
                };
                return (
                  <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-white font-medium">{r.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${typeColors[r.type] || 'bg-slate-700 text-slate-300'}`}>{r.type}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{r.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        r.priority === 'high' ? 'bg-rose-500/20 text-rose-300' :
                        r.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>{r.priority} priority</span>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition underline">
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
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => navigate('/interview/schedule')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition shadow-lg shadow-indigo-500/20"
          >
            Schedule Next Interview
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
          >
            View All Interviews
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <span className="block w-12 h-12 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading analysis…</p>
      </div>
    </div>
  );
}
