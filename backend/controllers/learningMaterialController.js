const LearningMaterial = require('../models/LearningMaterial');
const StudentProfile = require('../models/StudentProfile');
const LearningStyleReport = require('../models/LearningStyleReport');
const SubjectPerformance = require('../models/SubjectPerformance');
const { generateLearningMaterial, generateRevisionContent } = require('../services/grokService');

// ── Generate learning material ────────────────────────────────────────────────
exports.generateMaterial = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, subjectSlug, topic, subtopic, difficultyLevel, contentType, forceRegenerate } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ status: 'error', message: 'Subject and topic are required' });
    }

    const [profile, learningReport, subjectPerf] = await Promise.all([
      StudentProfile.findOne({ userId }),
      LearningStyleReport.findOne({ userId }),
      SubjectPerformance.findOne({ userId, subjectSlug }),
    ]);

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Complete onboarding first' });
    }

    const learningStyle = learningReport?.preferredLearningStyle || 'Reading/Writing Learner';
    const currentMarks = subjectPerf?.currentMarks || 50;
    const difficulty = difficultyLevel || (currentMarks < 50 ? 'easy' : currentMarks < 75 ? 'medium' : 'hard');

    // Check if material already exists for this style
    const existing = await LearningMaterial.findOne({
      userId,
      subjectSlug,
      topic,
      learningStyle,
      difficultyLevel: difficulty,
    });

    if (existing && !forceRegenerate) {
      return res.status(200).json({ status: 'success', data: { material: existing }, cached: true });
    }

    // Generate via Grok
    const aiContent = await generateLearningMaterial({
      subject,
      subjectSlug,
      topic,
      subtopic: subtopic || '',
      learningStyle,
      difficultyLevel: difficulty,
      currentMarks,
      profile,
    });

    const material = await LearningMaterial.create({
      userId,
      subject,
      subjectSlug,
      topic,
      subtopic: subtopic || '',
      difficultyLevel: difficulty,
      learningStyle,
      contentType: contentType || mapStyleToContentType(learningStyle),
      content: aiContent.content || '',
      summary: aiContent.summary || '',
      keyPoints: aiContent.keyPoints || [],
      visualMapData: aiContent.visualMapData || null,
      flashcards: aiContent.flashcards || [],
      quizQuestions: aiContent.quizQuestions || [],
      audioScript: aiContent.audioScript || '',
      videoResources: aiContent.videoResources || buildDummyVideos(subject, topic),
      practiceTasks: aiContent.practiceTasks || [],
      codeExercises: aiContent.codeExercises || [],
      sourceResources: aiContent.sourceResources || [],
      estimatedReadMinutes: aiContent.estimatedReadMinutes || 10,
      generatedByAI: true,
      aiModel: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || 'gpt-5-nano') : 'grok',
      rawAiResponse: aiContent,
    });

    res.status(201).json({ status: 'success', data: { material } });
  } catch (error) {
    console.error('Material generation error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Get material by topic ─────────────────────────────────────────────────────
exports.getMaterial = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId } = req.params;

    const material = await LearningMaterial.findOne({ _id: topicId, userId });
    if (!material) {
      return res.status(404).json({ status: 'error', message: 'Material not found' });
    }

    res.status(200).json({ status: 'success', data: { material } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── List materials for a subject ──────────────────────────────────────────────
exports.listMaterials = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subjectSlug, topic } = req.query;

    const filter = { userId };
    if (subjectSlug) filter.subjectSlug = subjectSlug;
    if (topic) filter.topic = topic;

    const materials = await LearningMaterial.find(filter)
      .select('subject subjectSlug topic subtopic learningStyle contentType difficultyLevel estimatedReadMinutes createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ status: 'success', data: { materials } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Generate revision content ─────────────────────────────────────────────────
exports.generateRevision = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, subjectSlug, topics } = req.body;

    if (!subject || !topics?.length) {
      return res.status(400).json({ status: 'error', message: 'Subject and topics are required' });
    }

    const [profile, learningReport] = await Promise.all([
      StudentProfile.findOne({ userId }),
      LearningStyleReport.findOne({ userId }),
    ]);

    const learningStyle = learningReport?.preferredLearningStyle || 'Reading/Writing Learner';

    const revision = await generateRevisionContent({
      subject,
      topics,
      learningStyle,
      profile: profile || { educationLevel: 'general' },
    });

    res.status(200).json({ status: 'success', data: { revision } });
  } catch (error) {
    console.error('Revision generation error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const mapStyleToContentType = (style) => {
  const map = {
    'Visual Learner': 'visual_map',
    'Audio Learner': 'audio_script',
    'Reading/Writing Learner': 'notes',
    'Interactive Learner': 'flashcards',
  };
  return map[style] || 'notes';
};

const buildDummyVideos = (subject, topic) => [
  {
    title: `${topic} visual walkthrough`,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationMinutes: 12,
    watchGoal: `Watch for the core idea behind ${topic} in ${subject}.`,
  },
  {
    title: `${topic} practice demo`,
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    durationMinutes: 8,
    watchGoal: 'Pause after each example and solve before the explanation continues.',
  },
];
