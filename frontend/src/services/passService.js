import api from './api';

export const requestPass = async (passData) => {
  const formData = new FormData();
  Object.keys(passData).forEach((key) => {
    formData.append(key, passData[key]);
  });
  
  const response = await api.post('/passes/request-pass', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMyRequests = async () => {
  const response = await api.get('/passes/my-requests');
  return response.data;
};

export const cancelPassRequest = async (id) => {
  const response = await api.patch(`/passes/${id}/cancel`);
  return response.data;
};

export const getMyPassesWithStatus = async () => {
  const response = await api.get('/passes/my');
  return response.data;
};

export const getAllPassRequests = async (status = '') => {
  const config = {};
  if (status) config.params = { status };
  const response = await api.get('/passes/all', config);
  return response.data;
};

export const handlePassAction = async (id, action, remark = '') => {
  const response = await api.patch(`/passes/${id}/action`, { action, remark });
  return response.data;
};

export const getStudentHistory = async (studentId) => {
  const response = await api.get(`/passes/history/${studentId}`);
  return response.data;
};

export const getManagerHistory = async (managerId) => {
  const response = await api.get(`/passes/manager-history/${managerId}`);
  return response.data;
};

export const getAllPassesWithStatus = async (filters = {}) => {
  const response = await api.get('/passes/all-passes', { params: filters });
  return response.data;
};

export const getGatekeeperPasses = async () => {
  const response = await api.get('/passes/get-passes');
  return response.data;
};

export const markOut = async (passId) => {
  const response = await api.post('/passes/mark-out', { passId });
  return response.data;
};

export const markIn = async (passId) => {
  const response = await api.post('/passes/mark-in', { passId });
  return response.data;
};

export const scanQR = async (qrData) => {
  const response = await api.post('/passes/qr', { qrCode: qrData });
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

// Extension requests
export const requestExtension = async (data) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });

  const response = await api.post('/passes/extension-request', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMyExtensionRequests = async () => {
  const response = await api.get('/passes/my-extensions');
  return response.data;
};

export const getAllExtensionRequests = async () => {
  const response = await api.get('/passes/all-extensions');
  return response.data;
};

export const handleExtensionAction = async (id, action, remark = '') => {
  const response = await api.patch(`/passes/extension/${id}/action`, { action, remark });
  return response.data;
};
