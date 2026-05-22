const { EDUCATION_LEVELS, getSubjectsForLevel } = require('../constants/educationSubjects');

exports.validateOnboarding = (req, res, next) => {
  const {
    fullName,
    age: rawAge,
    educationLevel,
    targetPercentage: rawTarget,
    currentCgpaOrPercentage: rawCurrent,
    studyHoursPerDay: rawStudyHours,
    sleepHours: rawSleep,
    screenTimeHours: rawScreen,
    examDeadline,
    subjects,
  } = req.body;

  const age = Number(rawAge);
  const targetPercentage = Number(rawTarget);
  const currentCgpaOrPercentage = Number(rawCurrent);
  const studyHoursPerDay = Number(rawStudyHours);
  const sleepHours = Number(rawSleep);
  const screenTimeHours = Number(rawScreen);

  req.body.age = age;
  req.body.targetPercentage = targetPercentage;
  req.body.currentCgpaOrPercentage = currentCgpaOrPercentage;
  req.body.studyHoursPerDay = studyHoursPerDay;
  req.body.sleepHours = sleepHours;
  req.body.screenTimeHours = screenTimeHours;

  const errors = [];

  if (!fullName?.trim()) errors.push('Full name is required');
  if (Number.isNaN(age) || age < 5 || age > 30) errors.push('Valid age (5-30) is required');
  if (!EDUCATION_LEVELS.includes(educationLevel)) errors.push('Invalid education level');
  if (Number.isNaN(targetPercentage) || targetPercentage < 0 || targetPercentage > 100) {
    errors.push('Target percentage must be 0-100');
  }
  if (Number.isNaN(currentCgpaOrPercentage) || currentCgpaOrPercentage < 0 || currentCgpaOrPercentage > 100) {
    errors.push('Current CGPA/percentage must be 0-100');
  }
  if (Number.isNaN(studyHoursPerDay) || studyHoursPerDay < 0.5 || studyHoursPerDay > 16) {
    errors.push('Study hours per day must be 0.5-16');
  }
  if (Number.isNaN(sleepHours) || sleepHours < 0 || sleepHours > 14) {
    errors.push('Sleep hours must be 0-14');
  }
  if (Number.isNaN(screenTimeHours) || screenTimeHours < 0 || screenTimeHours > 24) {
    errors.push('Screen time must be 0-24');
  }
  if (!examDeadline) errors.push('Exam deadline is required');
  if (!Array.isArray(subjects) || subjects.length === 0) {
    errors.push('Select at least one subject');
  }

  if (educationLevel && Array.isArray(subjects)) {
    const allowed = getSubjectsForLevel(educationLevel).map((s) => s.slug);
    for (const sub of subjects) {
      if (!allowed.includes(sub.subjectSlug)) {
        errors.push(`Invalid subject: ${sub.subjectSlug}`);
      }
      if (sub.currentMarks == null || sub.currentMarks < 0 || sub.currentMarks > 100) {
        errors.push(`Invalid marks for ${sub.subjectName || sub.subjectSlug}`);
      }
    }
  }

  if (errors.length) {
    return res.status(400).json({ status: 'error', message: errors.join('; ') });
  }

  next();
};

exports.validateModalitySubmission = (req, res, next) => {
  if (!Array.isArray(req.body.answers) || req.body.answers.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Answers array is required' });
  }
  next();
};
