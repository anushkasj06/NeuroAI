export default function BattleResult({ result, userId, onPlayAgain, onHome }) {
  if (!result) return null;

  const isWinner = result.winner?.userId === userId;
  const myStats  = result.playerStats?.find((p) => p.userId === userId);
  const oppStats = result.playerStats?.find((p) => p.userId !== userId);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center">

      {/* Win / Lose banner */}
      <div className={`rounded-3xl p-8 ${
        isWinner
          ? 'bg-gradient-to-br from-amber-600 to-yellow-500 shadow-xl shadow-amber-900/40'
          : 'bg-gradient-to-br from-gray-800 to-gray-700'
      }`}>
        <p className="text-5xl mb-3">{isWinner ? '🏆' : '💪'}</p>
        <h1 className="text-3xl font-black text-white">
          {isWinner ? 'You Won!' : 'Good Fight!'}
        </h1>
        <p className="text-white/80 mt-1 text-sm">
          {isWinner
            ? `You beat ${oppStats?.name ?? 'your opponent'}!`
            : `${result.winner?.name ?? 'Opponent'} wins this round`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {[myStats, oppStats].filter(Boolean).map((s, i) => (
          <div
            key={s.userId}
            className={`rounded-2xl border p-5 space-y-3 ${
              s.userId === userId
                ? 'border-indigo-700 bg-indigo-950/40'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            <p className={`text-sm font-bold ${s.userId === userId ? 'text-indigo-300' : 'text-rose-300'}`}>
              {s.name}{s.userId === userId && ' (you)'}
            </p>
            <p className="text-3xl font-black text-white">{s.score}</p>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Correct</span>
                <span className="text-white font-semibold">{s.correct}/{s.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy</span>
                <span className="text-white font-semibold">{s.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Best streak</span>
                <span className="text-amber-400 font-semibold">🔥 {s.streak}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
        >
          ⚔ Play Again
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-gray-300 font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          Back to Arena
        </button>
      </div>
    </div>
  );
}
