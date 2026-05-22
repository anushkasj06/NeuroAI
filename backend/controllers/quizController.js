const QuizAnswer = require('../models/QuizAnswer');
const QuizMarks = require('../models/QuizMarks');
const cors = require('cors');

// Submit quiz answers
const submitQuiz = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const quizData = req.body;

    // Check if user has already submitted quiz
    const existingAnswer = await QuizAnswer.findOne({ userId });
    if (existingAnswer) {
      return res.status(400).json({ message: 'You have already submitted the quiz' });
    }

    // Create new quiz answer
    const quizAnswer = new QuizAnswer({
      userId,
      ...quizData
    });

    await quizAnswer.save();
    res.status(201).json({ message: 'Quiz answers submitted successfully', quizAnswer });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ message: 'Error submitting quiz answers', error: error.message });
  }
};

// Get user's quiz answers
const getQuizAnswers = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const quizAnswer = await QuizAnswer.findOne({ userId });

    if (!quizAnswer) {
      return res.status(404).json({ message: 'Quiz answers not found' });
    }

    res.json(quizAnswer);
  } catch (error) {
    console.error('Error fetching quiz answers:', error);
    res.status(500).json({ message: 'Error fetching quiz answers', error: error.message });
  }
};

// Save quiz marks
const saveQuizMarks = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please log in again.'
      });
    }

    const { subject, marks, totalQuestions, correctAnswers, answers } = req.body;
    
    // Validate required fields
    if (!subject || !marks || !totalQuestions || !correctAnswers || !answers) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Create new quiz marks record
    const quizMarks = await QuizMarks.create({
      userId: req.user._id,
      userName: req.user.name,
      subject,
      marks,
      totalQuestions,
      correctAnswers,
      answers
    });

    res.status(201).json({
      status: 'success',
      data: quizMarks
    });
  } catch (error) {
    console.error('Error saving quiz marks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save quiz marks'
    });
  }
};

// Get quiz history for a user
const getQuizHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const quizHistory = await QuizMarks.find({ userId })
      .sort({ date: -1 })
      .select('subject marks totalQuestions correctAnswers date');

    res.status(200).json({
      status: 'success',
      data: {
        quizHistory
      }
    });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch quiz history'
    });
  }
};

// Get all quiz marks for leaderboard
const getAllQuizMarks = async (req, res) => {
  try {
    const { subject } = req.query;
    
    let query = {};
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    const marks = await QuizMarks.find(query)
      .sort({ marks: -1, date: -1 })
      .select('userName subject marks totalQuestions correctAnswers date')
      .limit(100);

    res.json(marks);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ message: 'Error fetching leaderboard data' });
  }
};

module.exports = {
  submitQuiz,
  getQuizAnswers,
  saveQuizMarks,
  getQuizHistory,
  getAllQuizMarks
}; 