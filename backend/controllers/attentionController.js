const AttentionSnapshot = require('../models/adaptive/AttentionSnapshot');
const LearningSession = require('../models/LearningSession');
const mongoose = require('mongoose');

// ── helpers ───────────────────────────────────────────────────────────────────
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Number(v) || 0));

/**
 * POST /api/attention/snapshot
 * Stores one 10-second attention window captured by the browser tracker.
 * Body: { sessionId, facePresent, faceMissingDurationMs, headPose,
 *         gazeDirection, lookingAwayDurationMs, isScreenFocused,
 *         screenUnfocusedDurationMs, attentionScore, focusPercentage,
 *         distractionEvents[] }
 */
exports.saveSnapshot = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sessionId,
      facePresent = false,
      faceMissingDurationMs = 0,
      headPose = { yaw: 0, pitch: 0, roll: 0 },
      gazeDirection = 'center',
      lookingAwayDurationMs = 0,
      isScreenFocused = true,
      screenUnfocusedDurationMs = 0,
      attentionScore,
      focusPercentage,
      distractionEvents = [],
      browserTelemetry = {},
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'sessionId is required' });
    }

    // Validate session belongs to user
    const session = await LearningSession.findOne({ _id: sessionId, userId }).lean();
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Learning session not found' });
    }

    const snapshot = await AttentionSnapshot.create({
      userId,
      sessionId,
      facePresent: Boolean(facePresent),
      faceMissingDurationMs: Math.max(0, Number(faceMissingDurationMs) || 0),
      headPose: {
        yaw:   Number(headPose?.yaw)   || 0,
        pitch: Number(headPose?.pitch) || 0,
        roll:  Number(headPose?.roll)  || 0,
      },
      gazeDirection: gazeDirection || 'center',
      lookingAwayDurationMs: Math.max(0, Number(lookingAwayDurationMs) || 0),
      isScreenFocused: Boolean(isScreenFocused),
      screenUnfocusedDurationMs: Math.max(0, Number(screenUnfocusedDurationMs) || 0),
      attentionScore: clamp(attentionScore),
      focusPercentage: clamp(focusPercentage),
      distractionEvents: Array.isArray(distractionEvents) ? distractionEvents : [],
      browserTelemetry: {
        cursorMoveCount: Number(browserTelemetry.cursorMoveCount) || 0,
        clickCount: Number(browserTelemetry.clickCount) || 0,
        keyPressCount: Number(browserTelemetry.keyPressCount) || 0,
        scrollCount: Number(browserTelemetry.scrollCount) || 0,
        tabSwitchCount: Number(browserTelemetry.tabSwitchCount) || 0,
        windowBlurCount: Number(browserTelemetry.windowBlurCount) || 0,
        cursorLeaveCount: Number(browserTelemetry.cursorLeaveCount) || 0,
        windowBlurDurationMs: Number(browserTelemetry.windowBlurDurationMs) || 0,
        isIdle: Boolean(browserTelemetry.isIdle),
      },
    });

    res.status(201).json({ status: 'success', data: snapshot });
  } catch (err) {
    console.error('[Attention] saveSnapshot error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save attention snapshot' });
  }
};

/**
 * GET /api/attention/session/:sessionId
 * Returns all snapshots for a session with aggregated summary.
 */
exports.getSessionAttention = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid sessionId' });
    }

    const snapshots = await AttentionSnapshot.find({ sessionId, userId })
      .sort({ timestamp: 1 })
      .lean();

    if (!snapshots.length) {
      return res.status(200).json({
        status: 'success',
        data: { snapshots: [], summary: buildEmptySummary() },
      });
    }

    const summary = aggregateSnapshots(snapshots);

    res.status(200).json({ status: 'success', data: { snapshots, summary } });
  } catch (err) {
    console.error('[Attention] getSessionAttention error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve attention data' });
  }
};

/**
 * GET /api/attention/analytics
 * Returns per-day aggregated attention analytics for the authenticated user.
 * Query: ?days=7 (default 7, max 30)
 */
exports.getAttentionAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snapshots = await AttentionSnapshot.find({
      userId,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .lean();

    // Group by UTC date string YYYY-MM-DD
    const byDay = {};
    for (const snap of snapshots) {
      const day = snap.timestamp.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(snap);
    }

    const dailySummaries = Object.entries(byDay).map(([date, snaps]) => ({
      date,
      ...aggregateSnapshots(snaps),
    }));

    // Overall summary across entire period
    const overallSummary = snapshots.length ? aggregateSnapshots(snapshots) : buildEmptySummary();

    res.status(200).json({
      status: 'success',
      data: { dailySummaries, overallSummary, totalSnapshots: snapshots.length },
    });
  } catch (err) {
    console.error('[Attention] getAttentionAnalytics error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve attention analytics' });
  }
};

/**
 * GET /api/attention/summary
 * Returns a lightweight recent-session summary for the authenticated user.
 * Useful for dashboard KPI tiles (last 24 hours).
 */
exports.getRecentSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const since  = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 h

    const snapshots = await AttentionSnapshot.find({
      userId,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .lean();

    const summary = snapshots.length ? aggregateSnapshots(snapshots) : buildEmptySummary();

    res.status(200).json({ status: 'success', data: { summary, snapshotCount: snapshots.length } });
  } catch (err) {
    console.error('[Attention] getRecentSummary error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve attention summary' });
  }
};

// ── Private helpers ───────────────────────────────────────────────────────────

function buildEmptySummary() {
  return {
    avgAttentionScore: 0,
    avgFocusPercentage: 0,
    totalFaceMissingMs: 0,
    totalLookingAwayMs: 0,
    totalScreenUnfocusedMs: 0,
    facePresenceRate: 0,
    screenFocusRate: 0,
    idleRate: 0,
    interactionTotals: {
      cursorMoves: 0,
      clicks: 0,
      keyPresses: 0,
    },
    distractionBreakdown: {},
    snapshotCount: 0,
  };
}

function aggregateSnapshots(snapshots) {
  const n = snapshots.length;
  if (!n) return buildEmptySummary();

  let sumAttention = 0;
  let sumFocus = 0;
  let totalFaceMissingMs = 0;
  let totalLookingAwayMs = 0;
  let totalScreenUnfocusedMs = 0;
  let faceDetectedCount = 0;
  let screenFocusedCount = 0;
  let totalCursorIdleCount = 0;
  let sumCursorMoves = 0;
  let sumClicks = 0;
  let sumKeyPresses = 0;
  const distractionBreakdown = {};

  for (const snap of snapshots) {
    sumAttention += snap.attentionScore || 0;
    sumFocus += snap.focusPercentage || 0;
    totalFaceMissingMs += snap.faceMissingDurationMs || 0;
    totalLookingAwayMs += snap.lookingAwayDurationMs || 0;
    totalScreenUnfocusedMs += snap.screenUnfocusedDurationMs || 0;
    if (snap.facePresent) faceDetectedCount++;
    if (snap.isScreenFocused) screenFocusedCount++;
    
    if (snap.browserTelemetry) {
      if (snap.browserTelemetry.isIdle) totalCursorIdleCount++;
      sumCursorMoves += snap.browserTelemetry.cursorMoveCount || 0;
      sumClicks += snap.browserTelemetry.clickCount || 0;
      sumKeyPresses += snap.browserTelemetry.keyPressCount || 0;
    }

    for (const evt of snap.distractionEvents || []) {
      distractionBreakdown[evt] = (distractionBreakdown[evt] || 0) + 1;
    }
  }

  return {
    avgAttentionScore: Math.round(sumAttention / n),
    avgFocusPercentage: Math.round(sumFocus / n),
    totalFaceMissingMs,
    totalLookingAwayMs,
    totalScreenUnfocusedMs,
    facePresenceRate: Math.round((faceDetectedCount / n) * 100),
    screenFocusRate: Math.round((screenFocusedCount / n) * 100),
    idleRate: Math.round((totalCursorIdleCount / n) * 100),
    interactionTotals: {
      cursorMoves: sumCursorMoves,
      clicks: sumClicks,
      keyPresses: sumKeyPresses,
    },
    distractionBreakdown,
    snapshotCount: n,
  };
}
