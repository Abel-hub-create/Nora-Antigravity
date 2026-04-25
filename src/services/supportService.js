import api from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const supportService = {
  createTicket: (category, subject, message) =>
    api.post('/tickets', { category, subject, message }),

  getMyTickets: () =>
    api.get('/tickets/mine'),

  submitUnbanRequest: async (email, subject, message) => {
    const res = await fetch(`${API_URL}/tickets/unban-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subject, message }),
    });
    const data = await res.json();
    if (!res.ok) throw { response: { status: res.status, data } };
    return data;
  },
};
