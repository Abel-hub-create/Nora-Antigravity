import api from '../lib/api';

export const sendMessage = async (messages) => {
  const response = await api.post('/assistant/chat', { messages });
  return response.message;
};

export const getChatHistory = async () => {
  const response = await api.get('/assistant/history');
  return response.messages || [];
};

export const getAvailableSubjects = async () => {
  const response = await api.get('/assistant/subjects');
  return response.subjects || [];
};

export const analyzeSubject = async (subject) => {
  const response = await api.post('/assistant/monk-mode/analyze', { subject });
  return response;
};

export const generateExercises = async ({ subject, weakTopics, errorPatterns, analysisSummary, specificDifficulties, counts, difficulty, source, feedbackNote }) => {
  const response = await api.post('/assistant/monk-mode/generate', {
    subject, weakTopics, errorPatterns, analysisSummary, specificDifficulties, counts, difficulty, source, feedbackNote
  });
  return response;
};

export const correctExercises = async (exerciseSetId) => {
  const response = await api.post(`/assistant/correct/${exerciseSetId}`);
  return response.correction;
};

export const correctItem = async (exerciseSetId, itemId) => {
  const response = await api.post('/assistant/correct-item', { exerciseSetId, itemId });
  return response; // { isCorrect, isPartial, feedback, tip }
};

export const analyzeExam = async (imageBase64, subject) => {
  const response = await api.post('/assistant/ana/analyze', { image: imageBase64, subject }, { timeout: 90000 });
  return response; // { analysis, examText, feedbackNote }
};

export const tts = async (text) => {
  const response = await api.post('/assistant/tts', { text }, { timeout: 30000 });
  return response.audio; // base64 mp3
};
