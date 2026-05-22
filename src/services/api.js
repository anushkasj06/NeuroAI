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

export { API_BASE };
export default api;
