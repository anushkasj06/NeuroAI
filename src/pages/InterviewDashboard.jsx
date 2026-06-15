/**
 * InterviewDashboard.jsx
 * ======================
 * Main hub for the AI Interview System.
 * Shows:
 *  - Analytics summary (total, avg score, best score, trend)
 *  - Action button to schedule a new interview
 *  - All past interviews with status and score
 *  - Topic performance chart
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MicrophoneIcon,
  PlusCircleIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  PlayIcon,
  EyeIcon,
  TrashIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig = {
  scheduled:   { label: 'Scheduled',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  ready:       { label: 'Ready',       color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  completed:   { label: 'Completed',   color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  analysing:   { label: 'Analysing…',  color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  analysed:    { label: 'Analysed',    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  cancelled:   { label: 'Cancelled',   color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

const typeLabel = (t) => t?.charAt(0).toUpperCase() + t?.slice(1) || '';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const scoreColor = (s) => {
  if (!s) return 'text-slate-500';
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function InterviewDashboard() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [analyticsRes, listRes] = await Promise.all([
        interviewApi.getAnalytics(),
        interviewApi.getAll({ limit: 50 }),
      ]);
      setAnalytics(analyticsRes.data.data);
      setInterviews(listRes.data.data.interviews || []);
    } catch (err) {
      console.error('Interview dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await interviewApi.remove(id);
      setInterviews((prev) => prev.filter((i) => i._id !== id));
      setDeleteId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAction = (iv) => {
    if (iv.status === 'analysed' || iv.status === 'completed') {
      navigate(`/interview/${iv._id}/analysis`);
    } else if (iv.status === 'in_progress') {
      navigate(`/interview/${iv._id}/room`);
    } else if (iv.status === 'ready') {
      navigate(`/interview/${iv._id}/room`);
    } else if (iv.status === 'analysing') {
      navigate(`/interview/${iv._id}/analysis`);
    } else {
      navigate(`/interview/${iv._id}/prepare`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <span className="block w-12 h-12 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your interviews…</p>
        </div>
      </div>
    );
  }

  const a = analytics || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <MicrophoneIcon className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Interview Practice</h1>
              <p className="text-slate-400 text-sm">Prepare for real interviews with an AI voice interviewer</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/interview/schedule')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Schedule Interview
          </button>
        </div>

        {/* ── Stats Row ── */}
        {a.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={MicrophoneIcon}   label="Total Interviews" value={a.total}        color="indigo" />
            <StatCard icon={ChartBarIcon}     label="Average Score"   value={`${a.avgScore}%`} color="blue" />
            <StatCard icon={TrophyIcon}       label="Best Score"      value={`${a.bestScore}%`} color="emerald" />
            <StatCard icon={ArrowTrendingUpIcon} label="Improvement"  value={a.improvement >= 0 ? `+${a.improvement}` : `${a.improvement}`} color={a.improvement >= 0 ? 'emerald' : 'rose'} />
          </div>
        )}

        {/* ── Charts ── */}
        {a.total > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score trend */}
            {a.trend?.length > 1 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-indigo-400" /> Score Trend
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={a.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Topic performance */}
            {a.topicPerformance?.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4 text-violet-400" /> Topic Performance
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={a.topicPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                    <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Interview List ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Your Interviews</h2>
            <button onClick={load} className="text-slate-400 hover:text-white transition">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          {interviews.length === 0 ? (
            <EmptyState onSchedule={() => navigate('/interview/schedule')} />
          ) : (
            <div className="space-y-3">
              {interviews.map((iv) => {
                const sc = statusConfig[iv.status] || statusConfig.scheduled;
                return (
                  <div key={iv._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-4 hover:border-slate-500 transition group">

                    {/* Status dot */}
                    <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                      iv.status === 'in_progress' ? 'bg-amber-400 animate-pulse' :
                      iv.status === 'analysed'    ? 'bg-emerald-400' :
                      iv.status === 'analysing'   ? 'bg-violet-400 animate-pulse' :
                                                     'bg-slate-500'
                    }`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{iv.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 capitalize">{typeLabel(iv.interviewType)}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 capitalize">{iv.difficulty}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />{iv.durationMinutes} min
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CalendarDaysIcon className="h-3 w-3" />{formatDate(iv.scheduledAt)}
                        </span>
                      </div>
                      {iv.topics?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {iv.topics.slice(0, 4).map((t) => (
                            <span key={t} className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">{t}</span>
                          ))}
                          {iv.topics.length > 4 && <span className="text-xs text-slate-500">+{iv.topics.length - 4}</span>}
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      {iv.overallScore != null ? (
                        <p className={`text-xl font-bold ${scoreColor(iv.overallScore)}`}>{iv.overallScore}</p>
                      ) : (
                        <p className="text-sm text-slate-500">—</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${sc.color}`}>
                      {sc.label}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAction(iv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                      >
                        {iv.status === 'analysed' || iv.status === 'completed'
                          ? <><EyeIcon className="h-3.5 w-3.5" />View</>
                          : iv.status === 'in_progress'
                          ? <><PlayIcon className="h-3.5 w-3.5" />Resume</>
                          : iv.status === 'analysing'
                          ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />Processing</>
                          : <><PlayIcon className="h-3.5 w-3.5" />Start</>
                        }
                      </button>

                      {deleteId === iv._id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(iv._id)}
                            disabled={deleteLoading}
                            className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs disabled:opacity-50 transition"
                          >
                            {deleteLoading ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-2 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs transition"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(iv._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
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
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo:  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    blue:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rose:    'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color] || colors.indigo}`}>
      <Icon className="h-5 w-5 mb-2 opacity-80" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ onSchedule }) {
  return (
    <div className="text-center py-20 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl">
      <MicrophoneIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
      <h3 className="text-white font-semibold text-lg mb-2">No interviews yet</h3>
      <p className="text-slate-400 text-sm mb-6">
        Schedule your first AI mock interview and get detailed feedback on your performance.
      </p>
      <button
        onClick={onSchedule}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition"
      >
        <PlusCircleIcon className="h-5 w-5" />
        Schedule Your First Interview
      </button>
    </div>
  );
}
