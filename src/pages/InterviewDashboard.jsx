/**
 * InterviewDashboard.jsx — Light theme, matches app design system
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MicrophoneIcon, PlusCircleIcon, ChartBarIcon, TrophyIcon,
  ArrowTrendingUpIcon, ClockIcon, PlayIcon, EyeIcon, TrashIcon,
  CalendarDaysIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import './AIDashboard.css';

const statusConfig = {
  scheduled:   { label: 'Scheduled',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready:       { label: 'Ready',       cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed:   { label: 'Completed',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  analysing:   { label: 'Analysing…',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  analysed:    { label: 'Analysed',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const scoreColor = (s) => {
  if (!s) return 'text-slate-400';
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-rose-600';
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const typeLabel = (t) => t?.charAt(0).toUpperCase() + t?.slice(1) || '';

export default function InterviewDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics]   = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, lRes] = await Promise.all([
        interviewApi.getAnalytics(),
        interviewApi.getAll({ limit: 50 }),
      ]);
      setAnalytics(aRes.data.data);
      setInterviews(lRes.data.data.interviews || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await interviewApi.remove(id);
      setInterviews((p) => p.filter((i) => i._id !== id));
      setDeleteId(null);
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
    finally { setDeleteLoading(false); }
  };

  const handleAction = (iv) => {
    if (iv.status === 'analysed' || iv.status === 'completed') navigate(`/interview/${iv._id}/analysis`);
    else if (iv.status === 'in_progress' || iv.status === 'ready') navigate(`/interview/${iv._id}/room`);
    else if (iv.status === 'analysing') navigate(`/interview/${iv._id}/analysis`);
    else navigate(`/interview/${iv._id}/prepare`);
  };

  if (loading) return (
    <div className="ai-dashboard min-h-screen">
      <div className="ai-shell flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <span className="block w-10 h-10 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your interviews…</p>
        </div>
      </div>
    </div>
  );

  const a = analytics || {};

  return (
    <div className="ai-dashboard min-h-screen">
      <div className="ai-shell space-y-8">

        {/* Header */}
        <header className="ai-hero ai-fade-up">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="ai-chip mb-2">
                <MicrophoneIcon className="h-4 w-4" />
                AI Interview Practice
              </div>
              <h1 className="ai-hero__title text-slate-900">Interview Dashboard</h1>
              <p className="ai-muted text-sm mt-1">
                Practice with an AI voice interviewer and get detailed feedback.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={load} className="ai-btn">
                <ArrowPathIcon className="h-4 w-4" /> Refresh
              </button>
              <button onClick={() => navigate('/interview/schedule')} className="ai-btn ai-btn--primary">
                <PlusCircleIcon className="h-4 w-4" /> Schedule Interview
              </button>
            </div>
          </div>
        </header>

        {/* KPI strip */}
        {a.total > 0 && (
          <div className="ai-kpi-strip ai-fade-up" style={{ gridTemplateColumns: 'repeat(4,1fr)', animationDelay: '0.05s' }}>
            <KPI icon={<MicrophoneIcon />}      label="Total Interviews" value={a.total} />
            <KPI icon={<ChartBarIcon />}        label="Average Score"   value={`${a.avgScore}%`} />
            <KPI icon={<TrophyIcon />}          label="Best Score"      value={`${a.bestScore}%`} accent />
            <KPI icon={<ArrowTrendingUpIcon />} label="Improvement"
              value={a.improvement >= 0 ? `+${a.improvement}` : `${a.improvement}`}
              warn={a.improvement < 0} />
          </div>
        )}

        {/* Charts */}
        {a.total > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ai-fade-up" style={{ animationDelay: '0.1s' }}>
            {a.trend?.length > 1 && (
              <div className="ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-teal-600" /> Score Trend
                  </span>
                </div>
                <div className="ai-panel__body">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={a.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={2} dot={{ fill: '#0f766e', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {a.topicPerformance?.length > 0 && (
              <div className="ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title">
                    <ChartBarIcon className="h-4 w-4 text-teal-600" /> Topic Performance
                  </span>
                </div>
                <div className="ai-panel__body">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={a.topicPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontSize: 12 }} />
                      <Bar dataKey="avgScore" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interview list */}
        <section className="ai-section ai-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="ai-panel__header">
            <span className="ai-panel__title">Your Interviews</span>
          </div>
          <div className="ai-panel__body">
            {interviews.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white/60">
                <MicrophoneIcon className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-semibold text-base mb-1">No interviews yet</h3>
                <p className="text-slate-400 text-sm mb-5">Schedule your first AI mock interview.</p>
                <button onClick={() => navigate('/interview/schedule')} className="ai-btn ai-btn--primary">
                  <PlusCircleIcon className="h-4 w-4" /> Schedule Interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((iv) => {
                  const sc = statusConfig[iv.status] || statusConfig.scheduled;
                  return (
                    <div key={iv._id} className="flex flex-wrap items-center gap-4 px-4 py-3 bg-white/80 border border-slate-100 rounded-xl hover:border-teal-200 hover:shadow-sm transition-all">
                      {/* Status dot */}
                      <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                        iv.status === 'in_progress' ? 'bg-amber-400 animate-pulse' :
                        iv.status === 'analysed'    ? 'bg-emerald-500' :
                        iv.status === 'analysing'   ? 'bg-violet-400 animate-pulse' : 'bg-slate-300'
                      }`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-semibold text-sm truncate">{iv.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-400">
                          <span className="capitalize">{typeLabel(iv.interviewType)}</span>
                          <span>·</span>
                          <span className="capitalize">{iv.difficulty}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{iv.durationMinutes}m</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3" />{formatDate(iv.scheduledAt)}</span>
                        </div>
                        {iv.topics?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {iv.topics.slice(0, 4).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{t}</span>
                            ))}
                            {iv.topics.length > 4 && <span className="text-[10px] text-slate-400">+{iv.topics.length - 4}</span>}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0">
                        {iv.overallScore != null
                          ? <p className={`text-xl font-black ${scoreColor(iv.overallScore)}`}>{iv.overallScore}</p>
                          : <p className="text-sm text-slate-300">—</p>}
                      </div>

                      {/* Status */}
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleAction(iv)} className="ai-btn ai-btn--compact ai-btn--primary">
                          {iv.status === 'analysed' || iv.status === 'completed'
                            ? <><EyeIcon className="h-3.5 w-3.5" />View</>
                            : iv.status === 'in_progress'
                            ? <><PlayIcon className="h-3.5 w-3.5" />Resume</>
                            : iv.status === 'analysing'
                            ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />Processing</>
                            : <><PlayIcon className="h-3.5 w-3.5" />Start</>}
                        </button>
                        {deleteId === iv._id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(iv._id)} disabled={deleteLoading}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs disabled:opacity-50 transition">
                              {deleteLoading ? '…' : 'Yes'}
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteId(iv._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, accent, warn }) {
  return (
    <div className="ai-kpi">
      <div className="flex items-center gap-1.5">
        <span style={{ width: 14, height: 14, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : '#64748b' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 800, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : 'var(--ai-ink)', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
}
