import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fos_token');
      localStorage.removeItem('fos_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
