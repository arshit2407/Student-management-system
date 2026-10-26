import axiosInstance from './axiosInstance';

export const getStudents = async (groupId) => {
  const response = await axiosInstance.get(`/groups/${groupId}/students`);
  return response.data;
};

export const createStudent = async (groupId, data) => {
  const response = await axiosInstance.post(`/groups/${groupId}/students`, data);
  return response.data;
};

export const updateStudent = async (groupId, id, data) => {
  const response = await axiosInstance.put(`/groups/${groupId}/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (groupId, id) => {
  const response = await axiosInstance.delete(`/groups/${groupId}/students/${id}`);
  return response.data;
};

export const importStudentsFromFile = async (groupId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosInstance.post(`/groups/${groupId}/students/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
