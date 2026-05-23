const User = require('../models/User');
const QuizAnswer = require('../models/QuizAnswer');
const QuizMarks = require('../models/QuizMarks');
const RapidBattleAttempt = require('../models/RapidBattleAttempt');
const StudentProfile = require('../models/StudentProfile');
const SubjectPerformance = require('../models/SubjectPerformance');
const DiagnosticAssessment = require('../models/DiagnosticAssessment');
const LearningStyleReport = require('../models/LearningStyleReport');
const TeacherResource = require('../models/TeacherResource');
const TopicProgress = require('../models/TopicProgress');
const ConceptMastery = require('../models/ConceptMastery');
const LearningSession = require('../models/LearningSession');
const StudyPlan = require('../models/StudyPlan');
const StudentAnswer = require('../models/StudentAnswer');

const LEGACY_SUBJECT_NAMES = {
  ads: 'Advanced Data Structures',
  ds: 'Data Structures',
  am: 'Applied Mathematics',
  java: 'Java Programming',
  dbms: 'Database Management Systems',
};

const toId = (value) => value?.toString();

const average = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
};

const getBucket = (score) => {
  if (score >= 75) return 'mastered';
  if (score >= 55) return 'developing';
  return 'needs-work';
};

const getStatus = ({ masteryAverage, battleAverage, attentionLevel, declining }) => {
  const lowAttention = /low|poor|weak|risk/i.test(attentionLevel || '');
  if (masteryAverage < 50 || battleAverage < 45 || declining) return 'Struggling';
  if (masteryAverage < 65 || battleAverage < 60 || lowAttention) return 'At Risk';
  return 'On Track';
};

const getDecliningTrend = (attempts) => {
  if (attempts.length < 3) return false;
  const latest = [...attempts]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-3)
    .map((attempt) => Number(attempt.accuracy) || 0);
  return latest[0] > latest[1] && latest[1] > latest[2];
};

const buildLegacySubjectMastery = (quizAnswer) => {
  if (!quizAnswer?.subjects) return [];
  return Object.entries(quizAnswer.subjects).map(([slug, data]) => ({
    subjectSlug: slug,
    subjectName: LEGACY_SUBJECT_NAMES[slug] || slug.toUpperCase(),
    score: Number(data?.marks) || 0,
    bucket: getBucket(Number(data?.marks) || 0),
  }));
};

const buildDiagnosticMastery = (subjects) =>
  subjects.map((subject) => ({
    subjectSlug: subject.subjectSlug,
    subjectName: subject.subjectName,
    score: Number(subject.currentMarks) || 0,
    bucket: getBucket(Number(subject.currentMarks) || 0),
  }));

const buildQuizTimeline = ({ quizMarks, rapidAttempts }) => {
  const marksTimeline = quizMarks.map((item) => ({
    type: 'Quiz',
    label: item.subject?.toUpperCase() || 'Quiz',
    score: Number(item.marks) || 0,
    correctAnswers: item.correctAnswers,
    totalQuestions: item.totalQuestions,
    date: item.date || item.createdAt,
  }));

  const battleTimeline = rapidAttempts.map((item) => ({
    type: 'Battle',
    label: item.topic,
    score: Number(item.accuracy) || 0,
    correctAnswers: item.correctAnswers,
    totalQuestions: item.questionCount,
    date: item.createdAt,
  }));

  return [...marksTimeline, ...battleTimeline]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10);
};

const buildAttentionTrend = (assessment, report, profile, legacyQuiz) => {
  const modalityScores = report?.modalityScores || {};
  const assessmentScores = [
    { label: 'Text', score: Number(modalityScores.text ?? assessment?.textMode?.accuracyPercent) || 0 },
    { label: 'Audio', score: Number(modalityScores.audio ?? assessment?.audioMode?.accuracyPercent) || 0 },
    { label: 'Video', score: Number(modalityScores.video ?? assessment?.videoMode?.accuracyPercent) || 0 },
  ];

  const sleepHours = Number(profile?.sleepHours ?? legacyQuiz?.sleepTime) || 0;
  const screenTime = Number(profile?.screenTimeHours ?? legacyQuiz?.screenTime) || 0;
  const focusReadiness = Math.max(0, Math.min(100, 70 + sleepHours * 4 - screenTime * 3));

  return {
    attentionLevel: report?.attentionLevel || (focusReadiness >= 70 ? 'Stable' : 'Needs support'),
    engagementScore: Number(report?.engagementScore) || average(assessmentScores.map((item) => item.score)),
    focusReadiness: Number(focusReadiness.toFixed(1)),
    modalityScores: assessmentScores,
  };
};

// ── Main dashboard endpoint ───────────────────────────────────────────────────
exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const [
      users,
      profiles,
      reports,
      assessments,
      subjectPerformances,
      legacyQuizAnswers,
      quizMarks,
      rapidAttempts,
      resources,
      allTopicProgress,
      allConceptMastery,
      allSessions,
      allPlans,
    ] = await Promise.all([
      User.find({ role: 'student', assignedTeacherId: teacherId })
        .select('name email role assignedTeacherId createdAt').lean(),
      StudentProfile.find().lean(),
      LearningStyleReport.find().lean(),
      DiagnosticAssessment.find().lean(),
      SubjectPerformance.find().lean(),
      QuizAnswer.find().lean(),
      QuizMarks.find().sort({ date: 1 }).lean(),
      RapidBattleAttempt.find().sort({ createdAt: 1 }).lean(),
      TeacherResource.find({ teacherId }).sort({ createdAt: -1 }).limit(20).lean(),
      TopicProgress.find().lean(),
      ConceptMastery.find().lean(),
      LearningSession.find().sort({ createdAt: -1 }).lean(),
      StudyPlan.find({ status: 'active' }).lean(),
    ]);

    // Build per-user lookup maps
    const byUser = (items) =>
      items.reduce((map, item) => {
        const key = toId(item.userId);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
        return map;
      }, new Map());

    const profileByUser = new Map(profiles.map((item) => [toId(item.userId), item]));
    const reportByUser = new Map(reports.map((item) => [toId(item.userId), item]));
    const assessmentByUser = new Map(assessments.map((item) => [toId(item.userId), item]));
    const legacyQuizByUser = new Map(legacyQuizAnswers.map((item) => [toId(item.userId), item]));
    const subjectsByUser = byUser(subjectPerformances);
    const quizMarksByUser = byUser(quizMarks);
    const rapidByUser = byUser(rapidAttempts);
    const topicProgressByUser = byUser(allTopicProgress);
    const conceptMasteryByUser = byUser(allConceptMastery);
    const sessionsByUser = byUser(allSessions);
    const planByUser = new Map(allPlans.map((p) => [toId(p.userId), p]));

    // ── Build student records ─────────────────────────────────────────────
    const students = users.map((user) => {
      const userId = toId(user._id);
      const profile = profileByUser.get(userId);
      const report = reportByUser.get(userId);
      const assessment = assessmentByUser.get(userId);
      const diagnosticSubjects = subjectsByUser.get(userId) || [];
      const legacyQuiz = legacyQuizByUser.get(userId);
      const userQuizMarks = quizMarksByUser.get(userId) || [];
      const userRapidAttempts = rapidByUser.get(userId) || [];
      const userTopicProgress = topicProgressByUser.get(userId) || [];
      const userConceptMastery = conceptMasteryByUser.get(userId) || [];
      const userSessions = (sessionsByUser.get(userId) || []).slice(0, 20);
      const userPlan = planByUser.get(userId);

      // Legacy concept mastery from diagnostic
      const conceptMasteryLegacy = diagnosticSubjects.length
        ? buildDiagnosticMastery(diagnosticSubjects)
        : buildLegacySubjectMastery(legacyQuiz);

      // AI-teacher topic progress (richer source if available)
      const topicMastery = userTopicProgress.length
        ? Math.round(userTopicProgress.reduce((s, t) => s + t.masteryPercent, 0) / userTopicProgress.length)
        : null;

      const masteryAverage = topicMastery !== null
        ? topicMastery
        : average(conceptMasteryLegacy.map((item) => item.score));

      const battleAverage = average(userRapidAttempts.map((a) => Number(a.accuracy) || 0));
      const declining = getDecliningTrend(userRapidAttempts);
      const attention = buildAttentionTrend(assessment, report, profile, legacyQuiz);
      const status = getStatus({ masteryAverage, battleAverage, attentionLevel: attention.attentionLevel, declining });

      // Risk reasons
      const riskReasons = [];
      if (masteryAverage < 65) riskReasons.push(`Overall mastery is ${masteryAverage}%`);
      if (battleAverage && battleAverage < 60) riskReasons.push(`Battle accuracy avg ${battleAverage}%`);
      if (declining) riskReasons.push('Declining performance across 3+ sessions');
      if (/low|poor|weak|risk|support/i.test(attention.attentionLevel)) riskReasons.push(`Attention: ${attention.attentionLevel}`);

      // Weak concepts from ConceptMastery
      const sortedConcepts = [...userConceptMastery].sort((a, b) => a.masteryPercent - b.masteryPercent);
      const weakConcepts = sortedConcepts.filter((c) => c.masteryPercent < 60).slice(0, 5).map((c) => ({
        concept: c.concept, topic: c.topic, subject: c.subject,
        masteryPercent: c.masteryPercent, attempts: c.attempts,
        weakSignals: c.weakSignals || [],
      }));
      const strongConcepts = sortedConcepts.filter((c) => c.masteryPercent >= 80).slice(-3).reverse().map((c) => ({
        concept: c.concept, topic: c.topic, masteryPercent: c.masteryPercent,
      }));

      // Subject breakdown from TopicProgress
      const subjectMap = {};
      for (const tp of userTopicProgress) {
        if (!subjectMap[tp.subjectSlug]) {
          subjectMap[tp.subjectSlug] = {
            subjectSlug: tp.subjectSlug, subjectName: tp.subject,
            topics: [], totalMinutes: 0,
          };
        }
        subjectMap[tp.subjectSlug].topics.push({
          topic: tp.topic, masteryPercent: tp.masteryPercent, status: tp.status,
          bestQuizScore: tp.bestQuizScore, currentDifficulty: tp.currentDifficulty,
        });
        subjectMap[tp.subjectSlug].totalMinutes += tp.totalStudyMinutes || 0;
      }
      const subjectBreakdown = Object.values(subjectMap).map((sub) => ({
        ...sub,
        avgMastery: sub.topics.length
          ? Math.round(sub.topics.reduce((s, t) => s + t.masteryPercent, 0) / sub.topics.length) : 0,
        completedCount: sub.topics.filter((t) => t.status === 'completed').length,
      }));

      // Recent sessions with mastery delta
      const completedSessions = userSessions.filter((s) => s.status === 'completed');
      const sessionHistory = completedSessions.slice(0, 8).map((s) => ({
        topic: s.topic, subject: s.subject,
        masteryBefore: s.masteryBefore || 0, masteryAfter: s.masteryAfter || 0,
        delta: (s.masteryAfter || 0) - (s.masteryBefore || 0),
        difficultyLevel: s.difficultyLevel,
        completedAt: s.completedAt || s.createdAt,
      }));

      // Study plan info
      const studyPlanInfo = userPlan ? {
        planName: userPlan.planName,
        completionPercent: userPlan.overallCompletionPercent || 0,
        currentStreak: userPlan.currentStreak || 0,
        longestStreak: userPlan.longestStreak || 0,
        examDeadline: userPlan.examDeadline,
        examName: userPlan.examName,
        totalPlannedHours: userPlan.totalPlannedHours || 0,
        totalCompletedHours: userPlan.totalCompletedHours || 0,
      } : null;

      const totalStudyMinutes = userTopicProgress.reduce((s, t) => s + (t.totalStudyMinutes || 0), 0);
      const totalTopics = userTopicProgress.length;
      const completedTopics = userTopicProgress.filter((t) => t.status === 'completed').length;

      return {
        id: user._id,
        name: profile?.fullName || user.name,
        email: user.email,
        educationLevel: profile?.educationLevel || legacyQuiz?.education || 'Not set',
        status,
        masteryAverage,
        battleAverage,
        preferredLearningStyle: report?.preferredLearningStyle || legacyQuiz?.studyStyle || 'Unknown',
        attention,
        conceptMastery: conceptMasteryLegacy,
        quizHistory: buildQuizTimeline({ quizMarks: userQuizMarks, rapidAttempts: userRapidAttempts }),
        likelyWeakAreas: report?.likelyWeakAreas || [],
        recommendedTeachingApproach: report?.recommendedTeachingApproach || 'Use mixed-format revision and short concept checks.',
        declining,
        riskReasons,
        lastActiveAt:
          completedSessions[0]?.completedAt ||
          userRapidAttempts[userRapidAttempts.length - 1]?.createdAt ||
          userQuizMarks[userQuizMarks.length - 1]?.date ||
          user.createdAt,
        // Enriched data
        subjectBreakdown,
        weakConcepts,
        strongConcepts,
        sessionHistory,
        studyPlanInfo,
        totalStudyMinutes,
        totalTopics,
        completedTopics,
      };
    });

    // ── Class-wide analytics ──────────────────────────────────────────────
    const statusCounts = students.reduce(
      (counts, s) => ({ ...counts, [s.status]: (counts[s.status] || 0) + 1 }),
      { 'On Track': 0, 'At Risk': 0, Struggling: 0 }
    );

    // Subject heatmap: for each subject across all students
    const allSubjectSlugs = new Set();
    students.forEach((s) => s.subjectBreakdown.forEach((sb) => allSubjectSlugs.add(sb.subjectSlug)));
    const subjectHeatmap = [...allSubjectSlugs].map((slug) => {
      const subjectName = students.find((s) => s.subjectBreakdown.find((sb) => sb.subjectSlug === slug))
        ?.subjectBreakdown.find((sb) => sb.subjectSlug === slug)?.subjectName || slug;
      const studentScores = students.map((s) => {
        const sb = s.subjectBreakdown.find((x) => x.subjectSlug === slug);
        return { studentId: s.id, studentName: s.name, mastery: sb?.avgMastery || 0 };
      });
      const classAvg = studentScores.length
        ? Math.round(studentScores.reduce((sum, x) => sum + x.mastery, 0) / studentScores.length) : 0;
      return { subjectSlug: slug, subjectName, classAvg, students: studentScores };
    });

    const interventionAlerts = students
      .filter((s) => s.status !== 'On Track')
      .map((s) => ({
        studentId: s.id, studentName: s.name, status: s.status,
        reasons: s.riskReasons.slice(0, 3), masteryAverage: s.masteryAverage,
      }))
      .sort((a, b) => (a.status === 'Struggling' ? -1 : 1));

    const riskPredictions = students
      .filter((s) => s.declining || s.masteryAverage < 55)
      .map((s) => ({
        studentId: s.id, studentName: s.name, masteryAverage: s.masteryAverage,
        declining: s.declining,
        prediction: s.declining
          ? 'Declining mastery across 3+ consecutive sessions'
          : 'Low current mastery requires intervention',
      }));

    // Class-wide stats
    const classTotalMinutes = students.reduce((s, st) => s + st.totalStudyMinutes, 0);
    const classAvgStreak = Math.round(average(
      students.map((s) => s.studyPlanInfo?.currentStreak || 0)
    ));

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalStudents: students.length,
          statusCounts,
          averageMastery: average(students.map((s) => s.masteryAverage)),
          averageBattleAccuracy: average(students.map((s) => s.battleAverage).filter(Boolean)),
          interventionCount: interventionAlerts.length,
          classTotalMinutes,
          classAvgStreak,
        },
        students,
        interventionAlerts,
        riskPredictions,
        subjectHeatmap,
        resources,
      },
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load teacher dashboard' });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { title, description, fileName, fileType, targetGroup } = req.body;
    if (!title || !fileName || !fileType) {
      return res.status(400).json({
        status: 'error',
        message: 'title, fileName, and fileType are required',
      });
    }

    const resource = await TeacherResource.create({
      teacherId: req.user._id,
      title,
      description,
      fileName,
      fileType,
      targetGroup,
    });

    res.status(201).json({ status: 'success', data: resource });
  } catch (error) {
    console.error('Teacher resource create error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save resource metadata' });
  }
};
