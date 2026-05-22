import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudyPlan } from '../hooks/useStudyPlan';
import { studyPlanApi } from '../services/studyPlanApi';

const SESSION_TYPE_EMOJI = { learn: '📘', revise: '🔄', practice: '✏️', quiz: '🧪', rest: '☕' };
const DIFF_COLOR = { easy: 'text-emerald-600 bg-emerald-50', medium: 'text-amber-600 bg-amber-50', hard: 'text-red-600 bg-red-50' };

const buildSessionLink = (session) => {
  const query = new URLSearchParams({
    subject: session.subjectSlug,
    topic: session.topic,
  });
  if (session.subtopic) query.set('subtopic', session.subtopic);
  return `/ai-teacher?${query.toString()}`;
};

export default function StudyPlanPage() {
  const { plan, analytics, loading, error, loadActivePlan, loadAnalytics } = useStudyPlan();
  const [activeWeek, setActiveWeek] = useState(0);
  const [completing, setCompleting] = useState(null);
  const [view, setView] = useState('weekly'); // 'weekly' | 'monthly'

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>;

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Study Plan Yet</h2>
          <p className="text-gray-500 mb-6">Generate your AI-powered personalized study plan.</p>
          <Link to="/study-plan/generate" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium">
            ✨ Generate Plan
          </Link>
        </div>
      </div>
    );
  }

  const handleComplete = async (weekNumber, dayLabel, sessionId) => {
    setCompleting(sessionId);
    try {
      await studyPlanApi.completeSession({ planId: plan._id, weekNumber, dayLabel, sessionId });
      await loadActivePlan();
      await loadAnalytics();
    } catch {}
    setCompleting(null);
  };

  const currentWeek = plan.weeklyPlan?.[activeWeek];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.planName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {plan.examName} · {plan.examDeadline ? new Date(plan.examDeadline).toLocaleDateString() : ''}
              {analytics?.daysUntilExam != null && <span className="ml-2 text-indigo-600 font-medium">{analytics.daysUntilExam} days left</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/study-plan/generate" className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Regenerate
            </Link>
            <Link to="/ai-dashboard" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:opacity-90">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Overall progress */}
        <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">Overall Progress</p>
              <p className="text-2xl font-bold text-indigo-600">{plan.overallCompletionPercent ?? 0}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Streak</p>
              <p className="text-2xl font-bold text-amber-500">🔥 {plan.currentStreak ?? 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{plan.totalCompletedHours ?? 0}h</p>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${plan.overallCompletionPercent ?? 0}%` }} />
          </div>
        </div>

        {/* AI Summary */}
        {plan.aiSummary && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">🤖 AI Summary</p>
            <p className="text-sm leading-relaxed">{plan.aiSummary}</p>
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-2">
          {['weekly', 'monthly'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === v ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {v === 'weekly' ? '📅 Weekly Plan' : '🗓️ Monthly Roadmap'}
            </button>
          ))}
        </div>

        {/* Weekly view */}
        {view === 'weekly' && (
          <div>
            {/* Week tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {plan.weeklyPlan?.map((w, i) => (
                <button key={i} onClick={() => setActiveWeek(i)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeWeek === i ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                  {w.weekLabel || `Week ${w.weekNumber}`}
                  <span className="ml-2 text-xs opacity-70">{w.completionPercent ?? 0}%</span>
                </button>
              ))}
            </div>

            {currentWeek && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{currentWeek.weekLabel}</h3>
                    <p className="text-sm text-gray-500">{currentWeek.weeklyGoal}</p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{currentWeek.totalHours}h total</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {currentWeek.days?.map((day, di) => (
                    <DayCard key={di} day={day} weekNumber={currentWeek.weekNumber} onComplete={handleComplete} completing={completing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Monthly view */}
        {view === 'monthly' && (
          <div className="space-y-4">
            {plan.monthlyRoadmap?.map((month, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md p-6 border border-gray-50">
                <h3 className="font-bold text-gray-900 mb-3">{month.monthLabel || `Month ${month.month}`}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-2">🎯 Goals</p>
                    <ul className="space-y-1">{(month.goals || []).map((g, j) => <li key={j} className="text-sm text-gray-600 flex gap-2"><span className="text-indigo-400">→</span>{g}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-600 mb-2">🔄 Revision Topics</p>
                    <div className="flex flex-wrap gap-1">{(month.revisionTopics || []).map((t, j) => <span key={j} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">{t}</span>)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCard({ day, weekNumber, onComplete, completing }) {
  const isToday = day.date && new Date(day.date).toDateString() === new Date().toDateString();
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{day.dayLabel}{isToday && ' 📍'}</p>
          {day.date && <p className="text-xs text-gray-400">{new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>}
        </div>
        <span className="text-xs font-semibold text-gray-500">{day.completionPercent ?? 0}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${day.completionPercent ?? 0}%` }} />
      </div>
      <div className="space-y-1.5">
        {(day.sessions || []).map((s) => (
          <div key={s._id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${s.completed ? 'opacity-50' : 'hover:bg-gray-50'}`}>
            <span>{SESSION_TYPE_EMOJI[s.sessionType] || '📘'}</span>
            <Link to={buildSessionLink(s)} className="flex-1 min-w-0 pr-2">
              <p className={`font-medium truncate ${s.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.topic}{s.subtopic ? ` — ${s.subtopic}` : ''}</p>
              <p className="text-gray-400 truncate">{s.subject} · {s.durationMinutes}m{(s.resources?.length) ? ` · ${s.resources.length} resource${s.resources.length === 1 ? '' : 's'}` : ''}</p>
            </Link>
            {!s.completed && (
              <button onClick={() => onComplete(weekNumber, day.dayLabel, s._id)} disabled={completing === s._id} className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center disabled:opacity-50">
                {completing === s._id ? <span className="animate-spin text-xs">⟳</span> : null}
              </button>
            )}
            {s.completed && <span className="text-emerald-500 shrink-0">✓</span>}
          </div>
        ))}
      </div>
      {day.motivationalNote && <p className="mt-2 text-xs text-indigo-500 italic">{day.motivationalNote}</p>}
    </div>
  );
}
