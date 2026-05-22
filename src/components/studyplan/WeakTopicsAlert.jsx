import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function WeakTopicsAlert({ weakTopics }) {
  if (!weakTopics?.length) return null;
  return (
    <div className="ai-panel--warning">
      <div className="flex items-center gap-2 text-amber-800 font-semibold mb-3">
        <ExclamationTriangleIcon className="h-5 w-5" />
        <h3>Topics needing attention</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6">
        {weakTopics.map((t) => (
          <div key={t._id || t.topic} className="ai-row text-sm text-slate-700">
            <div>
              <p className="font-medium text-slate-800">{t.topic}</p>
              <p className="text-xs text-slate-500">{t.subject}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-amber-700">{t.masteryPercent}%</p>
              <p className="text-xs text-slate-400">mastery</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
