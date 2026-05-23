/**
 * useBattleQuiz — Phase 3 hook.
 * Manages the live quiz battle state after battle:started.
 *
 * Listens to:
 *   battle:started, question:sent, answer:result,
 *   score:updated, opponent:answered, timer:tick, battle:finished
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';

export const useBattleQuiz = () => {
  const { emit, on } = useSocket();
  const { user } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('idle');
  // idle | countdown | question | result_flash | finished

  const [battleMeta, setBattleMeta]     = useState(null);   // subject, topic, players
  const [countdown, setCountdown]       = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex]     = useState(-1);
  const [totalQuestions, setTotalQuestions]   = useState(0);
  const [secondsLeft, setSecondsLeft]   = useState(20);
  const [scores, setScores]             = useState([]);
  const [myResult, setMyResult]         = useState(null);   // last answer result
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [finalResult, setFinalResult]   = useState(null);
  const [hasAnswered, setHasAnswered]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);

  const roomCodeRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Subscribe to server events ────────────────────────────────────────────
  useEffect(() => {
    const offStarted = on('battle:started', (data) => {
      setBattleMeta(data);
      setTotalQuestions(data.totalQuestions);
      setScores(data.players.map((p) => ({ userId: p.userId, name: p.name, score: 0, streak: 0 })));
      roomCodeRef.current = data.roomCode;
      setPhase('countdown');
      setCountdown(data.countdown ?? 3);

      // Client-side countdown display
      let c = data.countdown ?? 3;
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 0) clearInterval(countdownRef.current);
      }, 1000);
    });

    const offQuestion = on('question:sent', (data) => {
      setCurrentQuestion({
        question: data.question,
        options:  data.options,
      });
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setSecondsLeft(data.timeSeconds ?? 20);
      setHasAnswered(false);
      setMyResult(null);
      setOpponentAnswered(false);
      setPhase('question');
    });

    const offAnswerResult = on('answer:result', (data) => {
      setMyResult(data);
      setPhase('result_flash');
      // Return to question view after 1.5 s so player can see explanation
      setTimeout(() => setPhase('question'), 1500);
    });

    const offScoreUpdated = on('score:updated', (data) => {
      setScores(data.scores);
    });

    const offOpponentAnswered = on('opponent:answered', (data) => {
      if (data.userId !== user?._id) setOpponentAnswered(true);
    });

    const offTimerTick = on('timer:tick', (data) => {
      if (data.questionIndex === questionIndex || phase === 'question') {
        setSecondsLeft(data.secondsLeft);
      }
    });

    const offFinished = on('battle:finished', (data) => {
      clearInterval(countdownRef.current);
      setFinalResult(data);
      setPhase('finished');
    });

    const offError = on('battle:error', (data) => {
      setError(data.message);
    });

    return () => {
      offStarted(); offQuestion(); offAnswerResult();
      offScoreUpdated(); offOpponentAnswered();
      offTimerTick(); offFinished(); offError();
      clearInterval(countdownRef.current);
    };
  }, [on, user?._id, questionIndex, phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const startBattle = useCallback(async (roomCode) => {
    roomCodeRef.current = roomCode;
    setError(null);
    try {
      await emit('battle:start', { roomCode });
    } catch (err) {
      setError(err.message);
    }
  }, [emit]);

  const submitAnswer = useCallback(async (answerIndex) => {
    if (hasAnswered || submitting) return;
    const roomCode = roomCodeRef.current;
    if (!roomCode) return;
    setHasAnswered(true);
    setSubmitting(true);
    try {
      await emit('answer:submit', { roomCode, questionIndex, answerIndex });
    } catch (err) {
      setError(err.message);
      setHasAnswered(false);
    } finally {
      setSubmitting(false);
    }
  }, [emit, hasAnswered, submitting, questionIndex]);

  const myScore = scores.find((s) => s.userId === user?._id);
  const opponentScore = scores.find((s) => s.userId !== user?._id);

  return {
    phase,
    battleMeta,
    countdown,
    currentQuestion,
    questionIndex,
    totalQuestions,
    secondsLeft,
    scores,
    myScore,
    opponentScore,
    myResult,
    opponentAnswered,
    finalResult,
    hasAnswered,
    submitting,
    error,
    startBattle,
    submitAnswer,
  };
};

export default useBattleQuiz;
