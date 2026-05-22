const STYLE_EMOJI = {
  'Visual Learner': '👁️',
  'Audio Learner': '🎧',
  'Reading/Writing Learner': '📖',
  'Interactive Learner': '🧩',
};

export default function StatsRow({ analytics: a }) {
  const stats = [
    {
      label: 'Learning Style',
      value: a.learningStyle ? STYLE_EMOJI[a.learningStyle] + ' ' + a.learningStyle.replace(' Learner', '') : '—',
      sub: 'Detected by AI',
      color: 'from-indigo-500 to-purple-600',
    },
    {
      label: 'Engagement',
      value: `${a.engagementScore ?? 0}%`,
      sub: a.confidenceLevel ? `${a.confidenceLevel} confidence` : 'Score',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Study Streak',
      value: `${a.currentStreak ?? 0} days`,
      sub: `Best: ${a.longestStreak ?? 0} days`,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Plan Progress',
      value: a.hasPlan ? `${a.overallCompletionPercent ?? 0}%` : 'No plan',
      sub: a.hasPlan ? `${a.totalCompletedHours ?? 0}h / ${a.totalPlannedHours ?? 0}h` : 'Generate one',
      color: 'from-rose-500 to-pink-600',
    },
    {
      label: 'Target Score',
      value: `${a.targetScore ?? 0}%`,
      sub: `Current: ${a.currentScore ?? 0}%`,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      label: 'Days to Exam',
      value: a.daysUntilExam != null ? `${a.daysUntilExam}d` : '—',
      sub: a.examName || 'Set exam date',
      color: 'from-violet-500 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
          <p className={`text-lg font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent leading-tight`}>
            {s.value}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
