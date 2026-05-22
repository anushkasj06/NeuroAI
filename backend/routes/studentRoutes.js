const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz'); // Adjust path as needed
const auth = require('../middleware/auth'); // Your auth middleware

router.get('/report', auth, async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.user._id;

    // Fetch all quizzes for this user
    const quizzes = await Quiz.find({ userId })
      .sort({ createdAt: -1 });

    console.log('Fetched quizzes:', quizzes); // Debug log

    // Calculate statistics
    const totalScore = quizzes.reduce((acc, quiz) => acc + quiz.score, 0);
    const averageScore = quizzes.length > 0 ? (totalScore / quizzes.length).toFixed(2) : 0;

    // Generate recommendations
    let recommendations = '';
    if (averageScore >= 80) {
      recommendations = 'Excellent performance! Keep up the great work.';
    } else if (averageScore >= 60) {
      recommendations = 'Good progress. Focus on improving weaker areas.';
    } else {
      recommendations = 'Additional practice recommended. Review core concepts.';
    }

    const reportData = {
      studentName: req.user.name,
      email: req.user.email,
      averageScore,
      totalQuizzes: quizzes.length,
      quizzes: quizzes.map(quiz => ({
        date: quiz.createdAt,
        score: quiz.score,
        subject: quiz.subject || 'General',
        totalQuestions: quiz.totalQuestions || 0,
        correctAnswers: quiz.correctAnswers || 0
      })),
      recommendations
    };

    console.log('Sending report data:', reportData); // Debug log
    res.json(reportData);

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router; 