export default function BattleCountdown({ countdown, subject, topic, players }) {
  return (
    <div className="text-center space-y-6 max-w-sm mx-auto">
      <div className="space-y-1">
        {subject && <p className="text-sm text-gray-400">{subject}</p>}
        {topic   && <p className="text-lg font-semibold text-white">{topic}</p>}
      </div>

      {/* Big countdown number */}
      <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-800 animate-ping opacity-30" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600" />
        <span className="text-6xl font-black text-white">
          {countdown > 0 ? countdown : '⚔'}
        </span>
      </div>

      <p className="text-gray-400 text-sm">
        {countdown > 0 ? 'Get ready…' : 'Battle starts now!'}
      </p>

      {/* Players */}
      {players?.length >= 2 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="font-semibold text-indigo-300">{players[0]?.name}</span>
          <span className="text-gray-600 font-bold">VS</span>
          <span className="font-semibold text-rose-300">{players[1]?.name}</span>
        </div>
      )}
    </div>
  );
}
