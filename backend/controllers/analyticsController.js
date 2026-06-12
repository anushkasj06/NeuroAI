/**
 * analyticsController
 * ===================
 * Exposes the Learning Engagement Engine over HTTP.
 *
 * Routes (all protected):
 *   POST   /api/analytics/session/:sessionId/compute  — trigger computation
 *   GET    /api/analytics/session/:sessionId          — get session engagement
 *   GET    /api/analytics/user                        — user engagement summary (?days&subjectSlug)
 *   GET    /api/analytics/course/:subjectSlug         — course-level summary (?days)
 *   GET    /api/analytics/dashboard                   — lightweight KPI block for student dashboard
 */

'use strict';

const mongoose              = require('mongoose');
const analyticsService      = require('../services/learningAnalyticsService');
const EngagementMetrics     = require('../models/adaptive/EngagementMetrics');
const LearningSession       = require('../models/LearningSession');

// ── POST /api/analytics/session/:sessionId/compute ────────────────────────────
exports.computeSessionEngagement = async (req, res) => {
  try {
    const userId    = req.user._id;
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid sessionId' });
    }

    // Verify session ownership
    const session = await LearningSession.findOne({ _id: sessionId, userId }).lean();
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Session not found' });
    }

    const metrics = await analyticsService.computeAndSave(sessionId, userId);

    res.status(200).json({
      status: 'success',
      data: { metrics },
    });
  } catch (err) {
    console.error('[Analytics] computeSessionEngagement error:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Computation failed' });
  }
};

// ── GET /api/analytics/session/:sessionId ─────────────────────────────────────
exports.getSessionAnalytics = async (req, res) => {
  try {
    const userId        = req.user._id;
    const { sessionId } = req.params;
    const recompute     = req.query.recompute === 'true';

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid sessionId' });
    }

    // Verify session ownership
    const session = await LearningSession.findOne({ _id: sessionId, userId }).lean();
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Session not found' });
    }

    const metrics = await analyticsService.getSessionEngagement(sessionId, userId, recompute);

    res.status(200).json({
      status: 'success',
      data: { metrics },
    });
  } catch (err) {
    console.error('[Analytics] getSessionAnalytics error:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve session analytics' });
  }
};

// ── GET /api/analytics/user ───────────────────────────────────────────────────
exports.getUserAnalytics = async (req, res) => {
  try {
    const userId     = req.user._id;
    const days       = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const subjectSlug = req.query.subjectSlug || null;

    const summary = await analyticsService.getUserEngagementSummary(userId, { days, subjectSlug });

    // Also fetch the 10 most-recent session records for the detailed table
    const recentFilter = { userId, date: { $gte: new Date(Date.now() - days * 86_400_000) } };
    if (subjectSlug) recentFilter.subjectSlug = subjectSlug;

    const recentSessions = await EngagementMetrics.find(recentFilter)
      .sort({ date: -1 })
      .limit(10)
      .select('sessionId subject topic engagementScore engagementGrade attentionComponent presenceComponent emotionStabilityComponent interactionComponent sessionDurationMs date')
      .lean();

    res.status(200).json({
      status: 'success',
      data: { summary, recentSessions },
    });
  } catch (err) {
    console.error('[Analytics] getUserAnalytics error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve user analytics' });
  }
};

// ── GET /api/analytics/course/:subjectSlug ────────────────────────────────────
exports.getCourseAnalytics = async (req, res) => {
  try {
    const { subjectSlug } = req.params;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));

    if (!subjectSlug) {
      return res.status(400).json({ status: 'error', message: 'subjectSlug is required' });
    }

    const summary = await analyticsService.getCourseEngagementSummary(subjectSlug, { days });

    res.status(200).json({
      status: 'success',
      data: { summary },
    });
  } catch (err) {
    console.error('[Analytics] getCourseAnalytics error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve course analytics' });
  }
};

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
exports.getDashboardKPIs = async (req, res) => {
  try {
    const userId = req.user._id;
    const since  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

    // Last 5 session docs for sparkline + latest score
    const recentDocs = await EngagementMetrics.find({ userId, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(5)
      .select('engagementScore engagementGrade attentionComponent presenceComponent emotionStabilityComponent interactionComponent date subject topic')
      .lean();

    if (!recentDocs.length) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasData: false,
          latestScore: 0,
          latestGrade: 'critical',
          weeklyAvg: 0,
          componentAverages: { attention: 0, presence: 0, emotion: 0, interaction: 0 },
          sparkline: [],
        },
      });
    }

    const n = recentDocs.length;
    let sumEng = 0, sumAttn = 0, sumPres = 0, sumEmo = 0, sumInter = 0;
    for (const d of recentDocs) {
      sumEng   += d.engagementScore;
      sumAttn  += d.attentionComponent;
      sumPres  += d.presenceComponent;
      sumEmo   += d.emotionStabilityComponent;
      sumInter += d.interactionComponent;
    }

    res.status(200).json({
      status: 'success',
      data: {
        hasData:      true,
        latestScore:  recentDocs[0].engagementScore,
        latestGrade:  recentDocs[0].engagementGrade,
        weeklyAvg:    Math.round(sumEng / n),
        componentAverages: {
          attention:   Math.round(sumAttn   / n),
          presence:    Math.round(sumPres   / n),
          emotion:     Math.round(sumEmo    / n),
          interaction: Math.round(sumInter  / n),
        },
        sparkline: recentDocs.reverse().map((d) => ({
          date:    new Date(d.date).toISOString().slice(0, 10),
          score:   d.engagementScore,
          subject: d.subject,
          topic:   d.topic,
        })),
      },
    });
  } catch (err) {
    console.error('[Analytics] getDashboardKPIs error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve dashboard KPIs' });
  }
};
