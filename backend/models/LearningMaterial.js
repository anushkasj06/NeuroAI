const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { _id: true }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [String],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    type: { type: String, enum: ['mcq', 'short', 'true_false'], default: 'mcq' },
  },
  { _id: true }
);

const learningMaterialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Content classification
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },

    // Learning style this material is optimized for
    learningStyle: {
      type: String,
      enum: ['Visual Learner', 'Audio Learner', 'Reading/Writing Learner', 'Interactive Learner'],
      required: true,
    },
    contentType: {
      type: String,
      enum: ['notes', 'visual_map', 'flashcards', 'quiz', 'audio_script', 'summary', 'exercises'],
      required: true,
    },

    // Content body (varies by type)
    content: { type: String, default: '' },          // markdown / plain text notes
    summary: { type: String, default: '' },           // short summary
    keyPoints: [String],                              // bullet points
    visualMapData: { type: mongoose.Schema.Types.Mixed }, // JSON for concept map nodes/edges
    flashcards: [flashcardSchema],
    quizQuestions: [quizQuestionSchema],
    audioScript: { type: String, default: '' },       // TTS-ready script
    codeExercises: [
      {
        title: String,
        description: String,
        starterCode: String,
        solution: String,
        language: { type: String, default: 'python' },
      },
    ],
    sourceResources: [String],

    // Metadata
    estimatedReadMinutes: { type: Number, default: 5 },
    generatedByAI: { type: Boolean, default: true },
    aiModel: { type: String, default: 'grok' },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

learningMaterialSchema.index({ userId: 1, subjectSlug: 1, topic: 1, learningStyle: 1 });

module.exports = mongoose.model('LearningMaterial', learningMaterialSchema);
