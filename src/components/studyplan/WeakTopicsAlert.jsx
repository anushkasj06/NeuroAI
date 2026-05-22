export default function WeakTopicsAlert({ weakTopics }) {
  if (!weakTopics?.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <h3 className="font-bold text-amber-800 mb-3">⚠️ Topics Needing Attention</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {weakTopics.map((t) => (
          <div key={t._id || t.topic} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-100">
            <div>
              <p className="text-sm font-medium text-gray-800">{t.topic}</p>
              <p className="text-xs text-gray-500">{t.subject}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-600">{t.masteryPercent}%</p>
              <p className="text-xs text-gray-400">mastery</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
