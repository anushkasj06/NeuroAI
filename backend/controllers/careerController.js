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
      {
        name: 'Hands-On Hacker Path',
        duration: '8–12 months',
        steps: [
          { title: 'Linux & Networking Mastery', desc: 'Command line, TCP/IP, packet capture with Wireshark', duration: '2 months' },
          { title: 'TryHackMe / HackTheBox', desc: 'Complete beginner-to-advanced rooms and boxes', duration: '3 months' },
          { title: 'Bug Bounty Hunting', desc: 'Start on platforms like HackerOne, Bugcrowd', duration: '3 months' },
          { title: 'eJPT / OSCP Certification', desc: 'Practical penetration testing certification', duration: '3 months' },
          { title: 'Specialize', desc: 'Choose: Red Team, Blue Team, or AppSec', duration: '2 months' },
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
      {
        name: 'MBA / Business Background → PM',
        duration: '8–14 months',
        steps: [
          { title: 'Technical Literacy', desc: 'Learn basics of APIs, databases, and how software is built', duration: '2 months' },
          { title: 'Analytics & SQL', desc: 'Learn SQL, product analytics tools (Amplitude, Mixpanel)', duration: '2 months' },
          { title: 'Product Management Course', desc: 'Complete a structured PM course (Reforge, Product School)', duration: '2 months' },
          { title: 'Associate PM Role or Internship', desc: 'Get hands-on experience managing a product or feature', duration: '4 months' },
          { title: 'Build a PM Portfolio', desc: 'Document product teardowns, case studies, and metrics-driven decisions', duration: '2 months' },
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
      {
        name: 'Bootcamp / Formal Education Path',
        duration: '4–6 months',
        steps: [
          { title: 'Join a UX Bootcamp', desc: 'Google UX Certificate, Designlab, or Springboard', duration: '3 months' },
          { title: 'Capstone Project', desc: 'End-to-end design project from research to hi-fi prototype', duration: '1 month' },
          { title: 'Freelance or Internship', desc: 'Take on 2–3 freelance projects or a design internship', duration: '2 months' },
          { title: 'Portfolio Refinement', desc: 'Polish case studies and publish on Behance/Dribbble', duration: '1 month' },
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
      {
        name: 'DevOps/SysAdmin → Cloud Architect',
        duration: '10–14 months',
        steps: [
          { title: 'Cloud Foundations', desc: 'Migrate existing on-prem knowledge to cloud equivalents', duration: '2 months' },
          { title: 'Infrastructure as Code', desc: 'Terraform, CloudFormation — automate everything', duration: '2 months' },
          { title: 'Multi-Service Architectures', desc: 'Design solutions using compute, storage, networking, databases', duration: '3 months' },
          { title: 'Security & Cost Optimization', desc: 'IAM best practices, cost monitoring, FinOps principles', duration: '2 months' },
          { title: 'Lead Architecture Reviews', desc: 'Present designs, conduct well-architected reviews', duration: '3 months' },
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
      {
        name: 'Smart Contract Security Auditor',
        duration: '8–12 months',
        steps: [
          { title: 'Solidity Deep Dive', desc: 'Master the EVM, gas optimization, assembly', duration: '2 months' },
          { title: 'Common Vulnerabilities', desc: 'Study reentrancy, overflow, front-running, oracle manipulation', duration: '2 months' },
          { title: 'Audit Tools', desc: 'Learn Slither, Mythril, Echidna for automated analysis', duration: '2 months' },
          { title: 'Practice Audits', desc: 'Audit open-source protocols, participate in Code4rena contests', duration: '3 months' },
          { title: 'Bug Bounties', desc: 'Submit findings on Immunefi, build auditor reputation', duration: 'Ongoing' },
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

/**
 * Determine which pathway index to suggest based on user qualification.
 * Heuristics:
 *  - If user has skills/experience → suggest self-taught/hands-on paths (index 0 typically)
 *  - If user is currently in college → suggest campus/academic paths
 *  - If user is a graduate/postgraduate or working → suggest transition/fast-track paths
 *  - If user has no qualification data → suggest index 0 (most accessible)
 */
function getSuggestedPathwayIndex(careerId, qualification, pathwayCount) {
  if (!qualification || pathwayCount <= 1) return 0;

  const edu = (qualification.educationLevel || '').toLowerCase();
  const skills = qualification.skills || [];
  const hasSkills = skills.length >= 3;
  const isInCollege = edu.includes('_fe') || edu.includes('_se') || edu.includes('_te') || edu.includes('_be') || (qualification.year && qualification.year <= 4);
  const isGraduate = edu.includes('graduate') || edu.includes('postgraduate');
  const isSchool = edu.includes('standard');

  // Career-specific suggestion logic
  switch (careerId) {
    case 'software-engineer':
      // 0: Self-Taught, 1: Campus Placement, 2: Bootcamp
      if (isInCollege) return 1; // Campus placement path
      if (hasSkills) return 0;   // Self-taught path
      return 2;                  // Bootcamp for fresh starters

    case 'data-scientist':
      // 0: Academic + Research, 1: Industry Fast Track
      if (isGraduate || (isInCollege && edu.includes('_be'))) return 0; // Research path
      return 1; // Fast track

    case 'ml-engineer':
      // 0: Research to Production, 1: SWE → ML Engineer
      if (hasSkills && skills.some(s => s.toLowerCase().includes('python') || s.toLowerCase().includes('java'))) return 1;
      return 0;

    case 'frontend-developer':
      // 0: Zero to Hero, 1: Design-First
      if (skills.some(s => s.toLowerCase().includes('design') || s.toLowerCase().includes('figma') || s.toLowerCase().includes('ui'))) return 1;
      return 0;

    case 'backend-developer':
      // 0: Node.js Path, 1: Java/Spring Path
      if (skills.some(s => s.toLowerCase().includes('java') || s.toLowerCase().includes('spring'))) return 1;
      return 0;

    case 'devops-engineer':
      // 0: Linux Admin → DevOps, 1: Developer → DevOps
      if (hasSkills && skills.some(s => s.toLowerCase().includes('python') || s.toLowerCase().includes('javascript') || s.toLowerCase().includes('react'))) return 1;
      return 0;

    case 'cybersecurity-analyst':
      // 0: Certification-Driven, 1: Hands-On Hacker
      if (hasSkills && skills.some(s => s.toLowerCase().includes('linux') || s.toLowerCase().includes('network'))) return 1;
      return 0;

    case 'product-manager':
      // 0: Tech Background → PM, 1: MBA/Business → PM
      if (hasSkills && skills.some(s => s.toLowerCase().includes('code') || s.toLowerCase().includes('python') || s.toLowerCase().includes('engineering'))) return 0;
      return 1;

    case 'ui-ux-designer':
      // 0: Self-Taught, 1: Bootcamp/Formal
      if (isSchool || (!hasSkills && !isGraduate)) return 1; // Bootcamp for those without design background
      return 0;

    case 'cloud-architect':
      // 0: Certification Ladder, 1: DevOps/SysAdmin → Cloud
      if (hasSkills && skills.some(s => s.toLowerCase().includes('linux') || s.toLowerCase().includes('docker') || s.toLowerCase().includes('aws'))) return 1;
      return 0;

    case 'blockchain-developer':
      // 0: Web3 Developer, 1: Security Auditor
      if (hasSkills && skills.some(s => s.toLowerCase().includes('solidity') || s.toLowerCase().includes('security'))) return 1;
      return 0;

    case 'data-analyst':
      // 0: Analytics Fast Track, 1: Business Graduate Path
      if (isGraduate || (qualification.branch && qualification.branch.toLowerCase().includes('business'))) return 1;
      return 0;

    default:
      return 0;
  }
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
    const suggestedPathwayIndex = getSuggestedPathwayIndex(careerId, hasData ? qualification : null, pathways.length);
    res.json({ status: 'success', data: { career, pathways, qualification: hasData ? qualification : null, suggestedPathwayIndex } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Skill Roadmaps (inspired by roadmap.sh) ──────────────────────────────

const SKILL_ROADMAPS = {
  'software-engineer': {
    title: 'Software Engineer Roadmap',
    levels: [
      {
        label: 'Fundamentals',
        color: '#fbbf24',
        nodes: [
          { id: 'cs-basics', name: 'CS Fundamentals', children: ['os', 'networks', 'dbms'] },
          { id: 'os', name: 'Operating Systems' },
          { id: 'networks', name: 'Computer Networks' },
          { id: 'dbms', name: 'Databases & SQL' },
        ],
      },
      {
        label: 'Programming',
        color: '#34d399',
        nodes: [
          { id: 'lang', name: 'Pick a Language', children: ['python', 'java', 'javascript', 'cpp'] },
          { id: 'python', name: 'Python' },
          { id: 'java', name: 'Java' },
          { id: 'javascript', name: 'JavaScript' },
          { id: 'cpp', name: 'C++' },
        ],
      },
      {
        label: 'Data Structures & Algorithms',
        color: '#60a5fa',
        nodes: [
          { id: 'dsa', name: 'DSA Core', children: ['arrays', 'trees', 'graphs', 'dp'] },
          { id: 'arrays', name: 'Arrays & Strings' },
          { id: 'trees', name: 'Trees & BST' },
          { id: 'graphs', name: 'Graphs & BFS/DFS' },
          { id: 'dp', name: 'Dynamic Programming' },
        ],
      },
      {
        label: 'System Design',
        color: '#a78bfa',
        nodes: [
          { id: 'sysdesign', name: 'System Design', children: ['scalability', 'load-balancing', 'caching', 'microservices'] },
          { id: 'scalability', name: 'Scalability' },
          { id: 'load-balancing', name: 'Load Balancing' },
          { id: 'caching', name: 'Caching (Redis)' },
          { id: 'microservices', name: 'Microservices' },
        ],
      },
      {
        label: 'Tools & DevOps',
        color: '#f472b6',
        nodes: [
          { id: 'tools', name: 'Dev Tools', children: ['git', 'docker', 'cicd', 'cloud'] },
          { id: 'git', name: 'Git & GitHub' },
          { id: 'docker', name: 'Docker' },
          { id: 'cicd', name: 'CI/CD Pipelines' },
          { id: 'cloud', name: 'AWS / GCP / Azure' },
        ],
      },
    ],
  },
  'frontend-developer': {
    title: 'Frontend Developer Roadmap',
    levels: [
      {
        label: 'Internet & Basics',
        color: '#fbbf24',
        nodes: [
          { id: 'internet', name: 'Internet', children: ['http', 'dns', 'hosting', 'browsers'] },
          { id: 'http', name: 'HTTP / HTTPS' },
          { id: 'dns', name: 'DNS & Domain Names' },
          { id: 'hosting', name: 'Web Hosting' },
          { id: 'browsers', name: 'How Browsers Work' },
        ],
      },
      {
        label: 'HTML, CSS & JavaScript',
        color: '#34d399',
        nodes: [
          { id: 'html', name: 'HTML' },
          { id: 'css', name: 'CSS' },
          { id: 'js', name: 'JavaScript', children: ['es6', 'dom', 'fetch'] },
          { id: 'es6', name: 'ES6+ Features' },
          { id: 'dom', name: 'DOM Manipulation' },
          { id: 'fetch', name: 'Fetch API & Async' },
        ],
      },
      {
        label: 'Package Managers & Tooling',
        color: '#60a5fa',
        nodes: [
          { id: 'pkgmgr', name: 'Package Managers', children: ['npm', 'yarn', 'pnpm'] },
          { id: 'npm', name: 'npm' },
          { id: 'yarn', name: 'yarn' },
          { id: 'pnpm', name: 'pnpm' },
          { id: 'bundlers', name: 'Build Tools', children: ['vite', 'webpack'] },
          { id: 'vite', name: 'Vite' },
          { id: 'webpack', name: 'Webpack' },
        ],
      },
      {
        label: 'Frameworks',
        color: '#a78bfa',
        nodes: [
          { id: 'framework', name: 'Pick a Framework', children: ['react', 'vue', 'angular', 'svelte'] },
          { id: 'react', name: 'React' },
          { id: 'vue', name: 'Vue.js' },
          { id: 'angular', name: 'Angular' },
          { id: 'svelte', name: 'Svelte' },
        ],
      },
      {
        label: 'CSS Frameworks',
        color: '#f472b6',
        nodes: [
          { id: 'cssfx', name: 'CSS Frameworks', children: ['tailwind', 'bootstrap', 'styled'] },
          { id: 'tailwind', name: 'Tailwind CSS' },
          { id: 'bootstrap', name: 'Bootstrap' },
          { id: 'styled', name: 'Styled Components' },
        ],
      },
      {
        label: 'Testing & Deployment',
        color: '#fb923c',
        nodes: [
          { id: 'testing', name: 'Testing', children: ['vitest', 'jest', 'cypress'] },
          { id: 'vitest', name: 'Vitest' },
          { id: 'jest', name: 'Jest' },
          { id: 'cypress', name: 'Cypress / Playwright' },
          { id: 'deploy', name: 'Deployment', children: ['vercel', 'netlify', 'ghpages'] },
          { id: 'vercel', name: 'Vercel' },
          { id: 'netlify', name: 'Netlify' },
          { id: 'ghpages', name: 'GitHub Pages' },
        ],
      },
    ],
  },
  'data-scientist': {
    title: 'Data Scientist Roadmap',
    levels: [
      {
        label: 'Mathematics',
        color: '#fbbf24',
        nodes: [
          { id: 'math', name: 'Mathematics', children: ['linear-alg', 'probability', 'calculus'] },
          { id: 'linear-alg', name: 'Linear Algebra' },
          { id: 'probability', name: 'Probability & Statistics' },
          { id: 'calculus', name: 'Calculus' },
        ],
      },
      {
        label: 'Programming',
        color: '#34d399',
        nodes: [
          { id: 'python', name: 'Python', children: ['numpy', 'pandas', 'matplotlib'] },
          { id: 'numpy', name: 'NumPy' },
          { id: 'pandas', name: 'Pandas' },
          { id: 'matplotlib', name: 'Matplotlib / Seaborn' },
          { id: 'sql', name: 'SQL & Databases' },
        ],
      },
      {
        label: 'Machine Learning',
        color: '#60a5fa',
        nodes: [
          { id: 'ml-basics', name: 'ML Fundamentals', children: ['supervised', 'unsupervised', 'evaluation'] },
          { id: 'supervised', name: 'Supervised Learning' },
          { id: 'unsupervised', name: 'Unsupervised Learning' },
          { id: 'evaluation', name: 'Model Evaluation' },
          { id: 'sklearn', name: 'Scikit-learn' },
        ],
      },
      {
        label: 'Deep Learning',
        color: '#a78bfa',
        nodes: [
          { id: 'dl', name: 'Deep Learning', children: ['nn', 'cnn', 'rnn', 'transformers'] },
          { id: 'nn', name: 'Neural Networks' },
          { id: 'cnn', name: 'CNNs (Computer Vision)' },
          { id: 'rnn', name: 'RNNs / LSTMs' },
          { id: 'transformers', name: 'Transformers / LLMs' },
          { id: 'frameworks', name: 'Frameworks', children: ['tensorflow', 'pytorch'] },
          { id: 'tensorflow', name: 'TensorFlow' },
          { id: 'pytorch', name: 'PyTorch' },
        ],
      },
      {
        label: 'Tools & Deployment',
        color: '#f472b6',
        nodes: [
          { id: 'tools', name: 'MLOps & Tools', children: ['jupyter', 'mlflow', 'docker'] },
          { id: 'jupyter', name: 'Jupyter Notebooks' },
          { id: 'mlflow', name: 'MLflow / W&B' },
          { id: 'docker', name: 'Docker & Cloud' },
          { id: 'kaggle', name: 'Kaggle Competitions' },
        ],
      },
    ],
  },
  'backend-developer': {
    title: 'Backend Developer Roadmap',
    levels: [
      {
        label: 'Language',
        color: '#fbbf24',
        nodes: [
          { id: 'lang', name: 'Pick a Language', children: ['nodejs', 'python', 'java', 'go'] },
          { id: 'nodejs', name: 'Node.js' },
          { id: 'python', name: 'Python' },
          { id: 'java', name: 'Java / Spring' },
          { id: 'go', name: 'Go' },
        ],
      },
      {
        label: 'Databases',
        color: '#34d399',
        nodes: [
          { id: 'relational', name: 'Relational DBs', children: ['postgres', 'mysql'] },
          { id: 'postgres', name: 'PostgreSQL' },
          { id: 'mysql', name: 'MySQL' },
          { id: 'nosql', name: 'NoSQL', children: ['mongodb', 'redis'] },
          { id: 'mongodb', name: 'MongoDB' },
          { id: 'redis', name: 'Redis' },
        ],
      },
      {
        label: 'APIs',
        color: '#60a5fa',
        nodes: [
          { id: 'rest', name: 'REST APIs' },
          { id: 'graphql', name: 'GraphQL' },
          { id: 'auth', name: 'Authentication', children: ['jwt', 'oauth'] },
          { id: 'jwt', name: 'JWT' },
          { id: 'oauth', name: 'OAuth 2.0' },
        ],
      },
      {
        label: 'Architecture',
        color: '#a78bfa',
        nodes: [
          { id: 'arch', name: 'Architecture', children: ['monolith', 'micro', 'event-driven'] },
          { id: 'monolith', name: 'Monolith' },
          { id: 'micro', name: 'Microservices' },
          { id: 'event-driven', name: 'Event-Driven' },
          { id: 'mq', name: 'Message Queues', children: ['kafka', 'rabbitmq'] },
          { id: 'kafka', name: 'Kafka' },
          { id: 'rabbitmq', name: 'RabbitMQ' },
        ],
      },
      {
        label: 'DevOps & Deployment',
        color: '#f472b6',
        nodes: [
          { id: 'devops', name: 'DevOps', children: ['docker', 'k8s', 'cicd'] },
          { id: 'docker', name: 'Docker' },
          { id: 'k8s', name: 'Kubernetes' },
          { id: 'cicd', name: 'CI/CD' },
          { id: 'cloud', name: 'Cloud', children: ['aws', 'gcp'] },
          { id: 'aws', name: 'AWS' },
          { id: 'gcp', name: 'GCP' },
        ],
      },
    ],
  },
  'devops-engineer': {
    title: 'DevOps Engineer Roadmap',
    levels: [
      {
        label: 'OS & Networking',
        color: '#fbbf24',
        nodes: [
          { id: 'linux', name: 'Linux', children: ['shell', 'permissions', 'processes'] },
          { id: 'shell', name: 'Shell Scripting' },
          { id: 'permissions', name: 'File Permissions' },
          { id: 'processes', name: 'Process Management' },
          { id: 'networking', name: 'Networking', children: ['tcp', 'dns', 'http'] },
          { id: 'tcp', name: 'TCP/IP' },
          { id: 'dns', name: 'DNS' },
          { id: 'http', name: 'HTTP/HTTPS' },
        ],
      },
      {
        label: 'Version Control & CI/CD',
        color: '#34d399',
        nodes: [
          { id: 'git', name: 'Git', children: ['github', 'gitlab'] },
          { id: 'github', name: 'GitHub Actions' },
          { id: 'gitlab', name: 'GitLab CI' },
          { id: 'jenkins', name: 'Jenkins' },
        ],
      },
      {
        label: 'Containers & Orchestration',
        color: '#60a5fa',
        nodes: [
          { id: 'docker', name: 'Docker', children: ['compose', 'images'] },
          { id: 'compose', name: 'Docker Compose' },
          { id: 'images', name: 'Multi-stage Builds' },
          { id: 'k8s', name: 'Kubernetes', children: ['pods', 'services', 'helm'] },
          { id: 'pods', name: 'Pods & Deployments' },
          { id: 'services', name: 'Services & Ingress' },
          { id: 'helm', name: 'Helm Charts' },
        ],
      },
      {
        label: 'Infrastructure as Code',
        color: '#a78bfa',
        nodes: [
          { id: 'iac', name: 'IaC', children: ['terraform', 'ansible', 'pulumi'] },
          { id: 'terraform', name: 'Terraform' },
          { id: 'ansible', name: 'Ansible' },
          { id: 'pulumi', name: 'Pulumi' },
        ],
      },
      {
        label: 'Monitoring & Cloud',
        color: '#f472b6',
        nodes: [
          { id: 'monitoring', name: 'Monitoring', children: ['prometheus', 'grafana', 'elk'] },
          { id: 'prometheus', name: 'Prometheus' },
          { id: 'grafana', name: 'Grafana' },
          { id: 'elk', name: 'ELK Stack' },
          { id: 'cloud', name: 'Cloud Platforms', children: ['aws', 'azure', 'gcp'] },
          { id: 'aws', name: 'AWS' },
          { id: 'azure', name: 'Azure' },
          { id: 'gcp', name: 'GCP' },
        ],
      },
    ],
  },
  'ml-engineer': {
    title: 'ML Engineer Roadmap',
    levels: [
      {
        label: 'Mathematics',
        color: '#fbbf24',
        nodes: [
          { id: 'ml-math', name: 'Mathematics', children: ['ml-linalg', 'ml-stats', 'ml-calculus', 'ml-optimization'] },
          { id: 'ml-linalg', name: 'Linear Algebra' },
          { id: 'ml-stats', name: 'Probability & Statistics' },
          { id: 'ml-calculus', name: 'Multivariate Calculus' },
          { id: 'ml-optimization', name: 'Optimization Theory' },
        ],
      },
      {
        label: 'Programming & Libraries',
        color: '#34d399',
        nodes: [
          { id: 'ml-python', name: 'Python', children: ['ml-numpy', 'ml-pandas', 'ml-scipy'] },
          { id: 'ml-numpy', name: 'NumPy' },
          { id: 'ml-pandas', name: 'Pandas' },
          { id: 'ml-scipy', name: 'SciPy' },
          { id: 'ml-git', name: 'Git & Version Control' },
        ],
      },
      {
        label: 'ML Fundamentals',
        color: '#60a5fa',
        nodes: [
          { id: 'ml-supervised', name: 'Supervised Learning', children: ['ml-regression', 'ml-classification', 'ml-ensemble'] },
          { id: 'ml-regression', name: 'Regression Models' },
          { id: 'ml-classification', name: 'Classification Models' },
          { id: 'ml-ensemble', name: 'Ensemble Methods' },
          { id: 'ml-unsupervised', name: 'Unsupervised Learning', children: ['ml-clustering', 'ml-dimreduction'] },
          { id: 'ml-clustering', name: 'Clustering (K-Means, DBSCAN)' },
          { id: 'ml-dimreduction', name: 'Dimensionality Reduction (PCA)' },
        ],
      },
      {
        label: 'Deep Learning',
        color: '#a78bfa',
        nodes: [
          { id: 'ml-dl', name: 'Deep Learning', children: ['ml-pytorch', 'ml-tensorflow', 'ml-cnn', 'ml-transformers'] },
          { id: 'ml-pytorch', name: 'PyTorch' },
          { id: 'ml-tensorflow', name: 'TensorFlow / Keras' },
          { id: 'ml-cnn', name: 'CNNs & Computer Vision' },
          { id: 'ml-transformers', name: 'Transformers & LLMs' },
        ],
      },
      {
        label: 'MLOps & Production',
        color: '#f472b6',
        nodes: [
          { id: 'ml-mlops', name: 'MLOps', children: ['ml-mlflow', 'ml-docker', 'ml-kubeflow'] },
          { id: 'ml-mlflow', name: 'MLflow / W&B' },
          { id: 'ml-docker', name: 'Docker & Containers' },
          { id: 'ml-kubeflow', name: 'Kubeflow / SageMaker' },
          { id: 'ml-serving', name: 'Model Serving', children: ['ml-fastapi', 'ml-triton'] },
          { id: 'ml-fastapi', name: 'FastAPI / Flask' },
          { id: 'ml-triton', name: 'Triton / TorchServe' },
        ],
      },
      {
        label: 'Advanced Topics',
        color: '#fb923c',
        nodes: [
          { id: 'ml-advanced', name: 'Advanced ML', children: ['ml-rl', 'ml-genai', 'ml-federated'] },
          { id: 'ml-rl', name: 'Reinforcement Learning' },
          { id: 'ml-genai', name: 'Generative AI (GANs, Diffusion)' },
          { id: 'ml-federated', name: 'Federated Learning' },
          { id: 'ml-responsible', name: 'Responsible AI & Ethics' },
        ],
      },
    ],
  },
  'cybersecurity-analyst': {
    title: 'Cybersecurity Analyst Roadmap',
    levels: [
      {
        label: 'Networking Fundamentals',
        color: '#fbbf24',
        nodes: [
          { id: 'sec-net', name: 'Networking', children: ['sec-tcpip', 'sec-osi', 'sec-dns', 'sec-firewall'] },
          { id: 'sec-tcpip', name: 'TCP/IP & Subnetting' },
          { id: 'sec-osi', name: 'OSI Model' },
          { id: 'sec-dns', name: 'DNS & DHCP' },
          { id: 'sec-firewall', name: 'Firewalls & Proxies' },
        ],
      },
      {
        label: 'Operating Systems',
        color: '#34d399',
        nodes: [
          { id: 'sec-os', name: 'Operating Systems', children: ['sec-linux', 'sec-windows', 'sec-shell'] },
          { id: 'sec-linux', name: 'Linux Administration' },
          { id: 'sec-windows', name: 'Windows Security' },
          { id: 'sec-shell', name: 'Bash & PowerShell' },
        ],
      },
      {
        label: 'Security Fundamentals',
        color: '#60a5fa',
        nodes: [
          { id: 'sec-fundamentals', name: 'Security Basics', children: ['sec-cia', 'sec-crypto', 'sec-auth'] },
          { id: 'sec-cia', name: 'CIA Triad & Risk Management' },
          { id: 'sec-crypto', name: 'Cryptography (AES, RSA, Hashing)' },
          { id: 'sec-auth', name: 'Authentication & Access Control' },
          { id: 'sec-certs', name: 'Certifications', children: ['sec-comptia', 'sec-ceh'] },
          { id: 'sec-comptia', name: 'CompTIA Security+' },
          { id: 'sec-ceh', name: 'CEH' },
        ],
      },
      {
        label: 'Offensive Security',
        color: '#a78bfa',
        nodes: [
          { id: 'sec-offense', name: 'Offensive Security', children: ['sec-pentest', 'sec-webapp', 'sec-recon'] },
          { id: 'sec-pentest', name: 'Penetration Testing' },
          { id: 'sec-webapp', name: 'Web App Security (OWASP)' },
          { id: 'sec-recon', name: 'Reconnaissance & Enumeration' },
          { id: 'sec-tools', name: 'Tools', children: ['sec-burp', 'sec-nmap', 'sec-metasploit'] },
          { id: 'sec-burp', name: 'Burp Suite' },
          { id: 'sec-nmap', name: 'Nmap / Wireshark' },
          { id: 'sec-metasploit', name: 'Metasploit' },
        ],
      },
      {
        label: 'Defensive Security',
        color: '#f472b6',
        nodes: [
          { id: 'sec-defense', name: 'Defensive Security', children: ['sec-siem', 'sec-ids', 'sec-incident'] },
          { id: 'sec-siem', name: 'SIEM (Splunk, Sentinel)' },
          { id: 'sec-ids', name: 'IDS/IPS' },
          { id: 'sec-incident', name: 'Incident Response' },
          { id: 'sec-forensics', name: 'Digital Forensics' },
        ],
      },
      {
        label: 'Compliance & Governance',
        color: '#fb923c',
        nodes: [
          { id: 'sec-compliance', name: 'Compliance', children: ['sec-gdpr', 'sec-iso', 'sec-nist'] },
          { id: 'sec-gdpr', name: 'GDPR & HIPAA' },
          { id: 'sec-iso', name: 'ISO 27001' },
          { id: 'sec-nist', name: 'NIST Framework' },
          { id: 'sec-grc', name: 'GRC & Audit' },
        ],
      },
    ],
  },
  'product-manager': {
    title: 'Product Manager Roadmap',
    levels: [
      {
        label: 'Business Fundamentals',
        color: '#fbbf24',
        nodes: [
          { id: 'pm-biz', name: 'Business Basics', children: ['pm-strategy', 'pm-market', 'pm-economics'] },
          { id: 'pm-strategy', name: 'Business Strategy' },
          { id: 'pm-market', name: 'Market Analysis' },
          { id: 'pm-economics', name: 'Unit Economics' },
          { id: 'pm-communication', name: 'Stakeholder Communication' },
        ],
      },
      {
        label: 'User Research',
        color: '#34d399',
        nodes: [
          { id: 'pm-research', name: 'User Research', children: ['pm-interviews', 'pm-personas', 'pm-journey'] },
          { id: 'pm-interviews', name: 'User Interviews' },
          { id: 'pm-personas', name: 'Personas & Segments' },
          { id: 'pm-journey', name: 'Customer Journey Mapping' },
          { id: 'pm-validation', name: 'Hypothesis Validation' },
        ],
      },
      {
        label: 'Product Strategy',
        color: '#60a5fa',
        nodes: [
          { id: 'pm-strategy-core', name: 'Product Strategy', children: ['pm-vision', 'pm-roadmap', 'pm-prioritization'] },
          { id: 'pm-vision', name: 'Vision & OKRs' },
          { id: 'pm-roadmap', name: 'Roadmap Planning' },
          { id: 'pm-prioritization', name: 'Prioritization (RICE, MoSCoW)' },
          { id: 'pm-agile', name: 'Agile & Scrum' },
        ],
      },
      {
        label: 'Data & Analytics',
        color: '#a78bfa',
        nodes: [
          { id: 'pm-data', name: 'Data & Analytics', children: ['pm-metrics', 'pm-ab', 'pm-funnel'] },
          { id: 'pm-metrics', name: 'Product Metrics (KPIs)' },
          { id: 'pm-ab', name: 'A/B Testing' },
          { id: 'pm-funnel', name: 'Funnel Analysis' },
          { id: 'pm-tools', name: 'Tools', children: ['pm-amplitude', 'pm-mixpanel'] },
          { id: 'pm-amplitude', name: 'Amplitude' },
          { id: 'pm-mixpanel', name: 'Mixpanel / Google Analytics' },
        ],
      },
      {
        label: 'Technical Knowledge',
        color: '#f472b6',
        nodes: [
          { id: 'pm-tech', name: 'Technical Knowledge', children: ['pm-apis', 'pm-architecture', 'pm-sql'] },
          { id: 'pm-apis', name: 'APIs & Integrations' },
          { id: 'pm-architecture', name: 'System Architecture Basics' },
          { id: 'pm-sql', name: 'SQL & Data Querying' },
        ],
      },
      {
        label: 'Leadership',
        color: '#fb923c',
        nodes: [
          { id: 'pm-leadership', name: 'Leadership', children: ['pm-influence', 'pm-cross-func', 'pm-exec'] },
          { id: 'pm-influence', name: 'Influence Without Authority' },
          { id: 'pm-cross-func', name: 'Cross-Functional Collaboration' },
          { id: 'pm-exec', name: 'Executive Presentations' },
          { id: 'pm-mentoring', name: 'Mentoring & Coaching' },
        ],
      },
    ],
  },
  'ui-ux-designer': {
    title: 'UI/UX Designer Roadmap',
    levels: [
      {
        label: 'Design Fundamentals',
        color: '#fbbf24',
        nodes: [
          { id: 'ux-fundamentals', name: 'Design Fundamentals', children: ['ux-principles', 'ux-color', 'ux-typography'] },
          { id: 'ux-principles', name: 'Design Principles (Gestalt, Hierarchy)' },
          { id: 'ux-color', name: 'Color Theory' },
          { id: 'ux-typography', name: 'Typography' },
          { id: 'ux-accessibility', name: 'Accessibility (WCAG)' },
        ],
      },
      {
        label: 'User Research',
        color: '#34d399',
        nodes: [
          { id: 'ux-research', name: 'User Research', children: ['ux-interviews', 'ux-surveys', 'ux-usability'] },
          { id: 'ux-interviews', name: 'User Interviews' },
          { id: 'ux-surveys', name: 'Surveys & Questionnaires' },
          { id: 'ux-usability', name: 'Usability Testing' },
          { id: 'ux-personas', name: 'Personas & Empathy Maps' },
        ],
      },
      {
        label: 'Wireframing & Prototyping',
        color: '#60a5fa',
        nodes: [
          { id: 'ux-wireframe', name: 'Wireframing & Prototyping', children: ['ux-lofi', 'ux-hifi', 'ux-flows'] },
          { id: 'ux-lofi', name: 'Low-Fidelity Wireframes' },
          { id: 'ux-hifi', name: 'High-Fidelity Prototypes' },
          { id: 'ux-flows', name: 'User Flows & Sitemaps' },
          { id: 'ux-tools', name: 'Tools', children: ['ux-figma', 'ux-sketch'] },
          { id: 'ux-figma', name: 'Figma' },
          { id: 'ux-sketch', name: 'Sketch / Adobe XD' },
        ],
      },
      {
        label: 'Visual Design',
        color: '#a78bfa',
        nodes: [
          { id: 'ux-visual', name: 'Visual Design', children: ['ux-ui-patterns', 'ux-iconography', 'ux-motion'] },
          { id: 'ux-ui-patterns', name: 'UI Patterns & Components' },
          { id: 'ux-iconography', name: 'Iconography & Illustration' },
          { id: 'ux-motion', name: 'Motion & Micro-interactions' },
          { id: 'ux-responsive', name: 'Responsive & Adaptive Design' },
        ],
      },
      {
        label: 'Design Systems',
        color: '#f472b6',
        nodes: [
          { id: 'ux-systems', name: 'Design Systems', children: ['ux-tokens', 'ux-components', 'ux-docs'] },
          { id: 'ux-tokens', name: 'Design Tokens' },
          { id: 'ux-components', name: 'Component Libraries' },
          { id: 'ux-docs', name: 'Documentation & Guidelines' },
        ],
      },
      {
        label: 'Testing & Handoff',
        color: '#fb923c',
        nodes: [
          { id: 'ux-testing', name: 'Testing & Handoff', children: ['ux-ab', 'ux-heuristic', 'ux-devhandoff'] },
          { id: 'ux-ab', name: 'A/B Testing' },
          { id: 'ux-heuristic', name: 'Heuristic Evaluation' },
          { id: 'ux-devhandoff', name: 'Developer Handoff (Zeplin, Figma Dev)' },
          { id: 'ux-analytics', name: 'Analytics (Hotjar, FullStory)' },
        ],
      },
    ],
  },
  'cloud-architect': {
    title: 'Cloud Architect Roadmap',
    levels: [
      {
        label: 'Networking & Linux',
        color: '#fbbf24',
        nodes: [
          { id: 'ca-foundations', name: 'Foundations', children: ['ca-linux', 'ca-networking', 'ca-virtualization'] },
          { id: 'ca-linux', name: 'Linux Administration' },
          { id: 'ca-networking', name: 'Networking (TCP/IP, DNS, VPN)' },
          { id: 'ca-virtualization', name: 'Virtualization & Hypervisors' },
        ],
      },
      {
        label: 'Core Cloud Services',
        color: '#34d399',
        nodes: [
          { id: 'ca-compute', name: 'Compute', children: ['ca-ec2', 'ca-lambda', 'ca-containers'] },
          { id: 'ca-ec2', name: 'VMs (EC2, Compute Engine)' },
          { id: 'ca-lambda', name: 'Serverless (Lambda, Cloud Functions)' },
          { id: 'ca-containers', name: 'Containers (ECS, GKE, AKS)' },
          { id: 'ca-storage', name: 'Storage & Databases', children: ['ca-s3', 'ca-rds', 'ca-nosql'] },
          { id: 'ca-s3', name: 'Object Storage (S3, GCS)' },
          { id: 'ca-rds', name: 'Managed DBs (RDS, Cloud SQL)' },
          { id: 'ca-nosql', name: 'NoSQL (DynamoDB, Cosmos DB)' },
        ],
      },
      {
        label: 'Architecture Patterns',
        color: '#60a5fa',
        nodes: [
          { id: 'ca-patterns', name: 'Architecture Patterns', children: ['ca-microservices', 'ca-serverless-arch', 'ca-event'] },
          { id: 'ca-microservices', name: 'Microservices Architecture' },
          { id: 'ca-serverless-arch', name: 'Serverless Architecture' },
          { id: 'ca-event', name: 'Event-Driven Architecture' },
          { id: 'ca-ha', name: 'High Availability & DR', children: ['ca-multi-region', 'ca-backup'] },
          { id: 'ca-multi-region', name: 'Multi-Region Deployments' },
          { id: 'ca-backup', name: 'Backup & Disaster Recovery' },
        ],
      },
      {
        label: 'Security & IAM',
        color: '#a78bfa',
        nodes: [
          { id: 'ca-security', name: 'Cloud Security', children: ['ca-iam', 'ca-encryption', 'ca-networking-sec'] },
          { id: 'ca-iam', name: 'IAM & Role-Based Access' },
          { id: 'ca-encryption', name: 'Encryption (KMS, TLS)' },
          { id: 'ca-networking-sec', name: 'VPC, Security Groups, WAF' },
          { id: 'ca-compliance', name: 'Compliance (SOC 2, HIPAA)' },
        ],
      },
      {
        label: 'Advanced Services',
        color: '#f472b6',
        nodes: [
          { id: 'ca-advanced', name: 'Advanced Services', children: ['ca-iac', 'ca-k8s', 'ca-cicd'] },
          { id: 'ca-iac', name: 'IaC (Terraform, CloudFormation)' },
          { id: 'ca-k8s', name: 'Kubernetes & Service Mesh' },
          { id: 'ca-cicd', name: 'CI/CD Pipelines' },
          { id: 'ca-observability', name: 'Observability', children: ['ca-monitoring', 'ca-logging'] },
          { id: 'ca-monitoring', name: 'Monitoring (CloudWatch, Datadog)' },
          { id: 'ca-logging', name: 'Logging & Tracing (OpenTelemetry)' },
        ],
      },
      {
        label: 'Cost & Governance',
        color: '#fb923c',
        nodes: [
          { id: 'ca-cost', name: 'Cost Optimization', children: ['ca-rightsizing', 'ca-reservations', 'ca-finops'] },
          { id: 'ca-rightsizing', name: 'Rightsizing & Spot Instances' },
          { id: 'ca-reservations', name: 'Reserved & Savings Plans' },
          { id: 'ca-finops', name: 'FinOps Practices' },
          { id: 'ca-governance', name: 'Governance & Tagging' },
        ],
      },
    ],
  },
  'blockchain-developer': {
    title: 'Blockchain Developer Roadmap',
    levels: [
      {
        label: 'Cryptography & Distributed Systems',
        color: '#fbbf24',
        nodes: [
          { id: 'bc-crypto', name: 'Cryptography', children: ['bc-hashing', 'bc-asymmetric', 'bc-merkle'] },
          { id: 'bc-hashing', name: 'Hashing (SHA-256, Keccak)' },
          { id: 'bc-asymmetric', name: 'Public/Private Key Pairs' },
          { id: 'bc-merkle', name: 'Merkle Trees' },
          { id: 'bc-distributed', name: 'Distributed Systems', children: ['bc-consensus', 'bc-p2p'] },
          { id: 'bc-consensus', name: 'Consensus Mechanisms (PoW, PoS)' },
          { id: 'bc-p2p', name: 'P2P Networking' },
        ],
      },
      {
        label: 'Blockchain Fundamentals',
        color: '#34d399',
        nodes: [
          { id: 'bc-fundamentals', name: 'Blockchain Basics', children: ['bc-bitcoin', 'bc-ethereum', 'bc-wallets'] },
          { id: 'bc-bitcoin', name: 'Bitcoin & UTXO Model' },
          { id: 'bc-ethereum', name: 'Ethereum & EVM' },
          { id: 'bc-wallets', name: 'Wallets & Transactions' },
          { id: 'bc-networks', name: 'Networks', children: ['bc-mainnet', 'bc-layer2'] },
          { id: 'bc-mainnet', name: 'Mainnet vs Testnet' },
          { id: 'bc-layer2', name: 'Layer 2 (Optimism, Arbitrum)' },
        ],
      },
      {
        label: 'Smart Contracts',
        color: '#60a5fa',
        nodes: [
          { id: 'bc-smart', name: 'Smart Contracts', children: ['bc-solidity', 'bc-patterns', 'bc-testing'] },
          { id: 'bc-solidity', name: 'Solidity' },
          { id: 'bc-patterns', name: 'Design Patterns (Proxy, Factory)' },
          { id: 'bc-testing', name: 'Testing (Hardhat, Foundry)' },
          { id: 'bc-standards', name: 'Token Standards', children: ['bc-erc20', 'bc-erc721'] },
          { id: 'bc-erc20', name: 'ERC-20 (Fungible Tokens)' },
          { id: 'bc-erc721', name: 'ERC-721 / ERC-1155 (NFTs)' },
        ],
      },
      {
        label: 'DApp Development',
        color: '#a78bfa',
        nodes: [
          { id: 'bc-dapp', name: 'DApp Development', children: ['bc-web3js', 'bc-ethers', 'bc-frontend'] },
          { id: 'bc-web3js', name: 'Web3.js / Viem' },
          { id: 'bc-ethers', name: 'Ethers.js' },
          { id: 'bc-frontend', name: 'Frontend Integration (React + wagmi)' },
          { id: 'bc-storage', name: 'Decentralized Storage', children: ['bc-ipfs', 'bc-arweave'] },
          { id: 'bc-ipfs', name: 'IPFS' },
          { id: 'bc-arweave', name: 'Arweave' },
        ],
      },
      {
        label: 'DeFi & Advanced',
        color: '#f472b6',
        nodes: [
          { id: 'bc-defi', name: 'DeFi Protocols', children: ['bc-amm', 'bc-lending', 'bc-oracles'] },
          { id: 'bc-amm', name: 'AMMs (Uniswap, Curve)' },
          { id: 'bc-lending', name: 'Lending (Aave, Compound)' },
          { id: 'bc-oracles', name: 'Oracles (Chainlink)' },
          { id: 'bc-dao', name: 'DAOs & Governance' },
        ],
      },
      {
        label: 'Security & Auditing',
        color: '#fb923c',
        nodes: [
          { id: 'bc-security', name: 'Smart Contract Security', children: ['bc-vulnerabilities', 'bc-audit', 'bc-formal'] },
          { id: 'bc-vulnerabilities', name: 'Common Vulnerabilities (Reentrancy, Overflow)' },
          { id: 'bc-audit', name: 'Audit Tools (Slither, Mythril)' },
          { id: 'bc-formal', name: 'Formal Verification' },
          { id: 'bc-bugbounty', name: 'Bug Bounties (Immunefi)' },
        ],
      },
    ],
  },
  'data-analyst': {
    title: 'Data Analyst Roadmap',
    levels: [
      {
        label: 'Excel & Spreadsheets',
        color: '#fbbf24',
        nodes: [
          { id: 'da-excel', name: 'Excel & Spreadsheets', children: ['da-formulas', 'da-pivots', 'da-charts'] },
          { id: 'da-formulas', name: 'Formulas & Functions (VLOOKUP, INDEX)' },
          { id: 'da-pivots', name: 'Pivot Tables & Power Query' },
          { id: 'da-charts', name: 'Charts & Conditional Formatting' },
        ],
      },
      {
        label: 'SQL & Databases',
        color: '#34d399',
        nodes: [
          { id: 'da-sql', name: 'SQL', children: ['da-queries', 'da-joins', 'da-window'] },
          { id: 'da-queries', name: 'SELECT, WHERE, GROUP BY' },
          { id: 'da-joins', name: 'JOINs & Subqueries' },
          { id: 'da-window', name: 'Window Functions & CTEs' },
          { id: 'da-databases', name: 'Databases', children: ['da-postgres', 'da-bigquery'] },
          { id: 'da-postgres', name: 'PostgreSQL / MySQL' },
          { id: 'da-bigquery', name: 'BigQuery / Snowflake' },
        ],
      },
      {
        label: 'Statistics',
        color: '#60a5fa',
        nodes: [
          { id: 'da-stats', name: 'Statistics', children: ['da-descriptive', 'da-inferential', 'da-hypothesis'] },
          { id: 'da-descriptive', name: 'Descriptive Statistics' },
          { id: 'da-inferential', name: 'Inferential Statistics' },
          { id: 'da-hypothesis', name: 'Hypothesis Testing' },
          { id: 'da-probability', name: 'Probability & Distributions' },
        ],
      },
      {
        label: 'Python for Analysis',
        color: '#a78bfa',
        nodes: [
          { id: 'da-python', name: 'Python', children: ['da-pandas', 'da-numpy', 'da-matplotlib'] },
          { id: 'da-pandas', name: 'Pandas' },
          { id: 'da-numpy', name: 'NumPy' },
          { id: 'da-matplotlib', name: 'Matplotlib / Seaborn' },
          { id: 'da-jupyter', name: 'Jupyter Notebooks' },
        ],
      },
      {
        label: 'Visualization Tools',
        color: '#f472b6',
        nodes: [
          { id: 'da-viz', name: 'Visualization', children: ['da-tableau', 'da-powerbi', 'da-looker'] },
          { id: 'da-tableau', name: 'Tableau' },
          { id: 'da-powerbi', name: 'Power BI' },
          { id: 'da-looker', name: 'Looker / Google Data Studio' },
        ],
      },
      {
        label: 'Business Intelligence',
        color: '#fb923c',
        nodes: [
          { id: 'da-bi', name: 'Business Intelligence', children: ['da-storytelling', 'da-dashboards', 'da-etl'] },
          { id: 'da-storytelling', name: 'Data Storytelling' },
          { id: 'da-dashboards', name: 'Dashboard Design' },
          { id: 'da-etl', name: 'ETL & Data Pipelines' },
          { id: 'da-domain', name: 'Domain Knowledge (Finance, Marketing)' },
        ],
      },
    ],
  },
};

exports.getSkillRoadmap = async (req, res) => {
  try {
    const { careerId } = req.params;
    const roadmap = SKILL_ROADMAPS[careerId] || null;
    if (!roadmap) {
      return res.json({ status: 'success', data: { roadmap: null } });
    }
    res.json({ status: 'success', data: { roadmap } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.saveQualification = async (req, res) => {
  try {
    const { educationLevel, branch, year, college, skills, interests } = req.body;
    const updateData = {};
    if (college || branch || year) {
      updateData.profile = {};
      if (college) updateData['profile.collegeName'] = college;
      if (branch) updateData['profile.branch'] = branch;
      if (year) updateData['profile.currentYear'] = year;
    }
    if (skills && skills.length) {
      updateData['resumeData.skills'] = skills.map((s) => ({ name: s }));
    }
    if (interests && interests.length) {
      updateData['resumeData.interests'] = interests;
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updateData }, { new: true }).select('-password');

    // Also update StudentProfile if educationLevel is provided
    if (educationLevel) {
      const StudentProfile = require('../models/StudentProfile');
      await StudentProfile.findOneAndUpdate(
        { userId: req.user.id },
        { educationLevel },
        { upsert: false }
      );
    }

    res.json({ status: 'success', data: { user } });
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
