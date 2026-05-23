import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBattleQuiz } from '../hooks/useBattleQuiz';
import { useAuth } from '../context/AuthContext';
import BattleCountdown from '../components/battle/BattleCountdown';
import BattleQuestion from '../components/battle/BattleQuestion';
import BattleScoreboard from '../components/battle/BattleScoreboard';
import BattleResult from '../components/battle/BattleResult';

export default function BattleGame() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    phase, battleMeta, countdown,
    currentQuestion, questionIndex, totalQuestions,
    secondsLeft, scores, myScore, opponentScore,
    myResult, opponentAnswered, finalResult,
    hasAnswered, submitting, error,
    submitAnswer,
  } = useBattleQuiz();

  // If no battle started yet, redirect back to lobby
  useEffect(() => {
    if (phase === 'idle' && !battleMeta) {
      navigate(`/battle/lobby`, { replace: true });
    }
  }, [phase, battleMeta, navigate]);

  if (phase === 'idle') return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* Top bar — always visible */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="text-sm text-gray-400">
          <span className="text-indigo-400 font-semibold">⚔ Battle</span>
          {battleMeta?.topic && <span className="ml-2">· {battleMeta.topic}</span>}
        </div>
        {phase === 'question' && (
          <div className="text-sm font-semibold text-gray-300">
            Q {questionIndex + 1} / {totalQuestions}
          </div>
        )}
        {/* Live mini-scores */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-indigo-400">{myScore?.name ?? 'You'}: {myScore?.score ?? 0}</span>
          <span className="text-gray-600">vs</span>
          <span className="text-rose-400">{opponentScore?.name ?? 'Opponent'}: {opponentScore?.score ?? 0}</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">

        {phase === 'countdown' && (
          <BattleCountdown
            countdown={countdown}
            subject={battleMeta?.subject}
            topic={battleMeta?.topic}
            players={battleMeta?.players}
          />
        )}

        {(phase === 'question' || phase === 'result_flash') && currentQuestion && (
          <BattleQuestion
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            secondsLeft={secondsLeft}
            hasAnswered={hasAnswered}
            submitting={submitting}
            myResult={myResult}
            opponentAnswered={opponentAnswered}
            onAnswer={submitAnswer}
          />
        )}

        {phase === 'finished' && finalResult && (
          <BattleResult
            result={finalResult}
            userId={user?._id}
            onPlayAgain={() => navigate('/battle/home')}
            onHome={() => navigate('/battle')}
          />
        )}
      </div>

      {/* Bottom scoreboard — visible during question phase */}
      {(phase === 'question' || phase === 'result_flash') && (
        <BattleScoreboard scores={scores} userId={user?._id} />
      )}
    </div>
  );
}
