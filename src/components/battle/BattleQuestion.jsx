const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function BattleQuestion({
  question, questionIndex, totalQuestions,
  secondsLeft, hasAnswered, submitting,
  myResult, opponentAnswered, onAnswer,
}) {
  const danger = secondsLeft <= 5;
  const warn   = secondsLeft <= 10 && !danger;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">

      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Question {questionIndex + 1} / {totalQuestions}</span>
          <span className={`font-bold ${danger ? 'text-red-400 animate-pulse' : warn ? 'text-amber-400' : 'text-emerald-400'}`}>
            {secondsLeft}s
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              danger ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${(secondsLeft / 20) * 100}%` }}
          />
        </div>
      </div>

      {/* Opponent status */}
      <div className={`text-xs text-center transition-all ${opponentAnswered ? 'text-amber-400' : 'text-gray-600'}`}>
        {opponentAnswered ? '⚡ Opponent answered!' : 'Waiting for opponent…'}
      </div>

      {/* Question */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <p className="text-lg font-semibold text-white leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((opt, i) => {
          const isSelected = hasAnswered && myResult?.answerIndex === i;
          const isCorrect  = myResult && i === myResult.correctIndex;
          const isWrong    = myResult && isSelected && !myResult.isCorrect;

          let cls = 'border-gray-700 bg-gray-900 hover:border-indigo-500 hover:bg-indigo-950/30';
          if (isCorrect && hasAnswered) cls = 'border-emerald-500 bg-emerald-950/50';
          else if (isWrong)             cls = 'border-red-500 bg-red-950/50';
          else if (isSelected)          cls = 'border-indigo-500 bg-indigo-950/50';

          return (
            <button
              key={i}
              disabled={hasAnswered || submitting || secondsLeft <= 0}
              onClick={() => onAnswer(i)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 disabled:cursor-not-allowed ${cls}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                isCorrect && hasAnswered ? 'bg-emerald-600 text-white' :
                isWrong                 ? 'bg-red-600 text-white' :
                isSelected              ? 'bg-indigo-600 text-white' :
                                          'bg-gray-800 text-gray-400'
              }`}>
                {OPTION_LABELS[i]}
              </span>
              <span className="text-sm text-gray-200">{opt}</span>
              {isCorrect && hasAnswered && <span className="ml-auto text-emerald-400">✓</span>}
              {isWrong                  && <span className="ml-auto text-red-400">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Result flash */}
      {myResult && (
        <div className={`p-4 rounded-xl text-center text-sm font-semibold transition-all ${
          myResult.isCorrect
            ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
            : 'bg-red-950 border border-red-800 text-red-300'
        }`}>
          {myResult.isCorrect
            ? `✓ Correct! +${myResult.pointsEarned} pts${myResult.streak > 1 ? ` 🔥 x${myResult.streak} streak` : ''}`
            : '✗ Wrong'}
          {myResult.explanation && (
            <p className="mt-1 text-xs font-normal opacity-80">{myResult.explanation}</p>
          )}
        </div>
      )}

      {/* Waiting message */}
      {hasAnswered && !myResult && (
        <p className="text-center text-sm text-gray-500 animate-pulse">
          Waiting for opponent…
        </p>
      )}
    </div>
  );
}
