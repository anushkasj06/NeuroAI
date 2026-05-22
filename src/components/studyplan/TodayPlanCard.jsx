const SESSION_COLORS = {
  learn:    'bg-indigo-50 border-indigo-200 text-indigo-700',
  revise:   'bg-amber-50 border-amber-200 text-amber-700',
  practice: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  quiz:     'bg-purple-50 border-purple-200 text-purple-700',
  rest:     'bg-gray-50 border-gray-200 text-gray-500',
};
const SESSION_EMOJI = { learn: '📘', revise: '🔄', practice: '✏️', quiz: '🧪', rest: '☕' };
const DIFF_BADGE = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};

export default function TodayPlanCard({ sessions, completionPercent }) {
  if (!sessions?.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-50">
        <h3 className="font-bold text-gray-900 mb-2">📅 Today's Plan</h3>
        <p className="text-sm text-gray-400">No sessions scheduled for today. Check your weekly plan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">📅 Today's Plan</h3>
        <span className="text-sm font-semibold text-indigo-600">{completionPercent}% done</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="space-y-2">
        {sessions.map((s, i) => (
          <div
            key={s._id || i}
            className={`flex items-center gap-3 p-3 rounded-xl border ${SESSION_COLORS[s.sessionType] || SESSION_COLORS.learn} ${s.completed ? 'opacity-60' : ''}`}
          >
            <span className="text-lg">{SESSION_EMOJI[s.sessionType] || '📘'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${s.completed ? 'line-through' : ''}`}>
                {s.topic}{s.subtopic ? ` — ${s.subtopic}` : ''}
              </p>
              <p className="text-xs opacity-70">{s.subject} · {s.durationMinutes}min</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[s.difficultyLevel] || DIFF_BADGE.medium}`}>
                {s.difficultyLevel}
              </span>
              {s.completed && <span className="text-emerald-500 text-sm">✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
