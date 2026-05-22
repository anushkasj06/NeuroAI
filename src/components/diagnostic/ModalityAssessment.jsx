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
      answers: allQuestions.map(
        (q) => answers[q.id] || { questionId: q.id, selectedAnswer: '', responseTimeMs: 0 }
      ),
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

  // ── CONTENT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'content') {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h2>

        {content.modality && (
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">
            {content.modality}
          </p>
        )}

        <p className="text-indigo-600 font-medium mb-1">Topic: {content.topic}</p>

        {content.subject && (
          <p className="text-sm text-gray-500 mb-4">Subject: {content.subject}</p>
        )}

        {/* ── TEXT MODE ── */}
        {mode === 'text' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-xl">📖</span>
              <p className="text-sm font-medium text-blue-800">
                Read the passage carefully, then answer the questions.
              </p>
            </div>
            <div className="prose max-w-none p-5 bg-slate-50 rounded-2xl border border-slate-200 leading-relaxed text-gray-800 text-base">
              {content.paragraph}
            </div>
          </div>
        )}

        {/* ── AUDIO MODE ── */}
        {mode === 'audio' && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-1">🎧 Audio Resource</p>
              {content.resourceTitle && (
                <p className="text-sm text-amber-800 mb-3">{content.resourceTitle}</p>
              )}
              <audio
                controls
                className="w-full"
                src={content.audioUrl}
                onPlay={() => setReplayCount((c) => c + 1)}
              />
              <p className="text-xs text-gray-500 mt-2">
                Local file: audio.mpeg · Replays: {replayCount}
              </p>
            </div>
            {content.youtubeUrl && (
              <a
                href={content.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:underline"
              >
                {content.youtubeLabel || content.resourceTitle} (YouTube) ↗
              </a>
            )}
            {content.transcript && (
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer font-medium select-none">
                  Show transcript
                </summary>
                <p className="mt-2 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {content.transcript}
                </p>
              </details>
            )}
          </div>
        )}

        {/* ── VIDEO MODE ── */}
        {mode === 'video' && (
          <div className="mb-6 space-y-4">
            <p className="text-sm font-semibold text-gray-800">🎬 Animated Educational Video</p>
            {content.resourceTitle && (
              <p className="text-sm text-indigo-700 mb-2">{content.resourceTitle}</p>
            )}
            <video
              controls
              className="w-full rounded-xl bg-black max-h-96"
              src={content.videoUrl}
              onPause={() => setPauseCount((c) => c + 1)}
            />
            <p className="text-xs text-gray-500">
              Local file: vedio.mp4 · Pauses: {pauseCount}
            </p>
            {content.description && (
              <p className="text-sm text-gray-600">{content.description}</p>
            )}
            {content.youtubeUrl && (
              <a
                href={content.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:underline"
              >
                {content.youtubeLabel || content.resourceTitle} (YouTube) ↗
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Time on content: {elapsedSeconds}s</span>
          <span>{allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''} to follow</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setPhase('quiz');
            setQIndex(0);
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Continue to quiz →
        </button>
      </div>
    );
  }

  // ── QUIZ PHASE ─────────────────────────────────────────────────────────────
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

      {/* Question type badge */}
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${
          currentQ.type === 'mcq'
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {currentQ.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
      </span>

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
                  ? 'border-indigo-500 bg-indigo-50 font-medium'
                  : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          placeholder="Type your answer here..."
          value={answers[currentQ.id]?.selectedAnswer || ''}
          onChange={(e) => saveAnswer(e.target.value)}
        />
      )}

      <button
        type="button"
        disabled={!hasAnswer || loading}
        onClick={goNextQuestion}
        className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {loading
          ? 'Submitting...'
          : qIndex === allQuestions.length - 1
            ? 'Submit assessment'
            : 'Next question →'}
      </button>
    </div>
  );
}
