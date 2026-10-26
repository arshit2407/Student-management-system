import axiosInstance from './axiosInstance';

export const getGroups = async () => {
  const response = await axiosInstance.get('/groups');
  return response.data;
};

export const createGroup = async (name) => {
  const response = await axiosInstance.post('/groups', { name });
  return response.data;
};

export const getGroupById = async (groupId) => {
  const response = await axiosInstance.get(`/groups/${groupId}`);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await axiosInstance.delete(`/groups/${groupId}`);
  return response.data;
};
