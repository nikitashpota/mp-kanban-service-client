import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────
export const login = (data) => api.post('/auth/login', data).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const changePassword = (data) => api.post('/auth/change-password', data).then(r => r.data);

// ── Projects ──────────────────────────
export const getProjects = () => api.get('/projects').then(r => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then(r => r.data);
export const createProject = (data) => api.post('/projects', data).then(r => r.data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then(r => r.data);

// ── Photos ────────────────────────────
export const uploadPhotos = (id, files) => {
  const fd = new FormData();
  files.forEach(f => fd.append('photos', f));
  return api.post(`/projects/${id}/photos`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
export const setMainPhoto = (id, photoId) =>
  api.put(`/projects/${id}/main-photo/${photoId}`).then(r => r.data);
export const deletePhoto = (id, photoId) =>
  api.delete(`/projects/${id}/photos/${photoId}`).then(r => r.data);

// ── ТЭП ──────────────────────────────
export const uploadTep = (id, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/projects/${id}/tep/upload`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

// ── Contacts ──────────────────────────
export const addContact = (id, data) =>
  api.post(`/projects/${id}/contacts`, data).then(r => r.data);
export const updateContact = (id, contactId, data) =>
  api.put(`/projects/${id}/contacts/${contactId}`, data).then(r => r.data);
export const deleteContact = (id, contactId) =>
  api.delete(`/projects/${id}/contacts/${contactId}`).then(r => r.data);

export const setPhotoType = (id, photoId, photo_type) =>
  api.put(`/projects/${id}/photos/${photoId}/type`, { photo_type }).then(r => r.data);

// ── Engineering networks ───────────────────────────────────────
export const saveNetworks = (id, networks) =>
  api.put(`/projects/${id}/networks`, { networks }).then(r => r.data);

// ── Passport ──────────────────────────────────────────────────
export const getPassport = (projectId) =>
  api.get(`/passport/${projectId}`).then(r => r.data);
export const savePassportHeader = (projectId, data) =>
  api.put(`/passport/${projectId}/header`, data).then(r => r.data);
export const savePassportStages = (projectId, stages) =>
  api.put(`/passport/${projectId}/stages`, { stages }).then(r => r.data);
export const patchPassportStage = (projectId, stageId, fields) =>
  api.patch(`/passport/${projectId}/stages/${stageId}`, fields).then(r => r.data);
export const savePassportIssues = (projectId, issues) =>
  api.put(`/passport/${projectId}/issues`, { issues }).then(r => r.data);
export const initPassport = (projectId) =>
  api.post(`/passport/${projectId}/init`).then(r => r.data);
export const initPassportV2 = (projectId) =>
  api.post(`/passport/${projectId}/init-v2`).then(r => r.data);
export const importPassportXlsx = (projectId, file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post(`/import/${projectId}/xlsx`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

// ── Pending approvals ─────────────────────────────────────────
// ГИП предлагает дату (пишет в execution_actual_pending)
export const proposeDate = (stageId, date, slot = 1) =>
  api.post(`/pending/propose/${stageId}`, { date, slot }).then(r => r.data);

// РП утверждает предложенную дату
export const approveDate = (stageId, slot = 1) =>
  api.post(`/pending/approve/${stageId}`, { slot }).then(r => r.data);

// РП отклоняет предложенную дату
export const rejectDate = (stageId, slot = 1) =>
  api.post(`/pending/reject/${stageId}`, { slot }).then(r => r.data);

// Получить все ожидающие утверждения для проекта
export const getPending = (projectId) =>
  api.get(`/pending/${projectId}`).then(r => r.data);

// Получить счётчик pending по всем проектам (для бейджа)
export const getPendingAll = () =>
  api.get('/pending/count/all').then(r => r.data);

// ── Analytics ─────────────────────────────────────────────────
export const getAnalytics = (typeId) =>
  api.get('/analytics', { params: typeId ? { type_id: typeId } : {} }).then(r => r.data);

// ── Kanban ────────────────────────────────────────────────────
export const getKanban = () => api.get('/kanban').then(r => r.data);
export const patchKanbanStage = (stageId, data) =>
  api.patch(`/kanban/stage/${stageId}`, data).then(r => r.data);

// ── Project Types ─────────────────────────────────────────────
export const getProjectTypes = () => api.get('/project-types').then(r => r.data);
export const createProjectType = (data) => api.post('/project-types', data).then(r => r.data);
export const updateProjectType = (id, data) => api.put(`/project-types/${id}`, data).then(r => r.data);
export const deleteProjectType = (id) => api.delete(`/project-types/${id}`).then(r => r.data);
export const assignProjectType = (projectId, project_type_id) =>
  api.patch(`/project-types/assign/${projectId}`, { project_type_id }).then(r => r.data);

// ── Users ─────────────────────────────
export const getUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data) => api.post('/users', data).then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);

export const photoUrl = (filename) => filename ? `/uploads/${filename}` : null;

export default api;
