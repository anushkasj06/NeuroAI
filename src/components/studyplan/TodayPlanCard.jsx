import {
  ArrowPathIcon,
  BeakerIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MoonIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const SESSION_DOT = {
  learn: '#0ea5e9',
  revise: '#f59e0b',
  practice: '#10b981',
  quiz: '#6366f1',
  rest: '#94a3b8',
};
const SESSION_ICON = {
  learn: BookOpenIcon,
  revise: ArrowPathIcon,
  practice: PencilSquareIcon,
  quiz: BeakerIcon,
  rest: MoonIcon,
};
const DIFF_TEXT = {
  easy: 'text-emerald-600',
  medium: 'text-amber-600',
  hard: 'text-rose-600',
};

export default function TodayPlanCard({ sessions, completionPercent }) {
  if (!sessions?.length) {
    return (
      <div className="ai-rail">
        <div className="ai-panel__header">
          <div className="ai-panel__title">
            <CalendarDaysIcon className="h-5 w-5 text-teal-600" />
            Focus flow
          </div>
        </div>
        <div className="ai-panel__body">
          <p className="text-sm text-slate-400">No sessions scheduled for today. Check your weekly plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-rail">
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <CalendarDaysIcon className="h-5 w-5 text-teal-600" />
          Focus flow
        </div>
        <span className="text-sm font-semibold text-teal-700">{completionPercent}% complete</span>
      </div>

      <div className="ai-panel__body">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-sky-500 rounded-full transition-all duration-700"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="ai-flow">
          {sessions.map((s, i) => {
            const Icon = SESSION_ICON[s.sessionType] || BookOpenIcon;
            return (
              <div key={s._id || i} className={`ai-flow__item ${s.completed ? 'opacity-60' : ''}`}>
                <span className="ai-flow__dot" style={{ background: SESSION_DOT[s.sessionType] || SESSION_DOT.learn }} />
                <div className="flex items-center gap-3">
                  <span className="ai-icon-chip">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${s.completed ? 'line-through' : ''}`}>
                      {s.topic}{s.subtopic ? ` - ${s.subtopic}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{s.subject} - {s.durationMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] uppercase tracking-wide ${DIFF_TEXT[s.difficultyLevel] || DIFF_TEXT.medium}`}>
                      {s.difficultyLevel}
                    </span>
                    {s.completed && <CheckCircleIcon className="h-4 w-4 text-emerald-600" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
