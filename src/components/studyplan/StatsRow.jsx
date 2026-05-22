import {
  AdjustmentsHorizontalIcon,
  PresentationChartLineIcon,
  FireIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function StatsRow({ analytics: a }) {
  const stats = [
    {
      label: 'Learning style',
      value: a.learningStyle ? a.learningStyle.replace(' Learner', '') : 'N/A',
      sub: 'Detected by AI',
      icon: AdjustmentsHorizontalIcon,
    },
    {
      label: 'Engagement',
      value: `${a.engagementScore ?? 0}%`,
      sub: a.confidenceLevel ? `${a.confidenceLevel} confidence` : 'Score',
      icon: PresentationChartLineIcon,
    },
    {
      label: 'Study streak',
      value: `${a.currentStreak ?? 0} days`,
      sub: `Best: ${a.longestStreak ?? 0} days`,
      icon: FireIcon,
    },
    {
      label: 'Plan progress',
      value: a.hasPlan ? `${a.overallCompletionPercent ?? 0}%` : 'No plan',
      sub: a.hasPlan ? `${a.totalCompletedHours ?? 0}h / ${a.totalPlannedHours ?? 0}h` : 'Generate one',
      icon: ClipboardDocumentCheckIcon,
    },
    {
      label: 'Target score',
      value: `${a.targetScore ?? 0}%`,
      sub: `Current: ${a.currentScore ?? 0}%`,
      icon: ArrowTrendingUpIcon,
    },
    {
      label: 'Days to exam',
      value: a.daysUntilExam != null ? `${a.daysUntilExam} days` : 'N/A',
      sub: a.examName || 'Set exam date',
      icon: CalendarDaysIcon,
    },
  ];

  return (
    <div className="ai-kpi-strip grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="ai-kpi">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Icon className="h-4 w-4 text-teal-600" />
              {s.label}
            </div>
            <p className="text-lg font-semibold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
