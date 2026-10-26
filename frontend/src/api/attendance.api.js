import axiosInstance from './axiosInstance';

export const takeAttendance = async (groupId, entries, date) => {
  const response = await axiosInstance.post(`/groups/${groupId}/attendance`, {
    entries,
    date
  });
  return response.data;
};

export const getAttendanceHistory = async (groupId) => {
  const response = await axiosInstance.get(`/groups/${groupId}/attendance`);
  return response.data;
};
