import express from 'express';
import QuizResult from '../models/QuizResult.js';
import { auth } from '../middleware/auth.js';
import QuizMarks from '../models/QuizMarks.js';

const router = express.Router();

// Save quiz results
router.post('/save-result', auth, async (req, res) => {
  try {
    const { subject, score, answers } = req.body;
    const userId = req.user._id;

    console.log('Received quiz data:', { userId, subject, score, answers });

    // Validate required fields
    if (!subject || !score || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate score format
    if (!score.correct || !score.total || !score.percentage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid score format'
      });
    }

    // Create new quiz result
    const quizResult = new QuizResult({
      userId,
      subject,
      score,
      answers
    });

    // Save to database
    const savedResult = await quizResult.save();
    console.log('Quiz result saved:', savedResult);

    res.status(201).json({
      success: true,
      message: 'Quiz results saved successfully',
      data: savedResult
    });
  } catch (error) {
    console.error('Error saving quiz results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quiz results',
      error: error.message
    });
  }
});

// Get user's quiz history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const quizHistory = await QuizResult.find({ userId })
      .sort({ createdAt: -1 })
      .select('subject score date');

    res.status(200).json({
      success: true,
      data: quizHistory
    });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz history',
      error: error.message
    });
  }
});

// Save quiz marks
router.post('/save-marks', auth, async (req, res) => {
  try {
    const { userId, userName, subject, marks, totalQuestions, correctAnswers, answers } = req.body;

    // Validate required fields
    if (!userId || !userName || !subject || !marks || !totalQuestions || !correctAnswers || !answers) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Validate subject
    const validSubjects = ['ads', 'ds', 'am', 'java', 'dbms'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid subject'
      });
    }

    // Validate marks
    if (marks < 0 || marks > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid marks value'
      });
    }

    // Create new quiz marks record
    const quizMarks = await QuizMarks.create({
      userId,
      userName,
      subject,
      marks,
      totalQuestions,
      correctAnswers,
      answers,
      date: new Date()
    });

    res.status(201).json({
      status: 'success',
      data: {
        quizMarks
      }
    });
  } catch (error) {
    console.error('Error saving quiz marks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save quiz marks'
    });
  }
});

// Get quiz history for a user
router.get('/history', auth, async (req, res) => {
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
});

export default router; 