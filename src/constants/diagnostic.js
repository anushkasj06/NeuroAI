export const EDUCATION_LEVELS = [
  { value: '5th_standard', label: '5th Standard' },
  { value: '6th_standard', label: '6th Standard' },
  { value: '7th_standard', label: '7th Standard' },
  { value: '8th_standard', label: '8th Standard' },
  { value: '9th_standard', label: '9th Standard' },
  { value: '10th_standard', label: '10th Standard' },
  { value: 'computer_engineering_fe', label: 'Computer Engineering FE' },
  { value: 'computer_engineering_se', label: 'Computer Engineering SE' },
  { value: 'computer_engineering_te', label: 'Computer Engineering TE' },
  { value: 'computer_engineering_be', label: 'Computer Engineering BE' },
];

export const SCHOOL_LEVELS = EDUCATION_LEVELS.slice(0, 6).map((e) => e.value);
export const ENGINEERING_LEVELS = EDUCATION_LEVELS.slice(6).map((e) => e.value);

export const SCHOOL_SUBJECTS = [
  { slug: 'mathematics', name: 'Mathematics' },
  { slug: 'science', name: 'Science' },
  { slug: 'english', name: 'English' },
  { slug: 'history', name: 'History' },
  { slug: 'geography', name: 'Geography' },
  { slug: 'physics', name: 'Physics' },
  { slug: 'chemistry', name: 'Chemistry' },
  { slug: 'biology', name: 'Biology' },
];

export const ENGINEERING_SUBJECTS = [
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

/** Subjects available for an education level (works offline, no API required). */
export function getSubjectsForLevel(educationLevel) {
  if (SCHOOL_LEVELS.includes(educationLevel)) {
    return SCHOOL_SUBJECTS;
  }
  if (ENGINEERING_LEVELS.includes(educationLevel)) {
    return ENGINEERING_SUBJECTS;
  }
  return [];
}

export const DIAGNOSTIC_STEPS = [
  { id: 'onboarding', label: 'Onboarding', icon: '📋' },
  { id: 'text', label: 'Text Test', icon: '📖' },
  { id: 'audio', label: 'Audio Test', icon: '🎧' },
  { id: 'video', label: 'Video Test', icon: '🎬' },
  { id: 'interactive', label: 'Interactive', icon: '🧩' },
  { id: 'analyze', label: 'AI Analysis', icon: '🤖' },
  { id: 'report', label: 'Report', icon: '📊' },
];

export const LEARNING_STYLE_COLORS = {
  'Visual Learner': 'from-violet-500 to-purple-600',
  'Audio Learner': 'from-amber-500 to-orange-600',
  'Reading/Writing Learner': 'from-blue-500 to-cyan-600',
  'Interactive Learner': 'from-emerald-500 to-teal-600',
};
