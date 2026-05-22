const mongoose = require('mongoose');

const subjectPerformanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    subjectSlug: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    currentMarks: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

subjectPerformanceSchema.index({ userId: 1, subjectSlug: 1 }, { unique: true });

module.exports = mongoose.model('SubjectPerformance', subjectPerformanceSchema);
