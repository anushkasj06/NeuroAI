const StudyPlan = require('../models/StudyPlan');
const TopicProgress = require('../models/TopicProgress');
const AIRecommendation = require('../models/AIRecommendation');
const StudentProfile = require('../models/StudentProfile');
const SubjectPerformance = require('../models/SubjectPerformance');
const LearningStyleReport = require('../models/LearningStyleReport');
const { generateStudyPlan, generateAdaptiveRecommendations } = require('../services/grokService');

// ── Generate / regenerate study plan ─────────────────────────────────────────
exports.generatePlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      selectedSubjects,   // [{ subjectSlug, subjectName, currentMarks, targetMarks, selectedTopics }]
      examName,
      examDeadline,
      availableHoursPerDay,
    } = req.body;

    if (!selectedSubjects?.length) {
      return res.status(400).json({ status: 'error', message: 'Select at least one subject' });
    }
    if (!examDeadline) {
      return res.status(400).json({ status: 'error', message: 'Exam deadline is required' });
    }

    const [profile, learningReport, subjects] = await Promise.all([
      StudentProfile.findOne({ userId }),
      LearningStyleReport.findOne({ userId }),
      SubjectPerformance.find({ userId }),
    ]);

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Complete onboarding first' });
    }
    if (!learningReport) {
      return res.status(404).json({ status: 'error', message: 'Complete diagnostic assessment first' });
    }

    const hoursPerDay = availableHoursPerDay || profile.studyHoursPerDay;

    // Generate via Grok (with fallback)
    const aiPlan = await generateStudyPlan({
      profile,
      learningReport,
      subjects,
      selectedSubjects,
      examName: examName || 'Exam',
      examDeadline,
      availableHoursPerDay: hoursPerDay,
    });

    // Attach dates to daily plans
    const startDate = new Date();
    const weeklyPlanWithDates = (aiPlan.weeklyPlan || []).map((week, wi) => {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + wi * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const days = (week.days || []).map((day, di) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + di);
        return { ...day, date };
      });

      return { ...week, startDate: weekStart, endDate: weekEnd, days };
    });

    // Deactivate any existing active plan
    await StudyPlan.updateMany({ userId, status: 'active' }, { status: 'archived' });

    const totalPlannedHours = weeklyPlanWithDates.reduce((sum, w) => sum + (w.totalHours || 0), 0);

    const plan = await StudyPlan.create({
      userId,
      studentProfileId: profile._id,
      learningStyleReportId: learningReport._id,
      planName: aiPlan.planName || `${examName || 'Exam'} Study Plan`,
      status: 'active',
      generatedByAI: true,
      learningStyle: learningReport.preferredLearningStyle,
      targetScore: profile.targetPercentage,
      currentScore: profile.currentCgpaOrPercentage,
      availableHoursPerDay: hoursPerDay,
      examDeadline: new Date(examDeadline),
      examName: examName || 'Exam',
      selectedSubjects,
      weeklyPlan: weeklyPlanWithDates,
      monthlyRoadmap: aiPlan.monthlyRoadmap || [],
      aiSummary: aiPlan.aiSummary || '',
      aiRecommendations: aiPlan.aiRecommendations || [],
      totalPlannedHours,
      rawAiResponse: aiPlan,
    });

    // Seed TopicProgress for each selected topic
    const progressDocs = [];
    for (const sub of selectedSubjects) {
      for (const topic of sub.selectedTopics || []) {
        progressDocs.push({
          userId,
          studyPlanId: plan._id,
          subject: sub.subjectName,
          subjectSlug: sub.subjectSlug,
          topic,
          subtopic: '',
          masteryPercent: 0,
          status: 'not_started',
          currentDifficulty: sub.currentMarks < 50 ? 'easy' : sub.currentMarks < 75 ? 'medium' : 'hard',
        });
      }
    }

    if (progressDocs.length > 0) {
      await TopicProgress.insertMany(progressDocs, { ordered: false }).catch(() => {});
    }

    res.status(201).json({ status: 'success', data: { plan } });
  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Get active study plan ─────────────────────────────────────────────────────
exports.getActivePlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const plan = await StudyPlan.findOne({ userId, status: 'active' }).lean();

    if (!plan) {
      return res.status(404).json({ status: 'error', message: 'No active study plan found' });
    }

    res.status(200).json({ status: 'success', data: { plan } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Get all plans for user ────────────────────────────────────────────────────
exports.getAllPlans = async (req, res) => {
  try {
    const userId = req.user._id;
    const plans = await StudyPlan.find({ userId })
      .select('planName status examName examDeadline totalPlannedHours overallCompletionPercent createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ status: 'success', data: { plans } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Mark a session complete ───────────────────────────────────────────────────
exports.completeSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId, weekNumber, dayLabel, sessionId } = req.body;

    const plan = await StudyPlan.findOne({ _id: planId, userId });
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found' });

    const week = plan.weeklyPlan.find((w) => w.weekNumber === weekNumber);
    if (!week) return res.status(404).json({ status: 'error', message: 'Week not found' });

    const day = week.days.find((d) => d.dayLabel === dayLabel);
    if (!day) return res.status(404).json({ status: 'error', message: 'Day not found' });

    const session = day.sessions.id(sessionId);
    if (!session) return res.status(404).json({ status: 'error', message: 'Session not found' });

    session.completed = true;
    session.completedAt = new Date();

    // Recalculate day completion
    const completedSessions = day.sessions.filter((s) => s.completed).length;
    day.completionPercent = Math.round((completedSessions / day.sessions.length) * 100);
    day.completed = day.completionPercent === 100;

    // Recalculate week completion
    const totalSessions = week.days.reduce((sum, d) => sum + d.sessions.length, 0);
    const totalCompleted = week.days.reduce(
      (sum, d) => sum + d.sessions.filter((s) => s.completed).length,
      0
    );
    week.completionPercent = Math.round((totalCompleted / Math.max(1, totalSessions)) * 100);

    // Overall plan completion
    const allSessions = plan.weeklyPlan.flatMap((w) => w.days.flatMap((d) => d.sessions));
    const allCompleted = allSessions.filter((s) => s.completed).length;
    plan.overallCompletionPercent = Math.round((allCompleted / Math.max(1, allSessions.length)) * 100);
    plan.totalCompletedHours = Math.round((allCompleted * 45) / 60); // avg 45 min per session
    plan.lastStudiedAt = new Date();

    // Update streak
    const today = new Date().toDateString();
    const lastStudied = plan.lastStudiedAt ? new Date(plan.lastStudiedAt).toDateString() : null;
    if (lastStudied !== today) {
      plan.currentStreak = (plan.currentStreak || 0) + 1;
      plan.longestStreak = Math.max(plan.longestStreak || 0, plan.currentStreak);
    }

    await plan.save();

    // Update TopicProgress
    await TopicProgress.findOneAndUpdate(
      { userId, subjectSlug: session.subjectSlug, topic: session.topic },
      {
        $inc: { totalStudyMinutes: session.durationMinutes, sessionsCompleted: 1 },
        $set: { status: 'in_progress', startedAt: new Date() },
      },
      { upsert: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        dayCompletionPercent: day.completionPercent,
        weekCompletionPercent: week.completionPercent,
        overallCompletionPercent: plan.overallCompletionPercent,
        currentStreak: plan.currentStreak,
      },
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Dashboard analytics ───────────────────────────────────────────────────────
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [plan, profile, learningReport, subjects, topicProgress, recommendations] =
      await Promise.all([
        StudyPlan.findOne({ userId, status: 'active' }).lean(),
        StudentProfile.findOne({ userId }).lean(),
        LearningStyleReport.findOne({ userId }).lean(),
        SubjectPerformance.find({ userId }).lean(),
        TopicProgress.find({ userId }).lean(),
        AIRecommendation.find({ userId, dismissed: false, seen: false })
          .sort({ priority: -1, createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    // Today's sessions
    const today = new Date().toDateString();
    let todaySessions = [];
    let todayCompletionPercent = 0;

    if (plan) {
      for (const week of plan.weeklyPlan || []) {
        for (const day of week.days || []) {
          if (day.date && new Date(day.date).toDateString() === today) {
            todaySessions = day.sessions || [];
            todayCompletionPercent = day.completionPercent || 0;
            break;
          }
        }
      }
    }

    // Subject mastery from topic progress
    const subjectMastery = {};
    for (const tp of topicProgress) {
      if (!subjectMastery[tp.subjectSlug]) {
        subjectMastery[tp.subjectSlug] = { total: 0, sum: 0, name: tp.subject };
      }
      subjectMastery[tp.subjectSlug].total += 1;
      subjectMastery[tp.subjectSlug].sum += tp.masteryPercent;
    }

    const subjectMasteryList = Object.entries(subjectMastery).map(([slug, data]) => ({
      subjectSlug: slug,
      subjectName: data.name,
      masteryPercent: Math.round(data.sum / Math.max(1, data.total)),
    }));

    // Weak topics (mastery < 50%)
    const weakTopics = topicProgress
      .filter((tp) => tp.masteryPercent < 50 && tp.status !== 'not_started')
      .sort((a, b) => a.masteryPercent - b.masteryPercent)
      .slice(0, 5);

    // Days until exam
    const daysUntilExam = plan?.examDeadline
      ? Math.max(0, Math.ceil((new Date(plan.examDeadline) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    res.status(200).json({
      status: 'success',
      data: {
        // Learning profile
        learningStyle: learningReport?.preferredLearningStyle || null,
        engagementScore: learningReport?.engagementScore || 0,
        confidenceLevel: learningReport?.confidenceLevel || 'Moderate',
        attentionLevel: learningReport?.attentionLevel || '',
        recommendedStudyHours: learningReport?.recommendedStudyHours || profile?.studyHoursPerDay || 2,
        motivationalFeedback: learningReport?.motivationalFeedback || '',
        estimatedImprovementPotential: learningReport?.estimatedImprovementPotential || '',
        personalizedInsights: learningReport?.personalizedInsights || [],
        modalityScores: learningReport?.modalityScores || {},

        // Subject performance
        subjects: subjects.map((s) => ({
          subjectSlug: s.subjectSlug,
          subjectName: s.subjectName,
          currentMarks: s.currentMarks,
        })),
        subjectStrengths: learningReport?.subjectStrengths || [],
        subjectWeaknesses: learningReport?.subjectWeaknesses || [],
        subjectMastery: subjectMasteryList,
        weakTopics,

        // Study plan
        hasPlan: !!plan,
        planName: plan?.planName || null,
        overallCompletionPercent: plan?.overallCompletionPercent || 0,
        currentStreak: plan?.currentStreak || 0,
        longestStreak: plan?.longestStreak || 0,
        totalPlannedHours: plan?.totalPlannedHours || 0,
        totalCompletedHours: plan?.totalCompletedHours || 0,
        daysUntilExam,
        examName: plan?.examName || null,

        // Today
        todaySessions,
        todayCompletionPercent,

        // Profile
        targetScore: profile?.targetPercentage || 0,
        currentScore: profile?.currentCgpaOrPercentage || 0,

        // Recommendations
        recommendations,
      },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Generate adaptive recommendations ────────────────────────────────────────
exports.generateRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    const [profile, learningReport, plan, topicProgress] = await Promise.all([
      StudentProfile.findOne({ userId }),
      LearningStyleReport.findOne({ userId }),
      StudyPlan.findOne({ userId, status: 'active' }),
      TopicProgress.find({ userId }).lean(),
    ]);

    if (!profile || !learningReport) {
      return res.status(404).json({ status: 'error', message: 'Complete diagnostic first' });
    }

    const recentProgress = {
      overallCompletion: plan?.overallCompletionPercent || 0,
      currentStreak: plan?.currentStreak || 0,
      weakTopics: topicProgress.filter((t) => t.masteryPercent < 50).map((t) => t.topic),
      completedTopics: topicProgress.filter((t) => t.status === 'completed').length,
    };

    const result = await generateAdaptiveRecommendations({
      profile,
      learningReport,
      recentProgress,
      studyPlan: plan,
    });

    // Save recommendations to DB
    const docs = (result.recommendations || []).map((r) => ({
      userId,
      studyPlanId: plan?._id,
      ...r,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }));

    if (docs.length > 0) {
      await AIRecommendation.insertMany(docs);
    }

    res.status(200).json({ status: 'success', data: { recommendations: result.recommendations } });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Dismiss recommendation ────────────────────────────────────────────────────
exports.dismissRecommendation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    await AIRecommendation.findOneAndUpdate({ _id: id, userId }, { dismissed: true, seen: true, seenAt: new Date() });
    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Update topic progress ─────────────────────────────────────────────────────
exports.updateTopicProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subjectSlug, topic, masteryPercent, status, quizScore } = req.body;

    const update = {
      $set: { masteryPercent, status },
    };

    if (quizScore !== undefined) {
      update.$inc = { quizAttempts: 1 };
      update.$set.lastQuizScore = quizScore;
      update.$max = { bestQuizScore: quizScore };
    }

    if (status === 'completed') {
      update.$set.completedAt = new Date();
    }

    // Adaptive difficulty
    if (masteryPercent >= 80) {
      update.$set.currentDifficulty = 'hard';
    } else if (masteryPercent >= 50) {
      update.$set.currentDifficulty = 'medium';
    } else {
      update.$set.currentDifficulty = 'easy';
    }

    const progress = await TopicProgress.findOneAndUpdate(
      { userId, subjectSlug, topic },
      update,
      { new: true, upsert: true }
    );

    res.status(200).json({ status: 'success', data: { progress } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Get topic progress ────────────────────────────────────────────────────────
exports.getTopicProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subjectSlug } = req.query;

    const filter = { userId };
    if (subjectSlug) filter.subjectSlug = subjectSlug;

    const progress = await TopicProgress.find(filter).lean();
    res.status(200).json({ status: 'success', data: { progress } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
