import api from './api';

export const studyPlanApi = {
  // Study plan
  generatePlan: (data) => api.post('/study-plan/generate', data),
  getActivePlan: () => api.get('/study-plan/active'),
  getAllPlans: () => api.get('/study-plan/all'),
  completeSession: (data) => api.post('/study-plan/session/complete', data),

  // Analytics
  getDashboardAnalytics: () => api.get('/study-plan/analytics/dashboard'),

  // Recommendations
  generateRecommendations: () => api.post('/study-plan/recommendations/generate'),
  dismissRecommendation: (id) => api.patch(`/study-plan/recommendations/${id}/dismiss`),

  // Progress
  updateTopicProgress: (data) => api.post('/study-plan/progress/update', data),
  getTopicProgress: (subjectSlug) =>
    api.get('/study-plan/progress', { params: subjectSlug ? { subjectSlug } : {} }),
  getProgressDashboard: () => api.get('/study-plan/progress/dashboard'),

  // Strict tests and adaptive report
  generateStrictTest: (data) => api.post('/study-plan/test/generate', data),
  submitStrictTest: (data) => api.post('/study-plan/test/submit', data),
  getPerformanceReport: () => api.get('/study-plan/report/performance'),
  adaptPlan: (data) => api.post('/study-plan/adapt', data),
};

export const learningMaterialApi = {
  generateMaterial: (data) => api.post('/learning-material/generate', data),
  getMaterial: (topicId) => api.get(`/learning-material/${topicId}`),
  listMaterials: (params) => api.get('/learning-material/list', { params }),
  generateRevision: (data) => api.post('/learning-material/revision/generate', data),
};

export const aiTeacherApi = {
  startSession: (data) => api.post('/ai-teacher/sessions/start', data),
  getSession: (sessionId) => api.get(`/ai-teacher/sessions/${sessionId}`),
  generateQuestion: (sessionId) => api.post(`/ai-teacher/sessions/${sessionId}/question`),
  submitAnswer: (questionId, data) => api.post(`/ai-teacher/questions/${questionId}/answer`, data),
  completeSession: (sessionId) => api.post(`/ai-teacher/sessions/${sessionId}/complete`),
  getAnalytics: () => api.get('/ai-teacher/analytics'),
  getRevisionCenter: () => api.get('/ai-teacher/revision-center'),
};
