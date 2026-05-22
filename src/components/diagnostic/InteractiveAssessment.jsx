import { useState, useEffect, useMemo } from 'react';
import { useAssessmentTimer } from '../../hooks/useAssessmentTimer';

export default function InteractiveAssessment({ content, onSubmit, loading }) {
  const [phase, setPhase] = useState('match');
  const [selectedTerm, setSelectedTerm] = useState(null);
  // matched: { [pairId]: { correct: bool, selected: string } }
  const [matched, setMatched] = useState({});
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [interactionCount, setInteractionCount] = useState(0);
  const [startedAt] = useState(new Date().toISOString());

  const { elapsedSeconds, markQuestionStart, getResponseTimeMs } = useAssessmentTimer(true);

  // Shuffle definitions once on mount
  const shuffledDefinitions = useMemo(() => {
    const defs = content.matchPairs.map((p) => p.definition);
    return [...defs].sort(() => Math.random() - 0.5);
  }, [content.matchPairs]);

  const quizQuestions = [
    ...(content.mcqQuestions || []),
    ...(content.shortQuestions || []),
  ];

  useEffect(() => {
    if (phase === 'quiz') markQuestionStart();
  }, [qIndex, phase, markQuestionStart]);

  const currentQ = quizQuestions[qIndex];

  // ── MATCH PHASE HANDLERS ───────────────────────────────────────────────────

  const handleTermClick = (pair) => {
    // Don't allow re-clicking a correctly matched term
    if (matched[pair.id]?.correct) return;
    setInteractionCount((c) => c + 1);
    setSelectedTerm(selectedTerm === pair.id ? null : pair.id);
  };

  const handleDefinitionClick = (definition) => {
    if (!selectedTerm) return;
    setInteractionCount((c) => c + 1);

    const pair = content.matchPairs.find((p) => p.id === selectedTerm);
    const isCorrect = pair.definition === definition;

    setMatched((prev) => ({
      ...prev,
      [selectedTerm]: { correct: isCorrect, selected: definition },
    }));

    setAnswers((prev) => ({
      ...prev,
      [selectedTerm]: {
        questionId: selectedTerm,
        selectedAnswer: definition,
        responseTimeMs: getResponseTimeMs(),
      },
    }));

    setSelectedTerm(null);
  };

  const resetMatch = (pairId) => {
    setMatched((prev) => {
      const next = { ...prev };
      delete next[pairId];
      return next;
    });
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[pairId];
      return next;
    });
  };

  const allMatchesDone = content.matchPairs.every((p) => matched[p.id]?.correct);
  const matchedCount = Object.values(matched).filter((m) => m.correct).length;
  const answeredMatches = content.matchPairs.filter((p) => answers[p.id]?.selectedAnswer).length;
  const allMatchesAttempted = content.matchPairs.every((p) => answers[p.id]?.selectedAnswer);
  const canProceed = allMatchesAttempted;

  // ── QUIZ PHASE HANDLERS ────────────────────────────────────────────────────

  const saveQuizAnswer = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        selectedAnswer: value,
        responseTimeMs: getResponseTimeMs(),
      },
    }));
  };

  const submitAll = async () => {
    const matchAnswers = content.matchPairs.map(
      (p) =>
        answers[p.id] || {
          questionId: p.id,
          selectedAnswer: matched[p.id]?.selected || '',
          responseTimeMs: 0,
        }
    );
    const quizAnswers = quizQuestions.map(
      (q) => answers[q.id] || { questionId: q.id, selectedAnswer: '', responseTimeMs: 0 }
    );
    await onSubmit({
      startedAt,
      answers: [...matchAnswers, ...quizAnswers],
      interactionCount,
      readingOrWatchTimeSeconds: elapsedSeconds,
    });
  };

  // ── MATCH PHASE UI ─────────────────────────────────────────────────────────
  if (phase === 'match') {
    // Which definitions are already correctly matched (to dim them)
    const usedDefinitions = new Set(
      Object.values(matched)
        .filter((m) => m.correct)
        .map((m) => m.selected)
    );

    return (
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h2>
        <p className="text-emerald-600 font-medium mb-2">Topic: {content.topic}</p>
        <p className="text-gray-600 text-sm mb-6">{content.description}</p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Matches: {matchedCount} / {content.matchPairs.length}</span>
            <span>{elapsedSeconds}s</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${(matchedCount / content.matchPairs.length) * 100}%` }}
            />
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-4">
          Step 1 of 2 — Click a <strong className="text-indigo-600">term</strong>, then click its{' '}
          <strong className="text-emerald-600">matching description</strong>
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Terms column */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide font-semibold text-indigo-500 mb-2">
              🏷️ Terms
            </h3>
            {content.matchPairs.map((pair) => {
              const matchResult = matched[pair.id];
              const isCorrect = matchResult?.correct;
              const isWrong = matchResult && !matchResult.correct;
              const isSelected = selectedTerm === pair.id;

              return (
                <button
                  key={pair.id}
                  type="button"
                  disabled={isCorrect}
                  onClick={() => isWrong ? resetMatch(pair.id) : handleTermClick(pair)}
                  className={`w-full p-3 rounded-xl border-2 text-left font-medium transition-all text-sm ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-default'
                      : isWrong
                        ? 'border-red-300 bg-red-50 text-red-800 cursor-pointer'
                        : isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-gray-800'
                  }`}
                >
                  {isCorrect && <span className="mr-1">✓</span>}
                  {isWrong && <span className="mr-1 text-xs">✗ tap to retry</span>}
                  {pair.term}
                </button>
              );
            })}
          </div>

          {/* Definitions column */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide font-semibold text-emerald-500 mb-2">
              📝 Descriptions
            </h3>
            {shuffledDefinitions.map((def) => {
              const isUsed = usedDefinitions.has(def);
              return (
                <button
                  key={def}
                  type="button"
                  onClick={() => !isUsed && handleDefinitionClick(def)}
                  disabled={isUsed || !selectedTerm}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                    isUsed
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 opacity-60 cursor-default'
                      : selectedTerm
                        ? 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-800 cursor-pointer'
                        : 'border-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isUsed && <span className="mr-1">✓</span>}
                  {def}
                </button>
              );
            })}
          </div>
        </div>

        {!selectedTerm && answeredMatches < content.matchPairs.length && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            ← Select a term on the left to begin matching
          </p>
        )}
        {selectedTerm && (
          <p className="mt-4 text-xs text-indigo-600 text-center font-medium animate-pulse">
            Now click the matching description on the right →
          </p>
        )}

        <div className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-700">
          <p className="font-medium">Interactive ability is being evaluated, not just perfectly correct matches.</p>
          <p className="mt-1 text-gray-600">
            {matchedCount} correct out of {content.matchPairs.length} matches, {answeredMatches} attempted.
          </p>
        </div>

        <button
          type="button"
          disabled={!canProceed}
          onClick={() => {
            setPhase('quiz');
            setQIndex(0);
            markQuestionStart();
          }}
          className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {allMatchesDone
            ? 'Continue to quiz questions →'
            : `Continue with current answers →`}
        </button>
      </div>
    );
  }

  // ── QUIZ PHASE UI ──────────────────────────────────────────────────────────
  if (!currentQ) return null;

  const hasAnswer = answers[currentQ.id]?.selectedAnswer?.trim();

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-emerald-600 font-medium">
          Step 2 of 2 — Quiz · Question {qIndex + 1} / {quizQuestions.length}
        </p>
        <span className="text-xs text-gray-400">{elapsedSeconds}s</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-6">
        {quizQuestions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < qIndex
                ? 'bg-emerald-500'
                : i === qIndex
                  ? 'bg-indigo-500'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${
          currentQ.type === 'mcq'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-indigo-50 text-indigo-700'
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
              onClick={() => saveQuizAnswer(opt)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                answers[currentQ.id]?.selectedAnswer === opt
                  ? 'border-emerald-500 bg-emerald-50 font-medium'
                  : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          placeholder="Type your answer here..."
          value={answers[currentQ.id]?.selectedAnswer || ''}
          onChange={(e) => saveQuizAnswer(e.target.value)}
        />
      )}

      <button
        type="button"
        disabled={!hasAnswer || loading}
        onClick={() => {
          if (qIndex < quizQuestions.length - 1) {
            setQIndex((i) => i + 1);
          } else {
            submitAll();
          }
        }}
        className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {loading
          ? 'Submitting...'
          : qIndex === quizQuestions.length - 1
            ? 'Submit interactive assessment ✓'
            : 'Next →'}
      </button>
    </div>
  );
}
