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
};

export const learningMaterialApi = {
  generateMaterial: (data) => api.post('/learning-material/generate', data),
  getMaterial: (topicId) => api.get(`/learning-material/${topicId}`),
  listMaterials: (params) => api.get('/learning-material/list', { params }),
  generateRevision: (data) => api.post('/learning-material/revision/generate', data),
};
