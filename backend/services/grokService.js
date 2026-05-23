/**
 * AI provider service.
 * Primary provider: OpenAI Responses API.
 * Fallback provider: Groq OpenAI-compatible chat completions.
 *
 * Set OPENAI_API_KEY in backend/.env.
 * Optional fallback: GROQ_API_KEY in backend/.env.
 */

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const uniqueValues = (...values) => [...new Set(values.filter(Boolean).map((value) => value.trim()))];

const extractOpenAiText = (data) => {
  if (data?.output_text) return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) chunks.push(content.text);
      if (content?.text && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
};

const openAiCompletion = async (messages, opts = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in backend/.env');
  }

  const body = {
    model: opts.model || DEFAULT_OPENAI_MODEL,
    input: messages.map((message) => ({
      role: message.role === 'system' ? 'developer' : message.role,
      content: [{ type: 'input_text', text: message.content }],
    })),
    text: { format: { type: 'text' } },
    max_output_tokens: opts.maxTokens || 4096,
  };

  if (String(body.model).startsWith('gpt-5')) {
    body.reasoning = { effort: opts.reasoningEffort || 'minimal' };
  } else if (opts.temperature != null) {
    body.temperature = opts.temperature;
  }

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = extractOpenAiText(data);
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
};

const geminiCompletion = async (messages, opts = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in backend/.env');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: opts.geminiModel || DEFAULT_GEMINI_MODEL,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens || 4096,
    },
  });
  const prompt = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join('\n\n');
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
};

/**
 * Core chat completion call.
 * @param {Array<{role,content}>} messages
 * @param {object} opts  - { model, temperature, maxTokens }
 * @returns {Promise<string>} raw text response
 */
const chatCompletion = async (messages, opts = {}) => {
  const prompt = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join('\n\n');
  const preferredProvider = (process.env.QUIZ_AI_PROVIDER || '').trim().toLowerCase();
  let groqError = null;
  let geminiError = null;
  let openAiError = null;

  const tryGroq = async () => {
    try {
      return await groqChatCompletion(messages, opts);
    } catch (error) {
      groqError = error;
      console.error('Groq generation failed:', error.message);
      return null;
    }
  };

  const tryGemini = async () => {
    try {
      return await geminiBattleCompletion(prompt, opts);
    } catch (error) {
      geminiError = error;
      console.error('Gemini generation failed:', error.message);
      return null;
    }
  };

  if (preferredProvider === 'gemini') {
    const geminiResult = await tryGemini();
    if (geminiResult) return geminiResult;
    const groqResult = await tryGroq();
    if (groqResult) return groqResult;
  } else {
    const groqResult = await tryGroq();
    if (groqResult) return groqResult;
    const geminiResult = await tryGemini();
    if (geminiResult) return geminiResult;
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await openAiCompletion(messages, opts);
    } catch (error) {
      openAiError = error;
      console.error('OpenAI generation failed:', error.message);
    }
  }

  const errorParts = [];
  if (groqError) errorParts.push(`Groq: ${groqError.message}`);
  if (geminiError) errorParts.push(`Gemini: ${geminiError.message}`);
  if (openAiError) errorParts.push(`OpenAI: ${openAiError.message}`);

  const suffix = errorParts.length ? ` ${errorParts.join(' | ')}` : '';
  throw new Error(`No AI provider completed successfully.${suffix}`);
};

const groqChatCompletion = async (messages, opts = {}) => {
  const keys = uniqueValues(process.env.GROQ_API_KEY, process.env.VITE_GROQ_API_KEY);
  let lastError;
  for (const apiKey of keys) {
    try {
      const body = {
        model: opts.groqModel || process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens || 4096,
      };

      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from Groq');
      return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Missing Groq API key');
};

const geminiBattleCompletion = async (prompt, opts = {}) => {
  const keys = uniqueValues(process.env.GEMINI_API_KEY, process.env.VITE_GEMINI_API_KEY);
  const models = uniqueValues(process.env.GEMINI_MODEL, opts.geminiModel, DEFAULT_GEMINI_MODEL, 'gemini-2.0-flash');
  let lastError;

  for (const apiKey of keys) {
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: opts.temperature ?? 0.6 },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini');
        return text;
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError || new Error('Missing Gemini API key');
};

/**
 * Parse JSON from model output, stripping markdown fences if present.
 */
const parseJson = (text) => {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const jsonStr = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(jsonStr);
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDY PLAN GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const STUDY_PLAN_SYSTEM = `You are NeuroLearn AI — an expert adaptive learning system.
Generate personalized study plans as VALID JSON ONLY. No markdown, no explanation outside JSON.`;

/**
 * Generate a complete study plan for a student.
 */
const generateStudyPlan = async ({
  profile,
  learningReport,
  subjects,
  selectedSubjects,
  examName,
  examDeadline,
  availableHoursPerDay,
}) => {
  const daysUntilExam = Math.max(
    1,
    Math.ceil((new Date(examDeadline) - new Date()) / (1000 * 60 * 60 * 24))
  );
  const weeksCount = Math.min(12, Math.ceil(daysUntilExam / 7));

  const prompt = `Generate a ${weeksCount}-week personalized study plan.

STUDENT PROFILE:
- Name: ${profile.fullName}, Age: ${profile.age}
- Education: ${profile.educationLevel}
- Current score: ${profile.currentCgpaOrPercentage}%, Target: ${profile.targetPercentage}%
- Study hours available: ${availableHoursPerDay}h/day
- Sleep: ${profile.sleepHours}h, Screen time: ${profile.screenTimeHours}h
- Exam: "${examName}" in ${daysUntilExam} days

LEARNING PROFILE:
- Preferred style: ${learningReport.preferredLearningStyle}
- Strongest mode: ${learningReport.strongestLearningMode}
- Confidence: ${learningReport.confidenceLevel}
- Engagement score: ${learningReport.engagementScore}/100
- Attention: ${learningReport.attentionLevel}

SUBJECTS TO STUDY:
${selectedSubjects.map((s) => `- ${s.subjectName} (current: ${s.currentMarks}%, target: ${s.targetMarks}%, topics: ${s.selectedTopics.join(', ')})`).join('\n')}

ALL SUBJECT PERFORMANCE:
${subjects.map((s) => `- ${s.subjectName}: ${s.currentMarks}%`).join('\n')}

If a subject has no selected topics, choose the 3 most important topics and spread them across the plan.

Return ONLY this JSON structure:
{
  "planName": "string",
  "aiSummary": "2-3 sentence summary of the plan",
  "aiRecommendations": ["tip1", "tip2", "tip3"],
  "weeklyPlan": [
    {
      "weekNumber": 1,
      "weekLabel": "Week 1 — Foundation",
      "focusSubjects": ["subject1"],
      "weeklyGoal": "string",
      "totalHours": number,
      "days": [
        {
          "dayLabel": "Monday",
          "totalMinutes": number,
          "motivationalNote": "short motivational string",
          "sessions": [
            {
              "subject": "Subject Name",
              "subjectSlug": "subject_slug",
              "topic": "Topic Name",
              "subtopic": "Subtopic",
              "durationMinutes": number,
              "sessionType": "learn|revise|practice|quiz",
              "difficultyLevel": "easy|medium|hard",
              "resources": ["Recommended resource or study material"]
            }
          ]
        }
      ]
    }
  ],
  "monthlyRoadmap": [
    {
      "month": 1,
      "monthLabel": "Month 1",
      "goals": ["goal1", "goal2"],
      "revisionTopics": ["topic1"],
      "targetScores": { "subjectSlug": targetNumber }
    }
  ]
}

Rules:
- Prioritize weak subjects (low marks) with more sessions
- Match session types to learning style: ${learningReport.preferredLearningStyle}
- Keep daily total within ${availableHoursPerDay * 60} minutes
- Include revision sessions for previously covered topics
- Increase difficulty progressively week by week
- Generate exactly ${Math.min(weeksCount, 4)} weeks of daily plans (7 days each)`;

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: STUDY_PLAN_SYSTEM },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.6, maxTokens: 6000 }
    );
    return parseJson(text);
  } catch (err) {
    console.error('Grok study plan generation failed:', err.message);
    return buildFallbackStudyPlan({
      profile,
      learningReport,
      selectedSubjects,
      examName,
      examDeadline,
      availableHoursPerDay,
      weeksCount,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEARNING MATERIAL GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_SYSTEM = `You are NeuroLearn AI — an expert content creator for adaptive learning.
Generate learning material as VALID JSON ONLY. No markdown outside JSON values.`;

/**
 * Generate learning material adapted to a student's learning style.
 */
const generateLearningMaterial = async ({
  subject,
  subjectSlug,
  topic,
  subtopic,
  learningStyle,
  difficultyLevel,
  currentMarks,
  profile,
}) => {
  const styleInstructions = {
    'Visual Learner':
      'Create visual concept maps, diagrams described in text, flowcharts as step lists, and infographic-style bullet points with emoji icons.',
    'Audio Learner':
      'Write a conversational podcast-style explanation, as if speaking to the student. Include a TTS-ready audio script.',
    'Reading/Writing Learner':
      'Write detailed structured notes with headers, sub-headers, definitions, examples, and a comprehensive summary.',
    'Interactive Learner':
      'Create flashcards, quiz questions, mini-challenges, and coding exercises where applicable.',
  };

  const prompt = `Generate learning material for:
- Subject: ${subject}
- Topic: ${topic}${subtopic ? ` > ${subtopic}` : ''}
- Student learning style: ${learningStyle}
- Difficulty: ${difficultyLevel}
- Student current marks: ${currentMarks}%
- Education level: ${profile.educationLevel}

Style instruction: ${styleInstructions[learningStyle] || styleInstructions['Reading/Writing Learner']}

Return ONLY this JSON:
{
  "content": "main content string (markdown for notes, conversational for audio)",
  "summary": "2-3 sentence summary",
  "keyPoints": ["point1", "point2", "point3", "point4", "point5"],
  "estimatedReadMinutes": number,
  "visualMapData": {
    "nodes": [{"id": "1", "label": "concept", "type": "main|sub|detail"}],
    "edges": [{"from": "1", "to": "2", "label": "relationship"}]
  },
  "flashcards": [
    {"front": "question or term", "back": "answer or definition", "difficulty": "easy|medium|hard"}
  ],
  "quizQuestions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "why A is correct",
      "type": "mcq"
    }
  ],
  "audioScript": "conversational explanation for text-to-speech",
  "videoResources": [
    {
      "title": "topic video title",
      "url": "https://www.youtube.com/watch?v=ysz5S6PUM-U",
      "durationMinutes": 10,
      "watchGoal": "what the student should focus on while watching"
    }
  ],
  "practiceTasks": [
    {
      "title": "task title",
      "instruction": "student action",
      "expectedOutcome": "what good work looks like"
    }
  ],
  "sourceResources": ["Book, video, website, or other reference material aligned to the topic and style"],
  "codeExercises": [
    {
      "title": "Exercise title",
      "description": "What to implement",
      "starterCode": "# starter code",
      "solution": "# solution",
      "language": "python"
    }
  ]
}

Generate at least: 4 sourceResources, 2 videoResources using safe dummy YouTube URLs, 3 practiceTasks, 5 flashcards, 5 strict quiz questions, 7 key points.
For Visual Learner: include rich visualMapData with 6+ nodes.
For Interactive Learner: include 2+ code exercises if subject is technical.
For Audio Learner: write a detailed audioScript (300+ words).
For Reading/Writing Learner: write detailed content (500+ words in markdown).`;

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: MATERIAL_SYSTEM },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, maxTokens: 4096 }
    );
    return parseJson(text);
  } catch (err) {
    console.error('Grok material generation failed:', err.message);
    return buildFallbackMaterial({ subject, topic, subtopic, learningStyle, difficultyLevel });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

const generateAdaptiveRecommendations = async ({
  profile,
  learningReport,
  recentProgress,
  studyPlan,
}) => {
  const prompt = `Analyze student progress and generate adaptive recommendations.

STUDENT: ${profile.fullName}, ${profile.educationLevel}
LEARNING STYLE: ${learningReport.preferredLearningStyle}
CONFIDENCE: ${learningReport.confidenceLevel}
TARGET: ${profile.targetPercentage}%, CURRENT: ${profile.currentCgpaOrPercentage}%

RECENT PROGRESS:
${JSON.stringify(recentProgress, null, 2)}

Generate 3-5 actionable recommendations as JSON:
{
  "recommendations": [
    {
      "type": "difficulty_adjustment|schedule_change|topic_focus|revision_alert|motivation|study_tip",
      "title": "short title",
      "message": "detailed actionable message",
      "priority": "low|medium|high|urgent",
      "actionLabel": "button label or null",
      "actionRoute": "/route or null"
    }
  ]
}`;

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: 'You are NeuroLearn AI. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.6, maxTokens: 1500 }
    );
    return parseJson(text);
  } catch (err) {
    console.error('Grok recommendations failed:', err.message);
    return {
      recommendations: [
        {
          type: 'study_tip',
          title: 'Stay Consistent',
          message: `Keep up your ${profile.studyHoursPerDay}h daily study routine. Consistency is the key to reaching ${profile.targetPercentage}%.`,
          priority: 'medium',
          actionLabel: null,
          actionRoute: null,
        },
      ],
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REVISION CONTENT
// ─────────────────────────────────────────────────────────────────────────────

const generateRevisionContent = async ({ subject, topics, learningStyle, profile }) => {
  const prompt = `Create a quick revision sheet for:
Subject: ${subject}
Topics: ${topics.join(', ')}
Learning style: ${learningStyle}
Education: ${profile.educationLevel}

Return JSON:
{
  "revisionTitle": "string",
  "quickSummary": "string",
  "keyFormulas": ["formula1"],
  "importantPoints": ["point1", "point2"],
  "commonMistakes": ["mistake1"],
  "examTips": ["tip1", "tip2"],
  "flashcards": [{"front": "q", "back": "a", "difficulty": "easy"}],
  "practiceQuestions": [{"question": "q", "answer": "a"}]
}`;

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: 'You are NeuroLearn AI. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.5, maxTokens: 2000 }
    );
    return parseJson(text);
  } catch (err) {
    console.error('Grok revision content failed:', err.message);
    return {
      revisionTitle: `${subject} Quick Revision`,
      quickSummary: `Review the key concepts of ${topics.join(', ')} before your exam.`,
      keyFormulas: [],
      importantPoints: topics.map((t) => `Review: ${t}`),
      commonMistakes: ['Skipping revision', 'Not practicing problems'],
      examTips: ['Read questions carefully', 'Manage your time'],
      flashcards: [],
      practiceQuestions: [],
    };
  }
};

const generateTopicTest = async ({
  subject,
  topic,
  subtopic,
  learningStyle,
  confidenceLevel,
  personalityMode,
  difficultyLevel,
  profile,
  materialContext,
}) => {
  const sourceContext = materialContext
    ? `
SOURCE MATERIAL THE STUDENT JUST REVISED:
- Summary: ${materialContext.summary || 'Not available'}
- Key points: ${(materialContext.keyPoints || []).join('; ') || 'Not available'}
- Notes excerpt: ${(materialContext.content || '').slice(0, 2200)}
- Flashcards: ${(materialContext.flashcards || []).map((card) => `${card.front} -> ${card.back}`).join('; ') || 'Not available'}
- Practice tasks: ${(materialContext.practiceTasks || []).map((task) => `${task.title}: ${task.instruction}`).join('; ') || 'Not available'}
- Existing quiz concepts: ${(materialContext.quizQuestions || []).map((q) => q.question).join('; ') || 'Not available'}
`
    : `
SOURCE MATERIAL THE STUDENT JUST REVISED:
- No saved learning material was found. Generate questions from the exact topic and subtopic only.
`;

  const prompt = `Create a strict gamified mastery test.

STUDENT:
- Name: ${profile.fullName || 'Student'}
- Education: ${profile.educationLevel || 'general'}
- Learning style: ${learningStyle}
- Confidence level: ${confidenceLevel || 'Moderate'}
- Personality mode: ${personalityMode || 'balanced coach'}

TOPIC:
- Subject: ${subject}
- Topic: ${topic}${subtopic ? ` > ${subtopic}` : ''}
- Difficulty: ${difficultyLevel || 'medium'}

${sourceContext}

Return ONLY valid JSON:
{
  "title": "string",
  "rules": ["strict rule 1", "strict rule 2", "strict rule 3"],
  "passingScore": 75,
  "xpPerCorrect": 10,
  "negativeMarking": 2,
  "timeLimitMinutes": 15,
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "specific explanation",
      "type": "mcq",
      "difficulty": "easy|medium|hard",
      "points": 10
    }
  ],
  "rubric": {
    "excellent": "90-100 feedback",
    "pass": "75-89 feedback",
    "revise": "below 75 feedback"
  }
}

Rules:
- Generate exactly 8 questions.
- Every question must be directly based on the source material the student just revised.
- Cover the revised notes, key points, practice tasks, and common mistakes. Do not ask generic questions that ignore the source material.
- Questions must test understanding, application, and common mistakes.
- Do not repeat the same question pattern. Each question must assess a different idea from the revised material.
- Use a firm but supportive tone that fits the personality mode and learning style.
- Make wrong options plausible.`;

  try {
    const messages = [
      { role: 'system', content: 'You create strict educational tests. Return ONLY valid JSON. Never include markdown fences.' },
      { role: 'user', content: prompt },
    ];
    const preferredProvider = (process.env.QUIZ_AI_PROVIDER || '').trim().toLowerCase();
    const text =
      preferredProvider === 'gemini'
        ? await geminiBattleCompletion(prompt, { temperature: 0.45, maxTokens: 3000 }).catch(() =>
            groqChatCompletion(messages, { temperature: 0.45, maxTokens: 3000 })
          )
        : await groqChatCompletion(messages, { temperature: 0.45, maxTokens: 3000 }).catch(() =>
            geminiBattleCompletion(prompt, { temperature: 0.45, maxTokens: 3000 })
          );
    return parseJson(text);
  } catch (err) {
    console.error('Battle-style topic test generation failed:', err.message);
    return buildFallbackTopicTest({ subject, topic, difficultyLevel, personalityMode, learningStyle });
  }
};

const buildFallbackTopicTest = ({ subject, topic, difficultyLevel, personalityMode, learningStyle }) => {
  const lowerTopic = topic.toLowerCase();
  const isAi = lowerTopic.includes('ai') || lowerTopic.includes('artificial intelligence');
  const aiQuestions = [
    {
      question: 'Which statement best defines artificial intelligence?',
      options: ['Software that imitates or performs tasks needing human-like intelligence', 'Any program that stores data in a database', 'A faster version of normal internet search', 'Only robots that move physically'],
      correctAnswer: 'Software that imitates or performs tasks needing human-like intelligence',
      explanation: 'AI covers systems that perceive, reason, learn, or act in ways associated with intelligent behavior.',
      difficulty: 'easy',
    },
    {
      question: 'A spam filter improves after seeing thousands of labeled emails. Which AI idea is being used?',
      options: ['Machine learning from examples', 'Manual rule copying only', 'Random guessing', 'Data deletion'],
      correctAnswer: 'Machine learning from examples',
      explanation: 'The system learns a pattern from labeled examples rather than relying only on hard-coded rules.',
      difficulty: 'easy',
    },
    {
      question: 'What is the main difference between narrow AI and general AI?',
      options: ['Narrow AI solves specific tasks; general AI would handle many tasks like a human', 'Narrow AI is always physical; general AI is always a website', 'Narrow AI never uses data; general AI only uses images', 'There is no difference'],
      correctAnswer: 'Narrow AI solves specific tasks; general AI would handle many tasks like a human',
      explanation: 'Most real systems today are narrow AI designed for a defined task.',
      difficulty: 'medium',
    },
    {
      question: 'Why is biased training data dangerous in AI?',
      options: ['The model may repeat unfair or inaccurate patterns from the data', 'The model will automatically become more creative', 'It prevents the model from making any prediction', 'It makes hardware faster'],
      correctAnswer: 'The model may repeat unfair or inaccurate patterns from the data',
      explanation: 'Models learn from data, so biased examples can become biased outputs.',
      difficulty: 'medium',
    },
    {
      question: 'Which pair correctly matches an AI term with its role?',
      options: ['Model: learned pattern used for prediction', 'Dataset: final exam score only', 'Algorithm: computer screen size', 'Feature: internet speed only'],
      correctAnswer: 'Model: learned pattern used for prediction',
      explanation: 'A model is the learned representation used to make predictions or decisions.',
      difficulty: 'medium',
    },
    {
      question: 'A chatbot gives a confident answer that is factually wrong. What is the best student response?',
      options: ['Verify the answer with reliable sources before trusting it', 'Assume confidence means correctness', 'Delete the entire topic', 'Stop asking follow-up questions'],
      correctAnswer: 'Verify the answer with reliable sources before trusting it',
      explanation: 'AI output can be fluent but wrong, so verification is part of responsible use.',
      difficulty: 'hard',
    },
    {
      question: 'In supervised learning, what does the label usually represent?',
      options: ['The correct target answer the model should learn to predict', 'The color of the app interface', 'The name of the programmer only', 'A random ID with no meaning'],
      correctAnswer: 'The correct target answer the model should learn to predict',
      explanation: 'Labels are target outputs, such as spam/not spam or the correct class.',
      difficulty: 'hard',
    },
    {
      question: 'Which situation shows AI being used responsibly?',
      options: ['Explaining limitations, checking outputs, and protecting private data', 'Using any generated answer without review', 'Training on private data without consent', 'Hiding when AI is used in important decisions'],
      correctAnswer: 'Explaining limitations, checking outputs, and protecting private data',
      explanation: 'Responsible AI includes transparency, privacy, fairness, and human review.',
      difficulty: 'hard',
    },
  ];

  const genericQuestions = [
    {
      question: `What is the first thing you should master in ${topic}?`,
      options: ['The core definition and purpose', 'Only the heading', 'A random shortcut', 'The longest paragraph'],
      correctAnswer: 'The core definition and purpose',
      explanation: 'Definitions anchor examples, applications, and exam answers.',
      difficulty: 'easy',
    },
    {
      question: `Which study action best proves understanding of ${topic}?`,
      options: ['Solving a new question and explaining the reasoning', 'Reading the title once', 'Copying notes without thinking', 'Skipping examples'],
      correctAnswer: 'Solving a new question and explaining the reasoning',
      explanation: 'Transfer to a fresh question is stronger evidence than recognition.',
      difficulty: 'easy',
    },
    {
      question: `What should you do when you get a ${topic} question wrong?`,
      options: ['Record the mistake and revise the exact weak step', 'Ignore it and move ahead', 'Only change the subject', 'Assume the topic is impossible'],
      correctAnswer: 'Record the mistake and revise the exact weak step',
      explanation: 'Mistake analysis turns a wrong answer into a targeted revision task.',
      difficulty: 'medium',
    },
    {
      question: `Which option is a strong revision strategy for ${topic}?`,
      options: ['Recall first, then check notes', 'Look at the answer before trying', 'Study only when the test starts', 'Avoid practice questions'],
      correctAnswer: 'Recall first, then check notes',
      explanation: 'Active recall improves retention more than passive rereading.',
      difficulty: 'medium',
    },
    {
      question: `Why should confidence be tracked before answering ${topic} questions?`,
      options: ['It reveals overconfidence and uncertainty gaps', 'It replaces scoring completely', 'It makes all answers correct', 'It removes the need for revision'],
      correctAnswer: 'It reveals overconfidence and uncertainty gaps',
      explanation: 'Confidence plus correctness gives a better performance report.',
      difficulty: 'medium',
    },
    {
      question: `A student can define ${topic} but cannot solve examples. What is missing?`,
      options: ['Application practice', 'More highlighting only', 'A different username', 'Less feedback'],
      correctAnswer: 'Application practice',
      explanation: 'Definition knowledge must be converted into problem-solving skill.',
      difficulty: 'hard',
    },
    {
      question: `When should the study plan change for ${topic}?`,
      options: ['When test score or confidence shows weak mastery', 'Only after the exam is over', 'Never', 'Only when the topic name changes'],
      correctAnswer: 'When test score or confidence shows weak mastery',
      explanation: 'Adaptive planning should respond to measured performance.',
      difficulty: 'hard',
    },
    {
      question: `What score should trigger revision instead of moving ahead in this strict test?`,
      options: ['Below 75%', 'Exactly 100% only', 'Any score above 90%', 'Scores are ignored'],
      correctAnswer: 'Below 75%',
      explanation: 'The strict mastery gate is set at 75%. Below that, the plan adds revision.',
      difficulty: 'hard',
    },
  ];

  const questions = (isAi ? aiQuestions : genericQuestions).map((question, index) => ({
    ...question,
    type: 'mcq',
    difficulty: index < 2 ? 'easy' : index < 5 ? 'medium' : (question.difficulty || difficultyLevel || 'hard'),
    points: 10,
  }));

  return {
    title: `${topic} Mastery Test`,
    rules: [
      `Mode: ${personalityMode || 'balanced coach'}; answer before checking feedback.`,
      `Learning style: ${learningStyle || 'adaptive'}; use confidence ratings honestly.`,
      'A score below 75% marks this topic for revision and should change the plan.',
    ],
    passingScore: 75,
    xpPerCorrect: 10,
    negativeMarking: 2,
    timeLimitMinutes: 15,
    questions,
    rubric: {
      excellent: '90-100: strong mastery. Move to harder mixed practice.',
      pass: '75-89: acceptable mastery. Review mistakes once before moving on.',
      revise: 'Below 75: weak mastery. Add revision and practice to the study plan.',
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK GENERATORS (when Grok is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const buildFallbackStudyPlan = ({
  profile,
  learningReport,
  selectedSubjects,
  examName,
  availableHoursPerDay,
  weeksCount,
}) => {
  const minutesPerDay = Math.floor(availableHoursPerDay * 60);
  const weakSubjects = selectedSubjects.filter((s) => s.currentMarks < 60);
  const strongSubjects = selectedSubjects.filter((s) => s.currentMarks >= 60);

  const weeklyPlan = Array.from({ length: Math.min(weeksCount, 4) }, (_, wi) => {
    const weekNumber = wi + 1;
    const days = DAYS.map((dayLabel) => {
      const sessions = [];
      let remaining = minutesPerDay;

      // Prioritize weak subjects
      const prioritized = [...weakSubjects, ...strongSubjects];
      for (const sub of prioritized) {
        if (remaining <= 0) break;
        const dur = Math.min(60, remaining);
        const topic = sub.selectedTopics[wi % Math.max(1, sub.selectedTopics.length)] || sub.subjectName;
        sessions.push({
          subject: sub.subjectName,
          subjectSlug: sub.subjectSlug,
          topic,
          subtopic: '',
          durationMinutes: dur,
          sessionType: weekNumber <= 2 ? 'learn' : wi % 2 === 0 ? 'revise' : 'practice',
          difficultyLevel: weekNumber <= 2 ? 'easy' : weekNumber <= 3 ? 'medium' : 'hard',
          completed: false,
          skipped: false,
        });
        remaining -= dur;
      }

      return {
        dayLabel,
        totalMinutes: minutesPerDay - remaining,
        motivationalNote: `Keep going, ${profile.fullName}! Every session counts.`,
        sessions,
        completed: false,
        completionPercent: 0,
      };
    });

    return {
      weekNumber,
      weekLabel: `Week ${weekNumber} — ${weekNumber === 1 ? 'Foundation' : weekNumber === 2 ? 'Building' : weekNumber === 3 ? 'Practice' : 'Mastery'}`,
      focusSubjects: weakSubjects.slice(0, 2).map((s) => s.subjectName),
      weeklyGoal: `Complete ${weekNumber * 2} topics and score above ${Math.min(100, profile.currentCgpaOrPercentage + weekNumber * 5)}%`,
      totalHours: Math.round((minutesPerDay * 7) / 60),
      days,
      completionPercent: 0,
    };
  });

  return {
    planName: `${examName || 'Exam'} Study Plan`,
    aiSummary: `Personalized ${weeksCount}-week plan for ${profile.fullName}. Focuses on ${weakSubjects.map((s) => s.subjectName).join(', ') || 'all subjects'} with ${learningReport.preferredLearningStyle} content.`,
    aiRecommendations: [
      `Study ${availableHoursPerDay}h daily, prioritizing weak subjects first.`,
      `Use ${learningReport.preferredLearningStyle} resources for better retention.`,
      'Review previous week topics every Sunday.',
    ],
    weeklyPlan,
    monthlyRoadmap: [
      {
        month: 1,
        monthLabel: 'Month 1',
        goals: ['Complete all foundation topics', 'Score 10% higher in weak subjects'],
        revisionTopics: selectedSubjects.flatMap((s) => s.selectedTopics.slice(0, 2)),
        targetScores: Object.fromEntries(
          selectedSubjects.map((s) => [s.subjectSlug, Math.min(100, s.currentMarks + 15)])
        ),
        completionPercent: 0,
      },
    ],
  };
};

const buildStyleFallbackGuidance = (learningStyle, topic) => {
  const map = {
    'Visual Learner': `Create a one-page concept map: put ${topic} in the center, then add definition, example, formula/process, mistake, and memory cue branches.`,
    'Audio Learner': `Record yourself explaining ${topic} for two minutes, listen once, then correct any unclear sentence.`,
    'Reading/Writing Learner': `Write Cornell notes for ${topic}: cues on the left, explanation on the right, and a 4-line summary at the bottom.`,
    'Interactive Learner': `Turn ${topic} into a mini challenge: solve one example, make one flashcard, then teach the answer back without notes.`,
  };
  return map[learningStyle] || map['Reading/Writing Learner'];
};

const buildFallbackMaterial = ({ subject, topic, subtopic, learningStyle, difficultyLevel }) => ({
  content: `# ${topic}${subtopic ? ` - ${subtopic}` : ''}

## What You Must Understand
${topic} is an important part of ${subject}. Start with the definition, then connect it to one real example, one exam-style question, and one common mistake.

## Core Notes
- Definition: Write the meaning of ${topic} in your own words.
- Why it matters: This topic usually supports harder chapters and mixed questions.
- How to study it: Read the idea once, watch the dummy video, solve one example, then explain it aloud.
- Common mistake: Memorizing words without being able to apply the idea.
- Mastery signal: You can solve a fresh question and explain why the wrong options are wrong.

## Learning Style Path
${buildStyleFallbackGuidance(learningStyle, topic)}

## Daily Task
1. Read these notes for 10 minutes.
2. Make 5 flashcards.
3. Watch one dummy video resource.
4. Solve 3 practice questions.
5. Take the strict test and adapt the plan if you score below 75%.

## Summary
Master ${topic} by moving from definition to application. Do not mark this complete until you can explain it, solve a question, and identify your weak point.`,
  summary: `${topic} in ${subject} needs definition-level clarity plus applied practice. This fallback lesson gives notes, resources, flashcards, practice tasks, and a strict test path.`,
  keyPoints: [
    `Define ${topic} clearly before memorizing details`,
    `Connect ${topic} to at least one ${subject} example`,
    'Practice recall before looking at the answer',
    'Track mistakes because they decide the next plan change',
    'Use the strict test score as the mastery gate',
    'Retake weak topics after revision, not immediately',
    'Explain the concept aloud to expose gaps',
  ],
  estimatedReadMinutes: 18,
  visualMapData: {
    nodes: [
      { id: '1', label: topic, type: 'main' },
      { id: '2', label: 'Definition', type: 'sub' },
      { id: '3', label: 'Why it matters', type: 'sub' },
      { id: '4', label: 'Worked example', type: 'sub' },
      { id: '5', label: 'Common mistake', type: 'sub' },
      { id: '6', label: 'Exam question', type: 'detail' },
      { id: '7', label: 'Revision cue', type: 'detail' },
    ],
    edges: [
      { from: '1', to: '2', label: 'starts with' },
      { from: '1', to: '3', label: 'explains' },
      { from: '1', to: '4', label: 'applies through' },
      { from: '1', to: '5', label: 'avoid' },
      { from: '4', to: '6', label: 'becomes' },
      { from: '5', to: '7', label: 'fix with' },
    ],
  },
  flashcards: [
    { front: `Define ${topic} in one sentence.`, back: `${topic} is a key idea in ${subject}; write the exact class/textbook definition here.`, difficulty: 'easy' },
    { front: `Why is ${topic} important?`, back: `It connects foundation knowledge to applied ${subject} questions.`, difficulty: 'easy' },
    { front: `Give one example of ${topic}.`, back: 'Use a class example, then explain each step in your own words.', difficulty: 'medium' },
    { front: `What is a common mistake in ${topic}?`, back: 'Memorizing the label without knowing when and how to apply it.', difficulty: 'medium' },
    { front: `How do you prove mastery of ${topic}?`, back: 'Solve a new question, explain the reasoning, and score at least 75% on the strict test.', difficulty: 'hard' },
  ],
  quizQuestions: [
    {
      question: `What should you do first when learning ${topic}?`,
      options: ['Memorize random facts', 'Understand the definition', 'Skip to hard questions', 'Only watch videos'],
      correctAnswer: 'Understand the definition',
      explanation: 'A clear definition gives every example and practice question a base.',
      type: 'mcq',
    },
    {
      question: `Which action best proves you can apply ${topic}?`,
      options: ['Reading once', 'Solving a new problem correctly', 'Highlighting notes', 'Copying the heading'],
      correctAnswer: 'Solving a new problem correctly',
      explanation: 'Application requires using the idea in a fresh situation.',
      type: 'mcq',
    },
    {
      question: `True or False: Confidence should be tracked before the test, not after seeing answers.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Pre-answer confidence helps compare feeling versus actual performance.',
      type: 'true_false',
    },
    {
      question: `If you score below 75% on ${topic}, what should happen?`,
      options: ['Move ahead anyway', 'Delete the topic', 'Add revision/practice to the plan', 'Stop studying'],
      correctAnswer: 'Add revision/practice to the plan',
      explanation: 'The adaptive plan should slow down and repair weak mastery.',
      type: 'mcq',
    },
    {
      question: `What is the biggest risk while studying ${topic}?`,
      options: ['Too much sleep', 'Memorizing without application', 'Using examples', 'Taking notes'],
      correctAnswer: 'Memorizing without application',
      explanation: 'Most poor scores come from recognition without usable understanding.',
      type: 'mcq',
    },
  ],
  audioScript: `Welcome to your ${learningStyle} lesson on ${topic} in ${subject}. First, say the definition slowly. Now connect it to an example you have seen in class. Ask yourself: when would I use this, what mistake would I make, and how would I check my answer? After this lesson, you will take a strict test. Before each answer, rate your confidence from one to five. If your confidence is high but your answer is wrong, that becomes a priority revision point. If your score is below seventy-five percent, use the change-plan button so the schedule adds extra practice instead of pushing you forward too early.`,
  videoResources: [
    {
      title: `${topic} concept walkthrough`,
      url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      durationMinutes: 10,
      watchGoal: `Identify the definition, one example, and one common mistake for ${topic}.`,
    },
    {
      title: `${topic} practice demo`,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationMinutes: 8,
      watchGoal: 'Pause after each worked example and predict the next step first.',
    },
  ],
  practiceTasks: [
    {
      title: 'Explain it back',
      instruction: `Write a 6-line explanation of ${topic} without looking at the notes.`,
      expectedOutcome: 'Clear definition, one example, and one common mistake.',
    },
    {
      title: 'Apply it once',
      instruction: `Solve one textbook or class problem related to ${topic}.`,
      expectedOutcome: 'Correct final answer plus visible working steps.',
    },
    {
      title: 'Mistake log',
      instruction: 'Write one possible wrong answer and explain why it is wrong.',
      expectedOutcome: 'A short correction note you can revise before the test.',
    },
  ],
  sourceResources: [
    `${subject} class notes for ${topic}`,
    `${topic} textbook chapter or lecture PDF`,
    `${topic} practice worksheet`,
    'Dummy video resource: https://www.youtube.com/watch?v=ysz5S6PUM-U',
    'Dummy video resource: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ],
  codeExercises: [],
});
module.exports = {
  chatCompletion,
  parseJson,
  generateStudyPlan,
  generateLearningMaterial,
  generateAdaptiveRecommendations,
  generateRevisionContent,
  generateTopicTest,
};
