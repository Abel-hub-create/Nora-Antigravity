import api from '../lib/api';

export const getExercises = async () => {
  const response = await api.get('/exercises');
  return response;
};

export const getExercise = async (id) => {
  const response = await api.get(`/exercises/${id}`);
  return response.exercise;
};

export const saveAnswer = async (itemId, answer) => {
  await api.patch(`/exercises/items/${itemId}/answer`, { answer });
};

export const deleteExercise = async (id) => {
  await api.delete(`/exercises/${id}`);
};

export const deleteAllExercises = async () => {
  await api.delete('/exercises');
};
