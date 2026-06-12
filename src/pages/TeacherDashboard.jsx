import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, teacher } from '../services/api';
import {
  AcademicCapIcon, ClockIcon, FireIcon, ExclamationTriangleIcon,
  CheckCircleIcon, MagnifyingGlassIcon, ChevronDownIcon,
  ArrowPathIcon, ArrowUpTrayIcon, UserGroupIcon,
  BoltIcon, SignalIcon, BeakerIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend as RLegend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line,
} from 'recharts';
import './AIDashboard.css';

const CHART_COLORS = ['#059669', '#d97706', '#dc2626'];
const PIE_LABELS = ['On Track', 'At Risk', 'Struggling'];
const CHART_FONT = { fontFamily: 'Sora, sans-serif', fontSize: 10 };

const STATUS_CFG = {
  'On Track':   { cls: 'pg-badge--success', color: '#059669' },
  'At Risk':    { cls: 'pg-badge--warn',    color: '#d97706' },
  'Struggling': { cls: 'pg-badge--danger',  color: '#dc2626' },
};

function formatMinutes(m) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
}

function masteryColor(pct) {
  if (pct >= 75) return '#059669';
  if (pct >= 45) return '#d97706';
  return '#dc2626';
}

const STATUS_ORDER = ['Struggling', 'At Risk', 'On Track'];
const TOPIC_STATUS = {
  not_started: { label: 'Not Started', cls: 'pg-badge--muted' },
  in_progress: { label: 'In Progress', cls: 'pg-badge--info' },
  completed:   { label: 'Completed',   cls: 'pg-badge--success' },
  needs_revision: { label: 'Revision', cls: 'pg-badge--warn' },
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [savingResource, setSavingResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '', targetGroup: 'All students', file: null });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await teacher.getDashboard();
      setDashboard(res.data.data);
      setSelectedId((c) => c || res.data.data.students?.[0]?.id || null);
    } catch (err) { setError(getApiErrorMessage(err, 'Failed to load dashboard')); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const students = dashboard?.students || [];
  const summary = dashboard?.summary || { totalStudents: 0, statusCounts: {}, averageMastery: 0, interventionCount: 0, classTotalMinutes: 0, classAvgStreak: 0 };

  const filtered = useMemo(() => {
    let list = students;
    if (statusFilter !== 'All') list = list.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    return list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [students, statusFilter, search]);

  const selected = students.find((s) => s.id === selectedId) || filtered[0] || null;

  const getFileType = (fileName = '') => {
    const n = fileName.toLowerCase();
    if (n.endsWith('.pdf')) return 'pdf';
    if (n.endsWith('.docx')) return 'docx';
    if (/\.(mp4|mov|webm|mkv)$/.test(n)) return 'video';
    return 'other';
  };

  const submitResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.file || !resourceForm.title.trim()) { setError('Add a title and choose a file.'); return; }
    setSavingResource(true); setError('');
    try {
      await teacher.createResource({
        title: resourceForm.title.trim(), description: resourceForm.description.trim(),
        targetGroup: resourceForm.targetGroup, fileName: resourceForm.file.name,
        fileType: getFileType(resourceForm.file.name),
      });
      setResourceForm({ title: '', description: '', targetGroup: 'All students', file: null });
      await load();
    } catch (err) { setError(getApiErrorMessage(err, 'Failed to save resource')); }
    setSavingResource(false);
  };

  if (loading) {
    return (
      <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
        <div className="ai-shell">
          <div className="animate-pulse space-y-6">
            <div style={{ height: 80, background: 'linear-gradient(120deg,#0f172a,#0f766e 62%,#ca8a04)', borderRadius: 8 }} />
            <div style={{ height: 60, background: '#f1f5f9', borderRadius: 8 }} />
            <div style={{ height: 300, background: '#f1f5f9', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
      <div className="ai-shell">
        {/* ── Hero ──────────────────────────────────────── */}
        <header className="ai-fade-up" style={{
          background: 'linear-gradient(120deg, #0f172a, #0f766e 62%, #ca8a04)',
          color: '#f8fafc', padding: '26px 28px', borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
          boxShadow: '0 18px 40px rgba(15,23,42,0.2)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccfbf1' }}>Educator Intelligence Hub</p>
            <h1 style={{ margin: '4px 0', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800 }}>Teacher Dashboard</h1>
            <p style={{ margin: 0, color: '#dff7ef', fontSize: 13, maxWidth: 600 }}>
              Class oversight, individual learning reports, risk prediction, and intervention workflow.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, background: 'rgba(255,255,255,0.1)', padding: '8px 14px', minWidth: 140 }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ccfbf1' }}>Class Code</span>
              <strong style={{ display: 'block', fontSize: 18, marginTop: 2 }}>{user?.teacherCode || 'Pending'}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={load} style={{ border: 0, borderRadius: 6, background: '#f8fafc', color: '#0f172a', padding: '7px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Refresh</button>
              <Link to="/teacher/content" style={{ border: 0, borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '7px 12px', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>Content Studio</Link>
            </div>
          </div>
        </header>

        {error && <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 6, background: '#fff1f2', color: '#991b1b', border: '1px solid #fecdd3', fontSize: 13 }}>{error}</div>}

        {/* ── KPI Strip ────────────────────────────────── */}
        <div className="ai-kpi-strip ai-fade-up" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: 16, animationDelay: '0.05s' }}>
          <KPI icon={<UserGroupIcon />} label="Enrolled" value={summary.totalStudents} accent />
          <KPI icon={<AcademicCapIcon />} label="Class mastery" value={`${summary.averageMastery}%`} />
          <KPI icon={<ClockIcon />} label="Total study" value={formatMinutes(summary.classTotalMinutes)} />
          <KPI icon={<FireIcon />} label="Avg streak" value={`${summary.classAvgStreak}d`} />
          <KPI icon={<ExclamationTriangleIcon />} label="Alerts" value={summary.interventionCount} warn={summary.interventionCount > 0} />
          <KPI icon={<CheckCircleIcon />} label="On Track" value={summary.statusCounts?.['On Track'] || 0} />
        </div>

        {/* ── Class-wide Charts ────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 16 }} className="ai-fade-up" >
          {/* Status donut */}
          <Section title="Status Split" icon={<ChartBarIcon />} delay="0.06s">
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_LABELS.map((l, i) => ({ name: l, value: summary.statusCounts?.[l] || 0 }))} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3} stroke="none">
                    {PIE_LABELS.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 6, fontSize: 11, border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                  <RLegend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Class mastery by subject */}
          <Section title="Class Mastery by Subject" icon={<SignalIcon />} delay="0.08s"
            badge={`${dashboard?.subjectHeatmap?.length || 0} subjects`}>
            <div style={{ height: 190 }}>
              {dashboard?.subjectHeatmap?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.subjectHeatmap.map((sh) => ({ name: sh.subjectName.length > 14 ? sh.subjectName.slice(0, 12) + '...' : sh.subjectName, mastery: sh.classAvg }))} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="name" tick={{ ...CHART_FONT }} />
                    <YAxis domain={[0, 100]} tick={{ ...CHART_FONT }} />
                    <RTooltip contentStyle={{ borderRadius: 6, fontSize: 11, border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="mastery" fill="#0f766e" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', paddingTop: 60 }}>No subject data yet.</p>}
            </div>
          </Section>
        </div>

        {/* ── Main Layout ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginTop: 20 }} className="ai-fade-up">
          {/* LEFT: Student Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: 10, top: 10, width: 15, height: 15, color: '#94a3b8' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..."
                style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 6, border: '1px solid var(--ai-line)', background: 'rgba(255,255,255,0.7)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {/* Status filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['All', 'Struggling', 'At Risk', 'On Track'].map((f) => (
                <button key={f} onClick={() => setStatusFilter(f)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  border: statusFilter === f ? '1.5px solid var(--ai-accent)' : '1px solid var(--ai-line)',
                  background: statusFilter === f ? 'rgba(15,118,110,0.06)' : 'transparent',
                  color: statusFilter === f ? 'var(--ai-accent)' : '#64748b',
                }}>{f}</button>
              ))}
            </div>
            {/* Roster list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
              {filtered.length === 0 && <p style={{ color: '#64748b', fontSize: 12, padding: 12 }}>No students match filters.</p>}
              {filtered.map((s) => {
                const cfg = STATUS_CFG[s.status] || STATUS_CFG['On Track'];
                const isActive = selected?.id === s.id;
                return (
                  <button key={s.id} onClick={() => { setSelectedId(s.id); setExpandedSubject(null); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6,
                    border: isActive ? '1.5px solid var(--ai-accent)' : '1px solid var(--ai-line)',
                    background: isActive ? 'rgba(15,118,110,0.04)' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: cfg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{s.status} · {s.masteryAverage}% mastery</p>
                    </div>
                    <MiniBar value={s.masteryAverage} width={36} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Student Detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selected ? (
              <>
                {/* Student header */}
                <div className="ai-rail ai-fade-up" style={{ animationDelay: '0.1s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ai-accent)', margin: 0 }}>Individual Report</p>
                      <h2 style={{ margin: '4px 0', fontSize: 22, fontWeight: 800 }}>{selected.name}</h2>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{selected.email} · {selected.preferredLearningStyle}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <MasteryRing value={selected.masteryAverage} />
                      <span style={{
                        padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: (STATUS_CFG[selected.status] || STATUS_CFG['On Track']).color,
                        color: '#fff',
                      }}>{selected.status}</span>
                    </div>
                  </div>
                  {/* Quick metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ai-line)' }}>
                    <QuickStat label="Topics" value={`${selected.completedTopics || 0}/${selected.totalTopics || 0}`} />
                    <QuickStat label="Study time" value={formatMinutes(selected.totalStudyMinutes)} />
                    <QuickStat label="Streak" value={`${selected.studyPlanInfo?.currentStreak || 0}d`} />
                    <QuickStat label="Plan" value={selected.studyPlanInfo ? `${selected.studyPlanInfo.completionPercent}%` : 'None'} />
                  </div>
                </div>

                {/* Charts: Radar + Quiz Trend */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Subject mastery radar */}
                  {selected.subjectBreakdown?.length > 0 && (
                    <Section title="Subject Radar" icon={<SignalIcon />} delay="0.11s">
                      <div style={{ height: 210 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={selected.subjectBreakdown.map((s) => ({ subject: (s.subjectName || s.subjectSlug || '?').split(' ').map(w => w[0]).join(''), mastery: s.avgMastery, fullName: s.subjectName || s.subjectSlug }))}>
                            <PolarGrid stroke="rgba(148,163,184,0.2)" />
                            <PolarAngleAxis dataKey="subject" tick={{ ...CHART_FONT, fill: '#475569' }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar dataKey="mastery" stroke="#0f766e" fill="#0f766e" fillOpacity={0.18} strokeWidth={2} />
                            <RTooltip contentStyle={{ borderRadius: 6, fontSize: 11, border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </Section>
                  )}

                  {/* Quiz history trend */}
                  {selected.quizHistory?.length > 0 && (
                    <Section title="Quiz Trend" icon={<ChartBarIcon />} delay="0.12s">
                      <div style={{ height: 210 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selected.quizHistory.map((q, i) => ({ name: `#${i + 1}`, score: q.score, type: q.type }))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                            <XAxis dataKey="name" tick={{ ...CHART_FONT }} />
                            <YAxis domain={[0, 100]} tick={{ ...CHART_FONT }} />
                            <RTooltip contentStyle={{ borderRadius: 6, fontSize: 11, border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Section>
                  )}
                </div>

                {/* Subject Mastery */}
                {selected.subjectBreakdown?.length > 0 && (
                  <Section title="Subject Mastery" icon={<SignalIcon />} delay="0.12s">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selected.subjectBreakdown.map((sub) => (
                        <div key={sub.subjectSlug} style={{ border: '1px solid var(--ai-line)', borderRadius: 6, overflow: 'hidden' }}>
                          <button onClick={() => setExpandedSubject(expandedSubject === sub.subjectSlug ? null : sub.subjectSlug)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-ink)', margin: 0 }}>{sub.subjectName}</p>
                              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{sub.topics.length} topics · {sub.completedCount} done · {formatMinutes(sub.totalMinutes)}</p>
                            </div>
                            <MiniBar value={sub.avgMastery} width={50} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: masteryColor(sub.avgMastery), width: 28, textAlign: 'right' }}>{sub.avgMastery}%</span>
                            <ChevronDownIcon style={{ width: 13, height: 13, color: '#94a3b8', transition: 'transform 0.2s', transform: expandedSubject === sub.subjectSlug ? 'rotate(180deg)' : 'none' }} />
                          </button>
                          {expandedSubject === sub.subjectSlug && (
                            <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--ai-line)' }}>
                              {sub.topics.map((t, i) => {
                                const sc = TOPIC_STATUS[t.status] || TOPIC_STATUS.not_started;
                                return (
                                  <div key={t.topic + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < sub.topics.length - 1 ? '1px solid rgba(148,163,184,0.12)' : 'none' }}>
                                    <p style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--ai-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</p>
                                    <MiniBar value={t.masteryPercent} width={36} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: masteryColor(t.masteryPercent), width: 24, textAlign: 'right' }}>{t.masteryPercent}%</span>
                                    <span className={sc.cls} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, fontWeight: 600 }}>{sc.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Session Timeline */}
                {selected.sessionHistory?.length > 0 && (
                  <Section title="Session Timeline" icon={<ClockIcon />} delay="0.15s">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {selected.sessionHistory.map((s, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: i < selected.sessionHistory.length - 1 ? '1px solid var(--ai-line)' : 'none',
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                            background: s.delta >= 0 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s.delta >= 0 ? '#059669' : '#dc2626', fontWeight: 800, fontSize: 12,
                          }}>
                            {s.delta >= 0 ? '+' : ''}{s.delta}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: 'var(--ai-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic}</p>
                            <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{s.subject}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: 'var(--ai-ink)' }}>{s.masteryBefore}% → {s.masteryAfter}%</p>
                            <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{new Date(s.completedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Two-column: Weak Concepts + Teaching Approach */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {selected.weakConcepts?.length > 0 && (
                    <Section title="Weak Concepts" icon={<ExclamationTriangleIcon />} delay="0.18s" warn>
                      {selected.weakConcepts.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < selected.weakConcepts.length - 1 ? '1px solid var(--ai-line)' : 'none' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-ink)', margin: 0 }}>{c.concept}</p>
                            <p style={{ fontSize: 9, color: '#94a3b8', margin: '1px 0 0' }}>{c.topic} · {c.attempts} attempts</p>
                          </div>
                          <MiniBar value={c.masteryPercent} width={32} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: masteryColor(c.masteryPercent) }}>{c.masteryPercent}%</span>
                        </div>
                      ))}
                    </Section>
                  )}
                  <Section title="Teaching Approach" icon={<BeakerIcon />} delay="0.2s">
                    <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>{selected.recommendedTeachingApproach}</p>
                    {selected.attention && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
                        <QuickStat label="Attention" value={selected.attention.attentionLevel} small />
                        <QuickStat label="Engagement" value={`${selected.attention.engagementScore}%`} small />
                        <QuickStat label="Focus" value={`${selected.attention.focusReadiness}%`} small />
                      </div>
                    )}
                  </Section>
                </div>
              </>
            ) : (
              <div className="ai-rail" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <UserGroupIcon style={{ width: 40, height: 40, color: '#94a3b8', margin: '0 auto 12px' }} />
                <p style={{ color: '#64748b', fontSize: 14 }}>No students enrolled yet. Share your class code to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Panels ──────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
          {/* Class Subject Heatmap */}
          {dashboard?.subjectHeatmap?.length > 0 && (
            <Section title="Class Subject Heatmap" icon={<BoltIcon />} delay="0.22s"
              badge={`${dashboard.subjectHeatmap.length} subjects`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 600, fontSize: 10, borderBottom: '1px solid var(--ai-line)' }}>Student</th>
                      {dashboard.subjectHeatmap.map((sh) => (
                        <th key={sh.subjectSlug} style={{ textAlign: 'center', padding: '6px 6px', color: '#64748b', fontWeight: 600, fontSize: 10, borderBottom: '1px solid var(--ai-line)' }}>
                          {(sh.subjectName || sh.subjectSlug || '?').split(' ').map(w => w[0]).join('')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 15).map((student) => (
                      <tr key={student.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedId(student.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--ai-ink)', borderBottom: '1px solid rgba(148,163,184,0.1)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</td>
                        {dashboard.subjectHeatmap.map((sh) => {
                          const entry = sh.students.find((x) => x.studentId === student.id);
                          const m = entry?.mastery || 0;
                          const bg = m >= 75 ? 'rgba(5,150,105,0.12)' : m >= 45 ? 'rgba(217,119,6,0.1)' : m > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(148,163,184,0.04)';
                          return (
                            <td key={sh.subjectSlug} style={{ textAlign: 'center', padding: '5px 4px', borderBottom: '1px solid rgba(148,163,184,0.1)', background: bg }}>
                              <span style={{ fontWeight: 700, fontSize: 11, color: m > 0 ? masteryColor(m) : '#cbd5e1' }}>{m || '-'}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Class average row */}
                    <tr style={{ borderTop: '2px solid var(--ai-line)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: 'var(--ai-accent)', fontSize: 10, textTransform: 'uppercase' }}>Class Avg</td>
                      {dashboard.subjectHeatmap.map((sh) => (
                        <td key={sh.subjectSlug} style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 800, color: masteryColor(sh.classAvg) }}>
                          {sh.classAvg}%
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Right column: Alerts + Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Intervention Alerts */}
            <Section title="Intervention Alerts" icon={<ExclamationTriangleIcon />} delay="0.24s" warn
              badge={`${dashboard?.interventionAlerts?.length || 0} active`}>
              {(dashboard?.interventionAlerts || []).length === 0
                ? <p style={{ color: '#64748b', fontSize: 12 }}>No urgent interventions.</p>
                : (dashboard.interventionAlerts.slice(0, 6).map((a, i) => (
                  <div key={a.studentId} style={{
                    padding: '8px 0',
                    borderBottom: i < Math.min(dashboard.interventionAlerts.length, 6) - 1 ? '1px solid var(--ai-line)' : 'none',
                    cursor: 'pointer',
                  }} onClick={() => { setSelectedId(a.studentId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: 99, flexShrink: 0,
                        background: (STATUS_CFG[a.status] || STATUS_CFG['At Risk']).color,
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-ink)' }}>{a.studentName}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: (STATUS_CFG[a.status] || STATUS_CFG['At Risk']).color }}>{a.masteryAverage}%</span>
                    </div>
                    <p style={{ margin: '3px 0 0 14px', fontSize: 10, color: '#64748b' }}>{a.reasons.join(' · ')}</p>
                  </div>
                )))
              }
            </Section>

            {/* Resource Upload */}
            <Section title="Upload Resources" icon={<ArrowUpTrayIcon />} delay="0.26s">
              <form onSubmit={submitResource} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={resourceForm.title} onChange={(e) => setResourceForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Resource title" style={inputStyle} />
                <select value={resourceForm.targetGroup} onChange={(e) => setResourceForm((p) => ({ ...p, targetGroup: e.target.value }))} style={inputStyle}>
                  <option>All students</option><option>At Risk students</option><option>Struggling students</option>
                </select>
                <input type="file" accept=".pdf,.docx,.mp4,.mov,.webm" onChange={(e) => setResourceForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                  style={{ fontSize: 11 }} />
                <button type="submit" disabled={savingResource} style={{
                  border: 0, borderRadius: 6, background: 'var(--ai-accent)', color: '#fff',
                  padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>
                  {savingResource ? 'Saving...' : 'Save Resource'}
                </button>
              </form>
              {(dashboard?.resources || []).slice(0, 3).map((r) => (
                <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--ai-line)', marginTop: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-ink)' }}>{r.title}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{r.fileName}</span>
                </div>
              ))}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--ai-line)',
  background: 'rgba(255,255,255,0.7)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
};

function KPI({ icon, label, value, accent, warn }) {
  return (
    <div className="ai-kpi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 15, height: 15, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : '#64748b' }}>{icon}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: warn ? 'var(--ai-warn)' : accent ? 'var(--ai-accent)' : 'var(--ai-ink)', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children, delay = '0s', badge, warn }) {
  return (
    <div className="ai-rail ai-fade-up" style={{ animationDelay: delay, borderLeftColor: warn ? 'rgba(251,191,36,0.45)' : undefined }}>
      <div className="ai-panel__header">
        <span className="ai-panel__title">
          <span style={{ width: 15, height: 15, display: 'inline-flex', color: warn ? 'var(--ai-warn)' : 'var(--ai-accent)' }}>{icon}</span>
          {title}
        </span>
        {badge && <span className="ai-chip" style={{ fontSize: 9 }}>{badge}</span>}
      </div>
      <div className="ai-panel__body">{children}</div>
    </div>
  );
}

function MiniBar({ value, width = 48 }) {
  return (
    <div style={{ width, height: 4, borderRadius: 3, background: 'rgba(148,163,184,0.15)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: 3, background: masteryColor(value), transition: 'width 0.4s ease' }} />
    </div>
  );
}

function MasteryRing({ value }) {
  const color = masteryColor(value);
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `conic-gradient(${color} ${value * 3.6}deg, rgba(148,163,184,0.12) 0deg)`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color,
      }}>{value}%</div>
    </div>
  );
}

function QuickStat({ label, value, small }) {
  return (
    <div style={{ textAlign: 'center', padding: small ? '6px 4px' : '8px 6px', borderRadius: 6, background: 'rgba(148,163,184,0.04)', border: '1px solid var(--ai-line)' }}>
      <p style={{ fontSize: small ? 13 : 16, fontWeight: 800, color: 'var(--ai-ink)', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '2px 0 0' }}>{label}</p>
    </div>
  );
}
