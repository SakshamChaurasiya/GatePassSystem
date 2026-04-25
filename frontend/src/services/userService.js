import api from './api';

export const createUser = async (userData) => {
  const response = await api.post('/user/create-user', userData);
  return response.data;
};

export const bulkUploadStudents = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/user/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Update this function to accept the role parameter
export const getUsers = async (role = '') => {
  const response = await api.get('/user/get-users', {
    params: { role } // This sends ?role=student etc. to the backend
  });
  return response.data;
};