const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_COOKIE_EXPIRES_IN = Number(process.env.JWT_COOKIE_EXPIRES_IN || 7);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const generateTeacherCode = () => `TCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createUniqueTeacherCode = async () => {
  let teacherCode = generateTeacherCode();
  let exists = await User.exists({ teacherCode });

  while (exists) {
    teacherCode = generateTeacherCode();
    exists = await User.exists({ teacherCode });
  }

  return teacherCode;
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  // Remove password from output
  user.password = undefined;

  // Set cookie
  res.cookie('jwt', token, cookieOptions);

  // Send response with token
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = req.body.role === 'teacher' ? 'teacher' : 'student';
    const classCode = req.body.classCode?.trim().toUpperCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use',
      });
    }

    let teacherCode;
    let assignedTeacherId = null;

    if (role === 'teacher') {
      teacherCode = await createUniqueTeacherCode();
    }

    if (role === 'student' && classCode) {
      const teacher = await User.findOne({ role: 'teacher', teacherCode: classCode });
      if (!teacher) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid teacher class code',
        });
      }
      assignedTeacherId = teacher._id;
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      teacherCode,
      assignedTeacherId,
    });

    createSendToken(user, 201, res);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      });
    }

    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
      });
    }

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
}; 
