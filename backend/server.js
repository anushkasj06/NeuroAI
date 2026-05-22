const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const quizRoutes = require('./routes/quizRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const rapidBattleRoutes = require('./routes/rapidBattleRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const learningMaterialRoutes = require('./routes/learningMaterialRoutes');
const teacherRoutes = require('./routes/teacherRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    routes: ['auth', 'profile', 'quiz', 'diagnostic', 'rapid-battle', 'study-plan', 'learning-material', 'teacher'],
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/rapid-battle', rapidBattleRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/learning-material', learningMaterialRoutes);
app.use('/api/teacher', teacherRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}`);
    app.listen(PORT + 1, () => {
      console.log(`Server is running on port ${PORT + 1}`);
    });
  } else {
    console.error('Server error:', err);
  }
});
