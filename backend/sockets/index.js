/**
 * Socket.IO initialiser.
 * Call initSocket(httpServer) once from server.js.
 * All handlers are registered here in a modular way.
 */
const { Server } = require('socket.io');
const socketAuth        = require('./middleware/socketAuth');
const connectionHandler = require('./handlers/connectionHandler');
const roomHandler       = require('./handlers/roomHandler');
const battleHandler     = require('./handlers/battleHandler');
const quizHandler       = require('./handlers/quizHandler');
const { setIO }         = require('./socketManager');

const initSocket = (httpServer) => {
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173'
  )
    .split(',')
    .map((o) => o.trim());

  const io = new Server(httpServer, {
    cors: {
      // In development allow any localhost origin; in production use explicit list
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow any localhost / 127.0.0.1 origin in development
        if (
          process.env.NODE_ENV !== 'production' &&
          (origin.includes('localhost') || origin.includes('127.0.0.1'))
        ) {
          return callback(null, true);
        }
        // In production, check against explicit list
        if (corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // Allow both transports — polling first so the handshake always succeeds,
    // then upgrades to WebSocket automatically
    transports: ['polling', 'websocket'],
    allowEIO3:  true,
    pingInterval: 25000,
    pingTimeout:  60000,
  });

  // Store the io instance globally so other modules can emit
  setIO(io);

  // ── JWT authentication middleware ──────────────────────────────────────────
  io.use(socketAuth);

  // ── Per-connection handler registration ───────────────────────────────────
  io.on('connection', (socket) => {
    connectionHandler(io, socket);
    roomHandler(io, socket);
    battleHandler(io, socket);
    quizHandler(io, socket);
  });

  console.log('[Socket.IO] Initialised ✓');
  return io;
};

module.exports = { initSocket };
