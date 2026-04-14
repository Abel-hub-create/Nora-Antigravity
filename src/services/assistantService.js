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

export const tts = async (text, exerciseId = null) => {
  const response = await api.post('/assistant/tts', { text, exerciseId }, { timeout: 30000 });
  return response.audio; // base64 mp3
};

// ─── Conversations ──────────────────────────────────────────────────────────

export const getConversations = async () => {
  const response = await api.get('/conversations');
  return response.conversations || [];
};

export const createConversation = async () => {
  const response = await api.post('/conversations');
  return response.conversation;
};

export const getConversation = async (id) => {
  const response = await api.get(`/conversations/${id}`);
  return response;
};

export const deleteConversation = async (id) => {
  await api.delete(`/conversations/${id}`);
};

export const renameConversation = async (id, title) => {
  await api.patch(`/conversations/${id}`, { title });
};

export const sendConversationMessage = async (conversationId, content, syntheseIds = []) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, { content, syntheseIds });
  return response;
};

export const updateConversationContext = async (conversationId, syntheseIds) => {
  const response = await api.patch(`/conversations/${conversationId}/context`, { syntheseIds });
  return response;
};

export const getSyntheses = async () => {
  const response = await api.get('/syntheses');
  return response.syntheses || [];
};
