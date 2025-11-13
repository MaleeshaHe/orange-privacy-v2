import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance with timeout and retry configuration
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // 30 second timeout (increased for scan operations)
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable keepalive for persistent connections
  transitional: {
    clarifyTimeoutError: true,
  },
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Helper to check if request should be retried
const shouldRetry = (error: AxiosError): boolean => {
  if (!error.config) return false;

  // Don't retry if max retries reached
  const config = error.config as any;
  const retryCount = config.__retryCount || 0;
  if (retryCount >= MAX_RETRIES) return false;

  // Retry on network errors
  if (!error.response) return true;

  // Retry on specific status codes
  return RETRY_STATUS_CODES.includes(error.response.status);
};

// Helper to calculate retry delay with exponential backoff
const getRetryDelay = (retryCount: number): number => {
  return RETRY_DELAY * Math.pow(2, retryCount);
};

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

// Response interceptor for error handling with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any;

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry logic for network errors and specific status codes
    if (shouldRetry(error)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const retryDelay = getRetryDelay(config.__retryCount);

      console.log(
        `Retrying request (${config.__retryCount}/${MAX_RETRIES}) after ${retryDelay}ms...`,
        error.message
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Retry the request
      return api.request(config);
    }

    // Log connection errors for debugging
    if (!error.response) {
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: config?.url,
        method: config?.method,
      });
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
  getAll: (params?: any) => api.get('/scan-jobs', {
    params,
    timeout: 10000, // 10 second timeout for polling
  }),
  getById: (jobId: string) => api.get(`/scan-jobs/${jobId}`, {
    timeout: 10000, // 10 second timeout
  }),
  create: (data: any) => api.post('/scan-jobs', data, {
    timeout: 60000, // 60 second timeout for creation (job queuing)
  }),
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
