/**
 * ContentAdaptationService
 * ========================
 * Recommends the optimal content format for a student given:
 *   1. Learning Style      — from LearningStyleReport
 *   2. Confusion Score     — from AdaptiveLearningRecord (latest)
 *   3. Engagement Score    — from EngagementMetrics (latest)
 *   4. Historical Success  — derived from TopicProgress + StudentAnswer history
 *
 * Supported formats:
 *   video | pdf | infographic | flashcards | interactive_quiz | coding_practice
 *
 * Scoring model
 * -------------
 * Each format has a base weight vector across four dimensions.
 * Final score = Σ(dimension_score × dimension_weight × format_affinity)
 * All scores normalised to 0–100.
 *
 * No existing model is modified — reads only.
 */

'use strict';

const mongoose                    = require('mongoose');
const ContentFormatRecommendation = require('../models/adaptive/ContentFormatRecommendation');
const AdaptiveLearningRecord      = require('../models/adaptive/AdaptiveLearningRecord');
const EngagementMetrics           = require('../models/adaptive/EngagementMetrics');
const LearningStyleReport         = require('../models/LearningStyleReport');
const TopicProgress               = require('../models/TopicProgress');
const StudentAnswer               = require('../models/StudentAnswer');
const LearningSession             = require('../models/LearningSession');

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMATS = ['video', 'pdf', 'infographic', 'flashcards', 'interactive_quiz', 'coding_practice'];

/**
 * Base affinity matrix — how well each format serves each learning dimension.
 * Values 0.0 → 1.0.  Higher = stronger natural fit.
 *
 * Dimensions:
 *   styleAffinity      — alignment with learning style
 *   confusionRelief    — effectiveness at reducing confusion
 *   engagementLift     — ability to raise low engagement
 *   successReinforce   — reinforcement value when success is low
 */
const FORMAT_AFFINITY = {
  video: {
    styleAffinity:     { 'Visual Learner': 1.0, 'Audio Learner': 0.9, 'Reading/Writing Learner': 0.4, 'Interactive Learner': 0.5 },
    confusionRelief:   0.75,   // visual walkthroughs break confusion well
    engagementLift:    0.85,   // video re-engages passive learners effectively
    successReinforce:  0.60,
  },
  pdf: {
    styleAffinity:     { 'Visual Learner': 0.3, 'Audio Learner': 0.2, 'Reading/Writing Learner': 1.0, 'Interactive Learner': 0.3 },
    confusionRelief:   0.55,   // structured text helps systematic thinkers
    engagementLift:    0.25,   // low — already low-engagement students won't pick up docs
    successReinforce:  0.45,
  },
  infographic: {
    styleAffinity:     { 'Visual Learner': 0.95, 'Audio Learner': 0.35, 'Reading/Writing Learner': 0.50, 'Interactive Learner': 0.55 },
    confusionRelief:   0.80,   // visual summaries cut through complexity fast
    engagementLift:    0.70,   // colour/layout catches attention
    successReinforce:  0.50,
  },
  flashcards: {
    styleAffinity:     { 'Visual Learner': 0.55, 'Audio Learner': 0.40, 'Reading/Writing Learner': 0.70, 'Interactive Learner': 0.85 },
    confusionRelief:   0.65,   // spaced repetition isolates gaps
    engagementLift:    0.75,   // self-testing is engaging
    successReinforce:  0.90,   // best for low-success reinforcement loops
  },
  interactive_quiz: {
    styleAffinity:     { 'Visual Learner': 0.60, 'Audio Learner': 0.45, 'Reading/Writing Learner': 0.55, 'Interactive Learner': 1.0 },
    confusionRelief:   0.50,   // good for testing understanding but not explaining
    engagementLift:    0.90,   // highest engagement lift of all formats
    successReinforce:  0.80,
  },
  coding_practice: {
    styleAffinity:     { 'Visual Learner': 0.40, 'Audio Learner': 0.20, 'Reading/Writing Learner': 0.50, 'Interactive Learner': 0.95 },
    confusionRelief:   0.35,   // hands-on but increases confusion if foundations are shaky
    engagementLift:    0.80,   // high for technically-oriented students
    successReinforce:  0.70,
  },
};

// Dimension weights for the composite score
const WEIGHTS = {
  styleAffinity:    0.35,
  confusionRelief:  0.25,
  engagementLift:   0.25,
  successReinforce: 0.15,
};

// Adjustment multipliers for extreme signal values
const CONFUSION_BOOST_THRESHOLD  = 60;   // boost confusionRelief weight when confusion is high
const ENGAGEMENT_BOOST_THRESHOLD = 35;   // boost engagementLift weight when engagement is low
const SUCCESS_BOOST_THRESHOLD    = 40;   // boost successReinforce when history is weak

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));

// ── Signal collectors ─────────────────────────────────────────────────────────

async function collectInputSignals({ userId, sessionId, subjectSlug, topic }) {
  // 1. Learning style from LearningStyleReport
  const styleReport = await LearningStyleReport.findOne({ userId }).lean();
  const learningStyle = styleReport?.preferredLearningStyle || 'Reading/Writing Learner';

  // 2. Confusion score — latest AdaptiveLearningRecord for topic
  const adaptFilter = { userId, subjectSlug, topic };
  if (sessionId) adaptFilter.sessionId = sessionId;
  const adaptRecord = await AdaptiveLearningRecord
    .findOne(adaptFilter)
    .sort({ evaluatedAt: -1 })
    .lean();
  const confusionScore = clamp(adaptRecord?.scores?.confusionScore ?? 30);

  // 3. Engagement score — latest EngagementMetrics
  const engFilter = { userId };
  if (sessionId) engFilter.sessionId = sessionId;
  else engFilter.subjectSlug = subjectSlug;
  const engDoc = await EngagementMetrics
    .findOne(engFilter)
    .sort({ date: -1 })
    .lean();
  const engagementScore = clamp(engDoc?.engagementScore ?? 50);

  // 4. Historical success — avg mastery + quiz accuracy from TopicProgress & StudentAnswer
  const progress = await TopicProgress.findOne({ userId, subjectSlug, topic }).lean();
  let historicalSuccess = 50;
  if (progress) {
    // Blend mastery and best quiz score
    historicalSuccess = clamp(
      (progress.masteryPercent || 0) * 0.6 +
      (progress.bestQuizScore  || 0) * 0.4
    );
  } else {
    // Fall back to recent StudentAnswer average
    const answers = await StudentAnswer
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    if (answers.length) {
      historicalSuccess = clamp(
        answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length
      );
    }
  }

  return { learningStyle, confusionScore, engagementScore, historicalSuccess };
}

// ── Scoring engine ────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 fit score for each format given the four signals.
 * Returns an array sorted by score descending with rank attached.
 */
function rankFormats({ learningStyle, confusionScore, engagementScore, historicalSuccess }) {
  // Dynamically adjust weights based on signal extremes
  const effectiveWeights = { ...WEIGHTS };

  if (confusionScore >= CONFUSION_BOOST_THRESHOLD) {
    effectiveWeights.confusionRelief  += 0.10;
    effectiveWeights.styleAffinity    -= 0.05;
    effectiveWeights.successReinforce -= 0.05;
  }
  if (engagementScore <= ENGAGEMENT_BOOST_THRESHOLD) {
    effectiveWeights.engagementLift   += 0.10;
    effectiveWeights.styleAffinity    -= 0.05;
    effectiveWeights.successReinforce -= 0.05;
  }
  if (historicalSuccess <= SUCCESS_BOOST_THRESHOLD) {
    effectiveWeights.successReinforce += 0.10;
    effectiveWeights.styleAffinity    -= 0.05;
    effectiveWeights.confusionRelief  -= 0.05;
  }

  // Normalise dimension inputs to [0,1]
  const confusionNorm  = confusionScore  / 100;
  const engagementNorm = engagementScore / 100;
  const successNorm    = historicalSuccess / 100;

  const scores = FORMATS.map((format) => {
    const aff = FORMAT_AFFINITY[format];
    const styleScore = aff.styleAffinity[learningStyle] ?? 0.5;

    // confusionRelief: more valuable when confusion is HIGH
    const confusionValue = aff.confusionRelief * confusionNorm;

    // engagementLift: more valuable when engagement is LOW
    const engagementValue = aff.engagementLift * (1 - engagementNorm);

    // successReinforce: more valuable when success is LOW
    const successValue = aff.successReinforce * (1 - successNorm);

    const raw =
      styleScore     * effectiveWeights.styleAffinity    +
      confusionValue * effectiveWeights.confusionRelief  +
      engagementValue* effectiveWeights.engagementLift   +
      successValue   * effectiveWeights.successReinforce;

    // raw is in [0, ~0.4] since affinities are ≤1 and weights sum to ~1
    const score = clamp(Math.round(raw * 200)); // scale to 0–100

    // Estimated engagement gain (signed, relative to average)
    const avgEngagementLift = Object.values(FORMAT_AFFINITY).reduce(
      (s, a) => s + a.engagementLift, 0
    ) / FORMATS.length;
    const estimatedEngagementGain = Math.round(
      (aff.engagementLift - avgEngagementLift) * (100 - engagementScore)
    );

    return { format, score, estimatedEngagementGain };
  });

  // Sort descending by score, assign rank
  const sorted = scores.sort((a, b) => b.score - a.score);
  return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
}

/** Build the human-readable reasoning string */
function buildReasoning({ format, learningStyle, confusionScore, engagementScore, historicalSuccess }) {
  const parts = [];
  const affinityForStyle = FORMAT_AFFINITY[format]?.styleAffinity[learningStyle] ?? 0.5;

  if (affinityForStyle >= 0.8) {
    parts.push(`${format.replace('_', ' ')} aligns strongly with your ${learningStyle} profile`);
  }
  if (confusionScore >= CONFUSION_BOOST_THRESHOLD) {
    parts.push(`confusion score of ${confusionScore}% favours ${FORMAT_AFFINITY[format]?.confusionRelief >= 0.7 ? 'visual/structured formats' : 'practice-based reinforcement'}`);
  }
  if (engagementScore <= ENGAGEMENT_BOOST_THRESHOLD) {
    parts.push(`low engagement (${engagementScore}%) benefits from ${format.replace('_', ' ')} which provides higher interaction`);
  }
  if (historicalSuccess <= SUCCESS_BOOST_THRESHOLD) {
    parts.push(`limited past success (${historicalSuccess}%) calls for reinforcement-heavy content`);
  }
  if (!parts.length) {
    parts.push(`${format.replace('_', ' ')} provides the best overall fit for your current learning signals`);
  }
  return parts.join('; ') + '.';
}

/** Short adaptation note for UI display */
function buildAdaptationNote({ confusionScore, engagementScore, historicalSuccess, recommendedFormat }) {
  if (confusionScore >= 70)    return `High confusion detected — ${recommendedFormat.replace('_', ' ')} reduces cognitive load fastest.`;
  if (engagementScore <= 30)   return `Low engagement — switching to ${recommendedFormat.replace('_', ' ')} format to re-activate attention.`;
  if (historicalSuccess <= 30) return `Weak past results — ${recommendedFormat.replace('_', ' ')} reinforces fundamentals before progressing.`;
  return `${recommendedFormat.replace('_', ' ')} is the best fit for your current learning state.`;
}

// ── Core public API ───────────────────────────────────────────────────────────

/**
 * recommend
 * =========
 * Collect signals → rank formats → persist → return recommendation doc.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} [opts.sessionId]
 * @param {string} [opts.materialId]    — optional LearningMaterial ref
 * @param {string} opts.subjectSlug
 * @param {string} opts.subject
 * @param {string} opts.topic
 * @param {string} [opts.subtopic]
 * @param {object} [opts.overrides]     — partial signal overrides from req.body
 * @returns {Promise<ContentFormatRecommendation>}
 */
exports.recommend = async ({
  userId,
  sessionId,
  materialId,
  subjectSlug,
  subject,
  topic,
  subtopic = '',
  overrides = {},
}) => {
  // 1. Collect signals
  const collected = await collectInputSignals({ userId, sessionId, subjectSlug, topic });

  // 2. Merge any caller overrides
  const inputs = {
    learningStyle:     overrides.learningStyle    ?? collected.learningStyle,
    confusionScore:    overrides.confusionScore   !== undefined ? Number(overrides.confusionScore)   : collected.confusionScore,
    engagementScore:   overrides.engagementScore  !== undefined ? Number(overrides.engagementScore)  : collected.engagementScore,
    historicalSuccess: overrides.historicalSuccess !== undefined ? Number(overrides.historicalSuccess): collected.historicalSuccess,
  };

  // 3. Rank all formats
  const ranked = rankFormats(inputs);

  const primary   = ranked[0];
  const fallback  = ranked[1];

  // 4. Build reasoning strings
  const rankedFormats = ranked.map((item) => ({
    ...item,
    reasoning: buildReasoning({ format: item.format, ...inputs }),
  }));

  const primaryReasoning = buildReasoning({ format: primary.format, ...inputs });
  const adaptationNote   = buildAdaptationNote({ ...inputs, recommendedFormat: primary.format });

  // 5. Persist
  const doc = await ContentFormatRecommendation.create({
    userId,
    sessionId:   sessionId  || null,
    materialId:  materialId || null,
    subjectSlug,
    subject:     subject || subjectSlug,
    topic,
    subtopic,
    inputs,
    recommendedFormat: primary.format,
    fallbackFormat:    fallback.format,
    rankedFormats,
    primaryReasoning,
    adaptationNote,
    generatedAt: new Date(),
    expiresAt:   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  return doc;
};

/**
 * getLatestForTopic
 * Return the most recent active recommendation for a user/topic.
 */
exports.getLatestForTopic = async (userId, subjectSlug, topic) => {
  return ContentFormatRecommendation
    .findOne({ userId, subjectSlug, topic, status: 'active' })
    .sort({ generatedAt: -1 })
    .lean();
};

/**
 * getUserHistory
 * Return recent recommendations for a user, newest first.
 */
exports.getUserHistory = async (userId, { subjectSlug, limit = 20 } = {}) => {
  const filter = { userId };
  if (subjectSlug) filter.subjectSlug = subjectSlug;
  return ContentFormatRecommendation
    .find(filter)
    .sort({ generatedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * getDashboardSummary
 * Latest active recommendation per topic — for dashboard widget.
 */
exports.getDashboardSummary = async (userId) => {
  const records = await ContentFormatRecommendation.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active' } },
    { $sort:  { generatedAt: -1 } },
    { $group: {
        _id:   '$topic',
        record: { $first: '$$ROOT' },
      }
    },
    { $replaceRoot: { newRoot: '$record' } },
    { $limit: 10 },
  ]);
  return records;
};

/**
 * getFormatStats
 * Aggregated format usage stats for a user — useful for analytics panel.
 */
exports.getFormatStats = async (userId, days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const docs = await ContentFormatRecommendation
    .find({ userId, generatedAt: { $gte: since } })
    .select('recommendedFormat status inputs.engagementScore inputs.confusionScore')
    .lean();

  const formatCount = {};
  for (const f of FORMATS) formatCount[f] = 0;
  let totalApplied = 0;

  for (const doc of docs) {
    formatCount[doc.recommendedFormat] = (formatCount[doc.recommendedFormat] || 0) + 1;
    if (doc.status === 'applied') totalApplied++;
  }

  const mostRecommended = Object.entries(formatCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalRecommendations: docs.length,
    totalApplied,
    applyRate: docs.length ? Math.round((totalApplied / docs.length) * 100) : 0,
    formatBreakdown: formatCount,
    mostRecommended,
  };
};

/**
 * markApplied / markDismissed
 */
exports.markApplied = async (recordId, userId) => {
  return ContentFormatRecommendation.findOneAndUpdate(
    { _id: recordId, userId },
    { $set: { status: 'applied', appliedAt: new Date() } },
    { new: true }
  );
};

exports.markDismissed = async (recordId, userId) => {
  return ContentFormatRecommendation.findOneAndUpdate(
    { _id: recordId, userId },
    { $set: { status: 'dismissed' } },
    { new: true }
  );
};
