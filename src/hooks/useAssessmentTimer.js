import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Tracks elapsed seconds and per-question response times.
 */
export function useAssessmentTimer(autoStart = true) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartMs, setQuestionStartMs] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!autoStart) return undefined;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [autoStart]);

  const markQuestionStart = useCallback(() => {
    setQuestionStartMs(Date.now());
  }, []);

  const getResponseTimeMs = useCallback(() => {
    return Date.now() - questionStartMs;
  }, [questionStartMs]);

  const pauseTimer = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  return {
    elapsedSeconds,
    markQuestionStart,
    getResponseTimeMs,
    pauseTimer,
  };
}
