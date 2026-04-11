/* =====================================================================
   api.js — Axios instance + all API helpers
   ===================================================================== */
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ppa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to home (hash router) on 401 — but ONLY for protected routes,
// not for /auth/login or /auth/register which legitimately return 401/400
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/me');
    if (err.response && err.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ppa_token');
      localStorage.removeItem('ppa_user');
      localStorage.removeItem('ppa_profile');
      window.location.href = '/#/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────
const Auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

// ── Admin ─────────────────────────────────────────────────────────────
const Admin = {
  dashboard: () => api.get('/admin/dashboard'),
  companies: (params) => api.get('/admin/companies', { params }),
  getCompany: (id) => api.get(`/admin/companies/${id}`),
  approveCompany: (id) => api.put(`/admin/companies/${id}/approve`),
  rejectCompany: (id, reason) => api.put(`/admin/companies/${id}/reject`, { reason }),
  blacklistCompany: (id, action) => api.put(`/admin/companies/${id}/blacklist`, { action }),
  deleteCompany: (id) => api.delete(`/admin/companies/${id}`),
  students: (params) => api.get('/admin/students', { params }),
  getStudent: (id) => api.get(`/admin/students/${id}`),
  blacklistStudent: (id, action) => api.put(`/admin/students/${id}/blacklist`, { action }),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  drives: (params) => api.get('/admin/drives', { params }),
  approveDrive: (id) => api.put(`/admin/drives/${id}/approve`),
  rejectDrive: (id, reason) => api.put(`/admin/drives/${id}/reject`, { reason }),
  applications: (params) => api.get('/admin/applications', { params }),
  search: (params) => api.get('/admin/search', { params }),
  reports: (params) => api.get('/admin/reports', { params })
};

// ── Company ───────────────────────────────────────────────────────────
const Company = {
  dashboard: () => api.get('/company/dashboard'),
  getProfile: () => api.get('/company/profile'),
  updateProfile: (data) => api.put('/company/profile', data),
  drives: () => api.get('/company/drives'),
  createDrive: (data) => api.post('/company/drives', data),
  updateDrive: (id, data) => api.put(`/company/drives/${id}`, data),
  deleteDrive: (id) => api.delete(`/company/drives/${id}`),
  closeDrive: (id) => api.put(`/company/drives/${id}/close`),
  driveApplications: (id, params) => api.get(`/company/drives/${id}/applications`, { params }),
  updateAppStatus: (appId, data) => api.put(`/company/applications/${appId}/status`, data),
  triggerExport: (driveId) => api.post(`/company/drives/${driveId}/export`),
  exportStatus: (taskId) => api.get(`/company/export/status/${taskId}`),
  downloadExport: (taskId) => api.get(`/company/export/download/${taskId}`, { responseType: 'blob' })
};

// ── Student ───────────────────────────────────────────────────────────
const Student = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  uploadResume: (formData) => api.post('/student/profile/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  drives: (params) => api.get('/student/drives', { params }),
  getDrive: (id) => api.get(`/student/drives/${id}`),
  apply: (driveId, data) => api.post(`/student/drives/${driveId}/apply`, data),
  myApplications: () => api.get('/student/applications'),
  triggerExport: () => api.post('/student/applications/export'),
  exportStatus: (taskId) => api.get(`/student/export/status/${taskId}`),
  downloadExport: (taskId) => api.get(`/student/export/download/${taskId}`, { responseType: 'blob' }),
  history: () => api.get('/student/history')
};
