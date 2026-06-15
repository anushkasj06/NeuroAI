/**
 * VapiService
 * ===========
 * Vapi integration for AI voice interviews.
 *
 * KEY ARCHITECTURE:
 * ─────────────────
 * The Vapi Web SDK (frontend) only needs the PUBLIC key.
 * vapi.start(assistantConfig)  ← pass full config inline (no backend REST call needed)
 * vapi.start('assistantId')    ← OR pass a pre-created assistant ID
 *
 * The backend REST API (/assistant POST) requires the PRIVATE key.
 * Since most users only have the public key configured, we support BOTH modes:
 *
 *  Mode A – Private key set (VAPI_PRIVATE_KEY):
 *    Backend creates assistant → stores ID → frontend calls vapi.start(id)
 *
 *  Mode B – No private key (default):
 *    Backend builds assistant config → sends to frontend → frontend calls vapi.start(config)
 *    Zero Vapi REST API calls on the backend.
 */

'use strict';

const fetch = require('node-fetch');

const VAPI_BASE_URL = 'https://api.vapi.ai';

// Private key is ONLY needed for backend REST API calls (creating/listing assistants)
// Public key is what you see in Vapi dashboard → API Keys
const getPrivateKey = () => {
  return process.env.VAPI_PRIVATE_KEY || null;
};

const vapiHeaders = (key) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${key}`,
});

const vapiRequest = async (method, path, body = null) => {
  const key = getPrivateKey();
  if (!key) throw new Error('VAPI_PRIVATE_KEY is not set');

  const opts = { method, headers: vapiHeaders(key) };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${VAPI_BASE_URL}${path}`, opts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vapi API error ${res.status} on ${method} ${path}: ${errText}`);
  }
  return res.json();
};

// ── Build inline assistant config ─────────────────────────────────────────────
// This is used in Mode B (no private key) — sent to frontend to pass into vapi.start()

const buildAssistantConfig = (interview, interviewFlow = {}) => {
  const topicsList    = (interview.topics || []).join(', ');
  const difficultyMap = { beginner: 'entry-level', intermediate: 'mid-level', advanced: 'senior-level' };
  const diffLabel     = difficultyMap[interview.difficulty] || interview.difficulty;

  const systemPrompt = `You are an experienced ${diffLabel} technical interviewer conducting a ${interview.interviewType} interview.

INTERVIEW CONTEXT:
- Topics: ${topicsList}
- Difficulty: ${interview.difficulty}
- Duration: ${interview.durationMinutes} minutes

YOUR BEHAVIOUR:
1. Start with a warm professional greeting and introduce yourself.
2. Ask ONE question at a time. Wait for the candidate to finish speaking before asking the next.
3. Ask follow-up questions when answers are brief or need more depth.
4. Never reveal expected answers or correct the candidate mid-answer.
5. Be professional, encouraging, and conversational — like a real interviewer.
6. Move between questions naturally using transition phrases.
7. After all questions, thank the candidate and close the interview professionally.
8. Keep responses concise — you are the interviewer, not a teacher.

TRANSITION PHRASES:
${(interviewFlow.transitionPhrases || [
    "Great, thank you. Let's move on.",
    "Interesting perspective. Here's my next question.",
    "Good. Now let me ask you about something related.",
  ]).join('\n')}

CLOSING:
${interviewFlow.closingScript || `Thank you for your time today. That wraps up our ${interview.interviewType} interview. You'll receive detailed feedback shortly. Good luck!`}`;

  return {
    name: `AI Interviewer — ${interview.title}`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.65,
      maxTokens: 350,
      messages: [{ role: 'system', content: systemPrompt }],
    },
    voice: {
      provider: '11labs',
      voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam — professional, clear male voice
      stability: 0.5,
      similarityBoost: 0.75,
      optimizeStreamingLatency: 3,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en-US',
    },
    firstMessage: interviewFlow.openingScript
      ? interviewFlow.openingScript.slice(0, 400)
      : `Hello! Welcome to your ${diffLabel} ${interview.interviewType} interview. I'm your AI interviewer today, and we'll be covering ${topicsList}. This session will run for about ${interview.durationMinutes} minutes. Whenever you're ready, we can begin. Could you start by telling me a little about yourself?`,
    endCallMessage: `Thank you for completing this interview. Your responses have been recorded and you'll receive your detailed performance analysis shortly. Best of luck!`,
    endCallFunctionEnabled: true,
    recordingEnabled: true,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: (interview.durationMinutes + 5) * 60,
    backgroundSound: 'off',
    metadata: {
      interviewId: String(interview._id),
      userId: String(interview.userId || ''),
      topics: (interview.topics || []).join(','),
      difficulty: interview.difficulty,
    },
  };
};

// ── Mode A: Create assistant via REST (requires private key) ──────────────────
const createAssistant = async (interview, interviewFlow = {}) => {
  const config = buildAssistantConfig(interview, interviewFlow);
  const data   = await vapiRequest('POST', '/assistant', config);
  return { assistantId: data.id, config };
};

// ── Mode B check: can we use REST API? ────────────────────────────────────────
const hasPrivateKey = () => !!getPrivateKey();

// ── Call management ───────────────────────────────────────────────────────────

const endCall = async (callId) => {
  const key = getPrivateKey();
  if (!key) return null;
  return vapiRequest('DELETE', `/call/${callId}`);
};

const getCall = async (callId) => {
  return vapiRequest('GET', `/call/${callId}`);
};

// ── Transcript helpers ────────────────────────────────────────────────────────

const extractTranscript = (callData) => {
  const messages = callData?.artifact?.messages || callData?.messages || [];
  return messages
    .filter((m) => m.role && m.content)
    .map((m) => ({
      role: m.role === 'assistant' ? 'ai' : 'user',
      message: String(m.content || '').trim(),
      timestamp: m.time ? new Date(m.time * 1000) : new Date(),
    }));
};

const extractMetrics = (callData) => {
  const messages    = callData?.artifact?.messages || callData?.messages || [];
  const userMessages = messages.filter((m) => m.role === 'user');
  const totalWords   = userMessages.reduce((acc, m) =>
    acc + (m.content || '').split(/\s+/).filter(Boolean).length, 0);
  const durationSeconds = callData?.endedAt && callData?.startedAt
    ? Math.round((new Date(callData.endedAt) - new Date(callData.startedAt)) / 1000)
    : 0;
  return {
    totalWordCount: totalWords,
    actualDurationSeconds: durationSeconds,
    avgResponseSeconds: userMessages.length > 0
      ? Math.round(durationSeconds / userMessages.length) : 0,
  };
};

// ── Webhook parser ────────────────────────────────────────────────────────────

const VAPI_EVENTS = {
  CALL_STARTED: 'call-started',
  CALL_ENDED:   'call-ended',
  TRANSCRIPT:   'transcript',
  SPEECH_UPDATE:'speech-update',
  STATUS_UPDATE:'status-update',
};

const parseWebhookEvent = (body) => ({
  event:  body?.message?.type || body?.type || '',
  callId: body?.message?.call?.id || body?.call?.id || body?.callId || '',
  data:   body?.message || body,
});

module.exports = {
  buildAssistantConfig,
  createAssistant,
  hasPrivateKey,
  endCall,
  getCall,
  extractTranscript,
  extractMetrics,
  parseWebhookEvent,
  VAPI_EVENTS,
};
