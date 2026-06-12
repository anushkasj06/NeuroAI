/**
 * contentAdaptationController
 * ============================
 * HTTP layer for the Content Adaptation Engine.
 * All routes are JWT-protected.
 *
 * POST  /api/content-adapt/recommend                    — generate a format recommendation
 * GET   /api/content-adapt/topic/:subjectSlug/:topic    — latest rec for one topic
 * GET   /api/content-adapt/history                      — user history (?subjectSlug&limit)
 * GET   /api/content-adapt/dashboard                    — latest rec per active topic
 * GET   /api/content-adapt/stats                        — format usage stats (?days=30)
 * PATCH /api/content-adapt/:recordId/apply              — mark recommendation applied
 * PATCH /api/content-adapt/:recordId/dismiss            — dismiss recommendation
 */

'use strict';

const mongoose                  = require('mongoose');
const contentAdaptationService  = require('../services/contentAdaptationService');

// ── POST /api/content-adapt/recommend ────────────────────────────────────────
exports.recommend = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sessionId,
      materialId,
      subjectSlug,
      subject,
      topic,
      subtopic = '',
      // Optional signal overrides
      learningStyle,
      confusionScore,
      engagementScore,
      historicalSuccess,
    } = req.body;

    if (!subjectSlug || !topic) {
      return res.status(400).json({
        status: 'error',
        message: 'subjectSlug and topic are required',
      });
    }

    const overrides = {};
    if (learningStyle    != null) overrides.learningStyle    = learningStyle;
    if (confusionScore   != null) overrides.confusionScore   = Number(confusionScore);
    if (engagementScore  != null) overrides.engagementScore  = Number(engagementScore);
    if (historicalSuccess!= null) overrides.historicalSuccess= Number(historicalSuccess);

    const rec = await contentAdaptationService.recommend({
      userId,
      sessionId:   sessionId  || null,
      materialId:  materialId || null,
      subjectSlug,
      subject:     subject || subjectSlug,
      topic,
      subtopic,
      overrides,
    });

    res.status(201).json({ status: 'success', data: { recommendation: rec } });
  } catch (err) {
    console.error('[ContentAdapt] recommend error:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to generate recommendation' });
  }
};

// ── GET /api/content-adapt/topic/:subjectSlug/:topic ─────────────────────────
exports.getTopicRecommendation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subjectSlug } = req.params;
    const topic = decodeURIComponent(req.params.topic);

    const rec = await contentAdaptationService.getLatestForTopic(userId, subjectSlug, topic);
    if (!rec) {
      return res.status(404).json({
        status: 'error',
        message: 'No content recommendation found — generate one first',
      });
    }
    res.status(200).json({ status: 'success', data: { recommendation: rec } });
  } catch (err) {
    console.error('[ContentAdapt] getTopicRecommendation error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve recommendation' });
  }
};

// ── GET /api/content-adapt/history ───────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const userId      = req.user._id;
    const subjectSlug = req.query.subjectSlug || null;
    const limit       = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const records = await contentAdaptationService.getUserHistory(userId, { subjectSlug, limit });
    res.status(200).json({ status: 'success', data: { records, count: records.length } });
  } catch (err) {
    console.error('[ContentAdapt] getHistory error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve history' });
  }
};

// ── GET /api/content-adapt/dashboard ─────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const userId  = req.user._id;
    const records = await contentAdaptationService.getDashboardSummary(userId);
    res.status(200).json({ status: 'success', data: { records } });
  } catch (err) {
    console.error('[ContentAdapt] getDashboard error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve dashboard' });
  }
};

// ── GET /api/content-adapt/stats ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const days   = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const stats  = await contentAdaptationService.getFormatStats(userId, days);
    res.status(200).json({ status: 'success', data: { stats } });
  } catch (err) {
    console.error('[ContentAdapt] getStats error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve stats' });
  }
};

// ── PATCH /api/content-adapt/:recordId/apply ────────────────────────────────
exports.applyRecord = async (req, res) => {
  try {
    const userId   = req.user._id;
    const { recordId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid recordId' });
    }
    const rec = await contentAdaptationService.markApplied(recordId, userId);
    if (!rec) return res.status(404).json({ status: 'error', message: 'Record not found' });
    res.status(200).json({ status: 'success', data: { recommendation: rec } });
  } catch (err) {
    console.error('[ContentAdapt] applyRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to apply record' });
  }
};

// ── PATCH /api/content-adapt/:recordId/dismiss ──────────────────────────────
exports.dismissRecord = async (req, res) => {
  try {
    const userId   = req.user._id;
    const { recordId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid recordId' });
    }
    const rec = await contentAdaptationService.markDismissed(recordId, userId);
    if (!rec) return res.status(404).json({ status: 'error', message: 'Record not found' });
    res.status(200).json({ status: 'success', data: { recommendation: rec } });
  } catch (err) {
    console.error('[ContentAdapt] dismissRecord error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to dismiss record' });
  }
};
