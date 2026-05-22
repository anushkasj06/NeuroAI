import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

// Add a request interceptor to add the auth token to requests
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

export const auth = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.get('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const profile = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
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

export default api; 
