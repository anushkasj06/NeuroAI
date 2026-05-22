const { GoogleGenerativeAI } = require('@google/generative-ai');

const DIAGNOSTIC_SYSTEM_PROMPT = `You are an expert educational psychologist and learning analytics AI for a personalized learning platform called NeuroLearn AI.

Analyze student diagnostic data and return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "preferredLearningStyle": "Visual Learner" | "Audio Learner" | "Reading/Writing Learner" | "Interactive Learner",
  "strongestLearningMode": "text" | "audio" | "video",
  "weakestLearningMode": "text" | "audio" | "video",
  "attentionLevel": "string",
  "attentionBehavior": "string",
  "engagementAnalysis": "string",
  "confidenceLevel": "Low" | "Moderate" | "High",
  "studyConsistencyAnalysis": "string",
  "recommendedTeachingApproach": "string",
  "recommendedTeachingFormat": "string",
  "likelyWeakAreas": ["string"],
  "personalizedInsights": ["string", "string", "string"],
  "motivationalFeedback": "string",
  "estimatedImprovementPotential": "string",
  "aiGeneratedSummary": "string (2-3 sentences)"
}`;

const buildAnalysisPrompt = (profile, assessment, subjects, numericInsights) => {
  return `${DIAGNOSTIC_SYSTEM_PROMPT}

STUDENT PROFILE:
- Name: ${profile.fullName}, Age: ${profile.age}
- Education: ${profile.educationLevel}
- Target: ${profile.targetPercentage}%, Current: ${profile.currentCgpaOrPercentage}%
- Study hours/day: ${profile.studyHoursPerDay}, Sleep: ${profile.sleepHours}h, Screen: ${profile.screenTimeHours}h
- Exam deadline: ${profile.examDeadline}

SUBJECTS:
${subjects.map((s) => `- ${s.subjectName}: ${s.currentMarks}%`).join('\n')}

ASSESSMENT RESULTS:
Text — accuracy ${assessment.textMode.accuracyPercent}%, avg response ${assessment.textMode.avgResponseTimeMs}ms, reading time ${assessment.textMode.readingOrWatchTimeSeconds}s
Audio — accuracy ${assessment.audioMode.accuracyPercent}%, replays ${assessment.audioMode.replayCount}, listening ${assessment.audioMode.listeningDurationSeconds}s
Video — accuracy ${assessment.videoMode.accuracyPercent}%, pauses ${assessment.videoMode.pauseCount}, skips ${assessment.videoMode.skipCount}, watch ${assessment.videoMode.readingOrWatchTimeSeconds}s

PRE-COMPUTED SCORES:
${JSON.stringify(numericInsights, null, 2)}`;
};

const parseAiJson = (text) => {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
};

const generateAiDiagnosticReport = async (profile, assessment, subjects, numericInsights) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallbackReport(profile, numericInsights);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = buildAnalysisPrompt(profile, assessment, subjects, numericInsights);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseAiJson(text);
    return { ...parsed, rawAiResponse: parsed };
  } catch (error) {
    console.error('Gemini analysis failed:', error.message);
    return buildFallbackReport(profile, numericInsights);
  }
};

const buildFallbackReport = (profile, numericInsights) => ({
  preferredLearningStyle: numericInsights.preferredLearningStyle,
  strongestLearningMode: numericInsights.strongestLearningMode,
  weakestLearningMode: numericInsights.weakestLearningMode,
  attentionLevel: numericInsights.attentionLevel,
  attentionBehavior: `Based on screen time (${profile.screenTimeHours}h) and sleep (${profile.sleepHours}h), focus patterns suggest structured study blocks.`,
  engagementAnalysis: `Engagement score: ${numericInsights.engagementScore}/100 across text, audio, and video assessments.`,
  confidenceLevel:
    numericInsights.engagementScore > 70
      ? 'High'
      : numericInsights.engagementScore > 45
        ? 'Moderate'
        : 'Low',
  studyConsistencyAnalysis: `With ${profile.studyHoursPerDay} hours/day available, consistency will depend on reducing screen time and protecting sleep.`,
  recommendedTeachingApproach: `Prioritize ${numericInsights.preferredLearningStyle} content with mixed-modality revision.`,
  recommendedTeachingFormat: `Lead with ${numericInsights.strongestLearningMode} lessons; reinforce weak ${numericInsights.weakestLearningMode} mode with shorter sessions.`,
  likelyWeakAreas: numericInsights.subjectWeaknesses.map((w) => w.subject),
  personalizedInsights: [
    `Your strongest learning mode is ${numericInsights.strongestLearningMode}.`,
    `Target ${profile.targetPercentage}% by your exam date with daily ${numericInsights.recommendedStudyHours}h study blocks.`,
    'Complete weekly practice quizzes in weaker subjects.',
  ],
  motivationalFeedback: `Great start, ${profile.fullName}! Your diagnostic shows clear strengths — stay consistent and you can reach your goals.`,
  estimatedImprovementPotential: `Estimated ${Math.min(25, 100 - profile.currentCgpaOrPercentage)}% improvement possible before your deadline with focused practice.`,
  aiGeneratedSummary: `Diagnostic complete. Preferred style: ${numericInsights.preferredLearningStyle}. Focus on ${numericInsights.weakestLearningMode} reinforcement.`,
  rawAiResponse: null,
});

module.exports = {
  generateAiDiagnosticReport,
  buildAnalysisPrompt,
};
