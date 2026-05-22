import { ChartBarSquareIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function SubjectStrengthChart({ subjects, strengths, weaknesses }) {
  if (!subjects?.length) return null;

  const sorted = [...subjects].sort((a, b) => b.currentMarks - a.currentMarks);

  return (
    <div className="ai-rail">
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <ChartBarSquareIcon className="h-5 w-5 text-teal-600" />
          Subject performance
        </div>
      </div>

      <div className="ai-panel__body">

      <div className="space-y-3">
        {sorted.map((s) => {
          const pct = s.currentMarks;
          const color = pct >= 75 ? 'from-emerald-500 to-teal-500'
            : pct >= 50 ? 'from-amber-400 to-orange-400'
            : 'from-red-400 to-rose-500';
          const badge = pct >= 75 ? 'bg-emerald-50 text-emerald-700'
            : pct >= 50 ? 'bg-amber-50 text-amber-700'
            : 'bg-red-50 text-red-700';

          return (
            <div key={s.subjectSlug}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{s.subjectName}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {(strengths?.length > 0 || weaknesses?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100">
          {strengths?.length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-2">
                <CheckCircleIcon className="h-4 w-4" />
                Strengths
              </p>
              <ul className="space-y-1">
                {strengths.slice(0, 3).map((s) => (
                  <li key={s.subject} className="text-xs text-slate-600">
                    <span className="font-medium">{s.subject}</span> - {s.strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses?.length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Needs work
              </p>
              <ul className="space-y-1">
                {weaknesses.slice(0, 3).map((s) => (
                  <li key={s.subject} className="text-xs text-slate-600">
                    <span className="font-medium">{s.subject}</span> - {s.weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
