/**
 * InterviewAnalysisService
 * ========================
 * Evaluates a completed interview transcript using Groq LLM.
 *
 * Produces a comprehensive analysis including:
 * - Technical knowledge score (0-100)
 * - Communication score (0-100)
 * - Interview readiness score (0-100)
 * - Per-topic analysis
 * - Per-question evaluation
 * - Behavioral insights
 * - Improvement roadmap (immediate, 7-day, 30-day)
 * - Recommended learning resources
 * - Final overall score
 */

'use strict';

const { chatCompletion, parseJson } = require('../grokService');

const ANALYSIS_MODEL = process.env.INTERVIEW_GROQ_MODEL || 'llama-3.3-70b-versatile';

const ANALYSIS_SYSTEM = `You are an expert technical interview evaluator with 15+ years of experience 
at top tech companies (Google, Amazon, Microsoft, Meta).

Evaluate interview transcripts objectively and provide actionable, constructive feedback.
Return ONLY valid JSON — no markdown, no text outside the JSON object.
Be honest but encouraging. Base ALL scores strictly on what was said in the transcript.`;

/**
 * Build the analysis prompt from interview data.
 */
const buildAnalysisPrompt = ({ interview, transcript, questions, metrics }) => {
  const transcriptText = transcript
    .map((t) => `[${t.role.toUpperCase()}]: ${t.message}`)
    .join('\n');

  const questionsText = questions
    .map((q, i) => `Q${i + 1} (${q.category}, ${q.difficulty}): ${q.question}\n   Expected: ${q.expectedConcepts.join(', ')}`)
    .join('\n');

  return `Evaluate this complete technical interview and provide a detailed performance analysis.

INTERVIEW DETAILS:
- Title: ${interview.title}
- Type: ${interview.interviewType}
- Topics: ${interview.topics.join(', ')}
- Difficulty: ${interview.difficulty}
- Duration: ${interview.durationMinutes} minutes
- Actual Duration: ${Math.round((metrics.actualDurationSeconds || 0) / 60)} minutes

INTERVIEW QUESTIONS ASKED:
${questionsText}

PERFORMANCE METRICS:
- Total words spoken by candidate: ${metrics.totalWordCount || 0}
- Average response time (seconds): ${metrics.avgResponseSeconds || 0}
- Pause count: ${metrics.pauseCount || 0}

COMPLETE TRANSCRIPT:
${transcriptText}

Analyse the interview and return ONLY this exact JSON structure:

{
  "overallScore": <0-100 number>,
  "grade": "A+|A|B+|B|C+|C|D|F",
  "verdict": "Strong Hire|Hire|Weak Hire|No Hire",
  "executiveSummary": "3-4 sentence honest overall assessment",
  
  "scores": {
    "technicalKnowledge": {
      "score": <0-100>,
      "label": "Technical Knowledge",
      "breakdown": {
        "correctness": <0-100>,
        "depth": <0-100>,
        "understanding": <0-100>,
        "problemSolving": <0-100>
      },
      "comment": "specific comment on technical performance"
    },
    "communication": {
      "score": <0-100>,
      "label": "Communication",
      "breakdown": {
        "clarity": <0-100>,
        "confidence": <0-100>,
        "fluency": <0-100>,
        "explanationAbility": <0-100>
      },
      "comment": "specific comment on communication"
    },
    "interviewReadiness": {
      "score": <0-100>,
      "label": "Interview Readiness",
      "breakdown": {
        "structure": <0-100>,
        "professionalism": <0-100>,
        "confidence": <0-100>,
        "completeness": <0-100>
      },
      "comment": "specific comment on interview readiness"
    }
  },

  "topicAnalysis": [
    {
      "topic": "topic name",
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "missingConcepts": ["concept that should have been mentioned"],
      "comment": "brief topic-specific comment"
    }
  ],

  "questionEvaluations": [
    {
      "questionId": "q1",
      "question": "question text (shortened)",
      "candidateAnswerSummary": "brief summary of what candidate said",
      "score": <0-100>,
      "evaluation": "Excellent|Good|Adequate|Needs Work|No Answer",
      "strengths": ["what they did well"],
      "improvements": ["what they should have added or corrected"],
      "missedConcepts": ["concepts the ideal answer should include"]
    }
  ],

  "behavioralInsights": {
    "nervousnessLevel": "Low|Moderate|High",
    "confidenceLevel": "Low|Moderate|High|Very High",
    "hesitationPatterns": ["pattern observed"],
    "strongAreas": ["area of strength"],
    "communicationStyle": "concise|verbose|structured|scattered",
    "overallPersonality": "brief personality/style note for interview context"
  },

  "strengths": ["Top 5 specific strengths demonstrated in this interview"],
  "weaknesses": ["Top 5 specific areas that need improvement"],

  "improvementRoadmap": {
    "immediate": [
      "action to take this week"
    ],
    "sevenDay": {
      "goal": "7-day improvement goal",
      "tasks": ["specific daily task"]
    },
    "thirtyDay": {
      "goal": "30-day mastery goal",
      "milestones": ["week 1 milestone", "week 2 milestone", "week 3 milestone", "week 4 milestone"]
    }
  },

  "recommendedResources": [
    {
      "title": "Resource title",
      "type": "book|course|video|practice|website",
      "description": "why this is recommended",
      "url": "optional url or null",
      "priority": "high|medium|low"
    }
  ],

  "practiceQuestions": [
    {
      "question": "practice question to prepare for next time",
      "topic": "relevant topic",
      "difficulty": "easy|medium|hard",
      "hint": "brief hint for how to approach it"
    }
  ]
}`;
};

/**
 * Analyse a completed interview.
 * @param {object} params
 * @param {object} params.interview  - Interview document
 * @param {Array}  params.transcript - Transcript messages
 * @param {Array}  params.questions  - Generated question objects
 * @param {object} params.metrics    - Runtime metrics
 * @returns {Promise<object>} - Analysis result
 */
const analyseInterview = async ({ interview, transcript, questions, metrics }) => {
  if (!transcript || transcript.length < 2) {
    return buildMinimalAnalysis({ interview, questions });
  }

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: ANALYSIS_SYSTEM },
        {
          role: 'user',
          content: buildAnalysisPrompt({ interview, transcript, questions, metrics }),
        },
      ],
      {
        temperature: 0.3, // Low temperature for consistent evaluation
        maxTokens: 8000,
        groqModel: ANALYSIS_MODEL,
      }
    );

    const analysis = parseJson(text);

    // Validate and clamp all scores to 0-100
    const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
    analysis.overallScore = clamp(analysis.overallScore);
    if (analysis.scores) {
      for (const key of Object.keys(analysis.scores)) {
        if (analysis.scores[key]?.score != null) {
          analysis.scores[key].score = clamp(analysis.scores[key].score);
        }
      }
    }

    return analysis;
  } catch (err) {
    console.error('[InterviewAnalysisService] Analysis failed, using minimal fallback:', err.message);
    return buildMinimalAnalysis({ interview, questions });
  }
};

/**
 * Minimal fallback analysis when LLM fails or transcript is too short.
 */
const buildMinimalAnalysis = ({ interview, questions }) => {
  const baseScore = interview.difficulty === 'beginner' ? 55 : interview.difficulty === 'intermediate' ? 50 : 45;

  return {
    overallScore: baseScore,
    grade: 'C',
    verdict: 'Weak Hire',
    executiveSummary: `This interview covered ${interview.topics.join(', ')} at ${interview.difficulty} level. Analysis could not be fully completed due to insufficient transcript data. Please review the recording manually.`,
    scores: {
      technicalKnowledge: { score: baseScore, label: 'Technical Knowledge', breakdown: { correctness: baseScore, depth: baseScore, understanding: baseScore, problemSolving: baseScore }, comment: 'Insufficient data for detailed analysis.' },
      communication:      { score: baseScore, label: 'Communication', breakdown: { clarity: baseScore, confidence: baseScore, fluency: baseScore, explanationAbility: baseScore }, comment: 'Insufficient data for detailed analysis.' },
      interviewReadiness: { score: baseScore, label: 'Interview Readiness', breakdown: { structure: baseScore, professionalism: baseScore, confidence: baseScore, completeness: baseScore }, comment: 'Insufficient data for detailed analysis.' },
    },
    topicAnalysis: interview.topics.map((topic) => ({
      topic,
      score: baseScore,
      strengths: ['Participated in the interview'],
      weaknesses: ['More depth needed'],
      missingConcepts: [],
      comment: 'Full analysis not available.',
    })),
    questionEvaluations: (questions || []).slice(0, 5).map((q) => ({
      questionId: q.id,
      question: q.question.slice(0, 100),
      candidateAnswerSummary: 'No data',
      score: baseScore,
      evaluation: 'Adequate',
      strengths: [],
      improvements: ['Provide more detailed answers'],
      missedConcepts: q.expectedConcepts,
    })),
    behavioralInsights: {
      nervousnessLevel: 'Moderate',
      confidenceLevel: 'Moderate',
      hesitationPatterns: [],
      strongAreas: [],
      communicationStyle: 'structured',
      overallPersonality: 'Neutral',
    },
    strengths: ['Completed the interview', 'Engaged with questions'],
    weaknesses: ['Insufficient transcript data for detailed analysis'],
    improvementRoadmap: {
      immediate: ['Practice answering questions out loud', 'Record yourself and review'],
      sevenDay: { goal: 'Improve verbal communication', tasks: ['Daily 30-min mock interview practice'] },
      thirtyDay: { goal: 'Build confidence and depth', milestones: ['Complete 10 mock interviews', 'Study core topics deeply', 'Get peer feedback', 'Re-attempt this interview'] },
    },
    recommendedResources: [
      { title: 'Cracking the Coding Interview', type: 'book', description: 'Comprehensive technical interview preparation', url: null, priority: 'high' },
      { title: 'LeetCode', type: 'website', description: 'Practice algorithmic problems', url: 'https://leetcode.com', priority: 'high' },
    ],
    practiceQuestions: interview.topics.map((topic) => ({
      question: `Explain the core concepts of ${topic} and provide a real-world application example.`,
      topic,
      difficulty: interview.difficulty,
      hint: 'Start with definition, then example, then trade-offs.',
    })),
  };
};

module.exports = {
  analyseInterview,
};
