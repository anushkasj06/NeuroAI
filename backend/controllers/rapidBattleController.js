const RapidBattleAttempt = require('../models/RapidBattleAttempt');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const getGroqApiKey = () => process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

const normalizeTopic = (topic = '') =>
  topic
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const sanitizeQuestion = (question, index) => ({
  id: index + 1,
  question: question.question.trim(),
  options: question.options.map((option) => option.trim()),
  correctAnswer: question.correctAnswer,
  explanation: (question.explanation || '').trim(),
});

const parseQuestionsFromText = (rawText) => {
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI response did not include a JSON array.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned an empty question list.');
  }

  const validated = parsed.filter((question) => {
    const hasShape =
      question &&
      typeof question.question === 'string' &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      Number.isInteger(question.correctAnswer);

    if (!hasShape) {
      return false;
    }

    if (question.correctAnswer < 0 || question.correctAnswer > 3) {
      return false;
    }

    return question.options.every((option) => typeof option === 'string' && option.trim().length > 0);
  });

  if (!validated.length) {
    throw new Error('AI returned malformed questions.');
  }

  return validated.map(sanitizeQuestion);
};

const buildPrompt = ({ topic, questionCount }) => `
Create exactly ${questionCount} rapid-fire multiple-choice quiz questions for the topic: "${topic}".

Rules:
1. Difficulty: medium with a few challenging twists.
2. Every question must have 4 options.
3. Exactly one option is correct.
4. Keep each question concise and test conceptual clarity.
5. Return ONLY a JSON array.

Schema:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": 0,
    "explanation": "string"
  }
]
`;

const generateWithGroq = async ({ topic, questionCount }) => {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Missing Groq API key');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. Never include markdown fences.',
        },
        {
          role: 'user',
          content: buildPrompt({ topic, questionCount }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Groq returned an empty response.');
  }

  return parseQuestionsFromText(text);
};

const generateWithGemini = async ({ topic, questionCount }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: buildPrompt({ topic, questionCount }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.6,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return parseQuestionsFromText(text);
};

const generateQuestions = async ({ topic, questionCount }) => {
  const preferredProvider = (process.env.QUIZ_AI_PROVIDER || '').trim().toLowerCase();
  const providers =
    preferredProvider === 'gemini'
      ? [generateWithGemini, generateWithGroq]
      : [generateWithGroq, generateWithGemini];

  let lastError;
  for (const provider of providers) {
    try {
      return await provider({ topic, questionCount });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No AI provider available for quiz generation.');
};

const generateRapidQuiz = async (req, res) => {
  try {
    const topic = normalizeTopic(req.body.topic);
    const questionCount = Math.max(3, Math.min(Number(req.body.questionCount) || 7, 15));

    if (!topic) {
      return res.status(400).json({
        status: 'error',
        message: 'Topic is required.',
      });
    }

    const questions = await generateQuestions({ topic, questionCount });

    res.status(200).json({
      status: 'success',
      data: {
        topic,
        questions: questions.slice(0, questionCount),
      },
    });
  } catch (error) {
    console.error('Rapid quiz generation failed:', error);
    res.status(500).json({
      status: 'error',
      message:
        'Failed to generate rapid quiz questions. Check your AI API key in backend/.env and try again.',
    });
  }
};

const submitRapidBattleAttempt = async (req, res) => {
  try {
    const topic = normalizeTopic(req.body.topic);
    const mode = req.body.mode === 'friend' ? 'friend' : 'solo';
    const questionCount = Number(req.body.questionCount);
    const correctAnswers = Number(req.body.correctAnswers);
    const unanswered = Math.max(0, Number(req.body.unanswered) || 0);
    const timeSpentSeconds = Math.max(0, Number(req.body.timeSpentSeconds) || 0);
    const challengeCode = req.body.challengeCode ? req.body.challengeCode.toString().trim() : null;

    if (!topic) {
      return res.status(400).json({
        status: 'error',
        message: 'Topic is required.',
      });
    }

    if (!Number.isInteger(questionCount) || questionCount <= 0 || questionCount > 30) {
      return res.status(400).json({
        status: 'error',
        message: 'questionCount must be an integer between 1 and 30.',
      });
    }

    if (!Number.isInteger(correctAnswers) || correctAnswers < 0 || correctAnswers > questionCount) {
      return res.status(400).json({
        status: 'error',
        message: 'correctAnswers must be between 0 and questionCount.',
      });
    }

    if (unanswered > questionCount) {
      return res.status(400).json({
        status: 'error',
        message: 'unanswered cannot exceed questionCount.',
      });
    }

    const accuracy = Number(((correctAnswers / questionCount) * 100).toFixed(2));

    const attempt = await RapidBattleAttempt.create({
      userId: req.user._id,
      userName: req.user.name,
      mode,
      topic,
      questionCount,
      correctAnswers,
      unanswered,
      accuracy,
      timeSpentSeconds,
      challengeCode,
    });

    res.status(201).json({
      status: 'success',
      data: attempt,
    });
  } catch (error) {
    console.error('Rapid battle submit failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save battle attempt.',
    });
  }
};

const getRapidLeaderboard = async (req, res) => {
  try {
    const topic = normalizeTopic(req.query.topic || 'all');
    const mode = (req.query.mode || 'solo').toString().toLowerCase();
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));

    const query = {};
    if (topic !== 'all') {
      query.topic = topic;
    }
    if (mode !== 'all') {
      query.mode = mode === 'friend' ? 'friend' : 'solo';
    }

    const leaderboard = await RapidBattleAttempt.find(query)
      .sort({ correctAnswers: -1, accuracy: -1, timeSpentSeconds: 1, createdAt: 1 })
      .select('userName topic mode correctAnswers questionCount unanswered accuracy timeSpentSeconds createdAt')
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: leaderboard,
    });
  } catch (error) {
    console.error('Rapid leaderboard fetch failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch rapid leaderboard.',
    });
  }
};

const getMyRapidBattleHistory = async (req, res) => {
  try {
    const history = await RapidBattleAttempt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('topic mode correctAnswers questionCount unanswered accuracy timeSpentSeconds createdAt')
      .limit(50);

    res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    console.error('Rapid history fetch failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch rapid battle history.',
    });
  }
};

module.exports = {
  generateRapidQuiz,
  submitRapidBattleAttempt,
  getRapidLeaderboard,
  getMyRapidBattleHistory,
};
