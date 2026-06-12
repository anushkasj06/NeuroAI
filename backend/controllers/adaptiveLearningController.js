/**
 * adaptiveLearningController
 * ==========================
 * HTTP layer for the Adaptive Learning Engine.
 *
 * All routes are protected by JWT middleware.
 *
 * POST  /api/adaptive/evaluate              — evaluate & store a new record
 * GET   /api/adaptive/topic/:subjectSlug/:topic — latest record for a topic
 * GET   /api/adaptive/history               — user's evaluation history (?subjectSlug&limit)
 * GET   /api/adaptive/dashboard             — latest records for all active topics
 * PATCH /api/adaptive/:recordId/apply       — mark a recommendation as applied
 * PATCH /api/adaptive/:recordId/dismiss     — mark a recommendation as dismissed
 */

'use strict';

const mongoose              = require('mongoose');
const adaptiveLearningService = require('../services/adaptiveLearningService');

// ── POST /api/adaptive/evaluate ───────────────────────────────────────────────
exports.evaluate = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sessionId,
      subjectSlug,
      subject,
      topic,
      subtopic     = '',
      triggerEvent = 'manual_request',
      // Optional signal overrides
      quizMarks,
      emotionScore,
      attentionScore,
      engagementScore,
      completionRate,
      learningSpeed,
    } = req.body;

    if (!subjectSlug || !topic) {
      return res.status(400).json({
        status: 'error',
        message: 'subjectSlug and topic are required',
      });
    }

    // Build override map — only include keys the caller explicitly provided
    const overrides = {};
    if (quizMarks      != null) overrides.quizMarks      = Number(quizMarks);
    if (emotionScore   != null) overrides.emotionScore   = Number(emotionScore);
    if (attentionScore != null) overrides.attentionScore = Number(attentionScore);
    if (engagementScore!= null) overrides.engagementScore= Number(engagementScore);
    if (completionRate != null) overrides.completionRate = Number(completionRate);
    if (learningSpeed  != null) overrides.learningSpeed  = Number(learningSpeed);

    const record = await adaptiveLearningService.evaluate({
      userId,
      sessionId:    sessionId || null,
      subjectSlug,
      subject:      subject || subjectSlug,
      topic,
      subtopic,
      triggerEvent,
      overrides,
    });

    res.status(201).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[AdaptiveLearning] evaluate error:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Evaluation failed' });
  }
};

// ── GET /api/adaptive/topic/:subjectSlug/:topic ────────────────────────────────
exports.getTopicRecord = async (req, res) => {
  try {
    const userId           = req.user._id;
    const { subjectSlug, topic } = req.params;

    if (!subjectSlug || !topic) {
      return res.status(400).json({ status: 'error', message: 'subjectSlug and topic are required' });
    }

    const record = await adaptiveLearningService.getLatestForTopic(
      userId,
      subjectSlug,
      decodeURIComponent(topic)
    );

    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'No adaptive record found for this topic — trigger an evaluation first',
      });
    }

    res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[AdaptiveLearning] getTopicRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve topic record' });
  }
};

// ── GET /api/adaptive/history ─────────────────────────────────────────────────
exports.getUserHistory = async (req, res) => {
  try {
    const userId      = req.user._id;
    const subjectSlug = req.query.subjectSlug || null;
    const limit       = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const records = await adaptiveLearningService.getUserHistory(userId, { subjectSlug, limit });

    res.status(200).json({ status: 'success', data: { records, count: records.length } });
  } catch (err) {
    console.error('[AdaptiveLearning] getUserHistory error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve history' });
  }
};

// ── GET /api/adaptive/dashboard ───────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const userId  = req.user._id;
    const records = await adaptiveLearningService.getDashboardSummary(userId);

    res.status(200).json({ status: 'success', data: { records } });
  } catch (err) {
    console.error('[AdaptiveLearning] getDashboard error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve dashboard' });
  }
};

// ── PATCH /api/adaptive/:recordId/apply ───────────────────────────────────────
exports.applyRecord = async (req, res) => {
  try {
    const userId   = req.user._id;
    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid recordId' });
    }

    const record = await adaptiveLearningService.markApplied(recordId, userId);
    if (!record) return res.status(404).json({ status: 'error', message: 'Record not found' });

    res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[AdaptiveLearning] applyRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to apply record' });
  }
};

// ── PATCH /api/adaptive/:recordId/dismiss ─────────────────────────────────────
exports.dismissRecord = async (req, res) => {
  try {
    const userId   = req.user._id;
    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid recordId' });
    }

    const record = await adaptiveLearningService.markDismissed(recordId, userId);
    if (!record) return res.status(404).json({ status: 'error', message: 'Record not found' });

    res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    console.error('[AdaptiveLearning] dismissRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to dismiss record' });
  }
};
