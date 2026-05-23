/**
 * Socket.IO JWT authentication middleware.
 * Validates the token sent in socket.handshake.auth.token
 * and attaches the decoded user to socket.user.
 */
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const socketAuth = async (socket, next) => {
  try {
    // Token can come from auth object or query string (fallback)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('AUTH_MISSING_TOKEN'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return next(new Error('AUTH_TOKEN_EXPIRED'));
      return next(new Error('AUTH_TOKEN_INVALID'));
    }

    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) {
      return next(new Error('AUTH_USER_NOT_FOUND'));
    }

    // Attach authenticated user to socket for use in handlers
    socket.user = {
      _id:   user._id.toString(),
      name:  user.name,
      email: user.email,
      role:  user.role || 'student',
    };

    next();
  } catch (err) {
    console.error('[SocketAuth] Unexpected error:', err.message);
    next(new Error('AUTH_INTERNAL_ERROR'));
  }
};

module.exports = socketAuth;
