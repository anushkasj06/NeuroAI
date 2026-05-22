const SCHOOL_LEVELS = [
  '5th_standard',
  '6th_standard',
  '7th_standard',
  '8th_standard',
  '9th_standard',
  '10th_standard',
];

const ENGINEERING_LEVELS = [
  'computer_engineering_fe',
  'computer_engineering_se',
  'computer_engineering_te',
  'computer_engineering_be',
];

const EDUCATION_LEVELS = [...SCHOOL_LEVELS, ...ENGINEERING_LEVELS];

const EDUCATION_LEVEL_LABELS = {
  '5th_standard': '5th Standard',
  '6th_standard': '6th Standard',
  '7th_standard': '7th Standard',
  '8th_standard': '8th Standard',
  '9th_standard': '9th Standard',
  '10th_standard': '10th Standard',
  computer_engineering_fe: 'Computer Engineering FE',
  computer_engineering_se: 'Computer Engineering SE',
  computer_engineering_te: 'Computer Engineering TE',
  computer_engineering_be: 'Computer Engineering BE',
};

const SCHOOL_SUBJECTS = [
  { slug: 'mathematics', name: 'Mathematics' },
  { slug: 'science', name: 'Science' },
  { slug: 'english', name: 'English' },
  { slug: 'history', name: 'History' },
  { slug: 'geography', name: 'Geography' },
  { slug: 'physics', name: 'Physics' },
  { slug: 'chemistry', name: 'Chemistry' },
  { slug: 'biology', name: 'Biology' },
];

const ENGINEERING_SUBJECTS = [
  { slug: 'data_structures', name: 'Data Structures' },
  { slug: 'algorithms', name: 'Algorithms' },
  { slug: 'dbms', name: 'DBMS' },
  { slug: 'operating_systems', name: 'Operating Systems' },
  { slug: 'computer_networks', name: 'Computer Networks' },
  { slug: 'oop', name: 'OOP' },
  { slug: 'java', name: 'Java' },
  { slug: 'python', name: 'Python' },
  { slug: 'web_development', name: 'Web Development' },
  { slug: 'machine_learning', name: 'Machine Learning' },
  { slug: 'ai', name: 'AI' },
  { slug: 'cloud_computing', name: 'Cloud Computing' },
  { slug: 'cyber_security', name: 'Cyber Security' },
  { slug: 'software_engineering', name: 'Software Engineering' },
  { slug: 'theory_of_computation', name: 'Theory of Computation' },
  { slug: 'compiler_design', name: 'Compiler Design' },
  { slug: 'coa', name: 'COA' },
  { slug: 'mathematics', name: 'Mathematics' },
];

const isSchoolLevel = (level) => SCHOOL_LEVELS.includes(level);

const getSubjectsForLevel = (educationLevel) => {
  if (isSchoolLevel(educationLevel)) {
    return SCHOOL_SUBJECTS;
  }
  return ENGINEERING_SUBJECTS;
};

module.exports = {
  SCHOOL_LEVELS,
  ENGINEERING_LEVELS,
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  SCHOOL_SUBJECTS,
  ENGINEERING_SUBJECTS,
  isSchoolLevel,
  getSubjectsForLevel,
};
