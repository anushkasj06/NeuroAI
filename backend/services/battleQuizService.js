/**
 * battleQuizService — generates quiz questions for multiplayer battles.
 * Uses Groq API (same pattern as grokService.js).
 * Falls back to deterministic questions if Groq is unavailable.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const QUESTIONS_PER_BATTLE = 10;

const parseJson = (text) => {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('[');
  const end   = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found');
  return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
};

/**
 * Generate battle quiz questions.
 * @param {object} opts - { subject, topic, difficulty, count }
 * @returns {Promise<Array>} array of question objects
 */
const generateBattleQuestions = async ({ subject, topic, difficulty = 'medium', count = QUESTIONS_PER_BATTLE }) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('[BattleQuiz] GROQ_API_KEY not set — using fallback questions');
    return buildFallbackQuestions(subject, topic, difficulty, count);
  }

  const prompt = `Generate exactly ${count} multiple-choice quiz questions about "${topic || subject || 'General Knowledge'}" at ${difficulty} difficulty level.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of the correct answer",
    "points": 100
  }
]

Rules:
- Exactly ${count} questions
- Each question has exactly 4 options
- correctIndex is 0-3 (index of correct option in options array)
- ${difficulty === 'easy' ? 'Basic recall questions' : difficulty === 'medium' ? 'Application and understanding questions' : 'Analysis and synthesis questions'}
- Questions must be factually accurate
- No duplicate questions`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: 'You are a quiz generator. Return ONLY valid JSON arrays. No markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) throw new Error(`Groq API ${res.status}`);

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty Groq response');

    const questions = parseJson(text);

    // Validate and normalise
    return questions.slice(0, count).map((q, i) => ({
      id:           q.id || `q${i + 1}`,
      question:     q.question,
      options:      Array.isArray(q.options) ? q.options.slice(0, 4) : [],
      correctIndex: Number(q.correctIndex ?? 0),
      explanation:  q.explanation || '',
      points:       Number(q.points || 100),
    }));
  } catch (err) {
    console.error('[BattleQuiz] Groq failed:', err.message, '— using fallback');
    return buildFallbackQuestions(subject, topic, difficulty, count);
  }
};

const buildFallbackQuestions = (subject, topic, difficulty, count) => {
  const label = topic || subject || 'General Knowledge';
  return Array.from({ length: count }, (_, i) => ({
    id:           `q${i + 1}`,
    question:     `Question ${i + 1}: Which of the following is correct about ${label}?`,
    options:      ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: i % 4,
    explanation:  `This is a fallback question about ${label}.`,
    points:       100,
  }));
};

module.exports = { generateBattleQuestions, QUESTIONS_PER_BATTLE };
