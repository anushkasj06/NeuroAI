import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BeakerIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PresentationChartLineIcon,
  SparklesIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useStudyPlan } from '../hooks/useStudyPlan';
import LearningStyleCard from '../components/studyplan/LearningStyleCard';
import SubjectStrengthChart from '../components/studyplan/SubjectStrengthChart';
import TodayPlanCard from '../components/studyplan/TodayPlanCard';
import StatsRow from '../components/studyplan/StatsRow';
import RecommendationCard from '../components/studyplan/RecommendationCard';
import WeakTopicsAlert from '../components/studyplan/WeakTopicsAlert';
import ModalityRadar from '../components/studyplan/ModalityRadar';
import './AIDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
  scales: {
    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' } },
    x: { grid: { display: false } },
  },
};

function getRiskColor(marks) {
  if (marks < 45) return { border: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
  if (marks < 60) return { border: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  return { border: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
}

export default function AIDashboard() {
  const { analytics, loading, error, dismissRecommendation, generateRecommendations } = useStudyPlan();
  const [genLoading, setGenLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const handleGenRecs = async () => {
    setGenLoading(true);
    try { await generateRecommendations(); } catch {}
    setGenLoading(false);
  };

  if (loading) return <DashboardSkeleton />;

  if (error || !analytics) {
    return (
      <div className="ai-dashboard min-h-screen">
        <div className="ai-shell">
          <div className="ai-rail max-w-xl mx-auto ai-fade-up">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Complete your diagnostic first</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    The AI dashboard unlocks after the diagnostic assessment is complete.
                  </p>
                </div>
              </div>
              <Link to="/diagnostic" className="ai-btn ai-btn--primary">
                <ArrowRightIcon className="h-4 w-4" />
                Start diagnostic
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const a = analytics;

  // Build chart data from subjects
  const subjectLabels = (a.subjects || []).map((s) => s.subjectName);
  const subjectMarks  = (a.subjects || []).map((s) => s.currentMarks);
  const riskColors    = subjectMarks.map(getRiskColor);

  const performanceData = {
    labels: subjectLabels,
    datasets: [
      {
        label: 'Your Score',
        data: subjectMarks,
        backgroundColor: riskColors.map((c) => c.bg),
        borderColor: riskColors.map((c) => c.border),
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Target (100%)',
        data: subjectMarks.map(() => 100),
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderColor: 'rgba(99,102,241,0.4)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const trendData = {
    labels: subjectLabels,
    datasets: [
      {
        label: 'Performance Trend',
        data: subjectMarks,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: riskColors.map((c) => c.border),
        pointRadius: 5,
      },
    ],
  };

  const quickActions = [
    { to: '/learn', label: 'Start learning session', icon: BookOpenIcon },
    { to: '/study-plan/generate', label: 'Generate study plan', icon: SparklesIcon },
    { to: '/progress', label: 'Review progress', icon: PresentationChartLineIcon },
    { to: '/diagnostic', label: 'Redo diagnostic', icon: BeakerIcon },
    { to: '/prediction', label: 'Score prediction', icon: ChartBarSquareIcon },
  ];

  return (
    <div className="ai-dashboard min-h-screen">
      <div className="ai-shell space-y-8">
        <header className="ai-hero ai-fade-up">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="ai-chip">
                <CpuChipIcon className="h-4 w-4" />
                AI learning studio
              </div>
              <h1 className="ai-hero__title text-slate-900 mt-3">NeuroLearn Learning Studio</h1>
              <p className="text-sm ai-muted mt-2 max-w-xl">
                A premium learning space shaped by your diagnostic profile. AI keeps your pace,
                modality, and focus aligned with your exam goals.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!a.hasPlan ? (
                <Link to="/study-plan/generate" className="ai-btn ai-btn--primary">
                  <SparklesIcon className="h-4 w-4" />
                  Generate study plan
                </Link>
              ) : (
                <Link to="/study-plan" className="ai-btn ai-btn--primary">
                  <CalendarDaysIcon className="h-4 w-4" />
                  View study plan
                </Link>
              )}
              <Link to="/learn" className="ai-btn">
                <BookOpenIcon className="h-4 w-4" />
                Start learning
              </Link>
              <Link to="/prediction" className="ai-btn ai-btn--ghost">
                <ChartBarSquareIcon className="h-4 w-4" />
                Predictions
              </Link>
            </div>
          </div>
        </header>

        <section className="ai-section ai-fade-up" style={{ animationDelay: '0.05s' }}>
          <StatsRow analytics={a} />
        </section>

        <section className="ai-section">
          <div className="ai-grid-main">
          <div className="space-y-6">
            {a.hasPlan && (
              <div className="ai-fade-up" style={{ animationDelay: '0.08s' }}>
                <TodayPlanCard
                  sessions={a.todaySessions || []}
                  completionPercent={a.todayCompletionPercent || 0}
                />
              </div>
            )}

            {!a.hasPlan && (
              <div className="ai-rail ai-fade-up" style={{ animationDelay: '0.08s' }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plan not generated</p>
                    <h3 className="text-lg font-semibold text-slate-900 mt-1">Create your personalized study plan</h3>
                    <p className="text-sm ai-muted mt-1">
                      Build a plan that maps to your diagnostic profile and exam timeline.
                    </p>
                  </div>
                  <Link to="/study-plan/generate" className="ai-btn ai-btn--primary">
                    <SparklesIcon className="h-4 w-4" />
                    Generate plan
                  </Link>
                </div>
              </div>
            )}

            <div className="ai-fade-up" style={{ animationDelay: '0.12s' }}>
              <SubjectStrengthChart
                subjects={a.subjects || []}
                strengths={a.subjectStrengths || []}
                weaknesses={a.subjectWeaknesses || []}
              />
            </div>

            {a.weakTopics?.length > 0 && (
              <div className="ai-fade-up" style={{ animationDelay: '0.16s' }}>
                <WeakTopicsAlert weakTopics={a.weakTopics} />
              </div>
            )}

            <div className="ai-rail ai-fade-up" style={{ animationDelay: '0.18s' }}>
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <PresentationChartLineIcon className="h-5 w-5 text-teal-600" />
                  Learning signals
                </div>
                <button
                  onClick={() => setShowCharts((v) => !v)}
                  className="ai-btn ai-btn--ghost ai-btn--compact"
                >
                  {showCharts ? 'Hide charts' : 'Show charts'}
                  {showCharts ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </button>
              </div>

              {showCharts && subjectLabels.length > 0 && (
                <div className="ai-panel__body space-y-6">
                  {(a.subjects || []).filter((s) => s.currentMarks < 60).length > 0 && (
                    <div className="border-l-2 border-rose-300 pl-3">
                      <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold mb-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Subjects requiring attention
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(a.subjects || []).filter((s) => s.currentMarks < 60).map((s) => (
                          <span
                            key={s.subjectSlug}
                            className={`ai-tag ${s.currentMarks < 45 ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}
                          >
                            {s.subjectName} - {s.currentMarks}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Performance vs target</p>
                    <div className="h-56">
                      <Bar data={performanceData} options={CHART_OPTS} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Performance trend</p>
                    <div className="h-48">
                      <Line
                        data={trendData}
                        options={{
                          ...CHART_OPTS,
                          scales: {
                            ...CHART_OPTS.scales,
                            y: { ...CHART_OPTS.scales.y, max: 100 },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="ai-fade-up" style={{ animationDelay: '0.1s' }}>
              <LearningStyleCard
                learningStyle={a.learningStyle}
                engagementScore={a.engagementScore}
                confidenceLevel={a.confidenceLevel}
                attentionLevel={a.attentionLevel}
                recommendedStudyHours={a.recommendedStudyHours}
                motivationalFeedback={a.motivationalFeedback}
                estimatedImprovementPotential={a.estimatedImprovementPotential}
              />
            </div>

            {a.modalityScores && Object.keys(a.modalityScores).length > 0 && (
              <div className="ai-fade-up" style={{ animationDelay: '0.12s' }}>
                <ModalityRadar scores={a.modalityScores} />
              </div>
            )}

            <div className="ai-rail ai-fade-up" style={{ animationDelay: '0.14s' }}>
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <LightBulbIcon className="h-5 w-5 text-teal-600" />
                  AI coach feed
                </div>
                <button
                  onClick={handleGenRecs}
                  disabled={genLoading}
                  className="ai-btn ai-btn--ghost ai-btn--compact disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${genLoading ? 'animate-spin' : ''}`} />
                  {genLoading ? 'Generating...' : 'Refresh'}
                </button>
              </div>
              <div className="ai-panel__body">
                {(a.recommendations || []).length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-slate-400">No recommendations yet</p>
                    <button
                      onClick={handleGenRecs}
                      disabled={genLoading}
                      className="ai-btn ai-btn--primary disabled:opacity-50"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Generate recommendations
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {(a.recommendations || []).map((rec) => (
                      <RecommendationCard
                        key={rec._id}
                        rec={rec}
                        onDismiss={dismissRecommendation}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ai-rail ai-fade-up" style={{ animationDelay: '0.16s' }}>
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <BoltIcon className="h-5 w-5 text-teal-600" />
                  Quick actions
                </div>
              </div>
              <div className="ai-panel__body">
                {quickActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="ai-row text-sm font-semibold text-slate-700"
                    >
                      <span className="flex items-center gap-3">
                        <span className="ai-icon-chip">
                          <Icon className="h-4 w-4" />
                        </span>
                        {item.label}
                      </span>
                      <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </section>

        {(a.personalizedInsights || []).length > 0 && (
          <section className="ai-section ai-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="ai-rail">
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <LightBulbIcon className="h-5 w-5 text-teal-600" />
                  AI insights
                </div>
              </div>
              <div className="ai-panel__body">
                <ul className="grid sm:grid-cols-2 gap-3">
                  {a.personalizedInsights.map((insight, i) => (
                    <li key={i} className="ai-row ai-row--start text-sm text-slate-600">
                      <span className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-teal-500" />
                        {insight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="ai-dashboard min-h-screen">
      <div className="ai-shell space-y-8 animate-pulse">
        <div className="ai-hero">
          <div className="h-6 bg-slate-200 rounded-lg w-40 mb-3" />
          <div className="h-10 bg-slate-200 rounded-xl w-80" />
        </div>
        <div className="ai-kpi-strip grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100" />)}
        </div>
        <div className="ai-grid-main">
          <div className="space-y-6">
            <div className="h-44 bg-slate-100 rounded-2xl" />
            <div className="h-64 bg-slate-100 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-72 bg-slate-100 rounded-2xl" />
            <div className="h-48 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
