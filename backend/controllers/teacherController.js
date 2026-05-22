const User = require('../models/User');
const QuizAnswer = require('../models/QuizAnswer');
const QuizMarks = require('../models/QuizMarks');
const RapidBattleAttempt = require('../models/RapidBattleAttempt');
const StudentProfile = require('../models/StudentProfile');
const SubjectPerformance = require('../models/SubjectPerformance');
const DiagnosticAssessment = require('../models/DiagnosticAssessment');
const LearningStyleReport = require('../models/LearningStyleReport');
const TeacherResource = require('../models/TeacherResource');

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
  if (!clean.length) {
    return 0;
  }
  return Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1));
};

const getBucket = (score) => {
  if (score >= 75) return 'mastered';
  if (score >= 55) return 'developing';
  return 'needs-work';
};

const getStatus = ({ masteryAverage, battleAverage, attentionLevel, declining }) => {
  const lowAttention = /low|poor|weak|risk/i.test(attentionLevel || '');
  if (masteryAverage < 50 || battleAverage < 45 || declining) {
    return 'Struggling';
  }
  if (masteryAverage < 65 || battleAverage < 60 || lowAttention) {
    return 'At Risk';
  }
  return 'On Track';
};

const getDecliningTrend = (attempts) => {
  if (attempts.length < 3) {
    return false;
  }

  const latest = [...attempts]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-3)
    .map((attempt) => Number(attempt.accuracy) || 0);

  return latest[0] > latest[1] && latest[1] > latest[2];
};

const buildLegacySubjectMastery = (quizAnswer) => {
  if (!quizAnswer?.subjects) {
    return [];
  }

  return Object.entries(quizAnswer.subjects).map(([slug, data]) => ({
    subjectSlug: slug,
    subjectName: LEGACY_SUBJECT_NAMES[slug] || slug.toUpperCase(),
    score: Number(data?.marks) || 0,
    attendance: Number(data?.attendance) || 0,
    interest: Number(data?.interest) || 0,
    bucket: getBucket(Number(data?.marks) || 0),
  }));
};

const buildDiagnosticMastery = (subjects) =>
  subjects.map((subject) => ({
    subjectSlug: subject.subjectSlug,
    subjectName: subject.subjectName,
    score: Number(subject.currentMarks) || 0,
    attendance: null,
    interest: null,
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

const buildStudentRecord = ({
  user,
  profile,
  report,
  assessment,
  diagnosticSubjects,
  legacyQuiz,
  quizMarks,
  rapidAttempts,
}) => {
  const conceptMastery = diagnosticSubjects.length
    ? buildDiagnosticMastery(diagnosticSubjects)
    : buildLegacySubjectMastery(legacyQuiz);

  const masteryAverage = average(conceptMastery.map((item) => item.score));
  const battleAverage = average(rapidAttempts.map((attempt) => Number(attempt.accuracy) || 0));
  const declining = getDecliningTrend(rapidAttempts);
  const attention = buildAttentionTrend(assessment, report, profile, legacyQuiz);
  const status = getStatus({
    masteryAverage,
    battleAverage,
    attentionLevel: attention.attentionLevel,
    declining,
  });
  const riskReasons = [];

  if (masteryAverage < 65) {
    riskReasons.push(`Concept mastery average is ${masteryAverage}%`);
  }
  if (battleAverage && battleAverage < 60) {
    riskReasons.push(`Rapid quiz accuracy average is ${battleAverage}%`);
  }
  if (declining) {
    riskReasons.push('Mastery proxy declined across 3 consecutive battle sessions');
  }
  if (/low|poor|weak|risk|support/i.test(attention.attentionLevel)) {
    riskReasons.push(`Attention signal: ${attention.attentionLevel}`);
  }

  return {
    id: user._id,
    name: profile?.fullName || user.name,
    email: user.email,
    educationLevel: profile?.educationLevel || legacyQuiz?.education || 'Not set',
    status,
    masteryAverage,
    battleAverage,
    preferredLearningStyle: report?.preferredLearningStyle || legacyQuiz?.studyStyle || 'Unknown',
    strongestLearningMode: report?.strongestLearningMode || 'Unknown',
    weakestLearningMode: report?.weakestLearningMode || 'Unknown',
    attention,
    conceptMastery,
    quizHistory: buildQuizTimeline({ quizMarks, rapidAttempts }),
    likelyWeakAreas: report?.likelyWeakAreas || [],
    recommendedTeachingApproach: report?.recommendedTeachingApproach || 'Use mixed-format revision and short concept checks.',
    declining,
    riskReasons,
    lastActiveAt:
      rapidAttempts[rapidAttempts.length - 1]?.createdAt ||
      quizMarks[quizMarks.length - 1]?.date ||
      report?.updatedAt ||
      profile?.updatedAt ||
      user.createdAt,
  };
};

exports.getTeacherDashboard = async (req, res) => {
  try {
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
    ] = await Promise.all([
      User.find({
        role: 'student',
        assignedTeacherId: req.user._id,
      }).select('name email role assignedTeacherId createdAt').lean(),
      StudentProfile.find().lean(),
      LearningStyleReport.find().lean(),
      DiagnosticAssessment.find().lean(),
      SubjectPerformance.find().lean(),
      QuizAnswer.find().lean(),
      QuizMarks.find().sort({ date: 1 }).lean(),
      RapidBattleAttempt.find().sort({ createdAt: 1 }).lean(),
      TeacherResource.find({ teacherId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const byUser = (items) =>
      items.reduce((map, item) => {
        const key = toId(item.userId);
        if (!map.has(key)) {
          map.set(key, []);
        }
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

    const students = users.map((user) => {
      const userId = toId(user._id);
      return buildStudentRecord({
        user,
        profile: profileByUser.get(userId),
        report: reportByUser.get(userId),
        assessment: assessmentByUser.get(userId),
        diagnosticSubjects: subjectsByUser.get(userId) || [],
        legacyQuiz: legacyQuizByUser.get(userId),
        quizMarks: quizMarksByUser.get(userId) || [],
        rapidAttempts: rapidByUser.get(userId) || [],
      });
    });

    const statusCounts = students.reduce(
      (counts, student) => ({
        ...counts,
        [student.status]: (counts[student.status] || 0) + 1,
      }),
      { 'On Track': 0, 'At Risk': 0, Struggling: 0 }
    );

    const interventionAlerts = students
      .filter((student) => student.status !== 'On Track')
      .map((student) => ({
        studentId: student.id,
        studentName: student.name,
        status: student.status,
        reasons: student.riskReasons.slice(0, 3),
        createdAt: student.lastActiveAt,
      }))
      .sort((a, b) => (a.status === 'Struggling' ? -1 : 1));

    const riskPredictions = students
      .filter((student) => student.declining || student.masteryAverage < 55)
      .map((student) => ({
        studentId: student.id,
        studentName: student.name,
        masteryAverage: student.masteryAverage,
        declining: student.declining,
        prediction:
          student.declining
            ? 'Declining mastery across 3+ consecutive sessions'
            : 'Low current mastery requires intervention',
      }));

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalStudents: students.length,
          statusCounts,
          averageMastery: average(students.map((student) => student.masteryAverage)),
          averageBattleAccuracy: average(students.map((student) => student.battleAverage).filter(Boolean)),
          interventionCount: interventionAlerts.length,
        },
        students,
        interventionAlerts,
        riskPredictions,
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
