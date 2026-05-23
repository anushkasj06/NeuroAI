import { useState, useEffect, useMemo } from 'react';
import { studyPlanApi } from '../services/studyPlanApi';
import { Link } from 'react-router-dom';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AcademicCapIcon, ClockIcon, FireIcon, CheckCircleIcon,
  ArrowTrendingUpIcon, ExclamationTriangleIcon,
  ChevronDownIcon, ArrowPathIcon, BeakerIcon,
  SignalIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import './AIDashboard.css'; // reuse design tokens

const STATUS_CONFIG = {
  not_started:    { label: 'Not Started',     cls: 'pg-badge--muted' },
  in_progress:    { label: 'In Progress',     cls: 'pg-badge--info' },
  completed:      { label: 'Completed',       cls: 'pg-badge--success' },
  needs_revision: { label: 'Needs Revision',  cls: 'pg-badge--warn' },
};

const DIFF_COLORS = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };

const SUBJECT_COLORS = [
  '#0f766e', '#0369a1', '#7c3aed', '#c026d3', '#dc2626',
  '#d97706', '#059669', '#0ea5e9',
];

/* ── Helpers ────────────────────────────────────────────────────────── */
function formatMinutes(m) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
}

function daysUntil(date) {
  if (!date) return null;
  const d = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return d;
}

function masteryColor(pct) {
  if (pct >= 75) return '#059669';
  if (pct >= 45) return '#d97706';
  return '#dc2626';
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await studyPlanApi.getProgressDashboard();
        setData(res.data.data);
      } catch (e) {
        console.error('Progress dashboard error:', e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
        <div className="ai-shell">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-100 rounded-lg w-1/3" />
            <div className="ai-kpi-strip" style={{ gridTemplateColumns: 'repeat(6,1fr)', minHeight: 80 }}>
              {[...Array(6)].map((_, i) => <div key={i} className="ai-kpi"><div className="h-5 bg-slate-100 rounded w-12" /><div className="h-3 bg-slate-50 rounded w-16 mt-1" /></div>)}
            </div>
            <div className="h-64 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
        <div className="ai-shell">
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <AcademicCapIcon style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#94a3b8' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>No progress data yet</h2>
            <p style={{ color: '#64748b', marginTop: 8 }}>Start learning sessions or take quizzes to see your progress here.</p>
            <Link to="/learn" style={{
              display: 'inline-block', marginTop: 20, padding: '10px 24px', borderRadius: 8,
              background: '#0f766e', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>Start learning</Link>
          </div>
        </div>
      </div>
    );
  }

  const { overview, subjectBreakdown, radarData, masteryTrend, activityHeatmap,
    recentSessions, weakConcepts, strongConcepts, revisionSchedule,
    quizPerformance, difficultyDistribution } = data;

  return (
    <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
      <div className="ai-shell">
        {/* ── Header ──────────────────────────────────────────── */}
        <header style={{ marginBottom: 24 }} className="ai-fade-up">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ai-accent)' }}>
            Progress Intelligence
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>
            Learning Analytics
          </h1>
          <p style={{ color: 'var(--ai-muted)', fontSize: 14, marginTop: 4 }}>
            Multi-dimensional view of your learning journey across all subjects and concepts.
          </p>
        </header>

        {/* ── KPI Strip ───────────────────────────────────────── */}
        <div className="ai-kpi-strip ai-fade-up" style={{ gridTemplateColumns: 'repeat(6, 1fr)', animationDelay: '0.05s' }}>
          <KPI icon={<AcademicCapIcon />} label="Overall mastery" value={`${overview.overallMastery}%`} accent />
          <KPI icon={<ClockIcon />} label="Study time" value={formatMinutes(overview.totalStudyMinutes)} />
          <KPI icon={<FireIcon />} label="Current streak" value={`${overview.currentStreak}d`} />
          <KPI icon={<CheckCircleIcon />} label="Completed" value={`${overview.completedTopics}/${overview.totalTopics}`} />
          <KPI icon={<ExclamationTriangleIcon />} label="Need revision" value={overview.needsRevision} warn={overview.needsRevision > 0} />
          <KPI icon={<BeakerIcon />} label="Quiz avg" value={`${quizPerformance.avgScore}%`} />
        </div>

        {/* ── Main Grid ───────────────────────────────────────── */}
        <div className="ai-grid-main" style={{ marginTop: 24 }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Subject Breakdown */}
            <Section title="Subject Performance" icon={<SignalIcon />} delay="0.1s">
              {subjectBreakdown.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>No subjects tracked yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {subjectBreakdown.map((sub, idx) => (
                    <SubjectCard
                      key={sub.subjectSlug}
                      sub={sub}
                      color={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]}
                      expanded={expandedSubject === sub.subjectSlug}
                      onToggle={() => setExpandedSubject(expandedSubject === sub.subjectSlug ? null : sub.subjectSlug)}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Mastery Trend Chart */}
            {masteryTrend.length > 1 && (
              <Section title="Mastery Trend" icon={<ArrowTrendingUpIcon />} delay="0.15s">
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={masteryTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Line type="monotone" dataKey="avgMastery" stroke="#0f766e" strokeWidth={2.5}
                        dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} name="Avg Mastery %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            {/* Session Timeline */}
            {recentSessions.length > 0 && (
              <Section title="Recent Sessions" icon={<ClockIcon />} delay="0.2s">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {recentSessions.map((s, i) => (
                    <div key={s._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                      borderBottom: i < recentSessions.length - 1 ? '1px solid var(--ai-line)' : 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: s.delta >= 0 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: s.delta >= 0 ? '#059669' : '#dc2626', fontWeight: 800, fontSize: 13, flexShrink: 0,
                      }}>
                        {s.delta >= 0 ? '+' : ''}{s.delta}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic}</p>
                        <p style={{ fontSize: 11, color: '#64748b' }}>{s.subject}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-ink)' }}>{s.masteryBefore}% → {s.masteryAfter}%</p>
                        <p style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(s.completedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Radar Chart */}
            {radarData.length > 0 && (
              <Section title="Strength Radar" icon={<BoltIcon />} delay="0.1s">
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="rgba(148,163,184,0.2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Radar name="Mastery" dataKey="mastery" stroke="#0f766e" fill="#0f766e" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Confidence" dataKey="confidence" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} strokeWidth={1.5} />
                      <Radar name="Quiz Accuracy" dataKey="quizAccuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={1.5} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            {/* Activity Heatmap */}
            <Section title="Study Activity" icon={<FireIcon />} delay="0.15s"
              badge={`${activityHeatmap.filter(d => d.minutes > 0).length} active days`}>
              <ActivityHeatmap data={activityHeatmap} />
            </Section>

            {/* Revision Schedule */}
            {revisionSchedule.length > 0 && (
              <Section title="Revision Schedule" icon={<ArrowPathIcon />} delay="0.2s">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {revisionSchedule.map((r, i) => {
                    const days = daysUntil(r.nextRevisionDue);
                    const isOverdue = days !== null && days < 0;
                    const isDueSoon = days !== null && days <= 2 && days >= 0;
                    return (
                      <div key={r.topic + i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                        borderBottom: i < revisionSchedule.length - 1 ? '1px solid var(--ai-line)' : 'none',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: isOverdue ? 'rgba(220,38,38,0.08)' : isDueSoon ? 'rgba(217,119,6,0.08)' : 'rgba(148,163,184,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ArrowPathIcon style={{
                            width: 14, height: 14,
                            color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#64748b',
                          }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.topic}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8' }}>{r.subject} · {r.masteryPercent}% mastery</p>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: isOverdue ? 'rgba(220,38,38,0.08)' : isDueSoon ? 'rgba(217,119,6,0.08)' : 'rgba(148,163,184,0.06)',
                          color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#64748b',
                        }}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Weak Concepts */}
            {weakConcepts.length > 0 && (
              <Section title="Concepts to Strengthen" icon={<ExclamationTriangleIcon />} delay="0.25s" warn>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {weakConcepts.map((c, i) => (
                    <div key={c.concept + i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                      borderBottom: i < weakConcepts.length - 1 ? '1px solid var(--ai-line)' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-ink)' }}>{c.concept}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8' }}>{c.topic} · {c.attempts} attempts · {c.correctAttempts} correct</p>
                      </div>
                      <MiniBar value={c.masteryPercent} />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Difficulty Distribution */}
            <Section title="Difficulty Spread" icon={<BeakerIcon />} delay="0.3s">
              <div style={{ display: 'flex', gap: 8 }}>
                {['easy', 'medium', 'hard'].map((d) => {
                  const total = (difficultyDistribution.easy || 0) + (difficultyDistribution.medium || 0) + (difficultyDistribution.hard || 0);
                  const pct = total ? Math.round(((difficultyDistribution[d] || 0) / total) * 100) : 0;
                  return (
                    <div key={d} style={{
                      flex: 1, padding: '12px 10px', borderRadius: 8,
                      background: 'rgba(148,163,184,0.06)', textAlign: 'center',
                      border: '1px solid var(--ai-line)',
                    }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: DIFF_COLORS[d] }}>{difficultyDistribution[d] || 0}</p>
                      <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'capitalize', marginTop: 2 }}>{d}</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function KPI({ icon, label, value, accent, warn }) {
  return (
    <div className="ai-kpi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 16, height: 16, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : '#64748b' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 800, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : 'var(--ai-ink)', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children, delay = '0s', badge, warn }) {
  return (
    <div className="ai-rail ai-fade-up" style={{ animationDelay: delay, borderLeftColor: warn ? 'rgba(251,191,36,0.45)' : undefined }}>
      <div className="ai-panel__header">
        <span className="ai-panel__title">
          <span style={{ width: 16, height: 16, display: 'inline-flex', color: warn ? 'var(--ai-warn)' : 'var(--ai-accent)' }}>{icon}</span>
          {title}
        </span>
        {badge && <span className="ai-chip" style={{ fontSize: 10 }}>{badge}</span>}
      </div>
      <div className="ai-panel__body">{children}</div>
    </div>
  );
}

function SubjectCard({ sub, color, expanded, onToggle }) {
  const pct = sub.avgMastery;
  return (
    <div style={{ borderRadius: 8, border: '1px solid var(--ai-line)', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
      }}>
        <div style={{
          width: 8, height: 32, borderRadius: 3, background: color, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-ink)' }}>{sub.subjectName}</p>
          <p style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
            {sub.topicCount} topics · {sub.completedCount} done · {formatMinutes(sub.totalMinutes)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <MiniBar value={pct} width={60} />
          <span style={{ fontSize: 12, fontWeight: 700, color: masteryColor(pct), width: 32, textAlign: 'right' }}>{pct}%</span>
          <ChevronDownIcon style={{
            width: 14, height: 14, color: '#94a3b8',
            transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }} />
        </div>
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--ai-line)' }}>
          {sub.topics.map((t, i) => {
            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.not_started;
            return (
              <div key={t.topic + i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < sub.topics.length - 1 ? '1px solid rgba(148,163,184,0.15)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</p>
                  {t.subtopic && <p style={{ fontSize: 10, color: '#94a3b8' }}>{t.subtopic}</p>}
                </div>
                <MiniBar value={t.masteryPercent} width={40} />
                <span style={{ fontSize: 11, fontWeight: 700, color: masteryColor(t.masteryPercent), width: 28, textAlign: 'right' }}>{t.masteryPercent}%</span>
                <span className={sc.cls} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, fontWeight: 600 }}>{sc.label}</span>
                {t.bestQuizScore > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>Q: {t.bestQuizScore}%</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, width = 48 }) {
  return (
    <div style={{ width, height: 5, borderRadius: 3, background: 'rgba(148,163,184,0.15)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${masteryColor(value)}, ${masteryColor(value)}cc)`, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function ActivityHeatmap({ data }) {
  if (!data?.length) return null;

  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const weeks = [];
  let currentWeek = [];

  // Pad start to align to Monday
  const firstDay = new Date(data[0].date).getDay();
  const padDays = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < padDays; i++) currentWeek.push(null);

  for (const d of data) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const cellSize = 13;
  const gap = 2;
  const svgW = weeks.length * (cellSize + gap);
  const svgH = 7 * (cellSize + gap);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <svg width={svgW} height={svgH + 16} style={{ display: 'block' }}>
        {/* Day labels */}
        {['M', '', 'W', '', 'F', '', 'S'].map((label, i) => (
          <text key={i} x={0} y={i * (cellSize + gap) + cellSize - 2} fontSize={8} fill="#94a3b8" textAnchor="start">
            {label}
          </text>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return null;
            const intensity = day.minutes / maxMinutes;
            const fill = day.minutes === 0
              ? 'rgba(148,163,184,0.08)'
              : `rgba(15,118,110,${0.15 + intensity * 0.7})`;
            return (
              <rect
                key={`${wi}-${di}`}
                x={14 + wi * (cellSize + gap)}
                y={di * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={fill}
                style={{ cursor: 'default' }}
              >
                <title>{day.date}: {day.minutes}min</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
