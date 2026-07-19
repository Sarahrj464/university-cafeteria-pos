import api from './api';

export const lookupStudent = async (studentId) => {
  const { data } = await api.get(`/students/lookup/${encodeURIComponent(studentId)}`);
  return data.data;
};
