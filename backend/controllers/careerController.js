const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const User = require('../models/User');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function mlFetch(endpoint, body, method = 'POST') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${ML_SERVICE_URL}${endpoint}`);
    const data = JSON.stringify(body);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`ML service error ${res.statusCode}: ${raw}`));
          try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON from ML service')); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function mlGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${ML_SERVICE_URL}${endpoint}`);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: 'GET' },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`ML service error ${res.statusCode}: ${raw}`));
          try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON from ML service')); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/** Build ML profile payload from NeuroAI user + resumeData */
function buildMlProfile(user) {
  const rd = user.resumeData || {};
  const p = user.profile || {};
  const skills = (rd.skills && rd.skills.length)
    ? rd.skills.map((s) => ({ name: s.name, level: s.level, category: s.category }))
    : [];
  const interests = rd.interests || [];
  return {
    name: user.name,
    email: user.email,
    college: rd.college || p.collegeName || null,
    branch: rd.branch || p.branch || null,
    year: rd.year || p.currentYear || null,
    skills,
    interests,
    interests_text: rd.interestsText || interests.join(', ') || null,
    projects: rd.projects || [],
    experience: rd.experience || [],
    certifications: rd.certifications || [],
    objective: rd.objective || null,
    resumeText: rd.resumeText || null,
  };
}

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const filePath = req.file.path;
    const fileBytes = fs.readFileSync(filePath);
    const base64 = fileBytes.toString('base64');

    // Call ML service to parse
    let resumeData = {};
    try {
      const parsed = await mlFetch('/parse-resume', { resume_text: base64, is_base64_encoded: true });
      resumeData = {
        name: parsed.name,
        email: parsed.email,
        skills: (parsed.skills || []).map((s) => (typeof s === 'string' ? { name: s } : s)),
        interests: parsed.interests || [],
        interestsText: parsed.interests_text || parsed.interestsText || null,
        projects: parsed.projects || [],
        experience: parsed.experience || [],
        certifications: parsed.certifications || [],
        objective: parsed.objective || null,
        college: parsed.college || null,
        branch: parsed.branch || null,
        year: parsed.year || null,
        resumeText: parsed.resume_text || parsed.resumeText || null,
        extractedAt: new Date(),
      };
    } catch (mlErr) {
      console.error('ML parse-resume failed:', mlErr.message);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        resume: { filePath, originalName: req.file.originalname, uploadedAt: new Date() },
        ...(Object.keys(resumeData).length ? { resumeData } : {}),
      },
      { new: true }
    ).select('-password');

    res.json({ status: 'success', data: { user, resumeData } });
  } catch (err) {
    console.error('uploadResume error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getResumeData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('resume resumeData');
    res.json({ status: 'success', data: { resume: user.resume, resumeData: user.resumeData } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('resume');
    // Remove file from disk
    if (user?.resume?.filePath) {
      try { fs.unlinkSync(user.resume.filePath); } catch {}
    }
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { resume: '', resumeData: '' },
      cachedRecommendations: { recommendations: null, explanation: null, generatedAt: null },
    });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.viewResume = async (req, res) => {
  try {
    // Allow token via query param for direct browser access (view in new tab)
    let userId = req.user?.id;
    if (!userId && req.query.token) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch { return res.status(401).json({ status: 'error', message: 'Invalid token' }); }
    }
    const user = await User.findById(userId).select('resume');
    if (!user?.resume?.filePath) return res.status(404).json({ status: 'error', message: 'No resume uploaded' });
    const absPath = path.resolve(user.resume.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ status: 'error', message: 'Resume file not found on disk' });
    const ext = path.extname(user.resume.originalName || absPath).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${user.resume.originalName || 'resume' + ext}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.recommend = async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const user = await User.findById(req.user.id).select('-password');

    // Serve from MongoDB cache unless force-refresh requested
    if (!force && user.cachedRecommendations?.generatedAt) {
      return res.json({
        status: 'success',
        cached: true,
        generatedAt: user.cachedRecommendations.generatedAt,
        data: {
          recommendations: user.cachedRecommendations.recommendations,
          explanation:     user.cachedRecommendations.explanation,
        },
      });
    }

    const profile = buildMlProfile(user);
    const result = await mlFetch('/recommend?include_explanation=true', profile);

    // Persist to MongoDB
    await User.findByIdAndUpdate(req.user.id, {
      cachedRecommendations: {
        recommendations: result.recommendations,
        explanation:     result.explanation || null,
        generatedAt:     new Date(),
      },
    });

    res.json({ status: 'success', cached: false, data: result });
  } catch (err) {
    console.error('recommend error:', err);
    // If ML is down but we have a cached result, return it with a warning
    try {
      const user = await User.findById(req.user.id).select('cachedRecommendations');
      if (user?.cachedRecommendations?.generatedAt) {
        return res.json({
          status: 'success',
          cached: true,
          stale: true,
          generatedAt: user.cachedRecommendations.generatedAt,
          data: {
            recommendations: user.cachedRecommendations.recommendations,
            explanation:     user.cachedRecommendations.explanation,
          },
        });
      }
    } catch {}
    res.status(502).json({ status: 'error', message: err.message });
  }
};

exports.simulate = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const profile = buildMlProfile(user);
    const { addedSkills = [], removedSkills = [] } = req.body;
    const result = await mlFetch('/simulate', {
      current_profile: profile,
      currentProfile: profile,
      added_skills: addedSkills,
      addedSkills,
      removed_skills: removedSkills,
      removedSkills,
    });
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message });
  }
};

exports.skillGap = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const profile = buildMlProfile(user);
    const { role, goal } = req.body;
    const result = await mlFetch('/skill-gap', { profile, role: role || '', goal: goal || '' });
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message });
  }
};

// Derive a location string from a college name (e.g. 'MIT Academy... Pune' -> 'pune')
function inferLocationFromCollege(college) {
  if (!college) return 'india';
  const lower = college.toLowerCase();
  const cities = [
    'pune', 'mumbai', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
    'delhi', 'noida', 'gurgaon', 'kolkata', 'ahmedabad', 'jaipur',
    'bhopal', 'indore', 'nagpur', 'surat', 'coimbatore', 'kochi',
    'trivandrum', 'chandigarh', 'lucknow', 'patna', 'bhubaneswar',
  ];
  for (const city of cities) {
    if (lower.includes(city)) return city;
  }
  return 'india';
}

exports.roleChat = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const profile = buildMlProfile(user);
    const { role, persona, message, history } = req.body;
    const result = await mlFetch('/role-chat', { profile, role, persona, message, history: history || [] });
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message });
  }
};

exports.marketTrends = async (req, res) => {
  try {
    const result = await mlGet('/market-trends');
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message });
  }
};

exports.liveJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('resumeData profile');
    const college = user?.resumeData?.college || user?.profile?.collegeName || '';
    const defaultLocation = inferLocationFromCollege(college);
    const { role = 'software engineer', location = defaultLocation, limit = 12 } = req.query;
    const result = await mlGet(`/live-jobs?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&limit=${limit}`);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message });
  }
};
