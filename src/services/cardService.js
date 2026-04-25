import api from '../lib/api';

export const cardService = {
  getCatalog:     ()                             => api.get('/cards'),
  getMyCards:     ()                             => api.get('/cards/my'),
  getCollection:  ()                             => api.get('/cards/collection'),
  getDailyCards:  ()                             => api.get('/cards/daily'),
  getSets:        ()                             => api.get('/cards/sets'),
  openPack:       (type)                         => api.post(`/cards/pack/${type}/open`),
  buyDailyCard:   (cardId)                       => api.post(`/cards/daily/${cardId}/buy`),

  // Trade
  sendTradeRequest:    (receiverShareCode, offeredCardId) =>
    api.post('/trades/request', { receiverShareCode, offeredCardId }),
  getInbox:            ()                        => api.get('/trades/inbox'),
  getInboxCount:       ()                        => api.get('/trades/inbox/count'),
  refuseRequest:       (requestId)               => api.put(`/trades/${requestId}/refuse`),
  getAvailableCards:   (requestId)               => api.get(`/trades/${requestId}/available-cards`),
  acceptRequest:       (requestId, requestedCardId) =>
    api.put(`/trades/${requestId}/accept`, { requestedCardId }),
};
