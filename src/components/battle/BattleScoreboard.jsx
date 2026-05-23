export default function BattleScoreboard({ scores, userId }) {
  if (!scores?.length) return null;

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-around gap-4">
        {scores.map((s, i) => {
          const isMe = s.userId === userId;
          return (
            <div key={s.userId} className={`flex items-center gap-3 ${i === 0 ? 'order-first' : 'order-last'}`}>
              {/* Rank */}
              <span className={`text-lg font-black ${i === 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                #{i + 1}
              </span>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isMe ? 'bg-indigo-600 text-white' : 'bg-rose-700 text-white'
              }`}>
                {s.name?.charAt(0)?.toUpperCase()}
              </div>
              {/* Name + score */}
              <div>
                <p className={`text-xs font-semibold ${isMe ? 'text-indigo-300' : 'text-rose-300'}`}>
                  {s.name}{isMe && ' (you)'}
                </p>
                <p className="text-lg font-black text-white">{s.score}</p>
              </div>
              {/* Streak */}
              {s.streak > 1 && (
                <span className="text-xs text-amber-400 font-bold">🔥 x{s.streak}</span>
              )}
            </div>
          );
        })}

        {/* VS divider */}
        {scores.length >= 2 && (
          <span className="text-gray-700 font-black text-lg">VS</span>
        )}
      </div>
    </div>
  );
}
