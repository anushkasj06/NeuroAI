const { getAssessmentContent, getQuestionsForMode } = require('../data/assessmentContent');

const scoreShortAnswer = (answer, keywords = []) => {
  if (!answer || typeof answer !== 'string') return false;
  const normalized = answer.toLowerCase().trim();
  if (normalized.length < 8) return false;
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
};

const gradeAnswers = (questions, submittedAnswers) => {
  const answerMap = new Map(submittedAnswers.map((a) => [a.questionId, a]));
  let correct = 0;
  const graded = [];

  for (const q of questions) {
    const submitted = answerMap.get(q.id);
    let isCorrect = false;

    if (q.type === 'mcq' || q.type === 'match') {
      isCorrect =
        submitted?.selectedAnswer?.trim() === q.correctAnswer?.trim();
    } else if (q.type === 'short') {
      isCorrect = scoreShortAnswer(submitted?.selectedAnswer, q.keywords);
    }

    if (isCorrect) correct += 1;
    graded.push({
      questionId: q.id,
      questionType: q.type,
      selectedAnswer: submitted?.selectedAnswer || '',
      isCorrect,
      responseTimeMs: submitted?.responseTimeMs || 0,
    });
  }

  const total = questions.length || 1;
  const responseTimes = graded.map((g) => g.responseTimeMs).filter((t) => t > 0);
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  return {
    answers: graded,
    correctCount: correct,
    totalQuestions: total,
    accuracyPercent: Math.round((correct / total) * 100),
    avgResponseTimeMs,
  };
};

const buildModalityPayload = (mode, body) => {
  const content = getAssessmentContent()[mode];
  const allQuestions = getQuestionsForMode(content);
  const graded = gradeAnswers(allQuestions, body.answers || []);

  return {
    completed: true,
    startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
    completedAt: new Date(),
    readingOrWatchTimeSeconds: body.readingOrWatchTimeSeconds || body.watchDurationSeconds || 0,
    listeningDurationSeconds: body.listeningDurationSeconds || 0,
    replayCount: body.replayCount || 0,
    pauseCount: body.pauseCount || 0,
    skipCount: body.skipCount || 0,
    interactionCount: body.interactionCount || 0,
    ...graded,
  };
};

const computeModalityScores = (assessment) => {
  const modes = ['textMode', 'audioMode', 'videoMode', 'interactiveMode'];
  const keys = ['text', 'audio', 'video', 'interactive'];
  const scores = {};

  modes.forEach((field, idx) => {
    const mode = assessment[field];
    if (!mode?.completed) {
      scores[keys[idx]] = 0;
      return;
    }

    const accuracy = mode.accuracyPercent || 0;
    const speedScore = mode.avgResponseTimeMs
      ? Math.max(0, 100 - Math.min(mode.avgResponseTimeMs / 100, 80))
      : 50;
    let engagementBonus = 0;
    if (keys[idx] === 'audio') {
      engagementBonus = Math.min((mode.replayCount || 0) * 5, 15);
    } else if (keys[idx] === 'video') {
      engagementBonus = Math.min((mode.pauseCount || 0) * 3, 10);
    } else if (keys[idx] === 'interactive') {
      engagementBonus = Math.min((mode.interactionCount || 0) * 2, 20);
    } else {
      engagementBonus = Math.min((mode.readingOrWatchTimeSeconds || 0) / 10, 15);
    }

    scores[keys[idx]] = Math.round(
      accuracy * 0.65 + speedScore * 0.2 + engagementBonus
    );
  });

  return scores;
};

const detectStrongestWeakest = (modalityScores) => {
  const entries = Object.entries(modalityScores);
  entries.sort((a, b) => b[1] - a[1]);
  return {
    strongest: entries[0]?.[0] || 'text',
    weakest: entries[entries.length - 1]?.[0] || 'video',
  };
};

const mapModeToLearningStyle = (strongest) => {
  const map = {
    text: 'Reading/Writing Learner',
    audio: 'Audio Learner',
    video: 'Visual Learner',
    interactive: 'Interactive Learner',
  };
  return map[strongest] || 'Interactive Learner';
};

const analyzeSubjectPerformance = (subjects) => {
  const sorted = [...subjects].sort((a, b) => b.currentMarks - a.currentMarks);
  const strengths = sorted.slice(0, 3).map((s) => ({
    subject: s.subjectName,
    strength: `Strong performance at ${s.currentMarks}%`,
    weakness: '',
    improvementPotential: 'Maintain momentum with advanced practice',
  }));
  const weaknesses = sorted.slice(-3).reverse().map((s) => ({
    subject: s.subjectName,
    strength: '',
    weakness: `Needs improvement (current: ${s.currentMarks}%)`,
    improvementPotential: `Target ${Math.min(100, s.currentMarks + 15)}% with focused revision`,
  }));
  return { strengths, weaknesses };
};

const buildNumericInsights = (profile, assessment, subjects) => {
  const modalityScores = computeModalityScores(assessment);
  const { strongest, weakest } = detectStrongestWeakest(modalityScores);
  const { strengths, weaknesses } = analyzeSubjectPerformance(subjects);

  const completedModes = [
    assessment.textMode,
    assessment.audioMode,
    assessment.videoMode,
    assessment.interactiveMode,
  ].filter((m) => m?.completed);
  const avgAccuracy =
    completedModes.reduce((sum, m) => sum + (m.accuracyPercent || 0), 0) /
    (completedModes.length || 1);

  const engagementScore = Math.round(
    Math.min(
      100,
      avgAccuracy * 0.4 +
        modalityScores.text * 0.12 +
        modalityScores.audio * 0.12 +
        modalityScores.video * 0.18 +
        modalityScores.interactive * 0.18
    )
  );

  const attentionLevel =
    profile.screenTimeHours > 6 && profile.sleepHours < 7
      ? 'Moderate — high screen time and low sleep may reduce focus'
      : engagementScore > 75
        ? 'High — strong engagement across modalities'
        : 'Moderate — room to improve sustained focus';

  return {
    modalityScores,
    strongestLearningMode: strongest,
    weakestLearningMode: weakest,
    preferredLearningStyle: mapModeToLearningStyle(strongest),
    engagementScore,
    attentionLevel,
    subjectStrengths: strengths,
    subjectWeaknesses: weaknesses,
    recommendedStudyHours: Math.min(
      6,
      Math.max(1, Math.round(profile.studyHoursPerDay))
    ),
  };
};

module.exports = {
  buildModalityPayload,
  computeModalityScores,
  detectStrongestWeakest,
  buildNumericInsights,
  gradeAnswers,
};
