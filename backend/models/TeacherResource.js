const mongoose = require('mongoose');

const teacherResourceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'docx', 'video', 'other'],
    },
    targetGroup: {
      type: String,
      trim: true,
      default: 'All students',
    },
    storageProvider: {
      type: String,
      default: 'firebase-storage-pending',
    },
    storagePath: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherResource', teacherResourceSchema);
