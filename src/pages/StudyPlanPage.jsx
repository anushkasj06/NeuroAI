import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useStudyPlan } from '../hooks/useStudyPlan';
import { studyPlanApi } from '../services/studyPlanApi';
import './AIDashboard.css';
import './StudyPlanPage.css';

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

  if (loading) {
    return (
      <div className="ai-dashboard min-h-screen study-plan">
        <div className="ai-shell">
          <div className="plan-loading">Loading your study plan...</div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="ai-dashboard min-h-screen study-plan">
        <div className="ai-shell">
          <div className="plan-empty ai-rail ai-fade-up">
            <div>
              <div className="ai-chip">
                <CalendarDaysIcon className="h-4 w-4" />
                Study plan
              </div>
              <h2 className="plan-empty__title">No study plan yet</h2>
              <p className="ai-muted">Generate your AI-powered personalized study plan.</p>
            </div>
            <Link to="/study-plan/generate" className="ai-btn ai-btn--primary">
              Generate plan
            </Link>
          </div>
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
  const overallPercent = analytics?.overallCompletionPercent ?? plan.overallCompletionPercent ?? 0;
  const completedHours = analytics?.totalCompletedHours ?? plan.totalCompletedHours ?? 0;
  const plannedHours = analytics?.totalPlannedHours ?? plan.totalPlannedHours ?? 0;
  const daysLeft = analytics?.daysUntilExam;
  const examDate = plan.examDeadline ? new Date(plan.examDeadline).toLocaleDateString() : '';

  return (
    <div className="ai-dashboard min-h-screen study-plan">
      <div className="ai-shell space-y-8">
        <header className="ai-hero plan-hero ai-fade-up">
          <div className="plan-hero__meta">
            <div className="ai-chip">
              <CalendarDaysIcon className="h-4 w-4" />
              Study plan
            </div>
            <h1 className="ai-hero__title text-slate-900 mt-3">{plan.planName}</h1>
            <p className="plan-hero__sub ai-muted">
              <span>{plan.examName || 'Exam plan'}</span>
              {examDate ? <span className="plan-divider">•</span> : null}
              {examDate ? <span>{examDate}</span> : null}
              {daysLeft != null && <span className="plan-days">{daysLeft} days left</span>}
            </p>
          </div>
          <div className="plan-hero__actions">
            <Link to="/study-plan/generate" className="ai-btn">
              <ArrowPathIcon className="h-4 w-4" />
              Regenerate
            </Link>
            <Link to="/ai-dashboard" className="ai-btn ai-btn--primary">
              <Squares2X2Icon className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </header>

        <section className="ai-section ai-fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="ai-kpi-strip plan-kpi">
            <div className="ai-kpi">
              <p className="plan-kpi__label">Overall progress</p>
              <p className="plan-kpi__value">{overallPercent}%</p>
              <p className="plan-kpi__sub">Completion rate</p>
            </div>
            <div className="ai-kpi">
              <p className="plan-kpi__label">Study streak</p>
              <p className="plan-kpi__value">{plan.currentStreak ?? 0} days</p>
              <p className="plan-kpi__sub">Consistency</p>
            </div>
            <div className="ai-kpi">
              <p className="plan-kpi__label">Completed hours</p>
              <p className="plan-kpi__value">{completedHours}h</p>
              <p className="plan-kpi__sub">Logged so far</p>
            </div>
            <div className="ai-kpi">
              <p className="plan-kpi__label">Planned hours</p>
              <p className="plan-kpi__value">{plannedHours}h</p>
              <p className="plan-kpi__sub">Total plan</p>
            </div>
          </div>

          <div className="plan-progress">
            <div className="plan-progress__track">
              <span style={{ width: `${overallPercent}%` }} />
            </div>
            <div className="plan-progress__meta">
              <span>{completedHours}h completed</span>
              <span>{plannedHours}h planned</span>
            </div>
          </div>
        </section>

        {plan.aiSummary && (
          <section className="ai-section ai-fade-up" style={{ animationDelay: '0.08s' }}>
            <div className="plan-summary">
              <p className="plan-summary__label">AI Summary</p>
              <p className="plan-summary__text">{plan.aiSummary}</p>
            </div>
          </section>
        )}

        <section className="ai-section ai-fade-up" style={{ animationDelay: '0.12s' }}>
          <div className="plan-toggle">
            {['weekly', 'monthly'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`plan-toggle__btn ${view === v ? 'is-active' : ''}`}
              >
                {v === 'weekly' ? 'Weekly plan' : 'Monthly roadmap'}
              </button>
            ))}
          </div>

          {view === 'weekly' && (
            <div className="plan-week-view">
              <div className="plan-week-tabs">
                {plan.weeklyPlan?.map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveWeek(i)}
                    className={`plan-week-tab ${activeWeek === i ? 'is-active' : ''}`}
                  >
                    <span>{w.weekLabel || `Week ${w.weekNumber}`}</span>
                    <span className="plan-week-tab__meta">{w.completionPercent ?? 0}%</span>
                  </button>
                ))}
              </div>

              {currentWeek && (
                <div>
                  <div className="plan-week-header ai-rail">
                    <div>
                      <p className="plan-week-title">{currentWeek.weekLabel}</p>
                      <p className="ai-muted">{currentWeek.weeklyGoal}</p>
                    </div>
                    <span className="plan-week-hours">{currentWeek.totalHours}h total</span>
                  </div>

                  <div className="plan-day-grid">
                    {currentWeek.days?.map((day, di) => (
                      <DayCard
                        key={di}
                        day={day}
                        weekNumber={currentWeek.weekNumber}
                        onComplete={handleComplete}
                        completing={completing}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'monthly' && (
            <div className="plan-month-grid">
              {plan.monthlyRoadmap?.map((month, i) => (
                <div key={i} className="plan-month-card ai-rail">
                  <div className="plan-month-header">
                    <p className="plan-month-title">{month.monthLabel || `Month ${month.month}`}</p>
                    <span className="plan-month-chip">Focus window</span>
                  </div>
                  <div className="plan-month-body">
                    <div>
                      <p className="plan-month-label">Goals</p>
                      <ul className="plan-month-list">
                        {(month.goals || []).map((g, j) => (
                          <li key={j}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="plan-month-label is-warm">Revision topics</p>
                      <div className="plan-month-tags">
                        {(month.revisionTopics || []).map((t, j) => (
                          <span key={j} className="plan-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DayCard({ day, weekNumber, onComplete, completing }) {
  const isToday = day.date && new Date(day.date).toDateString() === new Date().toDateString();
  return (
    <div className={`plan-day-card ${isToday ? 'is-today' : ''}`}>
      <div className="plan-day-header">
        <div>
          <p className={`plan-day-title ${isToday ? 'is-today' : ''}`}>{day.dayLabel}{isToday ? ' today' : ''}</p>
          {day.date && (
            <p className="plan-day-date">
              {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <span className="plan-day-chip">{day.completionPercent ?? 0}%</span>
      </div>

      <div className="plan-day-progress">
        <span style={{ width: `${day.completionPercent ?? 0}%` }} />
      </div>

      <div className="plan-session-list">
        {(day.sessions || []).map((s) => (
          <div key={s._id} className={`plan-session ${s.completed ? 'is-complete' : ''}`}>
            <span className="plan-session-emoji">{SESSION_TYPE_EMOJI[s.sessionType] || '📘'}</span>
            <Link to={buildSessionLink(s)} className="plan-session-link">
              <p className={`plan-session-title ${s.completed ? 'is-complete' : ''}`}>
                {s.topic}{s.subtopic ? ` — ${s.subtopic}` : ''}
              </p>
              <p className="plan-session-meta">
                {s.subject} · {s.durationMinutes}m
                {(s.resources?.length) ? ` · ${s.resources.length} resource${s.resources.length === 1 ? '' : 's'}` : ''}
              </p>
            </Link>
            {!s.completed && (
              <button
                type="button"
                onClick={() => onComplete(weekNumber, day.dayLabel, s._id)}
                disabled={completing === s._id}
                className="plan-check"
              >
                {completing === s._id ? '...' : 'Done'}
              </button>
            )}
            {s.completed && <span className="plan-check is-complete">Done</span>}
          </div>
        ))}
      </div>

      {day.motivationalNote && <p className="plan-day-note">{day.motivationalNote}</p>}
    </div>
  );
}
