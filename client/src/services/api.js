import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    registerCompany: (data) => api.post('/auth/register-company', data), // SaaS Sign-up Step 1
    verifyEmail: (data) => api.post('/auth/verify-email', data), // SaaS Sign-up Step 2
    verifyInvite: (token) => api.post('/auth/verify-invite', { token }),
    login: (data) => api.post('/auth/login', data),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (token, data) => api.put(`/auth/reset-password/${token}`, data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (formData) => api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const userAPI = {
    getAll: () => api.get('/users'),
    invite: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`)
};

// Projects API
export const projectsAPI = {
    getAll: () => api.get('/projects'),
    getOne: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    addNote: (id, data) => api.post(`/projects/${id}/notes`, data)
};

// Transactions API
export const transactionsAPI = {
    getAll: (params) => api.get('/transactions', { params }),
    getOne: (id) => api.get(`/transactions/${id}`),
    create: (data) => api.post('/transactions', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id) => api.delete(`/transactions/${id}`),
    getStats: (params) => api.get('/transactions/stats', { params }),
    recordIncome: (data) => api.post('/transactions/income', data)
};

// Clients API
export const clientsAPI = {
    getAll: () => api.get('/clients'),
    getOne: (id) => api.get(`/clients/${id}`),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`)
};

// Suppliers API
export const suppliersAPI = {
    getAll: (params) => api.get('/suppliers', { params }),
    getOne: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`)
};

// Workmen API
export const workmenAPI = {
    getAll: (params) => api.get('/workmen', { params }),
    getOne: (id) => api.get(`/workmen/${id}`),
    create: (data) => api.post('/workmen', data),
    update: (id, data) => api.put(`/workmen/${id}`, data),
    delete: (id) => api.delete(`/workmen/${id}`)
};

// Materials API
export const materialsAPI = {
    getAll: (params) => api.get('/materials', { params }),
    getOne: (id) => api.get(`/materials/${id}`),
    create: (data) => api.post('/materials', data),
    update: (id, data) => api.put(`/materials/${id}`, data),
    delete: (id) => api.delete(`/materials/${id}`)
};

// Material Usage API (and Batches)
export const materialUsageAPI = {
    getAll: (params) => api.get('/material-usage', { params }),
    create: (data) => api.post('/material-usage', data),
    getBatches: (params) => api.get('/material-batches', { params }),
    consumeBatch: (id, data) => api.post(`/material-batches/${id}/consume`, data)
};

// Workmanship API
export const workmanshipAPI = {
    getAll: (params) => api.get('/workmanships', { params }),
    getOne: (id) => api.get(`/workmanships/${id}`),
    create: (data) => api.post('/workmanships', data),
    update: (id, data) => api.put(`/workmanships/${id}`, data),
    delete: (id) => api.delete(`/workmanships/${id}`)
};

// Chat API
export const chatAPI = {
    getMessages: () => api.get('/chat'),
    sendText: (data) => api.post('/chat/text', data),
    sendAudio: (formData) => api.post('/chat/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// Tenant API
export const tenantAPI = {
    getSettings: () => api.get('/tenant'),
    updateSettings: (formData) => api.put('/tenant', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// Roles API (RBAC)
export const rolesAPI = {
    getAll: () => api.get('/roles'),
    getOne: (id) => api.get(`/roles/${id}`),
    create: (data) => api.post('/roles', data),
    update: (id, data) => api.put(`/roles/${id}`, data),
    delete: (id) => api.delete(`/roles/${id}`),
    getTemplates: () => api.get('/roles/templates'),
    seedDefaults: () => api.post('/roles/seed-defaults')
};

export default api;
