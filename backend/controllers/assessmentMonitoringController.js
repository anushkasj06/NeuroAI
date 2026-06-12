/**
 * assessmentMonitoringController
 * ================================
 * Handles all proctoring events from the Secure Assessment Module.
 *
 * Routes (all JWT-protected):
 *   POST  /api/assessment-monitor/start             — create session record
 *   POST  /api/assessment-monitor/violation         — log one violation event
 *   POST  /api/assessment-monitor/batch             — log multiple violations at once
 *   GET   /api/assessment-monitor/:attemptId        — get full monitoring record
 *   PATCH /api/assessment-monitor/:attemptId/finish — mark session submitted
 *   GET   /api/assessment-monitor/history           — user's past records (?limit)
 */

'use strict';

const mongoose             = require('mongoose');
const AssessmentMonitoring = require('../models/adaptive/AssessmentMonitoring');
const StudyTestAttempt     = require('../models/StudyTestAttempt');

// ── Violation → severity mapping ──────────────────────────────────────────────
const SEVERITY = {
  fullscreen_exit:   'medium',
  tab_switch:        'high',
  window_blur:       'low',
  visibility_change: 'medium',
  copy_paste:        'high',
  right_click:       'low',
};

// ── Proctor status thresholds ─────────────────────────────────────────────────
function computeStatus(count) {
  if (count >= 6) return 'disqualified';
  if (count >= 3) return 'suspicious';
  if (count >= 1) return 'warned';
  return 'clean';
}

// Counter field per violation type
const COUNTER_MAP = {
  fullscreen_exit:   'fullscreenExitCount',
  tab_switch:        'tabSwitchCount',
  window_blur:       'windowBlurCount',
  visibility_change: 'visibilityChangeCount',
  copy_paste:        'copyPasteCount',
  right_click:       'rightClickCount',
};

// ── POST /api/assessment-monitor/start ────────────────────────────────────────
exports.startSession = async (req, res) => {
  try {
    const userId    = req.user._id;
    const { attemptId } = req.body;

    if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ status: 'error', message: 'Valid attemptId is required' });
    }

    // Verify the attempt belongs to the user
    const attempt = await StudyTestAttempt.findOne({ _id: attemptId, userId }).lean();
    if (!attempt) {
      return res.status(404).json({ status: 'error', message: 'Test attempt not found' });
    }

    // Upsert — idempotent so duplicate start calls are safe
    const record = await AssessmentMonitoring.findOneAndUpdate(
      { attemptId },
      { $setOnInsert: { userId, attemptId, startedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(201).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[Monitor] startSession error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to start monitoring session' });
  }
};

// ── POST /api/assessment-monitor/violation ────────────────────────────────────
exports.logViolation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId, type, detail = '' } = req.body;

    if (!attemptId || !type) {
      return res.status(400).json({ status: 'error', message: 'attemptId and type are required' });
    }

    const severity = SEVERITY[type] || 'low';
    const event    = { type, timestamp: new Date(), severity, detail };
    const counterField = COUNTER_MAP[type];

    const inc = { 'violations': 0 }; // placeholder — we use $push
    const incFields = {};
    if (counterField) incFields[counterField] = 1;

    const record = await AssessmentMonitoring.findOneAndUpdate(
      { attemptId, userId },
      {
        $push: { violations: event },
        $inc:  incFields,
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Monitoring session not found — call /start first' });
    }

    // Recompute status
    const newStatus = computeStatus(record.violations.length);
    if (newStatus !== record.proctorStatus) {
      record.proctorStatus = newStatus;
      record.warningCount  = record.violations.length;
      await record.save();
    }

    // Build warning message for frontend
    const warningMessage = buildWarningMessage(type, record.violations.length, newStatus);

    res.status(200).json({
      status: 'success',
      data: {
        proctorStatus: newStatus,
        totalViolations: record.violations.length,
        warningMessage,
        disqualified: newStatus === 'disqualified',
      },
    });
  } catch (err) {
    console.error('[Monitor] logViolation error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to log violation' });
  }
};

// ── POST /api/assessment-monitor/batch ───────────────────────────────────────
exports.logBatch = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId, events } = req.body; // events: [{type, detail?, timestamp?}]

    if (!attemptId || !Array.isArray(events) || !events.length) {
      return res.status(400).json({ status: 'error', message: 'attemptId and events[] are required' });
    }

    const mappedEvents = events.map((e) => ({
      type:      e.type,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      severity:  SEVERITY[e.type] || 'low',
      detail:    e.detail || '',
    }));

    const incFields = {};
    for (const e of mappedEvents) {
      const f = COUNTER_MAP[e.type];
      if (f) incFields[f] = (incFields[f] || 0) + 1;
    }

    const record = await AssessmentMonitoring.findOneAndUpdate(
      { attemptId, userId },
      {
        $push: { violations: { $each: mappedEvents } },
        $inc:  incFields,
      },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Monitoring session not found' });
    }

    const newStatus = computeStatus(record.violations.length);
    if (newStatus !== record.proctorStatus) {
      record.proctorStatus = newStatus;
      await record.save();
    }

    res.status(200).json({
      status: 'success',
      data: { proctorStatus: newStatus, totalViolations: record.violations.length },
    });
  } catch (err) {
    console.error('[Monitor] logBatch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to log batch violations' });
  }
};

// ── GET /api/assessment-monitor/:attemptId ────────────────────────────────────
exports.getRecord = async (req, res) => {
  try {
    const userId    = req.user._id;
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid attemptId' });
    }

    const record = await AssessmentMonitoring.findOne({ attemptId, userId }).lean();
    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Monitoring record not found' });
    }

    res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[Monitor] getRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve monitoring record' });
  }
};

// ── PATCH /api/assessment-monitor/:attemptId/finish ───────────────────────────
exports.finishSession = async (req, res) => {
  try {
    const userId    = req.user._id;
    const { attemptId } = req.params;

    const record = await AssessmentMonitoring.findOneAndUpdate(
      { attemptId, userId },
      { $set: { submittedAt: new Date() } },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Monitoring record not found' });
    }

    res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[Monitor] finishSession error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to finish monitoring session' });
  }
};

// ── GET /api/assessment-monitor/history ──────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const records = await AssessmentMonitoring
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ status: 'success', data: { records, count: records.length } });
  } catch (err) {
    console.error('[Monitor] getHistory error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve history' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildWarningMessage(type, total, status) {
  const typeMessages = {
    fullscreen_exit:   'You exited fullscreen. Return to fullscreen to continue.',
    tab_switch:        'Tab switch detected. Keep this tab active during the test.',
    window_blur:       'Window lost focus. Stay in the test window.',
    visibility_change: 'Browser visibility changed. Switching tabs is monitored.',
    copy_paste:        'Copy/paste is disabled during the assessment.',
    right_click:       'Right-click is disabled during the assessment.',
  };

  const base = typeMessages[type] || 'A security violation was detected.';

  if (status === 'disqualified') {
    return `${base} You have reached the violation limit — the test has been flagged.`;
  }
  if (status === 'suspicious') {
    return `${base} Multiple violations recorded (${total}). One more may flag this attempt.`;
  }
  return `${base} (Warning ${total} of 5)`;
}
