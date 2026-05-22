const StudentProfile = require('../models/StudentProfile');
const SubjectPerformance = require('../models/SubjectPerformance');
const DiagnosticAssessment = require('../models/DiagnosticAssessment');
const LearningStyleReport = require('../models/LearningStyleReport');
const User = require('../models/User');
const { getAssessmentContent } = require('../data/assessmentContent');
const { getSubjectsForLevel, EDUCATION_LEVEL_LABELS } = require('../constants/educationSubjects');
const {
  buildModalityPayload,
  buildNumericInsights,
} = require('../services/diagnosticAnalysisService');
const { generateAiDiagnosticReport } = require('../services/aiAnalysisService');

exports.getConfig = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      educationLevels: Object.entries(EDUCATION_LEVEL_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
  });
};

exports.getSubjectsForLevel = (req, res) => {
  const { level } = req.params;
  const subjects = getSubjectsForLevel(level);
  if (!subjects.length) {
    return res.status(400).json({ status: 'error', message: 'Invalid education level' });
  }
  res.status(200).json({ status: 'success', data: { subjects } });
};

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ userId });
    const assessment = await DiagnosticAssessment.findOne({ userId });
    const report = await LearningStyleReport.findOne({ userId });

    let step = 'onboarding';
    if (profile) {
      if (report) step = 'report';
      else if (assessment?.status === 'completed') step = 'analyze';
      else if (assessment?.textMode?.completed) {
        if (!assessment.audioMode?.completed) step = 'audio';
        else if (!assessment.videoMode?.completed) step = 'video';
        else step = 'analyze';
      } else if (profile.diagnosticStatus === 'onboarding_complete') step = 'text';
    }

    res.status(200).json({
      status: 'success',
      data: {
        step,
        profile,
        assessment,
        hasReport: !!report,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.submitOnboarding = async (req, res) => {
  try {
    const userId = req.user._id;
    const existing = await StudentProfile.findOne({ userId });
    if (existing) {
      const assessment = await DiagnosticAssessment.findOne({ userId });
      const report = await LearningStyleReport.findOne({ userId });
      let resumeStep = 'text';
      if (report) resumeStep = 'report';
      else if (assessment?.status === 'completed') resumeStep = 'analyze';
      else if (!assessment?.textMode?.completed) resumeStep = 'text';
      else if (!assessment?.audioMode?.completed) resumeStep = 'audio';
      else if (!assessment?.videoMode?.completed) resumeStep = 'video';
      else resumeStep = 'analyze';

      return res.status(200).json({
        status: 'success',
        message: 'Onboarding already saved. Continuing your diagnostic.',
        data: { profile: existing, resumeStep, alreadyExists: true },
      });
    }

    const {
      fullName,
      age,
      educationLevel,
      targetPercentage,
      currentCgpaOrPercentage,
      studyHoursPerDay,
      sleepHours,
      screenTimeHours,
      examDeadline,
      subjects,
    } = req.body;

    const profile = await StudentProfile.create({
      userId,
      fullName,
      age,
      educationLevel,
      targetPercentage,
      currentCgpaOrPercentage,
      studyHoursPerDay,
      sleepHours,
      screenTimeHours,
      examDeadline: new Date(examDeadline),
      diagnosticStatus: 'onboarding_complete',
    });

    await User.findByIdAndUpdate(userId, { name: fullName });

    let subjectDocs;
    try {
      subjectDocs = await SubjectPerformance.insertMany(
        subjects.map((s) => ({
          userId,
          studentProfileId: profile._id,
          subjectSlug: s.subjectSlug,
          subjectName: s.subjectName,
          currentMarks: Number(s.currentMarks),
        }))
      );
    } catch (insertErr) {
      if (insertErr.code === 11000) {
        await SubjectPerformance.deleteMany({ userId });
        subjectDocs = await SubjectPerformance.insertMany(
          subjects.map((s) => ({
            userId,
            studentProfileId: profile._id,
            subjectSlug: s.subjectSlug,
            subjectName: s.subjectName,
            currentMarks: Number(s.currentMarks),
          }))
        );
      } else {
        throw insertErr;
      }
    }

    await DiagnosticAssessment.create({
      userId,
      studentProfileId: profile._id,
      status: 'not_started',
    });

    res.status(201).json({
      status: 'success',
      data: { profile, subjects: subjectDocs },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAssessmentContent = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: getAssessmentContent(),
  });
};

const submitModality = async (req, res, mode, fieldName) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Complete onboarding first' });
    }

    let assessment = await DiagnosticAssessment.findOne({ userId });
    if (!assessment) {
      assessment = await DiagnosticAssessment.create({
        userId,
        studentProfileId: profile._id,
      });
    }

    if (assessment[fieldName]?.completed) {
      return res.status(400).json({
        status: 'error',
        message: `${mode} assessment already submitted`,
      });
    }

    const payload = buildModalityPayload(mode, req.body);
    assessment[fieldName] = payload;
    assessment.status = 'in_progress';
    profile.diagnosticStatus = 'assessment_in_progress';
    await assessment.save();
    await profile.save();

    const allDone =
      assessment.textMode?.completed &&
      assessment.audioMode?.completed &&
      assessment.videoMode?.completed;

    if (allDone) {
      assessment.status = 'completed';
      assessment.completedAt = new Date();
      profile.diagnosticStatus = 'assessment_complete';
      await assessment.save();
      await profile.save();
    }

    res.status(200).json({
      status: 'success',
      data: { assessment, nextStep: allDone ? 'analyze' : getNextModality(assessment) },
    });
  } catch (error) {
    console.error(`${mode} submission error:`, error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getNextModality = (assessment) => {
  if (!assessment.textMode?.completed) return 'text';
  if (!assessment.audioMode?.completed) return 'audio';
  if (!assessment.videoMode?.completed) return 'video';
  return 'analyze';
};

exports.submitTextAssessment = (req, res) =>
  submitModality(req, res, 'text', 'textMode');

exports.submitAudioAssessment = (req, res) =>
  submitModality(req, res, 'audio', 'audioMode');

exports.submitVideoAssessment = (req, res) =>
  submitModality(req, res, 'video', 'videoMode');

exports.analyzeAndGenerateReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ userId });
    const assessment = await DiagnosticAssessment.findOne({ userId });
    const subjects = await SubjectPerformance.find({ userId });

    if (!profile || !assessment) {
      return res.status(404).json({ status: 'error', message: 'Diagnostic data not found' });
    }

    if (
      !assessment.textMode?.completed ||
      !assessment.audioMode?.completed ||
      !assessment.videoMode?.completed
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Complete all three assessments before analysis',
      });
    }

    const existingReport = await LearningStyleReport.findOne({ userId });
    if (existingReport) {
      return res.status(200).json({ status: 'success', data: { report: existingReport } });
    }

    profile.diagnosticStatus = 'analyzing';
    await profile.save();

    const numericInsights = buildNumericInsights(profile, assessment, subjects);
    const aiReport = await generateAiDiagnosticReport(
      profile,
      assessment,
      subjects,
      numericInsights
    );

    const report = await LearningStyleReport.create({
      userId,
      studentProfileId: profile._id,
      diagnosticAssessmentId: assessment._id,
      preferredLearningStyle:
        aiReport.preferredLearningStyle || numericInsights.preferredLearningStyle,
      strongestLearningMode:
        aiReport.strongestLearningMode || numericInsights.strongestLearningMode,
      weakestLearningMode:
        aiReport.weakestLearningMode || numericInsights.weakestLearningMode,
      attentionLevel: aiReport.attentionLevel || numericInsights.attentionLevel,
      engagementScore: numericInsights.engagementScore,
      confidenceLevel: aiReport.confidenceLevel || 'Moderate',
      studyConsistencyAnalysis: aiReport.studyConsistencyAnalysis,
      subjectStrengths: numericInsights.subjectStrengths,
      subjectWeaknesses: numericInsights.subjectWeaknesses,
      estimatedImprovementPotential: aiReport.estimatedImprovementPotential,
      recommendedStudyHours: numericInsights.recommendedStudyHours,
      recommendedTeachingFormat: aiReport.recommendedTeachingFormat,
      recommendedTeachingApproach: aiReport.recommendedTeachingApproach,
      likelyWeakAreas: aiReport.likelyWeakAreas || [],
      personalizedInsights: aiReport.personalizedInsights || [],
      motivationalFeedback: aiReport.motivationalFeedback,
      attentionBehavior: aiReport.attentionBehavior,
      engagementAnalysis: aiReport.engagementAnalysis,
      modalityScores: numericInsights.modalityScores,
      aiGeneratedSummary: aiReport.aiGeneratedSummary,
      rawAiResponse: aiReport.rawAiResponse,
    });

    profile.diagnosticStatus = 'completed';
    await profile.save();

    res.status(201).json({ status: 'success', data: { report } });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const report = await LearningStyleReport.findOne({ userId });
    const profile = await StudentProfile.findOne({ userId });
    const subjects = await SubjectPerformance.find({ userId });
    const assessment = await DiagnosticAssessment.findOne({ userId });

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found. Complete diagnostic assessments first.',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { report, profile, subjects, assessment },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ userId });
    const subjects = await SubjectPerformance.find({ userId });

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { profile, subjects },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
