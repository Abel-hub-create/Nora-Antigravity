import api from '../lib/api';

export const getAllFolders = async () => {
  const response = await api.get('/folders');
  return response.folders;
};

export const getFolder = async (id) => {
  const response = await api.get(`/folders/${id}`);
  return response.folder;
};

export const createFolder = async ({ name, color }) => {
  const response = await api.post('/folders', { name, color });
  return response.folder;
};

export const updateFolder = async (id, { name, color }) => {
  const response = await api.patch(`/folders/${id}`, { name, color });
  return response;
};

export const deleteFolder = async (id) => {
  const response = await api.delete(`/folders/${id}`);
  return response;
};

export const getSynthesesInFolder = async (folderId) => {
  const response = await api.get(`/folders/${folderId}/syntheses`);
  return response.syntheses;
};

export const addSynthesesToFolder = async (folderId, syntheseIds) => {
  const response = await api.post(`/folders/${folderId}/syntheses`, { syntheseIds });
  return response;
};

export const removeSyntheseFromFolder = async (folderId, syntheseId) => {
  const response = await api.delete(`/folders/${folderId}/syntheses/${syntheseId}`);
  return response;
};

export const getAvailableSyntheses = async (folderId) => {
  const response = await api.get(`/folders/${folderId}/available-syntheses`);
  return response.syntheses;
};
