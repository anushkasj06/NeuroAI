import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  ClockIcon,
  FireIcon,
  FlagIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const TYPE_CONFIG = {
  difficulty_adjustment: { icon: WrenchScrewdriverIcon, color: 'border-l-sky-400' },
  schedule_change:       { icon: CalendarDaysIcon,     color: 'border-l-teal-400' },
  topic_focus:           { icon: FlagIcon,             color: 'border-l-indigo-400' },
  revision_alert:        { icon: ArrowPathIcon,        color: 'border-l-amber-400' },
  motivation:            { icon: BoltIcon,             color: 'border-l-emerald-400' },
  study_tip:             { icon: LightBulbIcon,        color: 'border-l-yellow-400' },
  break_suggestion:      { icon: ClockIcon,            color: 'border-l-orange-400' },
  streak_encouragement:  { icon: FireIcon,             color: 'border-l-rose-400' },
};

const PRIORITY_BADGE = {
  urgent: 'bg-red-50 text-red-600',
  high:   'bg-orange-50 text-orange-600',
  medium: 'bg-blue-50 text-blue-600',
  low:    'bg-gray-50 text-gray-500',
};

export default function RecommendationCard({ rec, onDismiss }) {
  const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.study_tip;
  const Icon = cfg.icon;

  return (
    <div className={`ai-row ai-row--start border-l-2 ${cfg.color} px-3`}>
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="mt-0.5 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[rec.priority] || PRIORITY_BADGE.medium}`}>
                {rec.priority}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{rec.message}</p>
            {rec.actionLabel && rec.actionRoute && (
              <Link to={rec.actionRoute} className="inline-block mt-1.5 text-xs text-teal-700 font-medium hover:underline">
                {rec.actionLabel}
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(rec._id)}
          className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          x
        </button>
      </div>
    </div>
  );
}
