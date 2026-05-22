import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { rapidBattle } from '../services/api';
import './BattleArena.css';

const DEFAULT_QUESTION_COUNT = 8;
const PRESET_CONFIG = {
  pulse: { label: 'Pulse', subtitle: 'Balanced pressure', secondsPerQuestion: 8 },
  rush: { label: 'Rush', subtitle: 'Fast and sharp', secondsPerQuestion: 6 },
  overdrive: { label: 'Overdrive', subtitle: 'Maximum pressure', secondsPerQuestion: 4 },
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const BattleArena = () => {
  const [mode, setMode] = useState('solo');
  const [phase, setPhase] = useState('setup');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [presetId, setPresetId] = useState('rush');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESET_CONFIG.rush.secondsPerQuestion);
  const [countdown, setCountdown] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [answerFlash, setAnswerFlash] = useState('');
  const [lockedQuestion, setLockedQuestion] = useState(false);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaderboardTopic, setLeaderboardTopic] = useState('all');
  const [leaderboardInput, setLeaderboardInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const startedAtRef = useRef(null);
  const preset = PRESET_CONFIG[presetId] || PRESET_CONFIG.rush;
  const secondsPerQuestion = preset.secondsPerQuestion;

  const completedCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const progressPercent = questions.length ? Math.round((completedCount / questions.length) * 100) : 0;
  const attemptedCount = useMemo(() => answers.filter((entry) => entry && !entry.timedOut).length, [answers]);
  const currentAccuracy = useMemo(() => {
    const correct = answers.filter((entry) => entry?.isCorrect).length;
    const resolved = answers.filter(Boolean).length;
    if (!resolved) {
      return 0;
    }
    return Math.round((correct / resolved) * 100);
  }, [answers]);

  const fetchLeaderboard = async ({ topicFilter = leaderboardTopic, modeFilter = mode } = {}) => {
    try {
      const response = await rapidBattle.getLeaderboard({
        topic: topicFilter,
        mode: modeFilter === 'friend' ? 'friend' : 'solo',
        limit: 10,
      });
      setLeaderboard(response.data.data || []);
    } catch (leaderboardError) {
      console.error('Leaderboard fetch error:', leaderboardError);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await rapidBattle.getHistory();
      setHistory(response.data?.data || []);
    } catch (historyError) {
      console.error('History fetch error:', historyError);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard({ topicFilter: leaderboardTopic, modeFilter: mode });
  }, [leaderboardTopic, mode]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const resetPlayState = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setTimeLeft(secondsPerQuestion);
    setCountdown(3);
    setStreak(0);
    setBestStreak(0);
    setLiveScore(0);
    setAnswerFlash('');
    setLockedQuestion(false);
    setResult(null);
    setPhase('setup');
    setError('');
    startedAtRef.current = null;
  };

  const startSoloBattle = async () => {
    const cleanedTopic = topic.trim();
    if (!cleanedTopic) {
      setError('Pick a topic to start.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await rapidBattle.generateQuiz({
        topic: cleanedTopic,
        questionCount,
      });

      const generatedQuestions = response.data?.data?.questions || [];
      if (!generatedQuestions.length) {
        setError('No questions generated. Try a different topic.');
        return;
      }

      setQuestions(generatedQuestions);
      setAnswers(new Array(generatedQuestions.length).fill(null));
      setCurrentIndex(0);
      setStreak(0);
      setBestStreak(0);
      setLiveScore(0);
      setAnswerFlash('');
      setLockedQuestion(false);
      setTimeLeft(secondsPerQuestion);
      setCountdown(3);
      setPhase('countdown');
      setLeaderboardTopic(cleanedTopic.toLowerCase());
      setLeaderboardInput(cleanedTopic.toLowerCase());
    } catch (startError) {
      console.error('Rapid battle start error:', startError);
      setError(startError.response?.data?.message || 'Failed to generate rapid quiz.');
    } finally {
      setLoading(false);
    }
  };

  const finishBattle = async (finalAnswers, resolvedBestStreak = bestStreak) => {
    const totalQuestions = questions.length;
    const correctAnswers = finalAnswers.filter((entry) => entry?.isCorrect).length;
    const unanswered = finalAnswers.filter((entry) => !entry || entry.selectedIndex === null).length;
    const timeSpentSeconds = startedAtRef.current
      ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
      : 0;
    const battleScore = finalAnswers.reduce((total, entry) => total + (entry?.points || 0), 0);

    const summary = {
      topic: topic.trim().toLowerCase(),
      correctAnswers,
      totalQuestions,
      unanswered,
      accuracy: totalQuestions ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0,
      timeSpentSeconds,
      battleScore,
      bestStreak: resolvedBestStreak,
    };

    setResult(summary);
    setPhase('result');

    try {
      setSubmitting(true);
      setError('');
      await rapidBattle.submitAttempt({
        topic: summary.topic,
        mode: 'solo',
        questionCount: summary.totalQuestions,
        correctAnswers: summary.correctAnswers,
        unanswered: summary.unanswered,
        timeSpentSeconds: summary.timeSpentSeconds,
      });
      await fetchLeaderboard({
        topicFilter: summary.topic || 'all',
        modeFilter: 'solo',
      });
      await fetchHistory();
    } catch (submitError) {
      console.error('Rapid battle submit error:', submitError);
      setError(submitError.response?.data?.message || 'Score not saved. Try again after restarting.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeCurrentQuestion = (selectedIndex, timedOut = false) => {
    if (phase !== 'playing' || lockedQuestion) {
      return;
    }
    if (!questions[currentIndex] || answers[currentIndex]) {
      return;
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedIndex === currentQuestion.correctAnswer;
    const nextStreak = isCorrect ? streak + 1 : 0;
    const speedBonus = isCorrect ? Math.max(0, timeLeft * 18) : 0;
    const streakBonus = isCorrect ? Math.max(0, (nextStreak - 1) * 25) : 0;
    const points = isCorrect ? 100 + speedBonus + streakBonus : 0;
    const responseSeconds = timedOut ? secondsPerQuestion : Math.max(0, secondsPerQuestion - timeLeft);

    const nextAnswers = [...answers];
    nextAnswers[currentIndex] = {
      selectedIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timedOut,
      points,
      responseSeconds,
    };

    setAnswers(nextAnswers);
    setStreak(nextStreak);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    setLiveScore((prev) => prev + points);
    setLockedQuestion(true);
    setAnswerFlash(timedOut ? 'timeout' : isCorrect ? 'correct' : 'wrong');

    window.setTimeout(() => {
      if (currentIndex >= questions.length - 1) {
        finishBattle(nextAnswers, Math.max(bestStreak, nextStreak));
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(secondsPerQuestion);
      setAnswerFlash('');
      setLockedQuestion(false);
    }, 300);
  };

  useEffect(() => {
    if (phase !== 'countdown') {
      return undefined;
    }

    if (countdown <= 0) {
      setPhase('playing');
      setTimeLeft(secondsPerQuestion);
      startedAtRef.current = Date.now();
      return undefined;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 550);

    return () => clearTimeout(timer);
  }, [phase, countdown, secondsPerQuestion]);

  useEffect(() => {
    if (phase !== 'playing' || lockedQuestion) {
      return undefined;
    }
    if (answers[currentIndex]) {
      return undefined;
    }
    if (timeLeft <= 0) {
      completeCurrentQuestion(null, true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, lockedQuestion, currentIndex, answers, timeLeft, secondsPerQuestion]);

  useEffect(() => {
    if (phase !== 'playing' || lockedQuestion) {
      return undefined;
    }

    const keyHandler = (event) => {
      if (!['1', '2', '3', '4'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      completeCurrentQuestion(Number(event.key) - 1, false);
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [phase, lockedQuestion, currentIndex, answers, timeLeft, streak, secondsPerQuestion]);

  const currentQuestion = questions[currentIndex];
  const currentSelection = answers[currentIndex]?.selectedIndex;
  const pressureClass = timeLeft <= 2 ? 'arena-danger' : timeLeft <= 4 ? 'arena-warning' : 'arena-safe';
  const timerAngle = Math.max(0, (timeLeft / secondsPerQuestion) * 360);

  const orderedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [history]
  );

  const recentHistory = useMemo(() => orderedHistory.slice(-12), [orderedHistory]);

  const topicStats = useMemo(() => {
    const grouped = new Map();
    history.forEach((attempt) => {
      const key = (attempt.topic || 'general').toLowerCase();
      const pace = attempt.questionCount ? attempt.timeSpentSeconds / attempt.questionCount : 0;
      if (!grouped.has(key)) {
        grouped.set(key, {
          topic: key,
          attempts: 0,
          totalAccuracy: 0,
          totalPace: 0,
          bestAccuracy: 0,
        });
      }
      const entry = grouped.get(key);
      entry.attempts += 1;
      entry.totalAccuracy += Number(attempt.accuracy) || 0;
      entry.totalPace += Number(pace) || 0;
      entry.bestAccuracy = Math.max(entry.bestAccuracy, Number(attempt.accuracy) || 0);
    });

    return [...grouped.values()]
      .map((entry) => ({
        ...entry,
        avgAccuracy: Number((entry.totalAccuracy / entry.attempts).toFixed(2)),
        avgPace: Number((entry.totalPace / entry.attempts).toFixed(2)),
      }))
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy);
  }, [history]);

  const averageAccuracy = useMemo(() => {
    if (!history.length) {
      return 0;
    }
    const total = history.reduce((sum, attempt) => sum + (Number(attempt.accuracy) || 0), 0);
    return Number((total / history.length).toFixed(1));
  }, [history]);

  const averagePace = useMemo(() => {
    if (!history.length) {
      return 0;
    }
    const totalPace = history.reduce((sum, attempt) => {
      const pace = attempt.questionCount ? attempt.timeSpentSeconds / attempt.questionCount : 0;
      return sum + pace;
    }, 0);
    return Number((totalPace / history.length).toFixed(2));
  }, [history]);

  const completionRate = useMemo(() => {
    if (!history.length) {
      return 0;
    }
    const totalAttempted = history.reduce((sum, attempt) => sum + (Number(attempt.questionCount) || 0), 0);
    const totalMissed = history.reduce((sum, attempt) => sum + (Number(attempt.unanswered) || 0), 0);
    if (!totalAttempted) {
      return 0;
    }
    return Number((((totalAttempted - totalMissed) / totalAttempted) * 100).toFixed(1));
  }, [history]);

  const trendDelta = useMemo(() => {
    if (orderedHistory.length < 6) {
      return 0;
    }
    const latest = orderedHistory.slice(-5);
    const previous = orderedHistory.slice(-10, -5);
    if (!previous.length) {
      return 0;
    }
    const latestAverage =
      latest.reduce((sum, attempt) => sum + (Number(attempt.accuracy) || 0), 0) / latest.length;
    const previousAverage =
      previous.reduce((sum, attempt) => sum + (Number(attempt.accuracy) || 0), 0) / previous.length;
    return Number((latestAverage - previousAverage).toFixed(1));
  }, [orderedHistory]);

  const strongestTopic = topicStats[0]?.topic || '--';
  const focusTopic = topicStats.length > 1 ? topicStats[topicStats.length - 1].topic : strongestTopic;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#334155',
          font: {
            family: 'Space Grotesk',
            size: 11,
            weight: 600,
          },
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          font: {
            family: 'Space Grotesk',
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: '#64748b',
          font: {
            family: 'Space Grotesk',
          },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.22)',
        },
      },
    },
  };

  const accuracyTrendData = useMemo(
    () => ({
      labels: recentHistory.map((attempt, index) =>
        recentHistory.length > 6
          ? `${new Date(attempt.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
          : `Attempt ${index + 1}`
      ),
      datasets: [
        {
          label: 'Accuracy (%)',
          data: recentHistory.map((attempt) => Number(attempt.accuracy) || 0),
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.14)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
        },
        {
          label: 'Target (75%)',
          data: recentHistory.map(() => 75),
          borderColor: '#ea580c',
          borderDash: [5, 5],
          borderWidth: 1.7,
          pointRadius: 0,
          tension: 0,
        },
      ],
    }),
    [recentHistory]
  );

  const paceTrendData = useMemo(() => {
    const paceValues = recentHistory.map((attempt) =>
      Number(
        (
          (Number(attempt.timeSpentSeconds) || 0) /
          Math.max(1, Number(attempt.questionCount) || 1)
        ).toFixed(2)
      )
    );
    const movingAverage = paceValues.map((_, index) => {
      const start = Math.max(0, index - 2);
      const slice = paceValues.slice(start, index + 1);
      const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
      return Number(average.toFixed(2));
    });

    return {
      labels: recentHistory.map((_, index) => `A${index + 1}`),
      datasets: [
        {
          label: 'Seconds / Question',
          data: paceValues,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.16)',
          borderWidth: 2,
          pointRadius: 2.5,
          tension: 0.32,
        },
        {
          label: '3-Attempt Pace Average',
          data: movingAverage,
          borderColor: '#16a34a',
          borderWidth: 1.8,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    };
  }, [recentHistory]);

  const topicMasteryData = useMemo(
    () => ({
      labels: topicStats.slice(0, 6).map((topicEntry) => topicEntry.topic.toUpperCase()),
      datasets: [
        {
          label: 'Average Accuracy (%)',
          data: topicStats.slice(0, 6).map((topicEntry) => topicEntry.avgAccuracy),
          backgroundColor: 'rgba(14, 165, 233, 0.68)',
          borderColor: '#0369a1',
          borderWidth: 1,
          borderRadius: 7,
        },
        {
          label: 'Best Accuracy (%)',
          data: topicStats.slice(0, 6).map((topicEntry) => topicEntry.bestAccuracy),
          backgroundColor: 'rgba(251, 146, 60, 0.66)',
          borderColor: '#c2410c',
          borderWidth: 1,
          borderRadius: 7,
        },
      ],
    }),
    [topicStats]
  );

  return (
    <div className="battle-arena-root min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="battle-grid max-w-6xl mx-auto space-y-6">
        <div className="arena-shell rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
          <div className="arena-header px-6 py-7 md:px-9">
            <p className="arena-tag">LIVE QUIZ BATTLE</p>
            <h1 className="arena-title">Rapid Fire Arena</h1>
            <p className="arena-subtitle">Fast answers. Rising pressure. Climb the table.</p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {error && <div className="arena-error">{error}</div>}

            {phase === 'setup' && (
              <div className="space-y-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode('solo')}
                    className={`arena-mode-card ${mode === 'solo' ? 'active-solo' : ''}`}
                  >
                    <p className="mode-title">Solo Sprint</p>
                    <p className="mode-desc">Instant queue. Score goes straight to leaderboard.</p>
                  </button>

                  <button
                    onClick={() => setMode('friend')}
                    className={`arena-mode-card ${mode === 'friend' ? 'active-friend' : ''}`}
                  >
                    <p className="mode-title">Challenge Friend</p>
                    <p className="mode-desc">Head-to-head rooms are next in the roadmap.</p>
                  </button>
                </div>

                {mode === 'solo' ? (
                  <div className="space-y-5">
                    <div>
                      <label className="arena-label">Topic</label>
                      <input
                        value={topic}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Examples: AI agents, recursion, geopolitics, chemistry"
                        className="arena-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="arena-label">Question Count</label>
                        <select
                          value={questionCount}
                          onChange={(event) => setQuestionCount(Number(event.target.value))}
                          className="arena-input"
                        >
                          {[5, 7, 8, 10, 12].map((count) => (
                            <option key={count} value={count}>
                              {count} questions
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="arena-label">Intensity</label>
                        <div className="intensity-row">
                          {Object.entries(PRESET_CONFIG).map(([id, config]) => (
                            <button
                              key={id}
                              onClick={() => setPresetId(id)}
                              className={`intensity-chip ${presetId === id ? 'active' : ''}`}
                            >
                              <span>{config.label}</span>
                              <small>{config.secondsPerQuestion}s / Q</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={startSoloBattle}
                      disabled={loading}
                      className={`arena-launch ${loading ? 'disabled' : ''}`}
                    >
                      {loading ? 'Spinning Up Questions...' : `Launch ${preset.label} Battle`}
                    </button>
                  </div>
                ) : (
                  <div className="arena-coming-soon">
                    <p className="mode-title">Challenge Mode Incoming</p>
                    <p className="mode-desc">
                      Next step: invite codes, shared question packs, synchronized countdown, and winner board.
                    </p>
                  </div>
                )}
              </div>
            )}

            {phase === 'countdown' && (
              <div className="arena-countdown-wrap">
                <p className="countdown-top">Arena Locked</p>
                <div className="countdown-value">{countdown || 'GO'}</div>
                <p className="countdown-note">
                  {preset.label} mode active: {secondsPerQuestion}s per question
                </p>
              </div>
            )}

            {phase === 'playing' && currentQuestion && (
              <div className="space-y-5">
                <div className="arena-hud">
                  <div className="hud-card">
                    <span>Score</span>
                    <strong>{liveScore}</strong>
                  </div>
                  <div className="hud-card">
                    <span>Streak</span>
                    <strong>x{streak}</strong>
                  </div>
                  <div className="hud-card">
                    <span>Accuracy</span>
                    <strong>{currentAccuracy}%</strong>
                  </div>
                  <div className="hud-card">
                    <span>Solved</span>
                    <strong>
                      {completedCount}/{questions.length}
                    </strong>
                  </div>
                </div>

                <div className="arena-question-wrap">
                  <div className={`arena-timer ${pressureClass}`} style={{ '--timer-angle': `${timerAngle}deg` }}>
                    <div className="arena-timer-core">
                      <span>{timeLeft}</span>
                      <small>sec</small>
                    </div>
                  </div>

                  <div className={`arena-question ${answerFlash ? `flash-${answerFlash}` : ''}`}>
                    <p className="question-step">
                      Question {currentIndex + 1} of {questions.length}
                    </p>
                    <h3>{currentQuestion.question}</h3>
                    <p className="question-hint">Use keys 1-4 for max speed.</p>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-white/70 overflow-hidden">
                  <div className="arena-progress" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options.map((option, optionIndex) => (
                    <button
                      key={`${optionIndex}-${option}`}
                      onClick={() => completeCurrentQuestion(optionIndex, false)}
                      disabled={lockedQuestion || (currentSelection !== undefined && currentSelection !== null)}
                      className={`arena-option ${
                        currentSelection === optionIndex ? 'selected' : ''
                      } ${lockedQuestion ? 'locked' : ''}`}
                    >
                      <span className="option-key">{optionIndex + 1}</span>
                      <span className="option-text">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === 'result' && result && (
              <div className="space-y-5">
                <div className="arena-result-card">
                  <p className="arena-tag">Round Complete</p>
                  <h2>{result.accuracy >= 80 ? 'Dominating' : result.accuracy >= 60 ? 'Strong Run' : 'Keep Grinding'}</h2>
                  <div className="result-stats">
                    <div>
                      <span>Battle Score</span>
                      <strong>{result.battleScore}</strong>
                    </div>
                    <div>
                      <span>Correct</span>
                      <strong>
                        {result.correctAnswers}/{result.totalQuestions}
                      </strong>
                    </div>
                    <div>
                      <span>Best Streak</span>
                      <strong>x{result.bestStreak}</strong>
                    </div>
                    <div>
                      <span>Duration</span>
                      <strong>{result.timeSpentSeconds}s</strong>
                    </div>
                  </div>
                  {submitting && <p className="saving-note">Syncing score...</p>}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={startSoloBattle} disabled={loading} className="arena-launch">
                    Play Again
                  </button>
                  <button onClick={resetPlayState} className="arena-reset">
                    Change Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="arena-analytics rounded-3xl border border-white/50 shadow-xl overflow-hidden">
          <div className="analytics-head">
            <h3>Performance Intelligence</h3>
            <p>Academic progress signals from your rapid battles.</p>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div className="analytics-metrics">
              <div className="metric-card">
                <span>Total Attempts</span>
                <strong>{history.length}</strong>
              </div>
              <div className="metric-card">
                <span>Avg Accuracy</span>
                <strong>{averageAccuracy}%</strong>
              </div>
              <div className="metric-card">
                <span>Completion Rate</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="metric-card">
                <span>Pace</span>
                <strong>{averagePace}s/Q</strong>
              </div>
              <div className="metric-card">
                <span>Strongest Topic</span>
                <strong className="capitalize">{strongestTopic}</strong>
              </div>
              <div className="metric-card">
                <span>Focus Next</span>
                <strong className="capitalize">{focusTopic}</strong>
              </div>
            </div>

            <div className="trend-signal">
              <span className="trend-label">Recent 5-attempt trend</span>
              <span className={`trend-value ${trendDelta >= 0 ? 'up' : 'down'}`}>
                {trendDelta >= 0 ? '+' : ''}
                {trendDelta}% accuracy shift
              </span>
            </div>

            {historyLoading ? (
              <div className="analytics-empty">Loading your performance analytics...</div>
            ) : !history.length ? (
              <div className="analytics-empty">Complete a few battles to unlock charts and learning signals.</div>
            ) : (
              <div className="analytics-chart-grid">
                <div className="chart-card">
                  <p className="chart-title">Accuracy Trend (Last 12)</p>
                  <div className="chart-wrap">
                    <Line data={accuracyTrendData} options={chartOptions} />
                  </div>
                </div>

                <div className="chart-card">
                  <p className="chart-title">Topic Mastery Snapshot</p>
                  <div className="chart-wrap">
                    <Bar data={topicMasteryData} options={chartOptions} />
                  </div>
                </div>

                <div className="chart-card span-2">
                  <p className="chart-title">Pace Stability (Lower is Better)</p>
                  <div className="chart-wrap">
                    <Line data={paceTrendData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="arena-leaderboard rounded-3xl border border-white/50 shadow-xl overflow-hidden">
          <div className="leaderboard-head">
            <h3>Rapid Leaderboard</h3>
            <div className="leaderboard-filter">
              <input
                value={leaderboardInput}
                onChange={(event) => setLeaderboardInput(event.target.value)}
                placeholder="topic or leave blank for all"
              />
              <button onClick={() => setLeaderboardTopic(leaderboardInput.trim().toLowerCase() || 'all')}>Apply</button>
            </div>
          </div>

          {leaderboard.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Topic</th>
                    <th>Correct</th>
                    <th>Accuracy</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={`${entry._id}-${index}`}>
                      <td>
                        <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>#{index + 1}</span>
                      </td>
                      <td>{entry.userName}</td>
                      <td className="capitalize">{entry.topic}</td>
                      <td>
                        {entry.correctAnswers}/{entry.questionCount}
                      </td>
                      <td>{entry.accuracy}%</td>
                      <td>{entry.timeSpentSeconds}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No rapid battle attempts yet.</p>
          )}
          <p className="attempt-meta">
            Attempts answered: {attemptedCount} | Missed by timeout: {answers.filter((entry) => entry?.timedOut).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BattleArena;
