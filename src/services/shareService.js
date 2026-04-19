import api from '../lib/api';

export const lookupUser = (code) => api.get(`/share/lookup/${encodeURIComponent(code)}`);
export const sendSynthese = (syntheseId, recipientCode) =>
  api.post(`/share/send/${syntheseId}`, { recipientCode });
