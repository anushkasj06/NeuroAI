/**
 * quizHandler — Phase 3: Real-Time Multiplayer Quiz Battle Engine.
 *
 * CLIENT → SERVER:
 *   battle:start      — host starts the battle (all players must be ready)
 *   answer:submit     — player submits an answer for the current question
 *
 * SERVER → CLIENT:
 *   battle:started    — countdown begins, sent to all players
 *   question:sent     — question + index sent to all players simultaneously
 *   answer:result     — sent to the answering player (correct/wrong + points)
 *   score:updated     — broadcast live scores to all players after each answer
 *   opponent:answered — tells other players someone answered (not the answer itself)
 *   timer:tick        — server-authoritative timer broadcast every second
 *   battle:finished   — final results sent to all players
 *   battle:error      — error sent to requesting socket only
 */

const BattleRoom = require('../../models/BattleRoom');
const { startFromRoom, activeBattles, advanceQuestion, finishBattle } = require('../battleManager');

const QUESTION_TIME_SECONDS = 20;
const COUNTDOWN_SECONDS = 3;

// ── Scoring formula ────────────────────────────────────────────────────────────
const calcPoints = (basePoints, timeLeftMs, streak) => {
  const speedBonus  = Math.round((timeLeftMs / (QUESTION_TIME_SECONDS * 1000)) * 50);
  const streakBonus = Math.min(streak * 20, 100);
  return basePoints + speedBonus + streakBonus;
};

// ── Handler ───────────────────────────────────────────────────────────────────
const quizHandler = (io, socket) => {
  const { _id: userId, name } = socket.user;

  // ── battle:start ───────────────────────────────────────────────────────────
  socket.on('battle:start', async (data, ack) => {
    try {
      const { roomCode } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const room = await BattleRoom.findOne({ roomCode });
      if (!room)                              throw new Error('Room not found');
      if (room.hostId.toString() !== userId)  throw new Error('Only the host can start the battle');
      if (room.status !== 'waiting')          throw new Error('Battle already started or room is not in lobby');
      if (room.players.length < 2)            throw new Error('Need at least 2 players to start');
      if (!room.players.every((p) => p.isReady)) throw new Error('All players must be ready');

      // Delegate starting the battle to the shared manager
      await startFromRoom(io, room);
      console.log(`[Quiz] START delegated | code=${roomCode} | host=${name}`);
      if (typeof ack === 'function') ack({ status: 'ok' });
    } catch (err) {
      console.error('[Quiz] START error:', err.message);
      socket.emit('battle:error', { code: 'START_ERROR', message: err.message });
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── answer:submit ──────────────────────────────────────────────────────────
  socket.on('answer:submit', async (data, ack) => {
    try {
      const { roomCode, questionIndex, answerIndex } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const state = activeBattles.get(roomCode);
      if (!state)                                   throw new Error('No active battle for this room');
      if (state.finished)                           throw new Error('Battle already finished');
      if (questionIndex !== state.currentIndex)     throw new Error('Answer for wrong question');
      if (state.answeredThisQuestion.has(userId))   throw new Error('Already answered this question');

      const question = state.currentQuestion;
      if (!question) throw new Error('No current question');

      // Mark as answered
      state.answeredThisQuestion.add(userId);

      const timeLeftMs   = Math.max(0, QUESTION_TIME_SECONDS * 1000 - (Date.now() - state.questionStartTs));
      const isCorrect    = answerIndex === question.correctIndex;
      const playerState  = state.scores[userId];

      if (!playerState) throw new Error('Player not in this battle');

      let pointsEarned = 0;
      if (isCorrect) {
        playerState.streak += 1;
        pointsEarned = calcPoints(question.points || 100, timeLeftMs, playerState.streak);
        playerState.score += pointsEarned;
      } else {
        playerState.streak = 0;
      }

      playerState.answers.push({
        questionIndex,
        answerIndex,
        isCorrect,
        pointsEarned,
        timeLeftMs,
      });

      console.log(`[Quiz] ANSWER    | code=${roomCode} | user=${name} | q=${questionIndex} | correct=${isCorrect} | pts=${pointsEarned}`);

      // Send result to the answering player
      socket.emit('answer:result', {
        questionIndex,
        answerIndex,
        correctIndex:  question.correctIndex,
        isCorrect,
        pointsEarned,
        explanation:   question.explanation || '',
        newScore:      playerState.score,
        streak:        playerState.streak,
      });

      // Tell everyone else this player answered (not the answer itself)
      socket.to(roomCode).emit('opponent:answered', {
        userId,
        userName:      name,
        questionIndex,
        timeLeftMs,
      });

      // Broadcast updated scores to all
      io.to(roomCode).emit('score:updated', {
        scores:        state.scoresSnapshot(),
        questionIndex,
      });

      if (typeof ack === 'function') ack({ status: 'ok', isCorrect, pointsEarned });

      // If all players answered, advance immediately
      const allAnswered = state.answeredThisQuestion.size >= Object.keys(state.scores).length;
      if (allAnswered) {
        clearTimeout(state.questionTimeout);
        clearInterval(state.timerInterval);
        setTimeout(() => advanceQuestion(io, roomCode), 1500);
      }
    } catch (err) {
      console.error('[Quiz] ANSWER error:', err.message);
      socket.emit('battle:error', { code: 'ANSWER_ERROR', message: err.message });
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });
};

// ── Internal: send next question ──────────────────────────────────────────────
const sendNextQuestion = (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state || state.finished) return;

  state.currentIndex += 1;

  if (state.currentIndex >= state.totalQuestions) {
    return finishBattle(io, roomCode);
  }

  state.answeredThisQuestion = new Set();
  state.questionStartTs      = Date.now();

  const question = state.currentQuestion;

  // Send question to all players — same question, same timestamp
  io.to(roomCode).emit('question:sent', {
    questionIndex: state.currentIndex,
    totalQuestions: state.totalQuestions,
    question:      question.question,
    options:       question.options,
    timeSeconds:   QUESTION_TIME_SECONDS,
    startTs:       state.questionStartTs,
    // Do NOT send correctIndex here
  });

  console.log(`[Quiz] QUESTION  | code=${roomCode} | q=${state.currentIndex + 1}/${state.totalQuestions}`);

  // Server-authoritative timer ticks
  let secondsLeft = QUESTION_TIME_SECONDS;
  state.timerInterval = setInterval(() => {
    secondsLeft -= 1;
    io.to(roomCode).emit('timer:tick', {
      questionIndex: state.currentIndex,
      secondsLeft,
    });
    if (secondsLeft <= 0) {
      clearInterval(state.timerInterval);
    }
  }, 1000);

  // Auto-advance when time runs out
  state.questionTimeout = setTimeout(() => {
    clearInterval(state.timerInterval);
    advanceQuestion(io, roomCode);
  }, QUESTION_TIME_SECONDS * 1000 + 500); // +500ms grace
};

// ── Internal: advance to next question ───────────────────────────────────────
const advanceQuestion = (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state || state.finished) return;

  clearTimeout(state.questionTimeout);
  clearInterval(state.timerInterval);

  // Brief pause between questions
  setTimeout(() => sendNextQuestion(io, roomCode), 2000);
};

// ── Internal: finish battle ───────────────────────────────────────────────────
const finishBattle = async (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state || state.finished) return;

  state.finished = true;
  clearTimeout(state.questionTimeout);
  clearInterval(state.timerInterval);

  const finalScores = state.scoresSnapshot();
  const winner      = finalScores[0];

  console.log(`[Quiz] FINISHED  | code=${roomCode} | winner=${winner?.name} | score=${winner?.score}`);

  // Build per-player stats
  const playerStats = Object.entries(state.scores).map(([uid, s]) => {
    const correct = s.answers.filter((a) => a.isCorrect).length;
    return {
      userId:    uid,
      name:      s.name,
      score:     s.score,
      correct,
      total:     state.totalQuestions,
      accuracy:  state.totalQuestions ? Math.round((correct / state.totalQuestions) * 100) : 0,
      streak:    s.streak,
    };
  }).sort((a, b) => b.score - a.score);

  io.to(roomCode).emit('battle:finished', {
    roomCode,
    winner:       { userId: winner?.userId, name: winner?.name, score: winner?.score },
    playerStats,
    totalQuestions: state.totalQuestions,
    timestamp:    new Date().toISOString(),
  });

  // Update DB
  try {
    await BattleRoom.findOneAndUpdate(
      { roomCode },
      { status: 'finished' }
    );
  } catch {}

  // Clean up in-memory state after 60s
  setTimeout(() => activeBattles.delete(roomCode), 60_000);
};

module.exports = quizHandler;
