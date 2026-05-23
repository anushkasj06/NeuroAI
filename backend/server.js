const express = require('express');
const http    = require('http');
const path    = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes            = require('./routes/authRoutes');
const profileRoutes         = require('./routes/profileRoutes');
const quizRoutes            = require('./routes/quizRoutes');
const diagnosticRoutes      = require('./routes/diagnosticRoutes');
const rapidBattleRoutes     = require('./routes/rapidBattleRoutes');
const studyPlanRoutes       = require('./routes/studyPlanRoutes');
const learningMaterialRoutes = require('./routes/learningMaterialRoutes');
const adaptiveTeacherRoutes = require('./routes/adaptiveTeacherRoutes');
const chatbotRoutes         = require('./routes/chatbotRoutes');
const teacherRoutes         = require('./routes/teacherRoutes');
const contentRoutes         = require('./routes/contentRoutes');

const { initSocket } = require('./sockets');

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  const { getOnlineCount } = require('./sockets/socketManager');
  res.json({
    status: 'ok',
    mongo:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socket: { enabled: true, onlineUsers: getOnlineCount() },
    routes: [
      'auth', 'profile', 'quiz', 'diagnostic', 'rapid-battle',
      'study-plan', 'learning-material', 'ai-teacher',
      'chatbot', 'teacher', 'content',
    ],
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
app.use('/api/ai-teacher', adaptiveTeacherRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/content', contentRoutes);

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
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File exceeds the 25MB upload limit.',
    });
  }
  if (err.message === 'Unsupported file type') {
    return res.status(400).json({
      status: 'error',
      message: 'Unsupported file type. Upload images, video, PDF, or office files.',
    });
  }
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// ── HTTP server + Socket.IO ───────────────────────────────────────────────────
const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

// Attach Socket.IO to the same HTTP server
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`REST  → http://localhost:${PORT}/api`);
  console.log(`WS    → ws://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} in use — trying ${PORT + 1}`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', err);
  }
});
