import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useStudyPlan } from '../hooks/useStudyPlan';
import LearningStyleCard from '../components/studyplan/LearningStyleCard';
import SubjectStrengthChart from '../components/studyplan/SubjectStrengthChart';
import TodayPlanCard from '../components/studyplan/TodayPlanCard';
import StatsRow from '../components/studyplan/StatsRow';
import RecommendationCard from '../components/studyplan/RecommendationCard';
import WeakTopicsAlert from '../components/studyplan/WeakTopicsAlert';
import ModalityRadar from '../components/studyplan/ModalityRadar';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Diagnostic First</h2>
          <p className="text-gray-500 mb-6">Your AI dashboard unlocks after the diagnostic assessment.</p>
          <Link to="/diagnostic" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium">
            Start Diagnostic →
          </Link>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              🧠 NeuroLearn Dashboard
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Your complete AI-powered learning ecosystem</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!a.hasPlan ? (
              <Link to="/study-plan/generate" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm shadow hover:opacity-90 transition-opacity">
                ✨ Generate Study Plan
              </Link>
            ) : (
              <Link to="/study-plan" className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm shadow hover:opacity-90 transition-opacity">
                📅 My Study Plan
              </Link>
            )}
            <Link to="/learn" className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 font-medium text-sm hover:bg-indigo-50 transition-colors">
              📚 Learn Now
            </Link>
            <Link to="/prediction" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors">
              📈 Predictions
            </Link>
          </div>
        </div>

        {/* ── Stats row ── */}
        <StatsRow analytics={a} />

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Today's plan */}
            {a.hasPlan && (
              <TodayPlanCard
                sessions={a.todaySessions || []}
                completionPercent={a.todayCompletionPercent || 0}
              />
            )}

            {/* No plan CTA */}
            {!a.hasPlan && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-1">✨ Ready to start learning?</h3>
                <p className="text-white/80 text-sm mb-4">Generate your AI-powered personalized study plan using your diagnostic results.</p>
                <Link to="/study-plan/generate" className="inline-block px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-colors">
                  Generate My Plan →
                </Link>
              </div>
            )}

            {/* Subject performance */}
            <SubjectStrengthChart
              subjects={a.subjects || []}
              strengths={a.subjectStrengths || []}
              weaknesses={a.subjectWeaknesses || []}
            />

            {/* Weak topics */}
            {a.weakTopics?.length > 0 && (
              <WeakTopicsAlert weakTopics={a.weakTopics} />
            )}

            {/* ── Academic Charts (collapsible) ── */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 overflow-hidden">
              <button
                onClick={() => setShowCharts((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-gray-900">📊 Academic Performance Charts</span>
                <span className="text-gray-400 text-lg">{showCharts ? '▲' : '▼'}</span>
              </button>

              {showCharts && subjectLabels.length > 0 && (
                <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
                  {/* At-risk alert */}
                  {(a.subjects || []).filter((s) => s.currentMarks < 60).length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Subjects Requiring Attention</p>
                      <div className="flex flex-wrap gap-2">
                        {(a.subjects || []).filter((s) => s.currentMarks < 60).map((s) => (
                          <span key={s.subjectSlug} className={`px-3 py-1 rounded-full text-xs font-medium ${s.currentMarks < 45 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {s.subjectName}: {s.currentMarks}% {s.currentMarks < 45 ? '🔴' : '🟠'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bar chart */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Performance vs Target</p>
                    <div className="h-56">
                      <Bar data={performanceData} options={CHART_OPTS} />
                    </div>
                  </div>

                  {/* Line chart */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Performance Trend</p>
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

          {/* Right column (1/3) */}
          <div className="space-y-6">

            {/* Learning style */}
            <LearningStyleCard
              learningStyle={a.learningStyle}
              engagementScore={a.engagementScore}
              confidenceLevel={a.confidenceLevel}
              attentionLevel={a.attentionLevel}
              recommendedStudyHours={a.recommendedStudyHours}
              motivationalFeedback={a.motivationalFeedback}
              estimatedImprovementPotential={a.estimatedImprovementPotential}
            />

            {/* Modality scores */}
            {a.modalityScores && Object.keys(a.modalityScores).length > 0 && (
              <ModalityRadar scores={a.modalityScores} />
            )}

            {/* AI Recommendations */}
            <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">🤖 AI Suggestions</h3>
                <button
                  onClick={handleGenRecs}
                  disabled={genLoading}
                  className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-50"
                >
                  {genLoading ? 'Generating…' : '↻ Refresh'}
                </button>
              </div>
              {(a.recommendations || []).length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">No suggestions yet</p>
                  <button
                    onClick={handleGenRecs}
                    disabled={genLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {genLoading ? 'Generating…' : '✨ Get AI Suggestions'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
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

            {/* Quick links */}
            <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-50">
              <h3 className="font-bold text-gray-900 mb-3">⚡ Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { to: '/learn',              label: '📚 Start Learning Session',  color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                  { to: '/study-plan/generate',label: '✨ Generate Study Plan',      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                  { to: '/progress',           label: '📈 View Progress',            color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                  { to: '/diagnostic',         label: '🔬 Redo Diagnostic',          color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                  { to: '/prediction',         label: '🎯 Score Prediction',         color: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${item.color}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Personalized Insights ── */}
        {(a.personalizedInsights || []).length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="font-bold text-lg mb-3">💡 Personalized Insights</h3>
            <ul className="grid sm:grid-cols-2 gap-2">
              {a.personalizedInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                  <span className="mt-0.5 text-white/50 shrink-0">→</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-gray-200 rounded-2xl" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-72 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
