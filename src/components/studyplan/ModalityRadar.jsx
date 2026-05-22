const MODES = [
  { key: 'text',        label: 'Text',        emoji: '📖', color: 'from-blue-500 to-cyan-500' },
  { key: 'audio',       label: 'Audio',       emoji: '🎧', color: 'from-amber-500 to-orange-500' },
  { key: 'video',       label: 'Video',       emoji: '🎬', color: 'from-violet-500 to-purple-500' },
  { key: 'interactive', label: 'Interactive', emoji: '🧩', color: 'from-emerald-500 to-teal-500' },
];

export default function ModalityRadar({ scores }) {
  if (!scores) return null;
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-50">
      <h3 className="font-bold text-gray-900 mb-4">🎯 Modality Scores</h3>
      <div className="space-y-3">
        {MODES.map((m) => {
          const val = scores[m.key] ?? 0;
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">{m.emoji} {m.label}</span>
                <span className="font-bold text-gray-700">{val}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-700`}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
