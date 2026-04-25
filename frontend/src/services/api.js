import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 and 403 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message;
      if (message === 'Token expired' || message === 'Invalid token' || message === 'Not authorized' || message === 'User not found or inactive') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      const message = error.response?.data?.message;
      if (message === 'Please change your password first') {
        // Redirection to change password
        window.location.href = '/change-password';
      } else if (message === 'Complete profile first') {
        window.location.href = '/complete-profile';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
