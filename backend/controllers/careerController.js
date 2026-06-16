const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const User = require('../models/User');
const { scrapeLinkedIn, normalizeLinkedInUrl } = require('../services/linkedinScraper');

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

/** Build ML profile payload from NeuroAI user + resumeData + linkedinData */
function buildMlProfile(user) {
  const rd = user.resumeData   || {};
  const li = user.linkedinData || {};
  const p  = user.profile      || {};

  // Merge skills from all sources
  const rdSkills = (rd.skills || []).map(s => ({ name: s.name, level: s.level, category: s.category }));
  const liSkills = (li.skills || []).map(s => ({ name: typeof s === 'string' ? s : s.name }));
  const skillMap = new Map();
  [...rdSkills, ...liSkills].forEach(s => { if (s.name && !skillMap.has(s.name.toLowerCase())) skillMap.set(s.name.toLowerCase(), s); });
  const skills = [...skillMap.values()];

  // Merge experience
  const rdExp = rd.experience || [];
  const liExp = (li.experience || []).map(e => `${e.title || ''} at ${e.company || ''}`.trim()).filter(Boolean);
  const experience = [...new Set([...rdExp, ...liExp])];

  // Merge certifications
  const certifications = [...new Set([...(rd.certifications || []), ...(li.certifications || [])])];

  // Merge interests — include LinkedIn about + posts as interest context
  const interests = [...new Set([...(rd.interests || [])])];
  const interestsParts = [
    rd.interestsText || '',
    li.about         || '',
    li.headline      || '',
    (li.posts || []).slice(0, 3).join(' '),
  ].filter(Boolean);
  const interestsText = interestsParts.join(' | ') || interests.join(', ') || null;

  // Merge projects
  const projects = [...new Set([...(rd.projects || [])])];

  return {
    name:           user.name,
    email:          user.email,
    college:        rd.college  || li.education?.[0]?.school || p.collegeName || null,
    branch:         rd.branch   || p.branch || null,
    year:           rd.year     || p.currentYear || null,
    skills,
    interests,
    interests_text: interestsText,
    projects,
    experience,
    certifications,
    objective:      rd.objective || li.headline || null,
    resumeText:     rd.resumeText || null,
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

// ─── Career Exploration ────────────────────────────────────────────────────

const CAREER_DATABASE = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    icon: '💻',
    description: 'Design, develop, and maintain software applications and systems.',
    avgSalary: '₹6L – ₹25L',
    growth: 'High',
    demand: 'Very High',
    skills: ['Programming', 'Data Structures', 'Algorithms', 'System Design', 'Git'],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Technology',
    icon: '📊',
    description: 'Extract insights from large datasets using statistics, ML, and programming.',
    avgSalary: '₹8L – ₹30L',
    growth: 'Very High',
    demand: 'High',
    skills: ['Python', 'Statistics', 'Machine Learning', 'SQL', 'Data Visualization'],
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    category: 'Technology',
    icon: '🤖',
    description: 'Build and deploy machine learning models at scale in production.',
    avgSalary: '₹10L – ₹35L',
    growth: 'Very High',
    demand: 'High',
    skills: ['Python', 'TensorFlow/PyTorch', 'MLOps', 'Cloud', 'Mathematics'],
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    category: 'Technology',
    icon: '🎨',
    description: 'Create user-facing web applications with modern frameworks and design systems.',
    avgSalary: '₹5L – ₹20L',
    growth: 'High',
    demand: 'High',
    skills: ['JavaScript', 'React/Vue/Angular', 'CSS', 'TypeScript', 'UI/UX'],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    category: 'Technology',
    icon: '⚙️',
    description: 'Build server-side logic, APIs, and database architectures.',
    avgSalary: '₹6L – ₹24L',
    growth: 'High',
    demand: 'High',
    skills: ['Node.js/Java/Python', 'Databases', 'APIs', 'Cloud', 'Security'],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    category: 'Technology',
    icon: '🔄',
    description: 'Bridge development and operations with CI/CD, automation, and cloud infrastructure.',
    avgSalary: '₹8L – ₹28L',
    growth: 'Very High',
    demand: 'High',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS/Azure', 'Linux'],
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Technology',
    icon: '🔒',
    description: 'Protect systems and networks from cyber threats and vulnerabilities.',
    avgSalary: '₹6L – ₹22L',
    growth: 'Very High',
    demand: 'Very High',
    skills: ['Networking', 'Security Tools', 'Ethical Hacking', 'Compliance', 'Forensics'],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    category: 'Management',
    icon: '📋',
    description: 'Define product vision, strategy, and roadmap while coordinating cross-functional teams.',
    avgSalary: '₹12L – ₹40L',
    growth: 'High',
    demand: 'High',
    skills: ['Strategy', 'Analytics', 'Communication', 'Technical Knowledge', 'UX'],
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    category: 'Design',
    icon: '✨',
    description: 'Design intuitive and beautiful user interfaces and experiences.',
    avgSalary: '₹5L – ₹20L',
    growth: 'High',
    demand: 'High',
    skills: ['Figma', 'User Research', 'Prototyping', 'Visual Design', 'Interaction Design'],
  },
  {
    id: 'cloud-architect',
    title: 'Cloud Architect',
    category: 'Technology',
    icon: '☁️',
    description: 'Design and oversee cloud computing strategy and infrastructure.',
    avgSalary: '₹15L – ₹45L',
    growth: 'Very High',
    demand: 'High',
    skills: ['AWS/Azure/GCP', 'Architecture', 'Networking', 'Security', 'Cost Optimization'],
  },
  {
    id: 'blockchain-developer',
    title: 'Blockchain Developer',
    category: 'Technology',
    icon: '⛓️',
    description: 'Build decentralized applications and smart contracts on blockchain platforms.',
    avgSalary: '₹8L – ₹35L',
    growth: 'High',
    demand: 'Medium',
    skills: ['Solidity', 'Web3.js', 'Smart Contracts', 'Cryptography', 'DeFi'],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'Analytics',
    icon: '📈',
    description: 'Analyze data to help businesses make informed decisions.',
    avgSalary: '₹4L – ₹15L',
    growth: 'High',
    demand: 'Very High',
    skills: ['Excel', 'SQL', 'Python/R', 'Tableau/Power BI', 'Statistics'],
  },
];

function getPathwaysForCareer(careerId, qualification) {
  const pathways = {
    'software-engineer': [
      {
        name: 'Self-Taught + Open Source',
        duration: '6–12 months',
        steps: [
          { title: 'Master a Language', desc: 'Learn Python or JavaScript deeply through online resources', duration: '2 months' },
          { title: 'DSA & Problem Solving', desc: 'Complete 200+ problems on LeetCode/CodeForces', duration: '3 months' },
          { title: 'Build Projects', desc: 'Create 3–4 full-stack projects with real-world use cases', duration: '2 months' },
          { title: 'Open Source Contribution', desc: 'Contribute to popular open-source projects on GitHub', duration: '2 months' },
          { title: 'Apply & Interview Prep', desc: 'Practice system design and mock interviews', duration: '1 month' },
        ],
      },
      {
        name: 'Campus Placement Path',
        duration: '2–3 years (during degree)',
        steps: [
          { title: 'Academic Foundation', desc: 'Focus on CS fundamentals — OS, DBMS, Networks, OOP', duration: '1 year' },
          { title: 'Coding Practice', desc: 'Regular competitive programming and DSA practice', duration: 'Ongoing' },
          { title: 'Internships', desc: 'Secure 1–2 internships via college placements or referrals', duration: '3–6 months' },
          { title: 'Campus Placement Prep', desc: 'Aptitude, coding rounds, and HR interview preparation', duration: '3 months' },
        ],
      },
      {
        name: 'Bootcamp Route',
        duration: '4–6 months',
        steps: [
          { title: 'Join a Coding Bootcamp', desc: 'Enroll in an intensive full-stack or backend bootcamp', duration: '3–4 months' },
          { title: 'Capstone Project', desc: 'Build a production-grade project as part of the bootcamp', duration: '1 month' },
          { title: 'Job Assistance', desc: 'Leverage bootcamp placement support and network', duration: '1–2 months' },
        ],
      },
    ],
    'data-scientist': [
      {
        name: 'Academic + Research Path',
        duration: '2–3 years',
        steps: [
          { title: 'Mathematics Foundation', desc: 'Linear Algebra, Probability, Calculus — Khan Academy/MIT OCW', duration: '3 months' },
          { title: 'Programming & Libraries', desc: 'Python, NumPy, Pandas, Matplotlib, Scikit-learn', duration: '2 months' },
          { title: 'Machine Learning', desc: 'Andrew Ng\'s course + hands-on Kaggle competitions', duration: '3 months' },
          { title: 'Deep Learning & Specialization', desc: 'NLP/CV/Time Series — pick a specialization', duration: '4 months' },
          { title: 'Research or Masters', desc: 'Publish papers or pursue M.Tech/MS in Data Science', duration: '1–2 years' },
        ],
      },
      {
        name: 'Industry-Ready Fast Track',
        duration: '8–12 months',
        steps: [
          { title: 'Python & SQL Mastery', desc: 'Data manipulation, queries, and automation', duration: '2 months' },
          { title: 'Statistics & EDA', desc: 'Hypothesis testing, distributions, exploratory data analysis', duration: '2 months' },
          { title: 'ML Model Building', desc: 'Classification, regression, clustering — real datasets', duration: '3 months' },
          { title: 'Portfolio & Kaggle', desc: 'Top 10% in 2+ Kaggle competitions, build portfolio site', duration: '2 months' },
          { title: 'Interview Prep', desc: 'Case studies, SQL rounds, ML theory questions', duration: '1 month' },
        ],
      },
    ],
    'ml-engineer': [
      {
        name: 'Research to Production',
        duration: '1–2 years',
        steps: [
          { title: 'Strong ML Foundation', desc: 'Complete Stanford CS229 or equivalent — theory + practice', duration: '3 months' },
          { title: 'Deep Learning Expertise', desc: 'PyTorch/TensorFlow — build models from scratch', duration: '3 months' },
          { title: 'MLOps & Deployment', desc: 'Docker, model serving, CI/CD for ML, monitoring', duration: '3 months' },
          { title: 'Cloud ML Services', desc: 'AWS SageMaker, GCP Vertex AI, or Azure ML', duration: '2 months' },
          { title: 'Production Projects', desc: 'Deploy 2–3 end-to-end ML pipelines', duration: '3 months' },
        ],
      },
      {
        name: 'Software Engineer → ML Engineer',
        duration: '8–12 months',
        steps: [
          { title: 'Math Refresher', desc: 'Linear algebra, calculus, and probability review', duration: '1 month' },
          { title: 'ML Fundamentals', desc: 'Scikit-learn, feature engineering, model evaluation', duration: '2 months' },
          { title: 'Deep Learning', desc: 'Neural networks, CNNs, RNNs, Transformers', duration: '3 months' },
          { title: 'ML System Design', desc: 'Scaling models, A/B testing, feature stores', duration: '2 months' },
          { title: 'Transition & Apply', desc: 'Internal transfer or external applications to ML roles', duration: '2 months' },
        ],
      },
    ],
    'frontend-developer': [
      {
        name: 'Zero to Frontend Hero',
        duration: '6–9 months',
        steps: [
          { title: 'HTML, CSS & JS Fundamentals', desc: 'Build 10+ responsive static pages', duration: '2 months' },
          { title: 'React/Vue Framework', desc: 'Component architecture, state management, routing', duration: '2 months' },
          { title: 'Advanced CSS & Animations', desc: 'Tailwind, Framer Motion, responsive design patterns', duration: '1 month' },
          { title: 'Full Projects', desc: 'E-commerce site, dashboard app, portfolio — deploy all', duration: '2 months' },
          { title: 'Job Prep', desc: 'JavaScript concepts, React internals, coding challenges', duration: '1 month' },
        ],
      },
      {
        name: 'Design-First Frontend',
        duration: '8–10 months',
        steps: [
          { title: 'UI/UX Fundamentals', desc: 'Figma, design systems, user research basics', duration: '2 months' },
          { title: 'CSS Mastery', desc: 'Grid, Flexbox, animations, accessibility', duration: '1 month' },
          { title: 'JavaScript & TypeScript', desc: 'ES6+, async patterns, type safety', duration: '2 months' },
          { title: 'React + Design Systems', desc: 'Build a component library, Storybook, testing', duration: '2 months' },
          { title: 'Portfolio & Freelance', desc: 'Showcase design-to-code projects, take freelance gigs', duration: '2 months' },
        ],
      },
    ],
    'backend-developer': [
      {
        name: 'Node.js Backend Path',
        duration: '6–9 months',
        steps: [
          { title: 'JavaScript Deep Dive', desc: 'Async/await, closures, event loop, Node.js runtime', duration: '1 month' },
          { title: 'Express & APIs', desc: 'REST APIs, middleware, authentication, validation', duration: '2 months' },
          { title: 'Databases', desc: 'MongoDB, PostgreSQL — schema design, indexing, queries', duration: '2 months' },
          { title: 'Cloud & Deployment', desc: 'Docker, AWS/Heroku, CI/CD pipelines', duration: '1 month' },
          { title: 'Production Projects', desc: 'Build 2–3 scalable backend services', duration: '2 months' },
        ],
      },
      {
        name: 'Java/Spring Enterprise Path',
        duration: '8–12 months',
        steps: [
          { title: 'Java Core & OOP', desc: 'Collections, multithreading, design patterns', duration: '2 months' },
          { title: 'Spring Boot', desc: 'REST APIs, Spring Security, JPA/Hibernate', duration: '3 months' },
          { title: 'Microservices', desc: 'Service discovery, API gateway, event-driven architecture', duration: '2 months' },
          { title: 'Enterprise Tools', desc: 'Kafka, Redis, Docker, Kubernetes basics', duration: '2 months' },
          { title: 'Internship/Job', desc: 'Apply to enterprise companies, prepare for interviews', duration: '2 months' },
        ],
      },
    ],
    'devops-engineer': [
      {
        name: 'Linux Admin → DevOps',
        duration: '8–12 months',
        steps: [
          { title: 'Linux & Networking', desc: 'Command line, shell scripting, TCP/IP, DNS', duration: '2 months' },
          { title: 'Version Control & CI/CD', desc: 'Git workflows, Jenkins/GitHub Actions, automated testing', duration: '2 months' },
          { title: 'Containers & Orchestration', desc: 'Docker deep-dive, Kubernetes, Helm charts', duration: '3 months' },
          { title: 'Cloud Platform', desc: 'AWS Solutions Architect or Azure Administrator cert path', duration: '2 months' },
          { title: 'IaC & Monitoring', desc: 'Terraform, Ansible, Prometheus, Grafana', duration: '2 months' },
        ],
      },
      {
        name: 'Developer → DevOps Transition',
        duration: '6–8 months',
        steps: [
          { title: 'CI/CD for Your Projects', desc: 'Automate builds, tests, deployments for existing code', duration: '1 month' },
          { title: 'Docker & Containers', desc: 'Containerize applications, multi-stage builds', duration: '1 month' },
          { title: 'Kubernetes', desc: 'Deployments, services, ingress, scaling', duration: '2 months' },
          { title: 'Cloud Certification', desc: 'AWS DevOps or GCP Cloud Engineer certification', duration: '2 months' },
          { title: 'Platform Engineering', desc: 'Internal developer platforms, golden paths', duration: '1 month' },
        ],
      },
    ],
    'cybersecurity-analyst': [
      {
        name: 'Certification-Driven Path',
        duration: '10–14 months',
        steps: [
          { title: 'CompTIA Security+', desc: 'Foundational security concepts, threats, and tools', duration: '2 months' },
          { title: 'Networking Deep Dive', desc: 'Wireshark, firewalls, VPNs, packet analysis', duration: '2 months' },
          { title: 'Ethical Hacking (CEH/eJPT)', desc: 'Penetration testing, vulnerability assessment', duration: '3 months' },
          { title: 'SOC Analyst Skills', desc: 'SIEM tools, log analysis, incident response', duration: '3 months' },
          { title: 'CTF & Bug Bounty', desc: 'Practice on HackTheBox, TryHackMe, submit bug bounties', duration: 'Ongoing' },
        ],
      },
    ],
    'product-manager': [
      {
        name: 'Tech Background → PM',
        duration: '6–12 months',
        steps: [
          { title: 'Product Thinking', desc: 'Read Inspired, Lean Startup — understand product frameworks', duration: '1 month' },
          { title: 'User Research & Analytics', desc: 'Customer interviews, data analysis, A/B testing', duration: '2 months' },
          { title: 'Product Strategy', desc: 'Roadmapping, prioritization frameworks (RICE, ICE)', duration: '2 months' },
          { title: 'Side Project as PM', desc: 'Lead a product initiative — even open source counts', duration: '3 months' },
          { title: 'PM Interview Prep', desc: 'Case studies, product sense, estimation questions', duration: '2 months' },
        ],
      },
    ],
    'ui-ux-designer': [
      {
        name: 'Self-Taught Designer Path',
        duration: '6–10 months',
        steps: [
          { title: 'Design Fundamentals', desc: 'Color theory, typography, layout, Gestalt principles', duration: '1 month' },
          { title: 'Figma Mastery', desc: 'Components, auto-layout, prototyping, design systems', duration: '2 months' },
          { title: 'UX Research', desc: 'User interviews, usability testing, personas, journey maps', duration: '2 months' },
          { title: 'Case Studies', desc: 'Redesign 3–4 apps, document process end-to-end', duration: '2 months' },
          { title: 'Portfolio & Apply', desc: 'Build a stunning portfolio site showcasing your process', duration: '2 months' },
        ],
      },
    ],
    'cloud-architect': [
      {
        name: 'Certification Ladder',
        duration: '12–18 months',
        steps: [
          { title: 'Cloud Practitioner/Fundamentals', desc: 'AWS Cloud Practitioner or Azure Fundamentals', duration: '1 month' },
          { title: 'Solutions Architect Associate', desc: 'Design highly available, cost-efficient systems', duration: '3 months' },
          { title: 'Hands-On Projects', desc: 'Build multi-tier architectures, serverless apps', duration: '3 months' },
          { title: 'Solutions Architect Professional', desc: 'Advanced networking, migration, multi-account', duration: '4 months' },
          { title: 'Specialty Certification', desc: 'Security, ML, or Networking specialty', duration: '3 months' },
        ],
      },
    ],
    'blockchain-developer': [
      {
        name: 'Web3 Developer Path',
        duration: '6–10 months',
        steps: [
          { title: 'Blockchain Fundamentals', desc: 'Consensus mechanisms, cryptography, distributed systems', duration: '1 month' },
          { title: 'Solidity & Smart Contracts', desc: 'ERC-20, ERC-721, security patterns, testing', duration: '3 months' },
          { title: 'DApp Development', desc: 'Web3.js/Ethers.js, Hardhat, frontend integration', duration: '2 months' },
          { title: 'DeFi & Advanced', desc: 'AMMs, lending protocols, cross-chain, L2 solutions', duration: '2 months' },
          { title: 'Hackathons & Portfolio', desc: 'Win/participate in Web3 hackathons, deploy on mainnet', duration: '2 months' },
        ],
      },
    ],
    'data-analyst': [
      {
        name: 'Analytics Fast Track',
        duration: '4–6 months',
        steps: [
          { title: 'Excel & Google Sheets', desc: 'Pivot tables, VLOOKUP, charts, data cleaning', duration: '1 month' },
          { title: 'SQL Mastery', desc: 'Complex queries, joins, window functions, CTEs', duration: '1.5 months' },
          { title: 'Visualization Tools', desc: 'Tableau or Power BI — build interactive dashboards', duration: '1.5 months' },
          { title: 'Python for Analysis', desc: 'Pandas, Matplotlib, Seaborn — automated reporting', duration: '1.5 months' },
          { title: 'Business Projects', desc: 'Analyze real datasets, present insights to stakeholders', duration: '1 month' },
        ],
      },
      {
        name: 'Business Graduate Path',
        duration: '6–8 months',
        steps: [
          { title: 'Statistics Foundation', desc: 'Descriptive stats, hypothesis testing, regression', duration: '2 months' },
          { title: 'SQL & Data Warehousing', desc: 'Database concepts, star schema, ETL basics', duration: '2 months' },
          { title: 'BI Tool Certification', desc: 'Get certified in Tableau/Power BI', duration: '1 month' },
          { title: 'Domain Specialization', desc: 'Finance, marketing, or operations analytics focus', duration: '2 months' },
          { title: 'Internship', desc: 'Apply for analytics internships at target companies', duration: '1 month' },
        ],
      },
    ],
  };

  return pathways[careerId] || [
    {
      name: 'General Path',
      duration: '6–12 months',
      steps: [
        { title: 'Research the Role', desc: 'Understand daily responsibilities, required skills, and industry', duration: '2 weeks' },
        { title: 'Build Foundation Skills', desc: 'Take online courses for core competencies', duration: '3 months' },
        { title: 'Hands-On Projects', desc: 'Apply skills through personal or open-source projects', duration: '3 months' },
        { title: 'Network & Apply', desc: 'Connect with professionals, attend events, apply to positions', duration: '2 months' },
      ],
    },
  ];
}

exports.exploreCareer = async (req, res) => {
  try {
    const { category } = req.query;
    let careers = CAREER_DATABASE;
    if (category && category !== 'All') {
      careers = careers.filter((c) => c.category === category);
    }
    const categories = [...new Set(CAREER_DATABASE.map((c) => c.category))];
    res.json({ status: 'success', data: { careers, categories } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getCareerPathways = async (req, res) => {
  try {
    const { careerId } = req.params;
    const career = CAREER_DATABASE.find((c) => c.id === careerId);
    if (!career) return res.status(404).json({ status: 'error', message: 'Career not found' });

    // Get user qualification from multiple sources
    const user = await User.findById(req.user.id).select('-password');
    const StudentProfile = require('../models/StudentProfile');
    const studentProfile = await StudentProfile.findOne({ userId: req.user.id });

    const educationLevel = studentProfile?.educationLevel || null;
    const branch = user?.resumeData?.branch || user?.profile?.branch || null;
    const year = user?.resumeData?.year || user?.profile?.currentYear || null;
    const college = user?.resumeData?.college || user?.profile?.collegeName || null;
    const cgpa = user?.profile?.currentCGPA || null;
    const skills = (user?.resumeData?.skills || []).map((s) => s.name || s).filter(Boolean);
    const interests = user?.resumeData?.interests || [];
    const subjects = user?.profile?.subjects || null;

    // Build a richer qualification object
    const qualification = {
      name: user?.name || null,
      educationLevel,
      branch,
      year,
      college,
      cgpa,
      skills,
      interests,
      subjects,
    };

    // Check if qualification has any real data
    const hasData = educationLevel || branch || year || college || cgpa || skills.length > 0 || interests.length > 0;
    
    const pathways = getPathwaysForCareer(careerId, qualification);
    res.json({ status: 'success', data: { career, pathways, qualification: hasData ? qualification : null } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
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

// ─── LinkedIn endpoints ────────────────────────────────────────────────────

exports.scrapeLinkedIn = async (req, res) => {
  const { linkedinUrl } = req.body;
  if (!linkedinUrl) return res.status(400).json({ status: 'error', message: 'linkedinUrl is required' });

  // Save URL immediately so UI shows "in progress"
  await User.findByIdAndUpdate(req.user.id, {
    linkedinUrl,
    'linkedinData.scrapeError': null,
    'linkedinData.scrapedAt': null,
  });

  try {
    const data = await scrapeLinkedIn(linkedinUrl);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { linkedinUrl, linkedinData: data },
      { new: true }
    ).select('-password');

    // Invalidate recommendation cache so next load re-generates with LinkedIn context
    await User.findByIdAndUpdate(req.user.id, {
      'cachedRecommendations.generatedAt': null,
    });

    res.json({ status: 'success', data: { linkedinData: user.linkedinData } });
  } catch (err) {
    // Persist the error so the UI can show it
    await User.findByIdAndUpdate(req.user.id, {
      'linkedinData.scrapeError': err.message,
      'linkedinData.scrapedAt': new Date(),
    });
    res.status(422).json({ status: 'error', message: err.message });
  }
};

exports.getLinkedInData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('linkedinUrl linkedinData');
    res.json({ status: 'success', data: { linkedinUrl: user.linkedinUrl, linkedinData: user.linkedinData } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.clearLinkedInData = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { linkedinUrl: '', linkedinData: '' },
      'cachedRecommendations.generatedAt': null,
    });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
