const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: '' },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const blockSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'file', 'callout', 'checklist'],
    },
    text: { type: String, trim: true, default: '' },
    style: { type: String, trim: true, default: 'paragraph' },
    tone: { type: String, trim: true, default: 'info' },
    url: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
    checklist: { type: [checklistItemSchema], default: [] },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const studyContentSchema = new mongoose.Schema(
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
    summary: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    coverImage: { type: assetSchema, default: () => ({}) },
    blocks: { type: [blockSchema], default: [] },
    targetUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    tags: { type: [String], default: [] },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyContent', studyContentSchema);
