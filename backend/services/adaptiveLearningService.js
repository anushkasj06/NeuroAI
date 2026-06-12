/**
 * AdaptiveLearningService
 * =======================
 * Core Adaptive Learning Engine.
 *
 * Input signals:
 *   quizMarks       — latest quiz score (0–100)
 *   emotionScore    — aggregated positive-emotion index (0–100)
 *   attentionScore  — average attention from AttentionSnapshots (0–100)
 *   engagementScore — composite from EngagementMetrics (0–100)
 *   completionRate  — % of study-plan sessions completed (0–100)
 *   learningSpeed   — derived from average quiz response-time (0–100)
 *
 * Computed scores (0–100):
 *   readinessScore  = f(quizMarks, completionRate, learningSpeed, attentionScore)
 *   confidenceScore = f(quizMarks, studentConfidenceAvg, emotionScore)
 *   confusionScore  = f(miscountRate, emotionScore, attentionScore, confusedFraction)
 *
 * Decision cases:
 *   Case 1 — High readiness (≥75)                 → advance_topic
 *   Case 2 — Medium readiness (40–74)              → more_practice
 *   Case 3 — High confusion (≥60)                  → simpler_explanation
 *   Case 4 — Low engagement (≤35)                  → change_format
 *   (Cases 3 and 4 take precedence over Case 2)
 */

'use strict';

const mongoose               = require('mongoose');
const AdaptiveLearningRecord = require('../models/adaptive/AdaptiveLearningRecord');
const AttentionSnapshot      = require('../models/adaptive/AttentionSnapshot');
const EmotionLog             = require('../models/adaptive/EmotionLog');
const EngagementMetrics      = require('../models/adaptive/EngagementMetrics');
const LearningSession        = require('../models/LearningSession');
const StudentAnswer          = require('../models/StudentAnswer');
const TopicProgress          = require('../models/TopicProgress');
const StudyPlan              = require('../models/StudyPlan');
const LearningStyleReport    = require('../models/LearningStyleReport');

// ── Constants ─────────────────────────────────────────────────────────────────
const READINESS_WEIGHTS = {
  quizMarks:      0.45,
  completionRate: 0.25,
  learningSpeed:  0.15,
  attentionScore: 0.15,
};

const CONFIDENCE_WEIGHTS = {
  quizMarks:          0.50,
  studentConfidence:  0.30,  // from StudentAnswer.confidence (1-5 → 0-100)
  emotionScore:       0.20,
};

// Confusion: higher quiz-error rate, more confused/frustrated emotions, less attention
const CONFUSION_WEIGHTS = {
  errorRate:          0.40,  // 1 - (quizAccuracy/100)
  emotionNegative:    0.35,  // fraction of confused+frustrated+sad in emotions
  attentionInverse:   0.25,  // 1 - (attentionScore/100)
};

// Decision thresholds
const THRESHOLDS = {
  readinessHigh:       75,
  readinessMedium:     40,
  confusionHigh:       60,
  engagementLow:       35,
};

const clamp   = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));
const round1  = (v) => Math.round(v * 10) / 10;

// ── Signal collectors ─────────────────────────────────────────────────────────

/**
 * Collect all six input signals from the database for a given context.
 * Falls back gracefully when some signals are missing.
 */
async function collectSignals({ userId, sessionId, subjectSlug, topic }) {
  // ── 1. AttentionSnapshot → attentionScore ──────────────────────────────────
  const snapFilter = { userId };
  if (sessionId) snapFilter.sessionId = sessionId;
  else { snapFilter.timestamp = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; }

  const snaps = await AttentionSnapshot.find(snapFilter).sort({ timestamp: -1 }).limit(50).lean();
  const attentionScore = snaps.length
    ? clamp(snaps.reduce((s, d) => s + (d.attentionScore || 0), 0) / snaps.length)
    : 50;

  // ── 2. EmotionLog → emotionScore ───────────────────────────────────────────
  const emoFilter = { userId };
  if (sessionId) emoFilter.sessionId = sessionId;
  else { emoFilter.timestamp = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }; }

  const emoLogs = await EmotionLog.find(emoFilter).sort({ timestamp: -1 }).limit(50).lean();
  let emotionScore = 50;
  let confusedFraction = 0;
  if (emoLogs.length) {
    let posSum = 0, negSum = 0, confused = 0;
    for (const log of emoLogs) {
      posSum += (log.emotions?.happy || 0) + (log.emotions?.engaged || 0);
      negSum += (log.emotions?.frustrated || 0) + (log.emotions?.sad || 0);
      confused += (log.emotions?.confused || 0);
    }
    const n = emoLogs.length;
    const positiveAvg = posSum / n;
    const negativeAvg = negSum / n;
    confusedFraction  = confused / n;
    emotionScore      = clamp(((positiveAvg - negativeAvg + 1) / 2) * 100);
  }

  // ── 3. EngagementMetrics → engagementScore ─────────────────────────────────
  const engFilter = { userId };
  if (sessionId) engFilter.sessionId = sessionId;
  else if (subjectSlug) { engFilter.subjectSlug = subjectSlug; }

  const engDoc = await EngagementMetrics
    .findOne(engFilter)
    .sort({ date: -1 })
    .lean();
  const engagementScore = engDoc ? clamp(engDoc.engagementScore) : 50;

  // ── 4. StudentAnswer → quizMarks, learningSpeed, studentConfidence ─────────
  const ansFilter = { userId };
  if (sessionId) ansFilter.learningSessionId = sessionId;
  const answers = await StudentAnswer.find(ansFilter).sort({ createdAt: -1 }).limit(30).lean();

  let quizMarks = 0, learningSpeed = 50, studentConfidenceRaw = 3, errorRate = 0.5;
  if (answers.length) {
    const n = answers.length;
    quizMarks = clamp(answers.reduce((s, a) => s + (a.score || 0), 0) / n);
    studentConfidenceRaw = answers.reduce((s, a) => s + (a.confidence || 3), 0) / n;
    const correctCount = answers.filter((a) => a.isCorrect).length;
    errorRate = 1 - (correctCount / n);

    // Learning speed: fast responders with high scores score higher
    const avgTime = answers.reduce((s, a) => s + (a.responseTimeSeconds || 60), 0) / n;
    const expectedTime = 60; // seconds
    const speedFactor = clamp((expectedTime / Math.max(10, avgTime)) * 100);
    learningSpeed = clamp((speedFactor * 0.6) + (quizMarks * 0.4));
  }

  // ── 5. TopicProgress → completionRate ─────────────────────────────────────
  const progress = await TopicProgress.findOne({ userId, subjectSlug, topic }).lean();
  let completionRate = 0;
  if (progress) {
    // Derive from sessions completed vs estimated sessions (assume ~4 per topic)
    const estimatedSessions = 4;
    completionRate = clamp((progress.sessionsCompleted / estimatedSessions) * 100);
  } else {
    // Fall back to plan-level completion
    const plan = await StudyPlan.findOne({ userId, status: 'active' }).lean();
    if (plan) completionRate = clamp(plan.overallCompletionPercent);
  }

  // Convert student confidence from 1-5 scale to 0-100
  const studentConfidence = clamp(((studentConfidenceRaw - 1) / 4) * 100);

  return {
    signals: {
      quizMarks,
      emotionScore,
      attentionScore,
      engagementScore,
      completionRate,
      learningSpeed,
    },
    derived: {
      studentConfidence,
      errorRate: clamp(errorRate * 100, 0, 100),
      confusedFraction: clamp(confusedFraction * 100, 0, 100),
    },
  };
}

// ── Score computations ────────────────────────────────────────────────────────

/**
 * Readiness Score — measures how prepared the student is to move forward.
 * High score → they have mastered this topic and are ready for the next.
 */
function computeReadinessScore({ quizMarks, completionRate, learningSpeed, attentionScore }) {
  const score =
    quizMarks      * READINESS_WEIGHTS.quizMarks      +
    completionRate * READINESS_WEIGHTS.completionRate  +
    learningSpeed  * READINESS_WEIGHTS.learningSpeed   +
    attentionScore * READINESS_WEIGHTS.attentionScore;
  return round1(clamp(score));
}

/**
 * Confidence Score — measures how sure the student is of their understanding.
 * Low confidence with correct answers → inconsistency.
 * High confidence with errors → overconfidence (penalised).
 */
function computeConfidenceScore({ quizMarks, studentConfidence, emotionScore }) {
  const score =
    quizMarks         * CONFIDENCE_WEIGHTS.quizMarks          +
    studentConfidence * CONFIDENCE_WEIGHTS.studentConfidence   +
    emotionScore      * CONFIDENCE_WEIGHTS.emotionScore;

  // Overconfidence penalty: high confidence + low quiz marks → reduce score
  const overconfidencePenalty =
    studentConfidence > 70 && quizMarks < 40
      ? (studentConfidence - 70) * 0.3
      : 0;

  return round1(clamp(score - overconfidencePenalty));
}

/**
 * Confusion Score — measures how confused/lost the student is.
 * High confusion triggers simplification of the explanation.
 */
function computeConfusionScore({ errorRate, confusedFraction, attentionScore }) {
  const attentionInverse = 100 - attentionScore;
  const score =
    errorRate        * (CONFUSION_WEIGHTS.errorRate       / 100) +
    confusedFraction * (CONFUSION_WEIGHTS.emotionNegative / 100) +
    attentionInverse * (CONFUSION_WEIGHTS.attentionInverse / 100);

  return round1(clamp(score * 100));
}

// ── Decision logic ────────────────────────────────────────────────────────────

/**
 * Apply the four decision cases in priority order and return
 * a full Recommendation object.
 */
function decideRecommendation({
  signals,
  scores,
  subject,
  subjectSlug,
  topic,
  subtopic,
  learningStyle,
  currentDifficulty,
  suggestedNextTopic,
}) {
  const { readinessScore, confidenceScore, confusionScore } = scores;
  const { engagementScore } = signals;

  // ── Case 3 takes priority over Case 2 ──────────────────────────────────────
  if (confusionScore >= THRESHOLDS.confusionHigh) {
    return buildRecommendation({
      decisionCase: 'simpler_explanation',
      scores,
      signals,
      subject,
      subjectSlug,
      topic,
      subtopic,
      learningStyle,
      currentDifficulty,
    });
  }

  // ── Case 4: low engagement ──────────────────────────────────────────────────
  if (engagementScore <= THRESHOLDS.engagementLow) {
    return buildRecommendation({
      decisionCase: 'change_format',
      scores,
      signals,
      subject,
      subjectSlug,
      topic,
      subtopic,
      learningStyle,
      currentDifficulty,
    });
  }

  // ── Case 1: high readiness ──────────────────────────────────────────────────
  if (readinessScore >= THRESHOLDS.readinessHigh) {
    return buildRecommendation({
      decisionCase: 'advance_topic',
      scores,
      signals,
      subject,
      subjectSlug,
      topic,
      subtopic,
      learningStyle,
      currentDifficulty,
      suggestedNextTopic,
    });
  }

  // ── Case 2: medium readiness ────────────────────────────────────────────────
  return buildRecommendation({
    decisionCase: 'more_practice',
    scores,
    signals,
    subject,
    subjectSlug,
    topic,
    subtopic,
    learningStyle,
    currentDifficulty,
  });
}

/** Map learning style to a non-current mode for format-switch suggestions */
function alternateModeFromStyle(learningStyle = '', currentMode = 'mixed') {
  const modes = ['visual', 'audio', 'reading', 'interactive'];
  const preferred =
    /visual/i.test(learningStyle)   ? 'visual'
    : /audio/i.test(learningStyle)  ? 'audio'
    : /interactive/i.test(learningStyle) ? 'interactive'
    : 'reading';
  // Return the first mode that is neither current nor preferred
  return modes.find((m) => m !== currentMode && m !== preferred) || 'mixed';
}

/** Build the full recommendation payload for a given decision case */
function buildRecommendation({
  decisionCase,
  scores,
  signals,
  subject,
  subjectSlug,
  topic,
  subtopic,
  learningStyle,
  currentDifficulty,
  suggestedNextTopic,
}) {
  const { readinessScore, confidenceScore, confusionScore } = scores;
  const { engagementScore, quizMarks } = signals;

  const topicLabel  = subtopic ? `${topic} › ${subtopic}` : topic;
  const teacherLink = `/ai-teacher?subject=${subjectSlug}&topic=${encodeURIComponent(topic)}${subtopic ? `&subtopic=${encodeURIComponent(subtopic)}` : ''}`;

  switch (decisionCase) {
    // ── Case 1: Advance to next topic ──────────────────────────────────────
    case 'advance_topic': {
      const nextTopic = suggestedNextTopic || topic;
      const nextLink  = `/ai-teacher?subject=${subjectSlug}&topic=${encodeURIComponent(nextTopic)}`;
      return {
        decisionCase,
        title:   `Ready to advance: ${topicLabel}`,
        message: `Your readiness score is ${readinessScore}% — you've mastered this topic! Quiz performance at ${quizMarks}% shows solid understanding. Time to move forward and build on this foundation.`,
        actionType:           'next_topic',
        actionRoute:          nextTopic !== topic ? nextLink : `/study-plan`,
        actionLabel:          nextTopic !== topic ? `Start ${nextTopic}` : 'View Study Plan',
        suggestedDifficulty:  readinessScore >= 90 ? 'hard' : 'medium',
        suggestedMode:        'mixed',
        suggestedNextTopic:   nextTopic,
        priority:             readinessScore >= 90 ? 'high' : 'medium',
        reasoning:            `Readiness ${readinessScore}% ≥ threshold ${THRESHOLDS.readinessHigh}%. Quiz ${quizMarks}%, engagement ${engagementScore}%.`,
      };
    }

    // ── Case 2: More practice ──────────────────────────────────────────────
    case 'more_practice': {
      const diff =
        readinessScore < 30 ? 'easy'
        : currentDifficulty === 'hard' ? 'medium'
        : currentDifficulty;
      return {
        decisionCase,
        title:   `Practice more: ${topicLabel}`,
        message: `You're making progress (readiness: ${readinessScore}%), but more reinforcement will solidify your understanding. A targeted practice quiz will close the remaining gaps before advancing.`,
        actionType:           'practice_quiz',
        actionRoute:          teacherLink,
        actionLabel:          'Practice Quiz',
        suggestedDifficulty:  diff,
        suggestedMode:        'mixed',
        suggestedNextTopic:   '',
        priority:             readinessScore < 30 ? 'high' : 'medium',
        reasoning:            `Readiness ${readinessScore}% is between ${THRESHOLDS.readinessMedium} and ${THRESHOLDS.readinessHigh}. Confidence ${confidenceScore}%.`,
      };
    }

    // ── Case 3: Simpler explanation ────────────────────────────────────────
    case 'simpler_explanation': {
      const simpleMode =
        /visual/i.test(learningStyle) ? 'visual'
        : /audio/i.test(learningStyle) ? 'audio'
        : 'reading';
      return {
        decisionCase,
        title:   `Let's simplify: ${topicLabel}`,
        message: `Confusion signals are high (${confusionScore}%). The current explanation may not be clicking. A fresh, simplified reteach using ${simpleMode} style will rebuild your understanding from the ground up.`,
        actionType:           'reteach_session',
        actionRoute:          teacherLink,
        actionLabel:          'Reteach me simply',
        suggestedDifficulty:  'easy',
        suggestedMode:        simpleMode,
        suggestedNextTopic:   '',
        priority:             confusionScore >= 80 ? 'urgent' : 'high',
        reasoning:            `Confusion score ${confusionScore}% ≥ threshold ${THRESHOLDS.confusionHigh}%. Error-rate and negative emotion signals elevated.`,
      };
    }

    // ── Case 4: Different learning format ──────────────────────────────────
    case 'change_format':
    default: {
      const altMode = alternateModeFromStyle(learningStyle, 'mixed');
      return {
        decisionCase,
        title:   `Switch it up: ${topicLabel}`,
        message: `Engagement is low (${engagementScore}%). The current format isn't holding your attention. Switching to a ${altMode} approach often re-sparks motivation and improves retention significantly.`,
        actionType:           'change_learning_format',
        actionRoute:          `${teacherLink}&mode=${altMode}`,
        actionLabel:          `Try ${altMode} mode`,
        suggestedDifficulty:  currentDifficulty || 'medium',
        suggestedMode:        altMode,
        suggestedNextTopic:   '',
        priority:             engagementScore <= 20 ? 'urgent' : 'high',
        reasoning:            `Engagement ${engagementScore}% ≤ threshold ${THRESHOLDS.engagementLow}. Switching mode from current to ${altMode}.`,
      };
    }
  }
}

// ── Core public API ───────────────────────────────────────────────────────────

/**
 * evaluate
 * ========
 * Full pipeline: collect signals → compute scores → decide → persist.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} [opts.sessionId]    — if from a session completion
 * @param {string} opts.subjectSlug
 * @param {string} opts.subject
 * @param {string} opts.topic
 * @param {string} [opts.subtopic]
 * @param {string} [opts.triggerEvent] — 'session_completed' | 'quiz_submitted' | etc.
 * @param {object} [opts.overrides]    — partial signal overrides (from req.body)
 * @returns {Promise<AdaptiveLearningRecord>}
 */
exports.evaluate = async ({
  userId,
  sessionId,
  subjectSlug,
  subject,
  topic,
  subtopic = '',
  triggerEvent = 'manual_request',
  overrides = {},
}) => {
  // 1. Collect all signals from DB
  const { signals: collectedSignals, derived } = await collectSignals({
    userId,
    sessionId,
    subjectSlug,
    topic,
  });

  // 2. Merge any caller-provided overrides (allow explicit values from req.body)
  const signals = {
    ...collectedSignals,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([k]) => k in collectedSignals)
    ),
  };

  // 3. Load teaching context for better recommendation text
  const [progress, learningReport] = await Promise.all([
    TopicProgress.findOne({ userId, subjectSlug, topic }).lean(),
    LearningStyleReport.findOne({ userId }).lean(),
  ]);

  const currentDifficulty = progress?.currentDifficulty || 'medium';
  const learningStyle = learningReport?.preferredLearningStyle || 'Reading/Writing Learner';

  // Suggest the next topic from the study plan if available
  let suggestedNextTopic = '';
  try {
    const plan = await StudyPlan.findOne({ userId, status: 'active' }).lean();
    if (plan) {
      const allSessions = (plan.weeklyPlan || []).flatMap((w) =>
        (w.days || []).flatMap((d) => d.sessions || [])
      );
      const currentIdx = allSessions.findIndex(
        (s) => s.subjectSlug === subjectSlug && s.topic === topic && !s.completed
      );
      if (currentIdx >= 0 && allSessions[currentIdx + 1]) {
        suggestedNextTopic = allSessions[currentIdx + 1].topic;
      }
    }
  } catch {}

  // 4. Compute three scores
  const readinessScore  = computeReadinessScore({
    quizMarks:      signals.quizMarks,
    completionRate: signals.completionRate,
    learningSpeed:  signals.learningSpeed,
    attentionScore: signals.attentionScore,
  });

  const confidenceScore = computeConfidenceScore({
    quizMarks:         signals.quizMarks,
    studentConfidence: derived.studentConfidence,
    emotionScore:      signals.emotionScore,
  });

  const confusionScore  = computeConfusionScore({
    errorRate:        derived.errorRate,
    confusedFraction: derived.confusedFraction,
    attentionScore:   signals.attentionScore,
  });

  const scores = { readinessScore, confidenceScore, confusionScore };

  // 5. Decision logic → recommendation object
  const recommendation = decideRecommendation({
    signals,
    scores,
    subject,
    subjectSlug,
    topic,
    subtopic,
    learningStyle,
    currentDifficulty,
    suggestedNextTopic,
  });

  // 6. Persist
  const record = await AdaptiveLearningRecord.create({
    userId,
    sessionId: sessionId || null,
    subjectSlug,
    subject,
    topic,
    subtopic,
    triggerEvent,
    inputs: signals,
    scores,
    decisionCase: recommendation.decisionCase,
    recommendation,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return record;
};

/**
 * getLatestForTopic
 * =================
 * Return the most recent active record for a user/topic combination.
 */
exports.getLatestForTopic = async (userId, subjectSlug, topic) => {
  return AdaptiveLearningRecord.findOne({
    userId,
    subjectSlug,
    topic,
    status: 'active',
  })
    .sort({ evaluatedAt: -1 })
    .lean();
};

/**
 * getUserHistory
 * ==============
 * Return recent records for a user, optionally filtered by subject.
 * Sorted by evaluatedAt desc.
 */
exports.getUserHistory = async (userId, { subjectSlug, limit = 20 } = {}) => {
  const filter = { userId };
  if (subjectSlug) filter.subjectSlug = subjectSlug;
  return AdaptiveLearningRecord.find(filter)
    .sort({ evaluatedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * markApplied / markDismissed
 * ===========================
 * Update the lifecycle status of a record.
 */
exports.markApplied = async (recordId, userId) => {
  return AdaptiveLearningRecord.findOneAndUpdate(
    { _id: recordId, userId },
    { $set: { status: 'applied', appliedAt: new Date() } },
    { new: true }
  );
};

exports.markDismissed = async (recordId, userId) => {
  return AdaptiveLearningRecord.findOneAndUpdate(
    { _id: recordId, userId },
    { $set: { status: 'dismissed', dismissedAt: new Date() } },
    { new: true }
  );
};

/**
 * getDashboardSummary
 * ===================
 * Light summary for the student dashboard: latest recommendation per active topic.
 */
exports.getDashboardSummary = async (userId) => {
  // Get one latest active record per topic
  const records = await AdaptiveLearningRecord.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active' } },
    { $sort:  { evaluatedAt: -1 } },
    { $group: {
        _id:            '$topic',
        record:         { $first: '$$ROOT' },
        decisionCase:   { $first: '$decisionCase' },
        readiness:      { $first: '$scores.readinessScore' },
        confusion:      { $first: '$scores.confusionScore' },
        engagement:     { $first: '$inputs.engagementScore' },
      }
    },
    { $limit: 10 },
  ]);

  return records.map((r) => r.record);
};
