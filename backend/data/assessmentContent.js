/**
 * Multi-modal diagnostic assessment content.
 *
 * Local media (served from frontend public/):
 *   - /audio.mpeg  → public/audio.mpeg
 *   - /vedio.mp4   → public/vedio.mp4
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEXT MODALITY (unchanged — onboarding flow still includes text step)
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_ASSESSMENT = {
  mode: 'text',
  modality: 'TEXT MODALITY — BIOLOGY',
  subject: 'Biology',
  topic: 'Photosynthesis',
  title: 'Text Learning Assessment — Biology',
  paragraph: `Photosynthesis is the process used by plants, algae, and certain bacteria to convert light energy into chemical energy. During this process, organisms capture sunlight and use it to convert carbon dioxide and water into glucose and oxygen. The process occurs mainly in the chloroplasts of plant cells, specifically in structures called thylakoids and stroma. The light-dependent reactions happen in the thylakoid membranes, while the Calvin cycle (light-independent reactions) occurs in the stroma. Factors affecting photosynthesis include light intensity, carbon dioxide concentration, temperature, and water availability. Understanding photosynthesis is essential because it forms the foundation of most food chains and produces the oxygen we breathe.`,
  mcqQuestions: [
    {
      id: 'text_q1',
      type: 'mcq',
      question: 'Where do the light-dependent reactions of photosynthesis occur?',
      options: ['Stroma', 'Thylakoid membranes', 'Mitochondria', 'Cell wall'],
      correctAnswer: 'Thylakoid membranes',
    },
    {
      id: 'text_q2',
      type: 'mcq',
      question: 'What are the main products of photosynthesis?',
      options: ['Glucose and oxygen', 'Carbon dioxide and water', 'Nitrogen and hydrogen', 'ATP only'],
      correctAnswer: 'Glucose and oxygen',
    },
    {
      id: 'text_q3',
      type: 'mcq',
      question: 'Which factor does NOT directly affect the rate of photosynthesis?',
      options: ['Light intensity', 'Gravity', 'Carbon dioxide concentration', 'Temperature'],
      correctAnswer: 'Gravity',
    },
  ],
  shortQuestions: [
    {
      id: 'text_s1',
      type: 'short',
      question: 'In one sentence, explain why photosynthesis is important for life on Earth.',
      keywords: ['oxygen', 'food', 'energy', 'plants', 'chain'],
    },
    {
      id: 'text_s2',
      type: 'short',
      question: 'Name two environmental factors that affect photosynthesis.',
      keywords: ['light', 'temperature', 'water', 'carbon', 'co2'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 🎧 AUDIO MODALITY — HISTORY
// Topic: French Revolution
// Audio Resource: French Revolution Audio Explanation (YouTube)
// Local file: /audio.mpeg
// ─────────────────────────────────────────────────────────────────────────────

const AUDIO_ASSESSMENT = {
  mode: 'audio',
  modality: 'AUDIO MODALITY — HISTORY',
  subject: 'History',
  topic: 'French Revolution',
  title: 'Audio Learning Assessment — History',
  audioUrl: '/audio.mpeg',
  resourceTitle: 'French Revolution Audio Explanation',
  youtubeUrl: 'https://www.youtube.com/watch?v=PBn7iWzrKoI&utm_source=chatgpt.com',
  youtubeLabel: 'French Revolution Audio Explanation',
  transcript: `Listen to the audio lesson on the French Revolution. The revolution began in France in 1789. The Third Estate bore the heaviest tax burden while the Clergy and Nobility held privileges. Revolutionaries stormed the Bastille on 14 July 1789. The revolution spread ideals of liberty, equality, and fraternity and reshaped world history.`,
  mcqQuestions: [
    {
      id: 'audio_q1',
      type: 'mcq',
      question: 'In which country did the French Revolution begin?',
      options: ['England', 'France', 'Germany', 'Italy'],
      correctAnswer: 'France',
    },
    {
      id: 'audio_q2',
      type: 'mcq',
      question: 'Which social class paid most taxes during the revolution?',
      options: ['Clergy', 'Nobility', 'Third Estate', 'Royal Family'],
      correctAnswer: 'Third Estate',
    },
    {
      id: 'audio_q3',
      type: 'mcq',
      question: 'Which famous prison was attacked during the French Revolution?',
      options: ['Louvre', 'Bastille', 'Versailles', 'Notre Dame'],
      correctAnswer: 'Bastille',
    },
  ],
  shortQuestions: [
    {
      id: 'audio_s1',
      type: 'short',
      question: 'What was one major reason for the French Revolution?',
      keywords: [
        'tax',
        'taxes',
        'inequality',
        'poverty',
        'hunger',
        'bread',
        'rights',
        'privilege',
        'estate',
        'third estate',
        'king',
        'economic',
        'unfair',
      ],
    },
    {
      id: 'audio_s2',
      type: 'short',
      question: 'Why is the French Revolution important in world history?',
      keywords: [
        'democracy',
        'rights',
        'liberty',
        'equality',
        'fraternity',
        'europe',
        'monarchy',
        'republic',
        'ideas',
        'freedom',
        'nation',
        'modern',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 🎥 VIDEO MODALITY — BIOLOGY
// Topic: DNA Structure & Function
// Animated Educational Video: DNA Structure Animated Video by Amoeba Sisters
// Local file: /vedio.mp4
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_ASSESSMENT = {
  mode: 'video',
  modality: 'VIDEO MODALITY — BIOLOGY',
  subject: 'Biology',
  topic: 'DNA Structure & Function',
  title: 'Video Learning Assessment — Biology',
  videoUrl: '/vedio.mp4',
  resourceTitle: 'DNA Structure Animated Video by Amoeba Sisters',
  youtubeUrl: 'https://www.youtube.com/watch?v=8kK2zwjRV0M&utm_source=chatgpt.com',
  youtubeLabel: 'DNA Structure Animated Video by Amoeba Sisters',
  description:
    'Watch the animated educational video on DNA structure and function, then answer the comprehension questions below.',
  mcqQuestions: [
    {
      id: 'video_q1',
      type: 'mcq',
      question: 'What does DNA stand for?',
      options: [
        'Dynamic Nucleic Acid',
        'Deoxyribonucleic Acid',
        'Double Nuclear Acid',
        'Dynamic Ribosome Acid',
      ],
      correctAnswer: 'Deoxyribonucleic Acid',
    },
    {
      id: 'video_q2',
      type: 'mcq',
      question: 'What is the shape of DNA called?',
      options: ['Circle', 'Helix', 'Double Helix', 'Spiral Chain'],
      correctAnswer: 'Double Helix',
    },
    {
      id: 'video_q3',
      type: 'mcq',
      question: 'Which molecules form the rungs of the DNA ladder?',
      options: ['Proteins', 'Base Pairs', 'Lipids', 'Enzymes'],
      correctAnswer: 'Base Pairs',
    },
  ],
  shortQuestions: [
    {
      id: 'video_s1',
      type: 'short',
      question: 'Why is DNA important for living organisms?',
      keywords: [
        'genetic',
        'genetics',
        'heredity',
        'traits',
        'instructions',
        'cells',
        'reproduction',
        'protein',
        'genes',
        'inherit',
        'life',
      ],
    },
    {
      id: 'video_s2',
      type: 'short',
      question: 'What are nucleotides in DNA?',
      keywords: [
        'building',
        'blocks',
        'sugar',
        'phosphate',
        'base',
        'units',
        'structure',
        'nucleotide',
        'deoxyribose',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE MODALITY — combines French Revolution & DNA review
// ─────────────────────────────────────────────────────────────────────────────

const INTERACTIVE_ASSESSMENT = {
  mode: 'interactive',
  title: 'Interactive Learning Assessment',
  topic: 'French Revolution & DNA — Active Review',
  description:
    'Match each term to its correct description (click a term, then its match). Complete all matches, then answer the quiz questions.',
  matchPairs: [
    { id: 'match_1', term: 'Bastille', definition: 'Prison stormed on 14 July 1789' },
    { id: 'match_2', term: 'Third Estate', definition: 'Social class that paid most taxes' },
    { id: 'match_3', term: 'Double Helix', definition: 'Shape of the DNA molecule' },
    { id: 'match_4', term: 'Base Pairs', definition: 'Rungs connecting the two DNA strands' },
    { id: 'match_5', term: 'Deoxyribonucleic Acid', definition: 'Full name of DNA' },
    { id: 'match_6', term: '1789', definition: 'Year the French Revolution began' },
  ],
  mcqQuestions: [
    {
      id: 'int_q1',
      type: 'mcq',
      question: 'Which learning activity helped you most in this session?',
      options: [
        'Matching terms interactively',
        'Listening to audio',
        'Watching the video',
        'Reading text',
      ],
      correctAnswer: 'Matching terms interactively',
    },
    {
      id: 'int_q2',
      type: 'mcq',
      question: 'Interactive learning works best when you:',
      options: [
        'Click, drag, or solve problems actively',
        'Only listen without taking notes',
        'Skip questions quickly',
        'Avoid practicing',
      ],
      correctAnswer: 'Click, drag, or solve problems actively',
    },
  ],
  shortQuestions: [
    {
      id: 'int_s1',
      type: 'short',
      question: 'How does interactive practice help you remember topics better?',
      keywords: ['active', 'engage', 'practice', 'hands', 'participate', 'memory', 'focus'],
    },
  ],
};

/** Build flat question list including match items for grading */
const getQuestionsForMode = (content) => {
  const matchAsQuestions = (content.matchPairs || []).map((p) => ({
    id: p.id,
    type: 'match',
    correctAnswer: p.definition,
  }));
  return [
    ...matchAsQuestions,
    ...(content.mcqQuestions || []),
    ...(content.shortQuestions || []),
    ...(content.questions || []),
  ];
};

const getAssessmentContent = () => ({
  text: TEXT_ASSESSMENT,
  audio: AUDIO_ASSESSMENT,
  video: VIDEO_ASSESSMENT,
  interactive: INTERACTIVE_ASSESSMENT,
});

module.exports = {
  TEXT_ASSESSMENT,
  AUDIO_ASSESSMENT,
  VIDEO_ASSESSMENT,
  INTERACTIVE_ASSESSMENT,
  getAssessmentContent,
  getQuestionsForMode,
};
