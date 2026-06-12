const BattleRoom = require('../models/BattleRoom');
const { generateBattleQuestions } = require('../services/battleQuizService');

// In-memory battle state map
const activeBattles = new Map(); // roomCode -> BattleState

const QUESTION_TIME_SECONDS = 20;
const COUNTDOWN_SECONDS = 3;

class BattleState {
  constructor(roomCode, players, questions) {
    this.roomCode = roomCode;
    this.questions = questions;
    this.currentIndex = -1;
    this.questionStartTs = null;
    this.timerInterval = null;
    this.questionTimeout = null;
    this.finished = false;

    this.scores = {};
    players.forEach((p) => {
      this.scores[p.userId] = { name: p.name, score: 0, streak: 0, answers: [] };
    });
    this.answeredThisQuestion = new Set();
  }

  get totalQuestions() { return this.questions.length; }
  get currentQuestion() { return this.questions[this.currentIndex] || null; }

  scoresSnapshot() {
    return Object.entries(this.scores).map(([userId, s]) => ({ userId, name: s.name, score: s.score, streak: s.streak })).sort((a,b)=>b.score-a.score);
  }
}

const sendNextQuestion = (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state) return;
  state.currentIndex += 1;
  if (state.currentIndex >= state.totalQuestions) {
    return finishBattle(io, roomCode);
  }

  state.answeredThisQuestion = new Set();
  state.questionStartTs = Date.now();

  const question = state.currentQuestion;
  if (!question) return finishBattle(io, roomCode);

  // Emit question payload expected by clients
  io.to(roomCode).emit('question:sent', {
    questionIndex: state.currentIndex,
    totalQuestions: state.totalQuestions,
    question: question.question,
    options: question.options,
    timeSeconds: QUESTION_TIME_SECONDS,
    startTs: state.questionStartTs,
  });

  console.log(`[Manager] QUESTION | code=${roomCode} | q=${state.currentIndex + 1}/${state.totalQuestions}`);

  // Timer ticks
  let secondsLeft = QUESTION_TIME_SECONDS;
  state.timerInterval = setInterval(() => {
    secondsLeft -= 1;
    io.to(roomCode).emit('timer:tick', { questionIndex: state.currentIndex, secondsLeft });
    if (secondsLeft <= 0) clearInterval(state.timerInterval);
  }, 1000);

  // Auto-advance when time runs out
  state.questionTimeout = setTimeout(() => {
    clearInterval(state.timerInterval);
    advanceQuestion(io, roomCode);
  }, QUESTION_TIME_SECONDS * 1000 + 500);
};

const finishBattle = async (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state || state.finished) return;
  state.finished = true;
  clearTimeout(state.questionTimeout);
  clearInterval(state.timerInterval);

  const finalScores = state.scoresSnapshot();
  const winner = finalScores[0];

  console.log(`[Manager] FINISHED | code=${roomCode} | winner=${winner?.name} | score=${winner?.score}`);

  const playerStats = Object.entries(state.scores).map(([uid, s]) => {
    const correct = s.answers.filter((a) => a.isCorrect).length;
    return {
      userId: uid,
      name: s.name,
      score: s.score,
      correct,
      total: state.totalQuestions,
      accuracy: state.totalQuestions ? Math.round((correct / state.totalQuestions) * 100) : 0,
      streak: s.streak,
    };
  }).sort((a, b) => b.score - a.score);

  io.to(roomCode).emit('battle:finished', {
    roomCode,
    winner: { userId: winner?.userId, name: winner?.name, score: winner?.score },
    playerStats,
    totalQuestions: state.totalQuestions,
    timestamp: new Date().toISOString(),
  });

  try {
    await BattleRoom.findOneAndUpdate({ roomCode }, { status: 'finished' });
  } catch {}

  // cleanup after 60s
  setTimeout(() => activeBattles.delete(roomCode), 60_000);
};

const advanceQuestion = (io, roomCode) => {
  const state = activeBattles.get(roomCode);
  if (!state || state.finished) return;
  clearTimeout(state.questionTimeout);
  clearInterval(state.timerInterval);
  setTimeout(() => sendNextQuestion(io, roomCode), 2000);
};

/** Start a battle given a room Mongoose document. This creates questions, state, and begins the countdown + first question. */
const startFromRoom = async (io, room) => {
  const roomCode = room.roomCode;
  if (!room) throw new Error('Room is required');
  if (activeBattles.has(roomCode)) return; // already started

  // Mark room starting
  room.status = 'starting';
  await room.save();

  // Generate questions
  const questions = await generateBattleQuestions({ subject: room.subject, topic: room.topic, difficulty: room.difficulty, count: 10 });

  const state = new BattleState(roomCode, room.players, questions);
  activeBattles.set(roomCode, state);

  io.to(roomCode).emit('battle:started', {
    roomCode,
    totalQuestions: questions.length,
    subject: room.subject,
    topic: room.topic,
    difficulty: room.difficulty,
    players: room.players,
    countdown: COUNTDOWN_SECONDS,
    timestamp: new Date().toISOString(),
  });

  // start first question after countdown
  setTimeout(() => sendNextQuestion(io, roomCode), COUNTDOWN_SECONDS * 1000);
};

module.exports = { startFromRoom, activeBattles, advanceQuestion, finishBattle };
