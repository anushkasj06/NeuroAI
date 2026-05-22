/**
 * Grok API service (OpenAI-compatible endpoint).
 * Uses the Groq cloud API: https://api.groq.com/openai/v1/chat/completions
 *
 * Set GROQ_API_KEY in backend/.env
 * Default model: llama-3.1-8b-instant  (fast, free-tier friendly)
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

/**
 * Core chat completion call.
 * @param {Array<{role,content}>} messages
 * @param {object} opts  - { model, temperature, maxTokens }
 * @returns {Promise<string>} raw text response
 */
const chatCompletion = async (messages, opts = {}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in backend/.env');
  }

  const body = {
    model: opts.model || DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens || 4096,
  };

  // fetch is native in Node 18+. For older Node versions the fallback
  // generators will be used automatically when this throws.
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

Generate at least: 3 sourceResources, 3 flashcards, 3 quiz questions, 5 key points.
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

const buildFallbackMaterial = ({ subject, topic, subtopic, learningStyle, difficultyLevel }) => ({
  content: `# ${topic}${subtopic ? ` — ${subtopic}` : ''}\n\nThis is an introduction to **${topic}** in ${subject}.\n\n## Key Concepts\n\n- Understand the fundamentals of ${topic}\n- Apply concepts to solve problems\n- Practice with examples\n\n## Summary\n\n${topic} is a core concept in ${subject}. Master it through regular practice.`,
  summary: `${topic} is a fundamental concept in ${subject}. Understanding it well will improve your overall performance.`,
  keyPoints: [
    `${topic} is a core concept in ${subject}`,
    'Regular practice improves mastery',
    'Connect concepts to real-world examples',
    'Review previous topics before advancing',
    'Test yourself with practice questions',
  ],
  estimatedReadMinutes: 10,
  visualMapData: {
    nodes: [
      { id: '1', label: topic, type: 'main' },
      { id: '2', label: 'Definition', type: 'sub' },
      { id: '3', label: 'Applications', type: 'sub' },
      { id: '4', label: 'Examples', type: 'detail' },
    ],
    edges: [
      { from: '1', to: '2', label: 'has' },
      { from: '1', to: '3', label: 'used in' },
      { from: '3', to: '4', label: 'includes' },
    ],
  },
  flashcards: [
    { front: `What is ${topic}?`, back: `${topic} is a key concept in ${subject}.`, difficulty: 'easy' },
    { front: `Why is ${topic} important?`, back: 'It forms the foundation for advanced topics.', difficulty: 'medium' },
    { front: `Give an example of ${topic}`, back: 'Practice with textbook examples.', difficulty: 'hard' },
  ],
  quizQuestions: [
    {
      question: `Which of the following best describes ${topic}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: `${topic} is best described by Option A based on its definition.`,
      type: 'mcq',
    },
    {
      question: `True or False: ${topic} is important in ${subject}.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `${topic} is indeed a core part of ${subject}.`,
      type: 'true_false',
    },
    {
      question: `In one sentence, explain ${topic}.`,
      options: [],
      correctAnswer: `${topic} is a fundamental concept in ${subject} that requires understanding and practice.`,
      explanation: '',
      type: 'short',
    },
  ],
  audioScript: `Welcome to your ${learningStyle} lesson on ${topic} in ${subject}. Today we're going to explore this important concept together. ${topic} is one of the key areas you need to master. Let's start with the basics and build up your understanding step by step. Remember, the more you practice, the better you'll get. Let's dive in!`,
  codeExercises: [],
});

module.exports = {
  chatCompletion,
  parseJson,
  generateStudyPlan,
  generateLearningMaterial,
  generateAdaptiveRecommendations,
  generateRevisionContent,
};
