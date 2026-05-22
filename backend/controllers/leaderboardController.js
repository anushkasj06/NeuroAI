const QuizScore = require('../models/QuizScore');

// Save quiz score
exports.saveQuizScore = async (req, res) => {
  try {
    const { subject, totalScore, correctAnswers, totalQuestions } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    const quizScore = new QuizScore({
      userId,
      userName,
      subject,
      totalScore,
      correctAnswers,
      totalQuestions
    });

    await quizScore.save();

    res.status(201).json({
      success: true,
      data: quizScore
    });
  } catch (error) {
    console.error('Error saving quiz score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quiz score'
    });
  }
};

// Get leaderboard data
exports.getLeaderboard = async (req, res) => {
  try {
    const { subject } = req.query;
    
    let query = {};
    if (subject && subject !== 'all') {
      query.subject = subject.toLowerCase();
    }

    const leaderboard = await QuizScore.find(query)
      .sort({ totalScore: -1, date: -1 })
      .select('userName subject totalScore correctAnswers totalQuestions date')
      .limit(100);

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard data'
    });
  }
}; 