import api from '../lib/api';

/**
 * Get active revision session for a synthese
 */
export const getSession = async (syntheseId) => {
    const response = await api.get(`/revision/${syntheseId}/session`);
    return response;
};

/**
 * Start a new revision session
 */
export const startSession = async (syntheseId) => {
    const response = await api.post(`/revision/${syntheseId}/start`);
    return response;
};

/**
 * Sync session state (timer, phase, iteration)
 */
export const syncSession = async (syntheseId, data) => {
    await api.patch(`/revision/${syntheseId}/sync`, data);
};

/**
 * Submit user recall text
 */
export const submitRecall = async (syntheseId, userRecall) => {
    await api.post(`/revision/${syntheseId}/recall`, { userRecall });
};

/**
 * Run AI comparison
 */
export const compare = async (syntheseId) => {
    const response = await api.post(`/revision/${syntheseId}/compare`);
    return response;
};

/**
 * Move to next loop iteration
 */
export const nextIteration = async (syntheseId) => {
    const response = await api.post(`/revision/${syntheseId}/next-iteration`);
    return response;
};

/**
 * Complete the revision session
 */
export const completeSession = async (syntheseId) => {
    const response = await api.post(`/revision/${syntheseId}/complete`);
    return response;
};

/**
 * Stop/cancel the revision session
 */
export const stopSession = async (syntheseId) => {
    await api.delete(`/revision/${syntheseId}/stop`);
};

/**
 * Get completion count for a synthese
 */
export const getCompletionCount = async (syntheseId) => {
    const response = await api.get(`/revision/${syntheseId}/completions`);
    return response.count;
};
