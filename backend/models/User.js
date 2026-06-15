const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
    required: true,
  },
  teacherCode: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
    unique: true,
  },
  assignedTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resume: {
    filePath: { type: String, default: null },
    originalName: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
  },
  cachedRecommendations: {
    recommendations: { type: mongoose.Schema.Types.Mixed, default: null },
    explanation:     { type: String, default: null },
    generatedAt:     { type: Date,   default: null },
  },
  resumeData: {
    name: String,
    email: String,
    skills: [{ name: String, level: Number, category: String }],
    interests: [String],
    interestsText: String,
    projects: [String],
    experience: [String],
    certifications: [String],
    objective: String,
    college: String,
    branch: String,
    year: Number,
    resumeText: String,
    extractedAt: { type: Date, default: null },
  },
  profile: {
    collegeName: {
      type: String,
      trim: true,
    },
    currentCGPA: {
      type: Number,
      min: 0,
      max: 10,
    },
    currentYear: {
      type: Number,
      min: 1,
      max: 4,
    },
    branch: {
      type: String,
      trim: true,
    },
    hobbies: [{
      type: String,
      trim: true,
    }],
    achievements: [{
      type: String,
      trim: true,
    }],
    subjects: {
      ads: {
        type: Number,
        min: 0,
        max: 100,
      },
      ds: {
        type: Number,
        min: 0,
        max: 100,
      },
      java: {
        type: Number,
        min: 0,
        max: 100,
      },
      dbms: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
