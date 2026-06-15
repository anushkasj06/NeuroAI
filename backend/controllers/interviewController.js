/**
 * Interview Controller
 * ====================
 * Handles all HTTP endpoints for the AI Interview System.
 *
 * Routes:
 *  POST   /api/interview/schedule        — Schedule a new interview
 *  GET    /api/interview                 — Get all interviews for user
 *  GET    /api/interview/:id             — Get single interview
 *  POST   /api/interview/:id/prepare     — Generate questions & Vapi assistant
 *  POST   /api/interview/:id/start       — Start interview (returns Vapi call token)
 *  POST   /api/interview/:id/transcript  — Append real-time transcript message
 *  POST   /api/interview/:id/end         — End interview and trigger analysis
 *  GET    /api/interview/:id/analysis    — Get analysis result
 *  GET    /api/interview/:id/report      — Get full report
 *  POST   /api/interview/webhook         — Vapi webhook handler
 *  GET    /api/interview/analytics       — User interview analytics
 *  DELETE /api/interview/:id             — Delete interview
 */

'use strict';

const mongoose = require('mongoose');
const Interview = require('../models/interview/Interview');
const { generateInterviewQuestions } = require('../services/interview/interviewQuestionService');
const { analyseInterview } = require('../services/interview/interviewAnalysisService');
const vapiService = require('../services/interview/vapiService');

// ── Validation Helpers ────────────────────────────────────────────────────────

const VALID_TYPES       = ['technical', 'behavioral', 'hr', 'mixed'];
const VALID_TOPICS      = ['DSA', 'Java', 'Spring Boot', 'DBMS', 'Operating Systems', 'Computer Networks', 'System Design', 'OOP', 'SQL', 'AWS', 'Custom Topic'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_DURATIONS   = [15, 30, 45, 60];

// ── POST /api/interview/schedule ──────────────────────────────────────────────

exports.scheduleInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, interviewType, topics, difficulty, durationMinutes, scheduledAt, candidateNotes } = req.body;

    // Input validation
    if (!title?.trim()) return res.status(400).json({ status: 'error', message: 'Interview title is required' });
    if (!VALID_TYPES.includes(interviewType)) return res.status(400).json({ status: 'error', message: `interviewType must be one of: ${VALID_TYPES.join(', ')}` });
    if (!Array.isArray(topics) || topics.length === 0) return res.status(400).json({ status: 'error', message: 'At least one topic is required' });
    if (!VALID_DIFFICULTIES.includes(difficulty)) return res.status(400).json({ status: 'error', message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
    if (!VALID_DURATIONS.includes(Number(durationMinutes))) return res.status(400).json({ status: 'error', message: `durationMinutes must be one of: ${VALID_DURATIONS.join(', ')}` });
    if (!scheduledAt) return res.status(400).json({ status: 'error', message: 'scheduledAt is required' });

    const interview = await Interview.create({
      userId,
      title: title.trim(),
      interviewType,
      topics,
      difficulty,
      durationMinutes: Number(durationMinutes),
      scheduledAt: new Date(scheduledAt),
      candidateNotes: candidateNotes || '',
      status: 'scheduled',
    });

    res.status(201).json({ status: 'success', data: { interview } });
  } catch (err) {
    console.error('[Interview] scheduleInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── GET /api/interview ─────────────────────────────────────────────────────────

exports.getUserInterviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Number(limit));
    const lim  = Math.min(50, Number(limit));

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .select('-transcript -generatedQuestions -analysis -report')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(lim),
      Interview.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: { interviews, total, page: Number(page), limit: lim },
    });
  } catch (err) {
    console.error('[Interview] getUserInterviews error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── GET /api/interview/:id ─────────────────────────────────────────────────────

exports.getInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    const interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    res.status(200).json({ status: 'success', data: { interview } });
  } catch (err) {
    console.error('[Interview] getInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── POST /api/interview/:id/prepare ───────────────────────────────────────────
// Generates questions via Groq and creates a Vapi assistant

exports.prepareInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    let interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    // Block only fully terminal statuses
    // Allow re-prepare of any non-terminal interview — especially 'in_progress' with no assistant
    if (['completed', 'analysing', 'analysed', 'cancelled'].includes(interview.status)) {
      return res.status(400).json({ status: 'error', message: `Cannot prepare an interview with status: ${interview.status}` });
    }

    // Step 1: Generate questions
    console.log(`[Interview] Generating questions for interview ${id}...`);
    const { questions, interviewFlow } = await generateInterviewQuestions({
      interviewType:   interview.interviewType,
      topics:          interview.topics,
      difficulty:      interview.difficulty,
      durationMinutes: interview.durationMinutes,
    });

    // Step 2: Create Vapi assistant via REST API only if private key is set
    // If only public key is available, assistant config is built inline at call time
    let vapiAssistantId = interview.vapiAssistantId || null;

    if (!vapiAssistantId && vapiService.hasPrivateKey()) {
      try {
        const result = await vapiService.createAssistant(interview, interviewFlow);
        vapiAssistantId = result.assistantId;
        console.log(`[Interview] Created Vapi assistant: ${vapiAssistantId}`);
      } catch (vapiErr) {
        console.error('[Interview] Vapi assistant creation failed (will use inline config at call time):', vapiErr.message);
      }
    } else if (!vapiAssistantId) {
      console.log('[Interview] No private key — assistant config will be built inline at call start.');
    }

    // Save to database
    interview = await Interview.findByIdAndUpdate(
      id,
      {
        generatedQuestions: questions,
        questionsGeneratedAt: new Date(),
        vapiAssistantId,
        status: 'ready',
        'metrics.interviewFlow': interviewFlow,
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        interview,
        questionsCount: questions.length,
        vapiReady: !!vapiAssistantId,
        vapiAssistantId,
      },
    });
  } catch (err) {
    console.error('[Interview] prepareInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── POST /api/interview/:id/start ─────────────────────────────────────────────
// Returns the Vapi assistant config inline (Mode B — public key only).
// Frontend calls vapi.start(assistantConfig) directly — no backend REST to Vapi needed.

exports.startInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    let interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    // Block only fully terminal statuses
    if (['completed', 'analysing', 'analysed', 'cancelled'].includes(interview.status)) {
      return res.status(400).json({ status: 'error', message: `Interview is already ${interview.status}.` });
    }

    // Generate questions if not already done (e.g., interview jumped straight to start)
    let questions = interview.generatedQuestions;
    let interviewFlow = {};

    if (!questions || questions.length === 0) {
      console.log(`[Interview] Auto-generating questions for ${id}…`);
      try {
        const result = await generateInterviewQuestions({
          interviewType:   interview.interviewType,
          topics:          interview.topics,
          difficulty:      interview.difficulty,
          durationMinutes: interview.durationMinutes,
        });
        questions = result.questions;
        interviewFlow = result.interviewFlow;
        await Interview.findByIdAndUpdate(id, {
          generatedQuestions: questions,
          questionsGeneratedAt: new Date(),
        });
        interview.generatedQuestions = questions;
      } catch (qErr) {
        console.error('[Interview] Question generation failed:', qErr.message);
        // Continue — we can still start the call with just the system prompt
        questions = [];
      }
    }

    // Build Vapi assistant config inline (no REST API needed — public key mode)
    const assistantConfig = vapiService.buildAssistantConfig(interview, interviewFlow);

    // Mark interview as in_progress
    interview = await Interview.findByIdAndUpdate(
      id,
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        interview,
        questions:       questions || [],
        vapiAssistantId: interview.vapiAssistantId || null,
        // Inline config — frontend will use this with vapi.start(assistantConfig)
        assistantConfig,
      },
    });
  } catch (err) {
    console.error('[Interview] startInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── POST /api/interview/:id/transcript ────────────────────────────────────────
// Append a transcript message during the interview

exports.appendTranscript = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { role, message, timestamp } = req.body;

    if (!['ai', 'user'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'role must be "ai" or "user"' });
    }
    if (!message?.trim()) {
      return res.status(400).json({ status: 'error', message: 'message is required' });
    }

    const interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    // Allow transcript writes for in_progress only (ignore if already terminal)
    if (['completed', 'analysing', 'analysed', 'cancelled'].includes(interview.status)) {
      return res.status(200).json({ status: 'success', ignored: true });
    }

    // Append to transcript
    await Interview.findByIdAndUpdate(id, {
      $push: {
        transcript: {
          role,
          message: message.trim(),
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      },
      // Update word count metric for user messages
      ...(role === 'user' && {
        $inc: {
          'metrics.totalWordCount': message.trim().split(/\s+/).filter(Boolean).length,
        },
      }),
    });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('[Interview] appendTranscript error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── POST /api/interview/:id/end ───────────────────────────────────────────────
// End the interview and trigger async analysis.
// Frontend sends vapiCallId so we can fetch the final transcript from Vapi.

exports.endInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { confidenceScore, pauseCount, totalPauseDurationMs, vapiCallId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    let interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    if (!['in_progress', 'ready', 'scheduled'].includes(interview.status)) {
      return res.status(400).json({ status: 'error', message: `Interview status is already: ${interview.status}` });
    }

    const now = new Date();
    const actualDurationSeconds = interview.startedAt
      ? Math.round((now - interview.startedAt) / 1000)
      : 0;

    // Save the vapiCallId the frontend reports (from vapi.start() response)
    const callIdToFetch = vapiCallId || interview.vapiCallId;
    if (callIdToFetch && callIdToFetch !== interview.vapiCallId) {
      await Interview.findByIdAndUpdate(id, { vapiCallId: callIdToFetch });
    }

    // Try to fetch the authoritative Vapi transcript
    if (callIdToFetch && process.env.VAPI_API_KEY) {
      try {
        await new Promise((r) => setTimeout(r, 2000)); // small delay for Vapi to finalise
        const callData = await vapiService.getCall(callIdToFetch);
        const vapiTranscript = vapiService.extractTranscript(callData);
        const vapiMetrics    = vapiService.extractMetrics(callData);

        if (vapiTranscript.length > 0) {
          await Interview.findByIdAndUpdate(id, {
            transcript: vapiTranscript,
            'metrics.totalWordCount': vapiMetrics.totalWordCount,
          });
        }
        // End the call on Vapi side if still active
        await vapiService.endCall(callIdToFetch).catch(() => {});
      } catch (vapiErr) {
        console.warn('[Interview] Could not fetch Vapi transcript:', vapiErr.message);
      }
    }

    // Mark as analysing + save metrics
    interview = await Interview.findByIdAndUpdate(
      id,
      {
        status: 'analysing',
        endedAt: now,
        vapiCallId: callIdToFetch || interview.vapiCallId,
        'metrics.actualDurationSeconds': actualDurationSeconds,
        'metrics.confidenceScore':       Number(confidenceScore)     || 0,
        'metrics.pauseCount':            Number(pauseCount)          || interview.metrics.pauseCount,
        'metrics.totalPauseDurationMs':  Number(totalPauseDurationMs)|| interview.metrics.totalPauseDurationMs,
      },
      { new: true }
    );

    // Trigger analysis asynchronously
    setImmediate(async () => {
      try {
        console.log(`[Interview] Starting async analysis for ${id}...`);
        const freshInterview = await Interview.findById(id);

        const analysis = await analyseInterview({
          interview: freshInterview,
          transcript: freshInterview.transcript,
          questions:  freshInterview.generatedQuestions || [],
          metrics: { ...freshInterview.metrics, actualDurationSeconds },
        });

        const report = buildReport(freshInterview, analysis);

        await Interview.findByIdAndUpdate(id, {
          status: 'analysed',
          analysis,
          report,
          analysedAt: new Date(),
        });
        console.log(`[Interview] Analysis complete for ${id}. Score: ${analysis.overallScore}`);
      } catch (analysisErr) {
        console.error(`[Interview] Async analysis failed for ${id}:`, analysisErr.message);
        await Interview.findByIdAndUpdate(id, { status: 'completed' });
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Interview ended. Analysis is being generated.',
      data: { interview, analysisInProgress: true },
    });
  } catch (err) {
    console.error('[Interview] endInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── GET /api/interview/:id/analysis ───────────────────────────────────────────

exports.getAnalysis = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    const interview = await Interview.findOne({ _id: id, userId }).select('status analysis analysedAt title topics difficulty interviewType durationMinutes metrics');
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    if (interview.status === 'analysing') {
      return res.status(202).json({ status: 'pending', message: 'Analysis is still being generated. Please try again in a few seconds.' });
    }

    if (!interview.analysis) {
      return res.status(404).json({ status: 'error', message: 'Analysis not available. End the interview first.' });
    }

    res.status(200).json({ status: 'success', data: { analysis: interview.analysis, interview } });
  } catch (err) {
    console.error('[Interview] getAnalysis error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── GET /api/interview/:id/report ─────────────────────────────────────────────

exports.getReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    const interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    if (interview.status === 'analysing') {
      return res.status(202).json({ status: 'pending', message: 'Report is being generated.' });
    }

    const reportData = interview.report || interview.analysis;
    if (!reportData) {
      return res.status(404).json({ status: 'error', message: 'Report not available yet.' });
    }

    res.status(200).json({ status: 'success', data: { report: reportData, interview } });
  } catch (err) {
    console.error('[Interview] getReport error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── GET /api/interview/analytics ──────────────────────────────────────────────

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const interviews = await Interview.find({ userId, status: { $in: ['completed', 'analysed'] } })
      .select('title interviewType topics difficulty durationMinutes scheduledAt startedAt endedAt analysis metrics status analysedAt')
      .sort({ scheduledAt: -1 })
      .limit(100);

    const total = interviews.length;
    const analysed = interviews.filter((i) => i.status === 'analysed' && i.analysis);

    // Aggregate scores
    const scores = analysed.map((i) => i.analysis?.overallScore || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const latestScore = scores.length ? scores[0] : 0;

    // Topic performance
    const topicMap = {};
    for (const iv of analysed) {
      const topicAnalysis = iv.analysis?.topicAnalysis || [];
      for (const ta of topicAnalysis) {
        if (!topicMap[ta.topic]) topicMap[ta.topic] = [];
        topicMap[ta.topic].push(ta.score);
      }
    }
    const topicPerformance = Object.entries(topicMap).map(([topic, s]) => ({
      topic,
      avgScore: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
      count: s.length,
    }));

    // Weekly trend (last 8 interviews)
    const trend = analysed.slice(0, 8).reverse().map((iv) => ({
      date: iv.scheduledAt?.toISOString().slice(0, 10) || '',
      score: iv.analysis?.overallScore || 0,
      title: iv.title,
    }));

    // Type distribution
    const typeCount = {};
    for (const iv of interviews) {
      typeCount[iv.interviewType] = (typeCount[iv.interviewType] || 0) + 1;
    }

    res.status(200).json({
      status: 'success',
      data: {
        total,
        totalAnalysed: analysed.length,
        avgScore,
        bestScore,
        latestScore,
        improvement: analysed.length >= 2
          ? analysed[0].analysis?.overallScore - analysed[analysed.length - 1].analysis?.overallScore
          : 0,
        topicPerformance,
        trend,
        typeDistribution: typeCount,
        recentInterviews: interviews.slice(0, 5).map((i) => ({
          _id: i._id,
          title: i.title,
          interviewType: i.interviewType,
          status: i.status,
          scheduledAt: i.scheduledAt,
          overallScore: i.analysis?.overallScore || null,
        })),
      },
    });
  } catch (err) {
    console.error('[Interview] getAnalytics error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── DELETE /api/interview/:id ─────────────────────────────────────────────────

exports.deleteInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid interview ID' });
    }

    const interview = await Interview.findOneAndDelete({ _id: id, userId });
    if (!interview) return res.status(404).json({ status: 'error', message: 'Interview not found' });

    res.status(200).json({ status: 'success', message: 'Interview deleted' });
  } catch (err) {
    console.error('[Interview] deleteInterview error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ── POST /api/interview/webhook ───────────────────────────────────────────────
// Handles Vapi webhook events (no auth required — verified by interviewId in metadata)

exports.vapiWebhook = async (req, res) => {
  try {
    const { event, callId, data } = vapiService.parseWebhookEvent(req.body);

    console.log(`[Interview] Vapi webhook event: ${event}, callId: ${callId}`);

    // Always respond 200 to Vapi immediately
    res.status(200).json({ status: 'received' });

    // Process event asynchronously
    if (!callId) return;

    const interview = await Interview.findOne({ vapiCallId: callId });
    if (!interview) {
      console.warn(`[Interview] No interview found for Vapi callId: ${callId}`);
      return;
    }

    switch (event) {
      case vapiService.VAPI_EVENTS.CALL_STARTED:
        await Interview.findByIdAndUpdate(interview._id, {
          status: 'in_progress',
          startedAt: new Date(),
        });
        break;

      case vapiService.VAPI_EVENTS.CALL_ENDED: {
        // Extract transcript and trigger analysis
        const transcript = vapiService.extractTranscript(data?.artifact ? data : { artifact: data });
        const metrics = vapiService.extractMetrics(data?.artifact ? data : { artifact: data });

        await Interview.findByIdAndUpdate(interview._id, {
          status: 'analysing',
          endedAt: new Date(),
          transcript: transcript.length > 0 ? transcript : interview.transcript,
          'metrics.totalWordCount': metrics.totalWordCount || interview.metrics.totalWordCount,
          'metrics.actualDurationSeconds': metrics.actualDurationSeconds,
        });

        // Trigger analysis
        setImmediate(async () => {
          try {
            const fresh = await Interview.findById(interview._id);
            const analysis = await analyseInterview({
              interview: fresh,
              transcript: fresh.transcript,
              questions: fresh.generatedQuestions || [],
              metrics: fresh.metrics,
            });
            const report = buildReport(fresh, analysis);
            await Interview.findByIdAndUpdate(fresh._id, {
              status: 'analysed',
              analysis,
              report,
              analysedAt: new Date(),
            });
            console.log(`[Interview] Webhook analysis done for ${fresh._id}. Score: ${analysis.overallScore}`);
          } catch (err) {
            console.error(`[Interview] Webhook analysis error for ${interview._id}:`, err.message);
            await Interview.findByIdAndUpdate(interview._id, { status: 'completed' });
          }
        });
        break;
      }

      case vapiService.VAPI_EVENTS.TRANSCRIPT: {
        const role = data?.role === 'assistant' ? 'ai' : 'user';
        const message = data?.transcript || data?.text || '';
        if (message) {
          await Interview.findByIdAndUpdate(interview._id, {
            $push: {
              transcript: { role, message, timestamp: new Date() },
            },
          });
        }
        break;
      }

      default:
        console.log(`[Interview] Unhandled Vapi event: ${event}`);
    }
  } catch (err) {
    console.error('[Interview] vapiWebhook error:', err);
    // Already sent 200, just log
  }
};

// ── Helper: Build Full Report ─────────────────────────────────────────────────

const buildReport = (interview, analysis) => ({
  interviewId:     String(interview._id),
  title:           interview.title,
  interviewType:   interview.interviewType,
  topics:          interview.topics,
  difficulty:      interview.difficulty,
  durationMinutes: interview.durationMinutes,
  scheduledAt:     interview.scheduledAt,
  completedAt:     interview.endedAt || new Date(),
  metrics:         interview.metrics,
  ...analysis,
  generatedAt:     new Date(),
});
