const jwt = require('jsonwebtoken');
const User = require('../models/User');

const clearAuthCookie = (res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
};

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

exports.protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it exists
    let bearerToken;
    let cookieToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      bearerToken = req.headers.authorization.split(' ')[1];
    }

    if (req.cookies.jwt) {
      cookieToken = req.cookies.jwt;
    }

    if (!bearerToken && !cookieToken) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.',
      });
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = bearerToken ? verifyToken(bearerToken) : verifyToken(cookieToken);
    } catch (bearerError) {
      if (cookieToken && bearerToken) {
        decoded = verifyToken(cookieToken);
      } else {
        clearAuthCookie(res);
        return res.status(401).json({
          status: 'error',
          message: 'Your session is invalid or has expired. Please log in again.',
        });
      }
    }

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      clearAuthCookie(res);
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      console.error('Auth middleware error:', error);
    }
    clearAuthCookie(res);
    res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.',
    });
  }
}; 