import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

/** Human-readable message from axios errors */
export function getApiErrorMessage(error, fallback = 'Request failed') {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Is the backend running?';
    }
    return `Cannot reach backend at ${API_BASE}. Start it with: cd backend && npm start`;
  }
  const data = error.response.data;
  return data?.message || data?.error || fallback;
}

export const auth = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.get('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const profile = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.patch('/profile', data),
};

export const quiz = {
  submitQuiz: (data) => api.post('/quiz/submit', data),
  getAnswers: () => api.get('/quiz/answers'),
  saveMarks: (data) => api.post('/quiz/save-marks', data),
  getHistory: () => api.get('/quiz/history'),
  getLeaderboard: (subject = 'all') => api.get(`/quiz/marks?subject=${subject.toLowerCase()}`),
};

export const leaderboard = {
  saveScore: (data) => api.post('/quiz/save-marks', data),
  getLeaderboard: (subject = 'all') => api.get(`/quiz/marks?subject=${subject.toLowerCase()}`),
};

export const rapidBattle = {
  generateQuiz: (data) => api.post('/rapid-battle/generate', data),
  submitAttempt: (data) => api.post('/rapid-battle/attempts', data),
  getLeaderboard: ({ topic = 'all', mode = 'solo', limit = 20 } = {}) =>
    api.get(`/rapid-battle/leaderboard?topic=${encodeURIComponent(topic)}&mode=${mode}&limit=${limit}`),
  getHistory: () => api.get('/rapid-battle/history'),
};

export const teacher = {
  getDashboard: () => api.get('/teacher/dashboard'),
  createResource: (data) => api.post('/teacher/resources', data),
};

export const content = {
  getTeacherContent: () => api.get('/content/teacher'),
  getTeacherStudents: () => api.get('/content/teacher/students'),
  createContent: (data) => api.post('/content/teacher', data),
  updateContent: (id, data) => api.put(`/content/teacher/${id}`, data),
  publishContent: (id, data) => api.post(`/content/teacher/${id}/publish`, data),
  unpublishContent: (id) => api.post(`/content/teacher/${id}/draft`),
  deleteContent: (id) => api.delete(`/content/teacher/${id}`),
  uploadAsset: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/content/teacher/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStudentContent: () => api.get('/content/student'),
  getConceptMap: (id, options = {}) => {
    const query = options.refresh ? '?refresh=1' : '';
    return api.get(`/content/student/${id}/concept-map${query}`);
  },
};

export const chatbot = {
  sendMessage: (data) => api.post('/chatbot/message', data),
};

export const career = {
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append('resume', file);
    return api.post('/career/resume/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
  },
  getResumeData: () => api.get('/career/resume'),
  viewResumeUrl: () => `${API_BASE}/api/career/resume/view`,
  deleteResume: () => api.delete('/career/resume'),
  recommend: (force = false) => api.post(`/career/recommend?force=${force}`),
  simulate: (addedSkills, removedSkills) => api.post('/career/simulate', { addedSkills, removedSkills }),
  skillGap: (role, goal) => api.post('/career/skill-gap', { role, goal }),
  roleChat: (role, persona, message, history = []) => api.post('/career/role-chat', { role, persona, message, history }, { timeout: 120000 }),
  marketTrends: () => api.get('/career/market-trends'),
  liveJobs: (role, location, limit = 20) =>
    api.get(`/career/live-jobs?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location || 'india')}&limit=${limit}`),
  explore: (category) =>
    api.get(`/career/explore${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getCareerPathways: (careerId) =>
    api.get(`/career/explore/${careerId}/pathways`),
  getSkillRoadmap: (careerId) =>
    api.get(`/career/explore/${careerId}/roadmap`),
  saveQualification: (data) =>
    api.post('/career/qualification', data),
};

export const emotion = {
  logEmotion: (data) => api.post('/emotion', data),
};

export const attention = {
  saveSnapshot: (data) => api.post('/attention/snapshot', data),
  getSessionAttention: (sessionId) => api.get(`/attention/session/${sessionId}`),
  getAnalytics: (days = 7) => api.get('/attention/analytics', { params: { days } }),
  getRecentSummary: () => api.get('/attention/summary'),
};

export const analytics = {
  computeSession:  (sessionId) => api.post(`/analytics/session/${sessionId}/compute`),
  getSession:      (sessionId, recompute = false) =>
    api.get(`/analytics/session/${sessionId}`, { params: { recompute } }),
  getUser:         (days = 30, subjectSlug) =>
    api.get('/analytics/user', { params: { days, ...(subjectSlug ? { subjectSlug } : {}) } }),
  getCourse:       (subjectSlug, days = 30) =>
    api.get(`/analytics/course/${subjectSlug}`, { params: { days } }),
  getDashboard:    () => api.get('/analytics/dashboard'),
};

export const adaptive = {
  evaluate:        (data) => api.post('/adaptive/evaluate', data),
  getTopic:        (subjectSlug, topic) =>
    api.get(`/adaptive/topic/${subjectSlug}/${encodeURIComponent(topic)}`),
  getHistory:      (subjectSlug, limit = 20) =>
    api.get('/adaptive/history', { params: { subjectSlug, limit } }),
  getDashboard:    () => api.get('/adaptive/dashboard'),
  apply:           (recordId) => api.patch(`/adaptive/${recordId}/apply`),
  dismiss:         (recordId) => api.patch(`/adaptive/${recordId}/dismiss`),
};

export const assessmentMonitor = {
  start:        (attemptId) => api.post('/assessment-monitor/start', { attemptId }),
  logViolation: (data)      => api.post('/assessment-monitor/violation', data),
  logBatch:     (data)      => api.post('/assessment-monitor/batch', data),
  getRecord:    (attemptId) => api.get(`/assessment-monitor/${attemptId}`),
  finish:       (attemptId) => api.patch(`/assessment-monitor/${attemptId}/finish`),
  getHistory:   (limit = 20) => api.get('/assessment-monitor/history', { params: { limit } }),
};

export const contentAdapt = {
  /** Generate a content format recommendation for a topic */
  recommend:    (data) => api.post('/content-adapt/recommend', data),
  /** Latest recommendation for one topic */
  getTopic:     (subjectSlug, topic) =>
    api.get(`/content-adapt/topic/${subjectSlug}/${encodeURIComponent(topic)}`),
  /** User history (?subjectSlug&limit) */
  getHistory:   (subjectSlug, limit = 20) =>
    api.get('/content-adapt/history', { params: { subjectSlug, limit } }),
  /** Latest rec per topic — dashboard widget */
  getDashboard: () => api.get('/content-adapt/dashboard'),
  /** Format usage stats (?days=30) */
  getStats:     (days = 30) => api.get('/content-adapt/stats', { params: { days } }),
  /** Mark recommendation as applied */
  apply:        (recordId) => api.patch(`/content-adapt/${recordId}/apply`),
  /** Dismiss a recommendation */
  dismiss:      (recordId) => api.patch(`/content-adapt/${recordId}/dismiss`),
};

// ── AI Interview System ───────────────────────────────────────────────────────
export const interview = {
  /** Schedule a new interview */
  schedule:       (data) => api.post('/interview/schedule', data),
  /** Get all interviews for the logged-in user */
  getAll:         (params = {}) => api.get('/interview', { params }),
  /** Get a single interview by ID */
  getOne:         (id) => api.get(`/interview/${id}`),
  /** Generate questions and create Vapi assistant */
  prepare:        (id) => api.post(`/interview/${id}/prepare`),
  /** Start the interview (get Vapi call token) */
  start:          (id) => api.post(`/interview/${id}/start`),
  /** Append a transcript message during interview */
  appendTranscript: (id, data) => api.post(`/interview/${id}/transcript`, data),
  /** End interview and trigger analysis */
  end:            (id, data = {}) => api.post(`/interview/${id}/end`, data),
  /** Get analysis result */
  getAnalysis:    (id) => api.get(`/interview/${id}/analysis`),
  /** Get full report */
  getReport:      (id) => api.get(`/interview/${id}/report`),
  /** Get user interview analytics */
  getAnalytics:   () => api.get('/interview/analytics'),
  /** Delete an interview */
  remove:         (id) => api.delete(`/interview/${id}`),
};

export { API_BASE };
export default api;
