/**
 * Dummy multi-modal assessment content served to the frontend.
 * Replace media URLs with your CDN assets in production.
 */

const TEXT_ASSESSMENT = {
  mode: 'text',
  topic: 'Photosynthesis',
  title: 'Text Learning Assessment',
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

const AUDIO_ASSESSMENT = {
  mode: 'audio',
  topic: 'Newton\'s Laws of Motion',
  title: 'Audio Learning Assessment',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  transcript: `Newton's three laws of motion describe the relationship between a body and the forces acting upon it. The first law states that an object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an unbalanced force. The second law states that force equals mass times acceleration (F = ma). The third law states that for every action, there is an equal and opposite reaction. These laws explain everyday phenomena from walking to rocket propulsion.`,
  questions: [
    {
      id: 'audio_q1',
      type: 'mcq',
      question: 'What does Newton\'s first law describe?',
      options: ['Inertia', 'Gravity only', 'Friction', 'Momentum conservation'],
      correctAnswer: 'Inertia',
    },
    {
      id: 'audio_q2',
      type: 'mcq',
      question: 'According to the second law, force equals:',
      options: ['Mass × acceleration', 'Mass ÷ acceleration', 'Velocity × time', 'Energy × distance'],
      correctAnswer: 'Mass × acceleration',
    },
    {
      id: 'audio_q3',
      type: 'short',
      question: 'Give a real-life example of Newton\'s third law.',
      keywords: ['rocket', 'walk', 'push', 'reaction', 'kick', 'swim'],
    },
  ],
};

const VIDEO_ASSESSMENT = {
  mode: 'video',
  topic: 'Introduction to Algorithms',
  title: 'Video Learning Assessment',
  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  description: 'Watch the short educational clip, then answer the comprehension questions.',
  questions: [
    {
      id: 'video_q1',
      type: 'mcq',
      question: 'Why is understanding algorithm efficiency important in programming?',
      options: [
        'It helps solve problems faster and use fewer resources',
        'It only affects visual design',
        'It is required for hardware manufacturing',
        'It replaces the need for data structures',
      ],
      correctAnswer: 'It helps solve problems faster and use fewer resources',
    },
    {
      id: 'video_q2',
      type: 'mcq',
      question: 'A step-by-step procedure to solve a problem is called a:',
      options: ['Database', 'Algorithm', 'Compiler', 'Browser'],
      correctAnswer: 'Algorithm',
    },
    {
      id: 'video_q3',
      type: 'short',
      question: 'What is one benefit of breaking a large problem into smaller steps?',
      keywords: ['easier', 'debug', 'manage', 'solve', 'understand', 'modular'],
    },
  ],
};

const getAssessmentContent = () => ({
  text: TEXT_ASSESSMENT,
  audio: AUDIO_ASSESSMENT,
  video: VIDEO_ASSESSMENT,
});

module.exports = {
  TEXT_ASSESSMENT,
  AUDIO_ASSESSMENT,
  VIDEO_ASSESSMENT,
  getAssessmentContent,
};
