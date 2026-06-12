/**
 * LearningAnalyticsService
 * ========================
 * Core engine that computes the composite Engagement Score from four
 * input signals and persists an EngagementMetrics document per session.
 *
 * Formula
 * -------
 *   engagementScore =
 *     attentionComponent   × 0.40   (avg attention score from AttentionSnapshots)
 *   + presenceComponent    × 0.30   (face presence × screen focus rates)
 *   + emotionStability     × 0.20   (positive-minus-negative emotion balance)
 *   + interactionRate      × 0.10   (interaction events per session minute)
 *
 * All components are normalised to [0–100] before weighting.
 * The service is stateless — call computeAndSave() at session end or on demand.
 */

'use strict';

const mongoose              = require('mongoose');
const AttentionSnapshot     = require('../models/adaptive/AttentionSnapshot');
const EmotionLog            = require('../models/adaptive/EmotionLog');
const LearningSession       = require('../models/LearningSession');
const EngagementMetrics     = require('../models/adaptive/EngagementMetrics');
const TeachingHistory       = require('../models/TeachingHistory');

// ── Constants ─────────────────────────────────────────────────────────────────
const WEIGHTS = { attention: 0.40, presence: 0.30, emotion: 0.20, interaction: 0.10 };

// Emotion weights: positive → increase score, negative → decrease
const EMOTION_WEIGHTS = {
  engaged:    +1.0,
  happy:      +0.7,
  neutral:     0.0,
  confused:   -0.4,
  frustrated: -0.8,
  sad:        -0.5,
};

// Maximum interactions-per-minute considered "fully engaged"
const MAX_INTERACTIONS_PER_MIN = 3;

// Grade thresholds
const GRADE_THRESHOLDS = [
  { min: 85, label: 'excellent' },
  { min: 70, label: 'good' },
  { min: 50, label: 'moderate' },
  { min: 30, label: 'low' },
  { min: 0,  label: 'critical' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp   = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number(v) || 0));
const round1  = (v) => Math.round(v * 10) / 10;

function gradeFromScore(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.label;
  }
  return 'critical';
}

// ── Signal aggregators ────────────────────────────────────────────────────────

/**
 * Aggregate all AttentionSnapshots for a session into component scores.
 * @returns {{ attentionComponent, presenceComponent, detail }}
 */
async function aggregateAttention(sessionId, userId) {
  const snaps = await AttentionSnapshot.find({ sessionId, userId }).lean();
  if (!snaps.length) {
    return {
      attentionComponent: 0,
      presenceComponent:  0,
      detail: {
        snapshotCount:       0,
        avgAttentionScore:   0,
        avgFocusPercentage:  0,
        facePresenceRate:    0,
        screenFocusRate:     0,
        totalFaceMissingMs:  0,
        totalLookingAwayMs:  0,
        distractionCount:    0,
      },
    };
  }

  const n = snaps.length;
  let sumAttn = 0, sumFocus = 0, facePresent = 0, screenFocused = 0;
  let totalFaceMissingMs = 0, totalLookingAwayMs = 0, distractionCount = 0;

  for (const s of snaps) {
    sumAttn          += s.attentionScore     || 0;
    sumFocus         += s.focusPercentage    || 0;
    if (s.facePresent)     facePresent++;
    if (s.isScreenFocused) screenFocused++;
    totalFaceMissingMs  += s.faceMissingDurationMs      || 0;
    totalLookingAwayMs  += s.lookingAwayDurationMs      || 0;
    distractionCount    += (s.distractionEvents || []).length;
  }

  const avgAttentionScore  = round1(sumAttn  / n);
  const avgFocusPercentage = round1(sumFocus / n);
  const facePresenceRate   = round1((facePresent  / n) * 100);
  const screenFocusRate    = round1((screenFocused / n) * 100);

  // attentionComponent  = average of attention score + focus percentage
  const attentionComponent = clamp((avgAttentionScore + avgFocusPercentage) / 2);

  // presenceComponent = geometric mean of face-presence and screen-focus rates
  const presenceComponent  = clamp(Math.sqrt(facePresenceRate * screenFocusRate));

  return {
    attentionComponent,
    presenceComponent,
    detail: {
      snapshotCount:     n,
      avgAttentionScore,
      avgFocusPercentage,
      facePresenceRate,
      screenFocusRate,
      totalFaceMissingMs,
      totalLookingAwayMs,
      distractionCount,
    },
  };
}

/**
 * Aggregate all EmotionLogs for a session into an emotion stability score.
 * @returns {{ emotionStabilityComponent, detail }}
 */
async function aggregateEmotion(sessionId, userId) {
  const logs = await EmotionLog.find({ sessionId, userId }).lean();
  if (!logs.length) {
    return {
      emotionStabilityComponent: 50,  // neutral baseline when no data
      detail: {
        logCount: 0,
        dominantEmotion: 'unknown',
        emotionDistribution: {},
      },
    };
  }

  // Accumulate emotion sums
  const sums = { happy: 0, neutral: 0, confused: 0, frustrated: 0, sad: 0, engaged: 0 };
  for (const log of logs) {
    for (const [k, v] of Object.entries(log.emotions || {})) {
      if (k in sums) sums[k] += v;
    }
  }

  const n = logs.length;
  const dist = {};
  for (const [k, v] of Object.entries(sums)) {
    dist[k] = round1(v / n);
  }

  // Weighted balance: positive emotions add, negative subtract
  let rawBalance = 0;
  for (const [emotion, weight] of Object.entries(EMOTION_WEIGHTS)) {
    rawBalance += (dist[emotion] || 0) * weight;
  }
  // rawBalance range: roughly [-0.8, +1.0] → normalise to [0,100]
  const emotionStabilityComponent = clamp(((rawBalance + 0.8) / 1.8) * 100);

  // Most frequent dominant emotion
  const domCounts = {};
  for (const log of logs) {
    const e = log.dominantEmotion || 'neutral';
    domCounts[e] = (domCounts[e] || 0) + 1;
  }
  const dominantEmotion = Object.entries(domCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  return {
    emotionStabilityComponent: round1(emotionStabilityComponent),
    detail: {
      logCount: n,
      dominantEmotion,
      emotionDistribution: dist,
    },
  };
}

/**
 * Aggregate interaction events from TeachingHistory for a session.
 * @param {string} sessionId
 * @param {number} sessionDurationMs
 * @returns {{ interactionComponent, detail }}
 */
async function aggregateInteractions(sessionId, sessionDurationMs) {
  const [events, snaps] = await Promise.all([
    TeachingHistory.find({ learningSessionId: sessionId }).lean(),
    AttentionSnapshot.find({ sessionId }).lean()
  ]);

  const interactionTypes = [
    'answer_analyzed',
    'question_generated',
    'session_started',
    'session_completed',
    'plan_modified',
  ];

  const filtered = events.filter((e) => interactionTypes.includes(e.eventType));
  const count    = filtered.length;

  let cursorMoves = 0, clicks = 0, keyPresses = 0, scrolls = 0;
  let tabSwitches = 0, windowBlurs = 0, cursorLeaves = 0;
  let windowBlurDurationMs = 0;
  let totalIdleCount = 0;
  let validSnaps = 0;

  for (const snap of snaps) {
    if (!snap.browserTelemetry) continue;
    validSnaps++;
    const bt = snap.browserTelemetry;
    cursorMoves += bt.cursorMoveCount || 0;
    clicks += bt.clickCount || 0;
    keyPresses += bt.keyPressCount || 0;
    scrolls += bt.scrollCount || 0;
    tabSwitches += bt.tabSwitchCount || 0;
    windowBlurs += bt.windowBlurCount || 0;
    cursorLeaves += bt.cursorLeaveCount || 0;
    windowBlurDurationMs += bt.windowBlurDurationMs || 0;
    if (bt.isIdle) totalIdleCount++;
  }

  const idleRate = validSnaps > 0 ? (totalIdleCount / validSnaps) * 100 : 0;
  
  // Combine browser telemetry events with teaching history events
  const browserEventCount = clicks + keyPresses + scrolls;
  const equivalentEvents = count + (browserEventCount / 20); // 20 physical actions ~ 1 meaningful interaction

  const durationMinutes = Math.max(1, sessionDurationMs / 60_000);
  const eventsPerMin    = equivalentEvents / durationMinutes;

  // Normalise: MAX_INTERACTIONS_PER_MIN → 100
  const interactionComponent = clamp((eventsPerMin / MAX_INTERACTIONS_PER_MIN) * 100);

  // Build lightweight event log for storage
  const interactionEvents = filtered.map((e) => ({
    eventType: mapTeachingHistoryType(e.eventType),
    timestamp: e.createdAt,
    metadata:  { summary: e.summary },
  }));

  return {
    interactionComponent: round1(interactionComponent),
    detail: {
      eventCount: count,
      eventsPerMin: round1(eventsPerMin),
      interactionEvents,
      activeInteractionMinutes: round1(Math.min(durationMinutes, count / MAX_INTERACTIONS_PER_MIN)),
      browserTelemetry: {
        cursorMoves,
        clicks,
        keyPresses,
        scrolls,
        tabSwitches,
        windowBlurs,
        cursorLeaves,
        windowBlurDurationMs,
        idleRate: round1(idleRate),
      }
    },
  };
}

function mapTeachingHistoryType(t) {
  const map = {
    answer_analyzed:    'answer_submitted',
    question_generated: 'question_generated',
    session_started:    'session_started',
    session_completed:  'session_completed',
    plan_modified:      'plan_modified',
  };
  return map[t] || 'block_viewed';
}

// ── Core public API ───────────────────────────────────────────────────────────

/**
 * computeAndSave
 * ==============
 * Gather all signals for a session, compute the composite score, and
 * upsert an EngagementMetrics document (one per session — idempotent).
 *
 * @param {string|ObjectId} sessionId
 * @param {string|ObjectId} userId
 * @returns {Promise<EngagementMetrics>}
 */
exports.computeAndSave = async (sessionId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid sessionId');
  }

  // Load session for context and duration
  const session = await LearningSession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error('Learning session not found');

  const sessionDurationMs = session.completedAt
    ? new Date(session.completedAt) - new Date(session.createdAt)
    : Date.now() - new Date(session.createdAt);

  // Gather all three signals in parallel
  const [attn, emo, inter] = await Promise.all([
    aggregateAttention(sessionId, userId),
    aggregateEmotion(sessionId, userId),
    aggregateInteractions(sessionId, sessionDurationMs),
  ]);

  // ── Composite score ────────────────────────────────────────────────────────
  const engagementScore = clamp(
    attn.attentionComponent       * WEIGHTS.attention +
    attn.presenceComponent        * WEIGHTS.presence  +
    emo.emotionStabilityComponent * WEIGHTS.emotion   +
    inter.interactionComponent    * WEIGHTS.interaction
  );

  const focusIndex = clamp((attn.attentionComponent + attn.presenceComponent) / 2);

  // ── Upsert ─────────────────────────────────────────────────────────────────
  const doc = await EngagementMetrics.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        userId,
        sessionId,
        subject:       session.subject     || '',
        subjectSlug:   session.subjectSlug || '',
        topic:         session.topic       || '',
        sessionStatus: session.status,
        date:          session.createdAt,
        sessionDurationMs,

        // Component scores
        attentionComponent:        attn.attentionComponent,
        presenceComponent:         attn.presenceComponent,
        emotionStabilityComponent: emo.emotionStabilityComponent,
        interactionComponent:      inter.interactionComponent,

        // Composite
        engagementScore: Math.round(engagementScore),
        engagementGrade: gradeFromScore(engagementScore),
        focusIndex:      Math.round(focusIndex),

        // Raw counts
        attentionSnapshotCount: attn.detail.snapshotCount,
        emotionLogCount:        emo.detail.logCount,
        interactionEventCount:  inter.detail.eventCount,

        // Attention detail
        avgAttentionScore:    attn.detail.avgAttentionScore,
        avgFocusPercentage:   attn.detail.avgFocusPercentage,
        facePresenceRate:     attn.detail.facePresenceRate,
        screenFocusRate:      attn.detail.screenFocusRate,
        totalFaceMissingMs:   attn.detail.totalFaceMissingMs,
        totalLookingAwayMs:   attn.detail.totalLookingAwayMs,
        distractionCount:     attn.detail.distractionCount,

        // Emotion detail
        dominantEmotion:      emo.detail.dominantEmotion,
        emotionDistribution:  emo.detail.emotionDistribution,

        // Interaction detail
        interactionEvents:         inter.detail.interactionEvents,
        activeInteractionMinutes:  inter.detail.activeInteractionMinutes,
        browserTelemetry:          inter.detail.browserTelemetry,
      },
    },
    { upsert: true, new: true }
  );

  return doc;
};

/**
 * getSessionEngagement
 * ====================
 * Return (or compute on-demand) the EngagementMetrics for one session.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {boolean} [recompute=false]  Force recompute even if doc exists
 */
exports.getSessionEngagement = async (sessionId, userId, recompute = false) => {
  if (!recompute) {
    const existing = await EngagementMetrics.findOne({ sessionId }).lean();
    if (existing) return existing;
  }
  return exports.computeAndSave(sessionId, userId);
};

/**
 * getUserEngagementSummary
 * ========================
 * Aggregate all EngagementMetrics docs for a user over a time window.
 * Returns trend data, per-subject rollups, and an overall summary object.
 *
 * @param {string} userId
 * @param {{ days?: number, subjectSlug?: string }} options
 */
exports.getUserEngagementSummary = async (userId, { days = 30, subjectSlug } = {}) => {
  const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filter = { userId, date: { $gte: since } };
  if (subjectSlug) filter.subjectSlug = subjectSlug;

  const docs = await EngagementMetrics.find(filter).sort({ date: -1 }).lean();

  if (!docs.length) {
    return {
      overallEngagement: 0,
      overallGrade:      'critical',
      sessionCount:      0,
      trend:             [],
      bySubject:         [],
      componentAverages: buildEmptyComponents(),
    };
  }

  // ── Overall averages ───────────────────────────────────────────────────────
  const n = docs.length;
  const sums = { engagement: 0, attention: 0, presence: 0, emotion: 0, interaction: 0 };
  for (const d of docs) {
    sums.engagement  += d.engagementScore;
    sums.attention   += d.attentionComponent;
    sums.presence    += d.presenceComponent;
    sums.emotion     += d.emotionStabilityComponent;
    sums.interaction += d.interactionComponent;
  }

  const overallEngagement = Math.round(sums.engagement / n);

  // ── Daily trend ────────────────────────────────────────────────────────────
  const byDay = {};
  for (const d of docs) {
    const day = new Date(d.date).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { scores: [], date: day };
    byDay[day].scores.push(d.engagementScore);
  }
  const trend = Object.values(byDay)
    .map(({ date, scores }) => ({
      date,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Per-subject rollup ─────────────────────────────────────────────────────
  const bySub = {};
  for (const d of docs) {
    const slug = d.subjectSlug || 'unknown';
    if (!bySub[slug]) bySub[slug] = { subjectSlug: slug, subject: d.subject, scores: [] };
    bySub[slug].scores.push(d.engagementScore);
  }
  const bySubject = Object.values(bySub).map(({ subjectSlug: slug, subject, scores }) => ({
    subjectSlug: slug,
    subject,
    avgEngagement: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    sessionCount:  scores.length,
  }));

  return {
    overallEngagement,
    overallGrade: gradeFromScore(overallEngagement),
    sessionCount: n,
    trend,
    bySubject,
    componentAverages: {
      attention:   Math.round(sums.attention   / n),
      presence:    Math.round(sums.presence    / n),
      emotion:     Math.round(sums.emotion     / n),
      interaction: Math.round(sums.interaction / n),
    },
  };
};

/**
 * getCourseEngagementSummary
 * ==========================
 * Aggregate across all users for a given subjectSlug.
 * Typically called by a teacher-facing endpoint.
 *
 * @param {string} subjectSlug
 * @param {{ days?: number }} options
 */
exports.getCourseEngagementSummary = async (subjectSlug, { days = 30 } = {}) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const docs = await EngagementMetrics.find({
    subjectSlug,
    date: { $gte: since },
  })
    .select('userId engagementScore attentionComponent presenceComponent emotionStabilityComponent interactionComponent date topic engagementGrade')
    .lean();

  if (!docs.length) {
    return {
      subjectSlug,
      sessionCount:      0,
      uniqueStudents:    0,
      avgEngagement:     0,
      overallGrade:      'critical',
      trend:             [],
      byTopic:           [],
      gradeDistribution: {},
      componentAverages: buildEmptyComponents(),
    };
  }

  const n = docs.length;
  const uniqueStudents = new Set(docs.map((d) => d.userId.toString())).size;

  let sumEng = 0, sumAttn = 0, sumPres = 0, sumEmo = 0, sumInter = 0;
  const byTopic = {}, byDay = {}, gradeDist = {};

  for (const d of docs) {
    sumEng   += d.engagementScore;
    sumAttn  += d.attentionComponent;
    sumPres  += d.presenceComponent;
    sumEmo   += d.emotionStabilityComponent;
    sumInter += d.interactionComponent;

    // By topic
    const t = d.topic || 'unknown';
    if (!byTopic[t]) byTopic[t] = { topic: t, scores: [] };
    byTopic[t].scores.push(d.engagementScore);

    // Daily trend
    const day = new Date(d.date).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, scores: [] };
    byDay[day].scores.push(d.engagementScore);

    // Grade distribution
    const g = d.engagementGrade || 'moderate';
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  }

  const trend = Object.values(byDay)
    .map(({ date, scores }) => ({
      date,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topicList = Object.values(byTopic).map(({ topic, scores }) => ({
    topic,
    avgEngagement: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    sessionCount:  scores.length,
  }));

  const avgEngagement = Math.round(sumEng / n);

  return {
    subjectSlug,
    sessionCount:   n,
    uniqueStudents,
    avgEngagement,
    overallGrade:   gradeFromScore(avgEngagement),
    trend,
    byTopic:        topicList,
    gradeDistribution: gradeDist,
    componentAverages: {
      attention:   Math.round(sumAttn   / n),
      presence:    Math.round(sumPres   / n),
      emotion:     Math.round(sumEmo    / n),
      interaction: Math.round(sumInter  / n),
    },
  };
};

// ── Internal helpers ──────────────────────────────────────────────────────────
function buildEmptyComponents() {
  return { attention: 0, presence: 0, emotion: 0, interaction: 0 };
}
