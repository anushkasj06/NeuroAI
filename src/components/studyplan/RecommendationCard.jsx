import { Link } from 'react-router-dom';

const TYPE_CONFIG = {
  difficulty_adjustment: { emoji: '⚙️', color: 'border-l-blue-400' },
  schedule_change:       { emoji: '📅', color: 'border-l-purple-400' },
  topic_focus:           { emoji: '🎯', color: 'border-l-indigo-400' },
  revision_alert:        { emoji: '🔄', color: 'border-l-amber-400' },
  motivation:            { emoji: '💪', color: 'border-l-emerald-400' },
  study_tip:             { emoji: '💡', color: 'border-l-yellow-400' },
  break_suggestion:      { emoji: '☕', color: 'border-l-orange-400' },
  streak_encouragement:  { emoji: '🔥', color: 'border-l-rose-400' },
};

const PRIORITY_BADGE = {
  urgent: 'bg-red-50 text-red-600',
  high:   'bg-orange-50 text-orange-600',
  medium: 'bg-blue-50 text-blue-600',
  low:    'bg-gray-50 text-gray-500',
};

export default function RecommendationCard({ rec, onDismiss }) {
  const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.study_tip;

  return (
    <div className={`border-l-4 ${cfg.color} bg-gray-50 rounded-r-xl p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-base mt-0.5">{cfg.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[rec.priority] || PRIORITY_BADGE.medium}`}>
                {rec.priority}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{rec.message}</p>
            {rec.actionLabel && rec.actionRoute && (
              <Link to={rec.actionRoute} className="inline-block mt-1.5 text-xs text-indigo-600 font-medium hover:underline">
                {rec.actionLabel} →
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(rec._id)}
          className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
