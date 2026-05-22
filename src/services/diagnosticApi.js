import api from './api';

export const diagnostic = {
  getConfig: () => api.get('/diagnostic/config'),
  getSubjectsForLevel: (level) => api.get(`/diagnostic/subjects/${level}`),
  getStatus: () => api.get('/diagnostic/status'),
  getProfile: () => api.get('/diagnostic/profile'),
  submitOnboarding: (data) => api.post('/diagnostic/onboarding', data),
  getAssessmentContent: () => api.get('/diagnostic/assessment-content'),
  submitTextAssessment: (data) => api.post('/diagnostic/assessment/text', data),
  submitAudioAssessment: (data) => api.post('/diagnostic/assessment/audio', data),
  submitVideoAssessment: (data) => api.post('/diagnostic/assessment/video', data),
  submitInteractiveAssessment: (data) => api.post('/diagnostic/assessment/interactive', data),
  analyze: () => api.post('/diagnostic/analyze'),
  getReport: () => api.get('/diagnostic/report'),
};
