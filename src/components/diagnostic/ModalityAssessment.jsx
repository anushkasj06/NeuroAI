import { useState, useEffect } from 'react';
import { useAssessmentTimer } from '../../hooks/useAssessmentTimer';

/**
 * Shared assessment UI for text / audio / video modes.
 */
export default function ModalityAssessment({
  mode,
  content,
  onSubmit,
  loading,
}) {
  const [phase, setPhase] = useState('content');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [replayCount, setReplayCount] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [startedAt] = useState(new Date().toISOString());

  const { elapsedSeconds, markQuestionStart, getResponseTimeMs } = useAssessmentTimer(
    phase === 'content' || phase === 'quiz'
  );

  const allQuestions = [
    ...(content.mcqQuestions || []),
    ...(content.shortQuestions || []),
    ...(content.questions || []),
  ];

  useEffect(() => {
    if (phase === 'quiz') markQuestionStart();
  }, [qIndex, phase, markQuestionStart]);

  const currentQ = allQuestions[qIndex];

  const saveAnswer = (value) => {
    const responseTimeMs = getResponseTimeMs();
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { questionId: currentQ.id, selectedAnswer: value, responseTimeMs },
    }));
  };

  const finishQuiz = async () => {
    const payload = {
      startedAt,
      answers: allQuestions.map((q) => answers[q.id] || { questionId: q.id, selectedAnswer: '', responseTimeMs: 0 }),
      readingOrWatchTimeSeconds: mode === 'text' || mode === 'video' ? elapsedSeconds : 0,
      listeningDurationSeconds: mode === 'audio' ? elapsedSeconds : 0,
      replayCount,
      pauseCount,
      skipCount,
    };
    await onSubmit(payload);
  };

  const goNextQuestion = () => {
    if (qIndex < allQuestions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  if (phase === 'content') {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h2>
        <p className="text-indigo-600 font-medium mb-4">Topic: {content.topic}</p>

        {mode === 'text' && (
          <div className="prose max-w-none mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 leading-relaxed text-gray-700">
            {content.paragraph}
          </div>
        )}

        {mode === 'audio' && (
          <div className="mb-6">
            <audio
              controls
              className="w-full"
              src={content.audioUrl}
              onPlay={() => {}}
              onEnded={() => {}}
            />
            <button
              type="button"
              className="mt-2 text-sm text-indigo-600"
              onClick={() => setReplayCount((c) => c + 1)}
            >
              + Count replay (manual: {replayCount})
            </button>
            <details className="mt-3 text-sm text-gray-500">
              <summary className="cursor-pointer">Show transcript</summary>
              <p className="mt-2">{content.transcript}</p>
            </details>
          </div>
        )}

        {mode === 'video' && (
          <div className="mb-6">
            <video
              controls
              className="w-full rounded-xl bg-black max-h-80"
              src={content.videoUrl}
              onPause={() => setPauseCount((c) => c + 1)}
            />
            <p className="text-sm text-gray-500 mt-2">{content.description}</p>
            <button
              type="button"
              className="mt-2 text-sm text-gray-500"
              onClick={() => setSkipCount((c) => c + 1)}
            >
              Log skip (+{skipCount})
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Time on content: {elapsedSeconds}s</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setPhase('quiz');
            setQIndex(0);
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
        >
          Continue to quiz →
        </button>
      </div>
    );
  }

  if (!currentQ) return null;

  const hasAnswer = answers[currentQ.id]?.selectedAnswer?.trim();

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>
          Question {qIndex + 1} / {allQuestions.length}
        </span>
        <span>{elapsedSeconds}s elapsed</span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-6">{currentQ.question}</h3>

      {currentQ.type === 'mcq' ? (
        <div className="grid gap-3">
          {currentQ.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => saveAnswer(opt)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                answers[currentQ.id]?.selectedAnswer === opt
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 hover:border-indigo-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
          placeholder="Type your answer..."
          value={answers[currentQ.id]?.selectedAnswer || ''}
          onChange={(e) => saveAnswer(e.target.value)}
        />
      )}

      <button
        type="button"
        disabled={!hasAnswer || loading}
        onClick={goNextQuestion}
        className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium disabled:opacity-50"
      >
        {loading
          ? 'Submitting...'
          : qIndex === allQuestions.length - 1
            ? 'Submit assessment'
            : 'Next question'}
      </button>
    </div>
  );
}
