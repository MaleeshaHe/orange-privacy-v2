import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  giveBiometricConsent: () => api.post('/auth/consent/biometric'),
  revokeBiometricConsent: () => api.delete('/auth/consent/biometric'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// Reference Photos API
export const refPhotoAPI = {
  getAll: () => api.get('/ref-photos'),
  upload: (formData: FormData) => api.post('/ref-photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (photoId: string) => api.delete(`/ref-photos/${photoId}`),
  deactivate: (photoId: string) => api.patch(`/ref-photos/${photoId}/deactivate`),
  activate: (photoId: string) => api.patch(`/ref-photos/${photoId}/activate`),
};

// Scan Jobs API
export const scanJobAPI = {
  getAll: (params?: any) => api.get('/scan-jobs', { params }),
  getById: (jobId: string) => api.get(`/scan-jobs/${jobId}`),
  create: (data: any) => api.post('/scan-jobs', data),
  cancel: (jobId: string) => api.post(`/scan-jobs/${jobId}/cancel`),
  getStats: () => api.get('/scan-jobs/stats'),
};

// Scan Results API
export const scanResultAPI = {
  getByScanJob: (scanJobId: string, params?: any) =>
    api.get(`/scan-results/scan/${scanJobId}`, { params }),
  getStats: (scanJobId: string) => api.get(`/scan-results/scan/${scanJobId}/stats`),
  updateConfirmation: (resultId: string, isConfirmed: boolean) =>
    api.patch(`/scan-results/${resultId}/confirm`, { isConfirmedByUser: isConfirmed }),
};

// Social Media API
export const socialMediaAPI = {
  // Get connected accounts
  getAll: () => api.get('/social-media'),
  // OAuth configuration status
  getOAuthStatus: () => axios.get(`${API_URL}/api/social-media/oauth/status`),
  // OAuth flows
  getFacebookOAuthUrl: () => api.get('/social-media/facebook/oauth'),
  getInstagramOAuthUrl: () => api.get('/social-media/instagram/oauth'),
  // Account management
  sync: (accountId: string) => api.post(`/social-media/${accountId}/sync`),
  disconnect: (accountId: string) => api.post(`/social-media/${accountId}/disconnect`),
};

// Admin API
export const adminAPI = {
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetails: (userId: string) => api.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: any) => api.put(`/admin/users/${userId}`, data),
  getAllScanJobs: (params?: any) => api.get('/admin/scans', { params }),
  getSystemStats: () => api.get('/admin/stats'),
  getSystemLogs: (params?: any) => api.get('/admin/logs', { params }),
};

export default api;
