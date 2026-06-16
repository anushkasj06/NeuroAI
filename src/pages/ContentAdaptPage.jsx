/**
 * ContentAdaptPage  —  /content-adapt
 * =====================================
 * Full-page Content Adaptation Engine dashboard.
 * Shows:
 *   • Format usage stats strip
 *   • Active recommendations (latest per topic)
 *   • Filterable history list with apply / dismiss
 *   • Format distribution bar chart
 */

import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  SparklesIcon, ArrowPathIcon, FunnelIcon,
  PlayCircleIcon, DocumentTextIcon, PhotoIcon,
  RectangleStackIcon, QuestionMarkCircleIcon, CodeBracketIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  useContentAdaptDashboard,
  useContentAdaptHistory,
  useContentAdaptStats,
} from '../hooks/useContentAdaptation';
import { contentAdapt } from '../services/api';
import { aiTeacherApi } from '../services/studyPlanApi';
import ContentFormatCard from '../components/common/ContentFormatCard';

// ── Format meta ───────────────────────────────────────────────────────────────
const FORMAT_META = {
  video:            { label: 'Video',           emoji: '🎬', color: '#ef4444', icon: PlayCircleIcon },
  pdf:              { label: 'PDF',             emoji: '📄', color: '#3b82f6', icon: DocumentTextIcon },
  infographic:      { label: 'Infographic',     emoji: '🖼️', color: '#8b5cf6', icon: PhotoIcon },
  flashcards:       { label: 'Flashcards',      emoji: '🃏', color: '#f59e0b', icon: RectangleStackIcon },
  interactive_quiz: { label: 'Quiz',            emoji: '🧩', color: '#10b981', icon: QuestionMarkCircleIcon },
  coding_practice:  { label: 'Coding',          emoji: '💻', color: '#0ea5e9', icon: CodeBracketIcon },
};

const SESSION_MODE_LABELS = {
  visual: 'Visual',
  audio: 'Audio',
  reading: 'Reading',
  interactive: 'Interactive',
  mixed: 'Mixed',
};

function formatSessionDate(value) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiTile({ label, value, sub, color = '#6366f1' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      <p className="break-words text-xl font-black sm:text-2xl" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ContentAdaptPage() {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);
  const [sessionHistoryError, setSessionHistoryError] = useState('');

  const { data: dashData,  loading: dashLoad,  refetch: refetchDash } = useContentAdaptDashboard();
  const { data: histData,  loading: histLoad,  refetch: refetchHist } = useContentAdaptHistory(filterSubject || null, 80);
  const { data: statsData, loading: statsLoad, refetch: refetchStats } = useContentAdaptStats(30);

  const loadSessionHistory = useCallback(async () => {
    setSessionHistoryLoading(true);
    setSessionHistoryError('');
    try {
      const res = await aiTeacherApi.getAnalytics();
      setSessionHistory(res.data?.data?.recentSessions || []);
    } catch (err) {
      setSessionHistoryError(err.response?.data?.message || 'Failed to load session history');
    } finally {
      setSessionHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionHistory();
  }, [loadSessionHistory]);

  const dashRecs   = dashData?.records  ?? [];
  const histRecs   = (histData?.records ?? []).filter(r => !filterStatus || r.status === filterStatus);
  const stats      = statsData?.stats;
  const isLoading  = dashLoad || histLoad || statsLoad || sessionHistoryLoading;

  const allSubjects = [...new Set((histData?.records ?? []).map(r => r.subjectSlug).filter(Boolean))];

  const chartData = stats
    ? Object.entries(FORMAT_META).map(([key, meta]) => ({
        name:  meta.emoji + ' ' + meta.label,
        count: stats.formatBreakdown?.[key] || 0,
        color: meta.color,
      })).filter(d => d.count > 0)
    : [];

  const handleApply   = useCallback(async (id) => {
    try { await contentAdapt.apply(id);   refetchDash(); refetchHist(); } catch {}
  }, [refetchDash, refetchHist]);

  const handleDismiss = useCallback(async (id) => {
    try { await contentAdapt.dismiss(id); refetchDash(); refetchHist(); } catch {}
  }, [refetchDash, refetchHist]);

  const refreshAll = () => { refetchDash(); refetchHist(); refetchStats(); loadSessionHistory(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-8 w-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-emerald-600" />
              </span>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Content Adaptation</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Format Recommendations</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Optimal content format based on your learning style, confusion, engagement & history
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshAll} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/progress"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
              Progress
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        {stats && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label="Total recommendations" value={stats.totalRecommendations}  color="#6366f1" />
            <KpiTile label="Applied"               value={stats.totalApplied}          color="#22c55e" />
            <KpiTile label="Apply rate"            value={`${stats.applyRate}%`}       color="#f59e0b" />
            <KpiTile label="Top format" value={FORMAT_META[stats.mostRecommended]?.emoji + ' ' + (FORMAT_META[stats.mostRecommended]?.label || '—')} color="#0ea5e9" sub="last 30 days" />
          </div>
        )}

        {/* Format distribution chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Format distribution</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [v, 'times recommended']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active recommendations */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Active recommendations
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({dashRecs.length} topic{dashRecs.length !== 1 ? 's' : ''})
            </span>
          </h2>
          {dashLoad && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {!dashLoad && dashRecs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <SparklesIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No active recommendations.</p>
              <p className="text-xs mt-1">Complete a learning session to generate format insights.</p>
              <Link to="/ai-teacher" className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
                Start a session
              </Link>
            </div>
          )}
          {!dashLoad && dashRecs.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {dashRecs.map(rec => (
                <ContentFormatCard key={rec._id} record={rec} onApply={handleApply} onDismiss={handleDismiss} />
              ))}
            </div>
          )}
        </section>

        {/* Session history */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Learning session history</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recent AI Teacher sessions remain available after new sessions start.</p>
            </div>
            <Link to="/ai-teacher" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Start new session
            </Link>
          </div>

          {sessionHistoryLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading session history...</span>
            </div>
          )}
          {!sessionHistoryLoading && sessionHistoryError && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              {sessionHistoryError}
            </div>
          )}
          {!sessionHistoryLoading && !sessionHistoryError && sessionHistory.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <ClockIcon className="h-9 w-9 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No learning sessions yet.</p>
            </div>
          )}
          {!sessionHistoryLoading && sessionHistory.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {sessionHistory.slice(0, 10).map((item) => (
                <SessionHistoryRow key={item._id} session={item} />
              ))}
            </div>
          )}
        </section>

        {/* History */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-base font-semibold text-slate-800">History</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelIcon className="h-4 w-4 text-slate-400" />
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5 focus:outline-none">
                <option value="">All subjects</option>
                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5 focus:outline-none">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="applied">Applied</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {histLoad && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {!histLoad && histRecs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <p className="text-sm">No records match the filter.</p>
            </div>
          )}
          {!histLoad && histRecs.length > 0 && (
            <div className="space-y-2">
              {histRecs.map(rec => (
                <HistoryRow key={rec._id} record={rec} onApply={handleApply} onDismiss={handleDismiss} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Compact history row ───────────────────────────────────────────────────────
function HistoryRow({ record, onApply, onDismiss }) {
  const meta = FORMAT_META[record.recommendedFormat] || FORMAT_META.pdf;
  const isActive = record.status === 'active';

  return (
    <div className={`bg-white border border-slate-100 rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${!isActive ? 'opacity-60' : ''}`}>
      <span className="text-lg flex-shrink-0" title={meta.label}>{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {record.topic}
          {record.subtopic ? <span className="text-slate-400 font-normal"> › {record.subtopic}</span> : null}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {record.subject || record.subjectSlug} · {meta.label} ·{' '}
          {new Date(record.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {/* Score */}
      <div className="hidden sm:flex items-center gap-1.5 text-[10px] flex-shrink-0">
        {['confusionScore', 'engagementScore', 'historicalSuccess'].map((k, i) => {
          const v = Math.round(record.inputs?.[k] ?? 0);
          const labels = ['Confusion', 'Engage', 'Success'];
          const inverts = [true, false, false];
          const inv = inverts[i];
          let color = 'bg-slate-100 text-slate-600';
          if (!inv) { color = v >= 65 ? 'bg-emerald-100 text-emerald-700' : v >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'; }
          else       { color = v >= 60 ? 'bg-rose-100 text-rose-700'    : v >= 35 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'; }
          return <span key={k} className={`font-bold px-1.5 py-0.5 rounded-md ${color}`}>{labels[i]} {v}%</span>;
        })}
      </div>
      {/* Actions */}
      <div className="flex w-full flex-shrink-0 items-center gap-2 sm:w-auto">
        {!isActive ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${record.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {record.status}
          </span>
        ) : (
          <>
            <Link to={`/materials`} onClick={() => onApply(record._id)}
              className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-center text-[10px] font-bold text-white hover:bg-emerald-700 sm:flex-none">
              Use {meta.emoji}
            </Link>
            <button onClick={() => onDismiss(record._id)} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium">Dismiss</button>
          </>
        )}
      </div>
    </div>
  );
}

function SessionHistoryRow({ session }) {
  const isCompleted = session.status === 'completed';
  const statusClass = isCompleted
    ? 'bg-emerald-100 text-emerald-700'
    : session.status === 'active'
      ? 'bg-cyan-100 text-cyan-700'
      : 'bg-slate-100 text-slate-500';
  const mastery = isCompleted ? session.masteryAfter : session.masteryBefore;
  const mode = SESSION_MODE_LABELS[session.activeTeachingMode] || 'Mixed';

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{session.topic}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {session.subject || session.subjectSlug} · {formatSessionDate(session.createdAt)}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusClass}`}>
          {session.status}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-3">
        <MiniStat label="Mode" value={mode} />
        <MiniStat label="Difficulty" value={session.difficultyLevel || 'medium'} />
        <MiniStat label="Mastery" value={`${Math.round(mastery || 0)}%`} />
      </div>
      <Link
        to={`/ai-teacher?sessionId=${session._id}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
      >
        {isCompleted ? 'Review session' : 'Resume session'}
      </Link>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-700 truncate capitalize">{value}</p>
    </div>
  );
}
