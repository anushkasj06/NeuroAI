const LearningSession = require('../models/LearningSession');
const AdaptiveQuestion = require('../models/AdaptiveQuestion');
const StudentAnswer = require('../models/StudentAnswer');
const ProgressReport = require('../models/ProgressReport');
const ConceptMastery = require('../models/ConceptMastery');
const TeachingHistory = require('../models/TeachingHistory');
const StudentProfile = require('../models/StudentProfile');
const LearningStyleReport = require('../models/LearningStyleReport');
const StudyPlan = require('../models/StudyPlan');
const TopicProgress = require('../models/TopicProgress');
const {
  generateTeachingSession,
  generateAdaptiveQuestion,
  analyzeStudentAnswer,
  generateProgressReport,
  modifyStudyPlan,
  modeFromStyle,
} = require('../services/adaptiveTeacherService');

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));

const getLearningContext = async (userId, { subjectSlug, topic }) => {
  const [profile, learningReport, plan, topicProgress, conceptMastery] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    LearningStyleReport.findOne({ userId }).lean(),
    StudyPlan.findOne({ userId, status: 'active' }),
    TopicProgress.findOne({ userId, subjectSlug, topic }).lean(),
    ConceptMastery.find({ userId, subjectSlug, topic }).lean(),
  ]);

  return { profile, learningReport, plan, topicProgress, conceptMastery };
};

exports.startTeachingSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      subject,
      subjectSlug,
      topic,
      subtopic = '',
      difficultyLevel,
      confidenceStart = 3,
      forceMode,
    } = req.body;

    if (!subject || !subjectSlug || !topic) {
      return res.status(400).json({ status: 'error', message: 'subject, subjectSlug, and topic are required' });
    }

    const { profile, learningReport, plan, topicProgress, conceptMastery } = await getLearningContext(userId, {
      subjectSlug,
      topic,
    });

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Complete onboarding before starting AI Teacher.' });
    }

    const selectedDifficulty =
      difficultyLevel ||
      topicProgress?.currentDifficulty ||
      (topicProgress?.masteryPercent < 45 ? 'easy' : topicProgress?.masteryPercent > 75 ? 'hard' : 'medium');

    const pastMistakes = conceptMastery.flatMap((item) => item.weakSignals || []).slice(0, 8);
    const aiSession = await generateTeachingSession({
      subject,
      topic,
      subtopic,
      difficultyLevel: selectedDifficulty,
      profile,
      learningReport,
      mastery: topicProgress,
      pastMistakes,
    });

    const activeTeachingMode = forceMode || aiSession.activeTeachingMode || modeFromStyle(learningReport?.preferredLearningStyle);
    const session = await LearningSession.create({
      userId,
      studyPlanId: plan?._id,
      subject,
      subjectSlug,
      topic,
      subtopic,
      learningStyle: learningReport?.preferredLearningStyle || 'Reading/Writing Learner',
      activeTeachingMode,
      difficultyLevel: aiSession.difficultyLevel || selectedDifficulty,
      teachingFlow: aiSession.teachingFlow || [],
      teacherPersona: aiSession.teacherPersona || 'warm expert teacher',
      masteryBefore: topicProgress?.masteryPercent || 0,
      confidenceStart: clamp(confidenceStart, 1, 5),
      confidenceEnd: clamp(confidenceStart, 1, 5),
      engagementScore: learningReport?.engagementScore || 60,
      attentionScore: /low|weak|poor/i.test(learningReport?.attentionLevel || '') ? 40 : 70,
      weakConcepts: aiSession.weakConcepts || [],
      strongConcepts: aiSession.strongConcepts || [],
      rawAiResponse: aiSession,
    });

    await TeachingHistory.create({
      userId,
      learningSessionId: session._id,
      subject,
      subjectSlug,
      topic,
      eventType: 'session_started',
      teachingMode: activeTeachingMode,
      difficultyLevel: session.difficultyLevel,
      summary: `Started adaptive AI Teacher session for ${topic}.`,
      metadata: { openingMessage: aiSession.openingMessage, revisionPoints: aiSession.revisionPoints },
    });

    await TopicProgress.findOneAndUpdate(
      { userId, subjectSlug, topic },
      {
        $set: {
          subject,
          subjectSlug,
          topic,
          subtopic,
          status: 'in_progress',
          startedAt: new Date(),
          currentDifficulty: session.difficultyLevel,
        },
      },
      { upsert: true }
    );

    res.status(201).json({
      status: 'success',
      data: {
        session,
        openingMessage: aiSession.openingMessage,
        revisionPoints: aiSession.revisionPoints || [],
        ttsScript: aiSession.ttsScript || '',
      },
    });
  } catch (error) {
    console.error('Start AI Teacher session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getTeachingSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await LearningSession.findOne({ _id: req.params.sessionId, userId }).lean();
    if (!session) return res.status(404).json({ status: 'error', message: 'Learning session not found' });

    const [questions, answers, report] = await Promise.all([
      AdaptiveQuestion.find({ learningSessionId: session._id }).sort({ questionNumber: 1 }).lean(),
      StudentAnswer.find({ learningSessionId: session._id }).sort({ createdAt: 1 }).lean(),
      session.finalReportId ? ProgressReport.findOne({ _id: session.finalReportId, userId }).lean() : null,
    ]);

    res.status(200).json({ status: 'success', data: { session, questions, answers, report } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.generateNextQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await LearningSession.findOne({ _id: req.params.sessionId, userId });
    if (!session) return res.status(404).json({ status: 'error', message: 'Learning session not found' });
    if (session.status !== 'active') {
      return res.status(400).json({ status: 'error', message: 'Session is not active' });
    }

    const [profile, learningReport, recentAnswers, previousQuestion, mastery, questionCount] = await Promise.all([
      StudentProfile.findOne({ userId }).lean(),
      LearningStyleReport.findOne({ userId }).lean(),
      StudentAnswer.find({ learningSessionId: session._id }).sort({ createdAt: 1 }).lean(),
      AdaptiveQuestion.findOne({ learningSessionId: session._id }).sort({ questionNumber: -1 }).lean(),
      TopicProgress.findOne({ userId, subjectSlug: session.subjectSlug, topic: session.topic }).lean(),
      AdaptiveQuestion.countDocuments({ learningSessionId: session._id }),
    ]);

    const questionNumber = questionCount + 1;
    const aiQuestion = await generateAdaptiveQuestion({
      session,
      profile,
      learningReport,
      recentAnswers,
      previousQuestion,
      mastery,
      questionNumber,
    });

    const question = await AdaptiveQuestion.create({
      userId,
      learningSessionId: session._id,
      subject: session.subject,
      subjectSlug: session.subjectSlug,
      topic: session.topic,
      subtopic: session.subtopic,
      conceptTag: aiQuestion.conceptTag || session.topic,
      questionNumber,
      type: aiQuestion.type || 'mcq',
      difficultyLevel: aiQuestion.difficultyLevel || session.difficultyLevel,
      prompt: aiQuestion.prompt,
      options: aiQuestion.options || [],
      correctAnswer: aiQuestion.correctAnswer || '',
      idealAnswer: aiQuestion.idealAnswer || '',
      hint: aiQuestion.hint || '',
      teacherPurpose: aiQuestion.teacherPurpose || '',
      expectedTimeSeconds: aiQuestion.expectedTimeSeconds || 90,
      generatedFrom: {
        previousAnswerQuality: recentAnswers[recentAnswers.length - 1]?.understandingLevel || 'not_available',
        previousConfidence: recentAnswers[recentAnswers.length - 1]?.confidence || 3,
        previousResponseTimeSeconds: recentAnswers[recentAnswers.length - 1]?.responseTimeSeconds || 0,
        weakConcepts: session.weakConcepts || [],
      },
      rawAiResponse: aiQuestion,
    });

    await TeachingHistory.create({
      userId,
      learningSessionId: session._id,
      subject: session.subject,
      subjectSlug: session.subjectSlug,
      topic: session.topic,
      eventType: 'question_generated',
      teachingMode: session.activeTeachingMode,
      difficultyLevel: question.difficultyLevel,
      summary: `Generated adaptive question ${questionNumber} for ${session.topic}.`,
      metadata: { conceptTag: question.conceptTag, teacherPurpose: question.teacherPurpose },
    });

    res.status(201).json({ status: 'success', data: { question } });
  } catch (error) {
    console.error('Generate adaptive question error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { answerText = '', selectedOption = '', confidence = 3, responseTimeSeconds = 0 } = req.body;
    const question = await AdaptiveQuestion.findOne({ _id: req.params.questionId, userId });
    if (!question) return res.status(404).json({ status: 'error', message: 'Question not found' });
    if (question.answered) return res.status(400).json({ status: 'error', message: 'Question already answered' });

    const session = await LearningSession.findOne({ _id: question.learningSessionId, userId });
    if (!session) return res.status(404).json({ status: 'error', message: 'Learning session not found' });

    const analysis = await analyzeStudentAnswer({
      session,
      question,
      answerText,
      selectedOption,
      confidence: clamp(confidence, 1, 5),
      responseTimeSeconds: Number(responseTimeSeconds) || 0,
    });

    const answer = await StudentAnswer.create({
      userId,
      learningSessionId: session._id,
      adaptiveQuestionId: question._id,
      answerText,
      selectedOption,
      confidence: clamp(confidence, 1, 5),
      responseTimeSeconds: Number(responseTimeSeconds) || 0,
      isCorrect: !!analysis.isCorrect,
      score: clamp(analysis.score),
      understandingLevel: analysis.understandingLevel || 'partial',
      feedback: analysis.feedback || '',
      misconceptionDetected: analysis.misconceptionDetected || '',
      nextTeachingAction: analysis.nextTeachingAction || 'continue',
      suggestedMode: analysis.suggestedMode || session.activeTeachingMode,
      rawAiResponse: analysis,
    });

    question.answered = true;
    await question.save();

    const oldMode = session.activeTeachingMode;
    const oldDifficulty = session.difficultyLevel;
    const suggestedDifficulty = analysis.suggestedDifficulty || session.difficultyLevel;
    const suggestedMode = analysis.suggestedMode || session.activeTeachingMode;

    session.weakConcepts = [...new Set([...(session.weakConcepts || []), ...(analysis.weakConcepts || [])])].slice(0, 12);
    session.strongConcepts = [...new Set([...(session.strongConcepts || []), ...(analysis.strongConcepts || [])])].slice(0, 12);
    session.confidenceEnd = answer.confidence;

    if (
      (analysis.nextTeachingAction === 'reteach' || analysis.nextTeachingAction === 'easier_question') &&
      suggestedMode !== session.activeTeachingMode
    ) {
      session.activeTeachingMode = suggestedMode;
      session.adaptationEvents.push({
        trigger: analysis.nextTeachingAction,
        change: `Switched teaching mode to ${suggestedMode}.`,
        fromMode: oldMode,
        toMode: suggestedMode,
        fromDifficulty: oldDifficulty,
        toDifficulty: suggestedDifficulty,
      });
    }

    if (suggestedDifficulty !== session.difficultyLevel) {
      session.difficultyLevel = suggestedDifficulty;
      session.adaptationEvents.push({
        trigger: answer.isCorrect ? 'strong_answer' : 'weak_answer',
        change: `Adjusted difficulty to ${suggestedDifficulty}.`,
        fromMode: oldMode,
        toMode: session.activeTeachingMode,
        fromDifficulty: oldDifficulty,
        toDifficulty: suggestedDifficulty,
      });
    }

    if (analysis.reteachBlock?.content) {
      session.teachingFlow.push({
        type: 'teacher_note',
        title: analysis.reteachBlock.title || 'Adaptive reteach',
        content: analysis.reteachBlock.content,
        mediaType: analysis.reteachBlock.mediaType || 'markdown',
        estimatedMinutes: 3,
      });
    }

    await session.save();

    await updateConceptMastery({ userId, session, question, answer, analysis });
    await updateTopicProgressFromAnswers({ userId, session });

    await TeachingHistory.create({
      userId,
      learningSessionId: session._id,
      subject: session.subject,
      subjectSlug: session.subjectSlug,
      topic: session.topic,
      eventType: 'answer_analyzed',
      teachingMode: session.activeTeachingMode,
      difficultyLevel: session.difficultyLevel,
      summary: analysis.feedback || `Analyzed answer for ${question.conceptTag}.`,
      metadata: { score: answer.score, nextTeachingAction: answer.nextTeachingAction },
    });

    res.status(200).json({
      status: 'success',
      data: {
        answer,
        analysis,
        sessionUpdate: {
          activeTeachingMode: session.activeTeachingMode,
          difficultyLevel: session.difficultyLevel,
          weakConcepts: session.weakConcepts,
          strongConcepts: session.strongConcepts,
          adaptationEvents: session.adaptationEvents,
        },
      },
    });
  } catch (error) {
    console.error('Submit adaptive answer error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.completeTeachingSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await LearningSession.findOne({ _id: req.params.sessionId, userId });
    if (!session) return res.status(404).json({ status: 'error', message: 'Learning session not found' });

    const [answers, previousReports, plan] = await Promise.all([
      StudentAnswer.find({ learningSessionId: session._id }).sort({ createdAt: 1 }).lean(),
      ProgressReport.find({ userId, subjectSlug: session.subjectSlug, topic: session.topic }).sort({ createdAt: -1 }).limit(3).lean(),
      StudyPlan.findOne({ userId, status: 'active' }),
    ]);

    const aiReport = await generateProgressReport({ session, answers, previousReports });
    const report = await ProgressReport.create({
      userId,
      learningSessionId: session._id,
      studyPlanId: plan?._id,
      subject: session.subject,
      subjectSlug: session.subjectSlug,
      topic: session.topic,
      summary: aiReport.summary || '',
      whatStudentLearned: aiReport.whatStudentLearned || [],
      conceptMastery: clamp(aiReport.conceptMastery),
      confidenceLevel: clamp(aiReport.confidenceLevel, 1, 5),
      quizAccuracy: clamp(aiReport.quizAccuracy),
      improvementFromPrevious: aiReport.improvementFromPrevious || '',
      strongAreas: aiReport.strongAreas || [],
      weakAreas: aiReport.weakAreas || [],
      recommendedNextSteps: aiReport.recommendedNextSteps || [],
      motivationFeedback: aiReport.motivationFeedback || '',
      planModification: aiReport.planModification || { required: false, reason: '', changes: [] },
      rawAiResponse: aiReport,
    });

    session.status = 'completed';
    session.masteryAfter = report.conceptMastery;
    session.confidenceEnd = report.confidenceLevel;
    session.finalReportId = report._id;
    session.completedAt = new Date();
    await session.save();

    const planUpdate = modifyStudyPlan({ plan, session, report });
    if (planUpdate.changed) {
      await planUpdate.plan.save();
      await TeachingHistory.create({
        userId,
        learningSessionId: session._id,
        subject: session.subject,
        subjectSlug: session.subjectSlug,
        topic: session.topic,
        eventType: 'plan_modified',
        teachingMode: session.activeTeachingMode,
        difficultyLevel: session.difficultyLevel,
        summary: report.planModification.reason,
        metadata: { changes: report.planModification.changes },
      });
    }

    await TopicProgress.findOneAndUpdate(
      { userId, subjectSlug: session.subjectSlug, topic: session.topic },
      {
        $set: {
          masteryPercent: report.conceptMastery,
          status: report.conceptMastery >= 75 ? 'completed' : 'needs_revision',
          lastQuizScore: report.quizAccuracy,
          currentDifficulty: report.conceptMastery >= 85 ? 'hard' : report.conceptMastery >= 55 ? 'medium' : 'easy',
          ...(report.conceptMastery >= 75 ? { completedAt: new Date() } : {}),
        },
        $inc: { sessionsCompleted: 1, totalStudyMinutes: 35 },
        $max: { bestQuizScore: report.quizAccuracy },
      },
      { upsert: true }
    );

    await TeachingHistory.create({
      userId,
      learningSessionId: session._id,
      subject: session.subject,
      subjectSlug: session.subjectSlug,
      topic: session.topic,
      eventType: 'session_completed',
      teachingMode: session.activeTeachingMode,
      difficultyLevel: session.difficultyLevel,
      summary: report.summary,
      metadata: { reportId: report._id, planChanged: planUpdate.changed },
    });

    res.status(200).json({ status: 'success', data: { session, report, planChanged: planUpdate.changed } });
  } catch (error) {
    console.error('Complete AI Teacher session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getLearningAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const [sessions, reports, mastery, answers] = await Promise.all([
      LearningSession.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      ProgressReport.find({ userId }).sort({ createdAt: -1 }).limit(12).lean(),
      ConceptMastery.find({ userId }).sort({ masteryPercent: 1 }).limit(30).lean(),
      StudentAnswer.find({ userId }).sort({ createdAt: -1 }).limit(80).lean(),
    ]);

    const completed = sessions.filter((session) => session.status === 'completed');
    const averageMastery = reports.length
      ? Math.round(reports.reduce((sum, report) => sum + (report.conceptMastery || 0), 0) / reports.length)
      : 0;
    const averageAccuracy = reports.length
      ? Math.round(reports.reduce((sum, report) => sum + (report.quizAccuracy || 0), 0) / reports.length)
      : 0;
    const answerAccuracy = answers.length
      ? Math.round((answers.filter((answer) => answer.isCorrect).length / answers.length) * 100)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalSessions: sessions.length,
          completedSessions: completed.length,
          averageMastery,
          averageAccuracy,
          answerAccuracy,
          activeSessions: sessions.filter((session) => session.status === 'active').length,
        },
        recentSessions: sessions,
        recentReports: reports,
        weakestConcepts: mastery.slice(0, 8),
        strongestConcepts: [...mastery].sort((a, b) => b.masteryPercent - a.masteryPercent).slice(0, 8),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getRevisionCenter = async (req, res) => {
  try {
    const userId = req.user._id;
    const [weakMastery, weakProgress, reports] = await Promise.all([
      ConceptMastery.find({ userId, masteryPercent: { $lt: 70 } }).sort({ masteryPercent: 1 }).limit(20).lean(),
      TopicProgress.find({ userId, status: 'needs_revision' }).sort({ updatedAt: -1 }).limit(20).lean(),
      ProgressReport.find({ userId, 'planModification.required': true }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        weakMastery,
        weakProgress,
        reports,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

async function updateConceptMastery({ userId, session, question, answer, analysis }) {
  const concept = question.conceptTag || session.topic;
  const existing = await ConceptMastery.findOne({ userId, subjectSlug: session.subjectSlug, topic: session.topic, concept });
  const attempts = (existing?.attempts || 0) + 1;
  const correctAttempts = (existing?.correctAttempts || 0) + (answer.isCorrect ? 1 : 0);
  const oldMastery = existing?.masteryPercent || session.masteryBefore || 0;
  const masteryPercent = Math.round(oldMastery * 0.65 + answer.score * 0.35);
  const confidenceAverage = Number((((existing?.confidenceAverage || 3) * (attempts - 1) + answer.confidence) / attempts).toFixed(1));

  await ConceptMastery.findOneAndUpdate(
    { userId, subjectSlug: session.subjectSlug, topic: session.topic, concept },
    {
      $set: {
        subject: session.subject,
        subjectSlug: session.subjectSlug,
        topic: session.topic,
        concept,
        masteryPercent,
        confidenceAverage,
        attempts,
        correctAttempts,
        lastTeachingMode: session.activeTeachingMode,
        nextReviewAt: new Date(Date.now() + (masteryPercent < 70 ? 24 : 72) * 60 * 60 * 1000),
      },
      $addToSet: {
        weakSignals: { $each: analysis.weakConcepts || [] },
        strongSignals: { $each: analysis.strongConcepts || [] },
      },
    },
    { upsert: true }
  );
}

async function updateTopicProgressFromAnswers({ userId, session }) {
  const answers = await StudentAnswer.find({ learningSessionId: session._id }).lean();
  if (!answers.length) return;

  const mastery = Math.round(answers.reduce((sum, answer) => sum + (answer.score || 0), 0) / answers.length);
  await TopicProgress.findOneAndUpdate(
    { userId, subjectSlug: session.subjectSlug, topic: session.topic },
    {
      $set: {
        subject: session.subject,
        subjectSlug: session.subjectSlug,
        topic: session.topic,
        subtopic: session.subtopic,
        masteryPercent: mastery,
        status: mastery >= 75 ? 'completed' : 'in_progress',
        lastQuizScore: mastery,
        currentDifficulty: mastery >= 85 ? 'hard' : mastery >= 55 ? 'medium' : 'easy',
      },
      $inc: { quizAttempts: 1 },
      $max: { bestQuizScore: mastery },
    },
    { upsert: true }
  );
}
