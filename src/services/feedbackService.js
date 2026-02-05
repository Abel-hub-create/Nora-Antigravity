import api from '../lib/api';

// Get all reviews
export const getReviews = async () => {
  const response = await api.get('/feedback/reviews');
  return response.reviews || [];
};

// Get all suggestions
export const getSuggestions = async () => {
  const response = await api.get('/feedback/suggestions');
  return response.suggestions || [];
};

// Get daily count info
export const getDailyCount = async () => {
  return await api.get('/feedback/daily-count');
};

// Create a review
export const createReview = async (content) => {
  const response = await api.post('/feedback/reviews', { content });
  return response.review;
};

// Create a suggestion
export const createSuggestion = async (content) => {
  const response = await api.post('/feedback/suggestions', { content });
  return response.suggestion;
};

// Vote on a feedback (1 = like, -1 = dislike, 0 = remove vote)
export const vote = async (feedbackId, voteValue) => {
  const response = await api.post(`/feedback/${feedbackId}/vote`, { vote: voteValue });
  return response;
};

// Delete a feedback
export const deleteFeedback = async (feedbackId) => {
  return await api.delete(`/feedback/${feedbackId}`);
};
