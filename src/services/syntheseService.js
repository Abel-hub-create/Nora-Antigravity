import api from '../lib/api';

export const getAllSyntheses = async ({ search = '', limit = 50, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', limit);
  if (offset) params.append('offset', offset);

  const response = await api.get(`/syntheses?${params.toString()}`);
  return response;
};

export const getSynthese = async (id) => {
  const response = await api.get(`/syntheses/${id}`);
  return response.synthese;
};

export const createSynthese = async (data) => {
  const response = await api.post('/syntheses', data);
  return response.synthese;
};

export const updateTitle = async (id, title) => {
  const response = await api.patch(`/syntheses/${id}/title`, { title });
  return response;
};

export const archiveSynthese = async (id) => {
  const response = await api.patch(`/syntheses/${id}/archive`);
  return response;
};

export const deleteSynthese = async (id) => {
  const response = await api.delete(`/syntheses/${id}`);
  return response;
};

export const deleteMultipleSyntheses = async (ids) => {
  const results = await Promise.all(ids.map(id => deleteSynthese(id)));
  return results;
};

export const getFlashcards = async (syntheseId) => {
  const response = await api.get(`/syntheses/${syntheseId}/flashcards`);
  return response;
};

export const updateFlashcardProgress = async (flashcardId, isCorrect) => {
  const response = await api.post(`/syntheses/flashcards/${flashcardId}/progress`, { isCorrect });
  return response;
};

export const getQuizQuestions = async (syntheseId) => {
  const response = await api.get(`/syntheses/${syntheseId}/quiz`);
  return response;
};

export const updateQuizProgress = async (syntheseId, questionId, isCorrect) => {
  const response = await api.post(`/syntheses/${syntheseId}/quiz/progress`, { questionId, isCorrect });
  return response;
};
