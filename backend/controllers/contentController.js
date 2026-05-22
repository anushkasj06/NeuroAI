const StudyContent = require('../models/StudyContent');
const User = require('../models/User');

const normalizeString = (value, maxLength = 4000) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => normalizeString(tag, 40))
    .filter(Boolean)
    .slice(0, 12);
};

const normalizeChecklist = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      text: normalizeString(item?.text, 140),
      checked: Boolean(item?.checked),
    }))
    .filter((item) => item.text);
};

const allowedBlockTypes = new Set(['text', 'image', 'video', 'file', 'callout', 'checklist']);

const normalizeBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block) => block && typeof block === 'object')
    .map((block) => ({
      id: normalizeString(block.id, 80),
      type: block.type,
      text: normalizeString(block.text, 6000),
      style: normalizeString(block.style, 40) || 'paragraph',
      tone: normalizeString(block.tone, 40) || 'info',
      url: normalizeString(block.url, 500),
      caption: normalizeString(block.caption, 240),
      fileName: normalizeString(block.fileName, 140),
      mimeType: normalizeString(block.mimeType, 120),
      size: Number(block.size) || 0,
      checklist: normalizeChecklist(block.checklist),
    }))
    .filter((block) => allowedBlockTypes.has(block.type));
};

const normalizeCover = (coverImage) => {
  if (!coverImage || typeof coverImage !== 'object') return {};
  return {
    url: normalizeString(coverImage.url, 500),
    fileName: normalizeString(coverImage.fileName, 140),
    mimeType: normalizeString(coverImage.mimeType, 120),
    size: Number(coverImage.size) || 0,
  };
};

const resolveTargetIds = async (teacherId, targetUserIds) => {
  if (!Array.isArray(targetUserIds) || !targetUserIds.length) return [];
  const uniqueIds = [...new Set(targetUserIds.map((id) => id?.toString()).filter(Boolean))];
  if (!uniqueIds.length) return [];
  const students = await User.find({
    _id: { $in: uniqueIds },
    role: 'student',
    assignedTeacherId: teacherId,
  })
    .select('_id')
    .lean();
  return students.map((student) => student._id);
};

const buildPayload = (body) => ({
  title: normalizeString(body.title, 140),
  summary: normalizeString(body.summary, 1000),
  coverImage: normalizeCover(body.coverImage),
  blocks: normalizeBlocks(body.blocks),
  tags: normalizeTags(body.tags),
});

exports.getTeacherStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      assignedTeacherId: req.user._id,
    })
      .select('name email createdAt')
      .lean();
    res.status(200).json({ status: 'success', data: students });
  } catch (error) {
    console.error('Teacher students error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load students' });
  }
};

exports.getTeacherContent = async (req, res) => {
  try {
    const content = await StudyContent.find({ teacherId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Teacher content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load content' });
  }
};

exports.getStudentContent = async (req, res) => {
  try {
    const content = await StudyContent.find({
      status: 'published',
      targetUserIds: req.user._id,
    })
      .populate('teacherId', 'name email')
      .sort({ publishedAt: -1 })
      .lean();
    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Student content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load study materials' });
  }
};

exports.createContent = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ status: 'error', message: 'Title is required' });
    }

    const targetUserIds = await resolveTargetIds(req.user._id, req.body.targetUserIds);

    const content = await StudyContent.create({
      ...payload,
      teacherId: req.user._id,
      targetUserIds,
    });

    res.status(201).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save content' });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ status: 'error', message: 'Title is required' });
    }

    const targetUserIds = await resolveTargetIds(req.user._id, req.body.targetUserIds);

    const content = await StudyContent.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      {
        ...payload,
        targetUserIds,
      },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ status: 'error', message: 'Content not found' });
    }

    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update content' });
  }
};

exports.publishContent = async (req, res) => {
  try {
    const content = await StudyContent.findOne({
      _id: req.params.id,
      teacherId: req.user._id,
    });

    if (!content) {
      return res.status(404).json({ status: 'error', message: 'Content not found' });
    }

    const targetUserIds = await resolveTargetIds(req.user._id, req.body.targetUserIds || content.targetUserIds);

    if (!targetUserIds.length) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Select at least one student to publish' });
    }

    content.targetUserIds = targetUserIds;
    content.status = 'published';
    content.publishedAt = new Date();
    await content.save();

    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Publish content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to publish content' });
  }
};

exports.unpublishContent = async (req, res) => {
  try {
    const content = await StudyContent.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { status: 'draft', publishedAt: null },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ status: 'error', message: 'Content not found' });
    }

    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Unpublish content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to move content to draft' });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const content = await StudyContent.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user._id,
    });

    if (!content) {
      return res.status(404).json({ status: 'error', message: 'Content not found' });
    }

    res.status(200).json({ status: 'success', data: content });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete content' });
  }
};

exports.uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'File is required' });
    }

    const file = req.file;
    const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    res.status(201).json({
      status: 'success',
      data: {
        url,
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Upload asset error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to upload asset' });
  }
};
