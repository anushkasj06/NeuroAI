/**
 * InterviewQuestionService
 * ========================
 * Generates AI-powered interview questions using Groq (primary)
 * with fallback to other providers via the existing chatCompletion abstraction.
 *
 * Each question object:
 * {
 *   id, question, category, difficulty, expectedConcepts: [], followUps: []
 * }
 */

'use strict';

const { chatCompletion, parseJson } = require('../grokService');

// ── Groq model preference for interviews (can be changed here) ─────────────
const INTERVIEW_MODEL = process.env.INTERVIEW_GROQ_MODEL || 'llama-3.3-70b-versatile';

const QUESTION_SYSTEM = `You are an expert technical interviewer at a top-tier tech company.
Generate realistic interview questions as VALID JSON ONLY. No markdown, no explanation outside JSON.
Questions must be challenging, industry-relevant, and test real understanding — not memorisation.`;

/**
 * Build a rich prompt for interview question generation.
 */
const buildQuestionPrompt = ({ interviewType, topics, difficulty, durationMinutes }) => {
  const topicList = topics.join(', ');

  // Determine question count based on duration
  const questionCount = Math.max(5, Math.floor(durationMinutes / 5));

  return `Generate a complete interview question bank for a ${durationMinutes}-minute ${difficulty} ${interviewType} interview.

TOPICS: ${topicList}
DIFFICULTY: ${difficulty}
INTERVIEW TYPE: ${interviewType}
DURATION: ${durationMinutes} minutes
TARGET QUESTION COUNT: ${questionCount} questions

Generate questions across these categories:
- opening_intro: 1 warm-up / intro question
- ice_breaker: 1 light confidence-building question
- core_technical: ${Math.ceil(questionCount * 0.5)} topic-specific deep-dive questions
- scenario_based: ${Math.ceil(questionCount * 0.2)} real-world application questions
- cross_topic: ${Math.ceil(questionCount * 0.1)} questions that connect multiple topics
- behavioral: ${interviewType === 'behavioral' || interviewType === 'mixed' ? 2 : 1} situational questions (STAR-format friendly)
- closing: 1 closing question (e.g., "Do you have any questions for us?")

Rules:
- Core technical questions must test DEPTH, not surface knowledge
- Scenario questions should reflect real problems at companies like Google, Amazon, Microsoft
- Follow-up questions should probe for deeper understanding if the candidate answers superficially
- Questions should increase in difficulty progressively
- For each question, list 3-5 key expected concepts/keywords the ideal answer should cover
- Generate 2-3 follow-up questions per core/scenario question

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "full question text",
      "category": "opening_intro|ice_breaker|core_technical|scenario_based|cross_topic|behavioral|closing",
      "difficulty": "easy|medium|hard",
      "topic": "relevant topic from the list",
      "expectedConcepts": ["concept1", "concept2", "concept3"],
      "followUps": [
        "follow-up question 1",
        "follow-up question 2"
      ],
      "estimatedMinutes": 3,
      "hints": "internal hint for the interviewer AI about what a great answer looks like"
    }
  ],
  "interviewFlow": {
    "openingScript": "How the AI interviewer should open the interview",
    "closingScript": "How the AI interviewer should close the interview",
    "transitionPhrases": ["phrase to use when moving to next question", "another transition phrase"]
  }
}`;
};

/**
 * Generate interview questions using Groq.
 * @param {object} config - { interviewType, topics, difficulty, durationMinutes }
 * @returns {Promise<{questions: Array, interviewFlow: object}>}
 */
const generateInterviewQuestions = async (config) => {
  const { interviewType, topics, difficulty, durationMinutes } = config;

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: QUESTION_SYSTEM },
        { role: 'user', content: buildQuestionPrompt(config) },
      ],
      {
        temperature: 0.7,
        maxTokens: 6000,
        groqModel: INTERVIEW_MODEL,
      }
    );

    const parsed = parseJson(text);

    // Normalise and ensure IDs are unique
    const questions = (parsed.questions || []).map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      question: q.question || '',
      category: q.category || 'core_technical',
      difficulty: q.difficulty || difficulty,
      topic: q.topic || topics[0],
      expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts : [],
      followUps: Array.isArray(q.followUps) ? q.followUps : [],
      estimatedMinutes: q.estimatedMinutes || 3,
      hints: q.hints || '',
    }));

    return {
      questions,
      interviewFlow: parsed.interviewFlow || buildDefaultFlow(interviewType, topics, difficulty),
    };
  } catch (err) {
    console.error('[InterviewQuestionService] Generation failed, using fallback:', err.message);
    return buildFallbackQuestions(config);
  }
};

// ── Fallback question bank ────────────────────────────────────────────────────

const buildDefaultFlow = (interviewType, topics, difficulty) => ({
  openingScript: `Hello! Welcome to your ${difficulty} ${interviewType} interview covering ${topics.join(', ')}. I'm your AI interviewer today. Take a deep breath — let's have a great conversation. Ready to begin?`,
  closingScript: `That was a great interview! Thank you for your thoughtful responses. We'll analyse your performance and provide detailed feedback shortly. Good luck!`,
  transitionPhrases: [
    "Great, let's move to the next question.",
    "Interesting perspective. Now, let me ask you about something related.",
    "Good answer. Here's my next question.",
    "Thanks for that. Let's shift our focus to...",
  ],
});

const buildFallbackQuestions = ({ interviewType, topics, difficulty, durationMinutes }) => {
  const topic = topics[0] || 'Computer Science';
  const questionCount = Math.max(5, Math.floor(durationMinutes / 5));

  const questions = [
    {
      id: 'q1',
      question: `Tell me about yourself and why you're interested in ${topic}.`,
      category: 'opening_intro',
      difficulty: 'easy',
      topic,
      expectedConcepts: ['self-introduction', 'motivation', 'background'],
      followUps: ['What specific aspect of this interests you most?'],
      estimatedMinutes: 2,
      hints: 'Looking for clear communication and genuine interest.',
    },
    {
      id: 'q2',
      question: `What's a recent project or problem you worked on that you're proud of?`,
      category: 'ice_breaker',
      difficulty: 'easy',
      topic,
      expectedConcepts: ['problem-solving', 'initiative', 'communication'],
      followUps: ['What was the biggest challenge in that project?'],
      estimatedMinutes: 3,
      hints: 'Looking for enthusiasm and clear narrative.',
    },
    {
      id: 'q3',
      question: `Explain the core concepts of ${topic} and how they apply in real-world systems.`,
      category: 'core_technical',
      difficulty: difficulty === 'beginner' ? 'easy' : 'medium',
      topic,
      expectedConcepts: ['core definition', 'real-world application', 'trade-offs'],
      followUps: [
        `Can you give a specific example from your experience?`,
        `What are common pitfalls when working with ${topic}?`,
      ],
      estimatedMinutes: 5,
      hints: 'Expect understanding beyond textbook definition.',
    },
    {
      id: 'q4',
      question: `Describe a scenario where you had to optimise a system dealing with ${topic}. What approach did you take?`,
      category: 'scenario_based',
      difficulty: difficulty === 'beginner' ? 'medium' : 'hard',
      topic,
      expectedConcepts: ['system thinking', 'optimisation', 'trade-offs', 'metrics'],
      followUps: [
        'How did you measure success?',
        'What would you do differently now?',
      ],
      estimatedMinutes: 6,
      hints: 'Looking for structured approach and outcome awareness.',
    },
    {
      id: 'q5',
      question: `Tell me about a time you disagreed with a technical decision and how you handled it.`,
      category: 'behavioral',
      difficulty: 'medium',
      topic: 'general',
      expectedConcepts: ['communication', 'empathy', 'professionalism', 'technical justification'],
      followUps: ['What was the outcome?', 'What did you learn from it?'],
      estimatedMinutes: 4,
      hints: 'Using STAR method. Looking for maturity and communication.',
    },
    {
      id: 'q6',
      question: `How do the principles of ${topics.slice(0, 2).join(' and ')} intersect in a distributed system?`,
      category: 'cross_topic',
      difficulty: 'hard',
      topic: topics[0],
      expectedConcepts: ['integration', 'system design', 'distributed computing'],
      followUps: ['What trade-offs would you consider?'],
      estimatedMinutes: 5,
      hints: 'Looking for ability to connect multiple concepts.',
    },
    {
      id: 'q7',
      question: `Do you have any questions for me about the role or the team?`,
      category: 'closing',
      difficulty: 'easy',
      topic: 'general',
      expectedConcepts: ['curiosity', 'engagement', 'preparation'],
      followUps: [],
      estimatedMinutes: 2,
      hints: 'Good candidates always have thoughtful questions.',
    },
  ];

  // Trim to questionCount if needed
  return {
    questions: questions.slice(0, questionCount),
    interviewFlow: buildDefaultFlow(interviewType, topics, difficulty),
  };
};

module.exports = {
  generateInterviewQuestions,
  INTERVIEW_MODEL,
};
