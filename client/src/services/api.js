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
        // Don't auto-redirect for 401s on the login endpoint itself —
        // a wrong-password response is a 401 that the Login page wants to
        // surface as an error message, not a navigation.
        const reqUrl = error.config?.url || '';
        const isAuthAttempt = /\/auth\/(login|register|register-company|verify-email|verify-invite|forgot-password|reset-password)/.test(reqUrl);

        if (error.response?.status === 401 && !isAuthAttempt) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Avoid redirect loop if we're already on /login.
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
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
    login2FA: (data) => api.post('/auth/2fa/login', data),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (token, data) => api.put(`/auth/reset-password/${token}`, data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (formData) => api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    twoFactor: {
        status: () => api.get('/auth/2fa/status'),
        enroll: () => api.post('/auth/2fa/enroll'),
        confirm: (code) => api.post('/auth/2fa/confirm', { code }),
        disable: (password, code) => api.post('/auth/2fa/disable', { password, code })
    }
};

// Audit log API (admin-only listing; per-resource history available to any tenant member)
export const auditLogAPI = {
    list: (params) => api.get('/audit-logs', { params }),
    history: (entity, entityId) => api.get(`/audit-logs/${entity}/${entityId}`)
};

// Phase 5 — Invoicing
export const invoicesAPI = {
    list: (params) => api.get('/invoices', { params }),
    get: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    remove: (id) => api.delete(`/invoices/${id}`),
    pdfUrl: (id) => {
        // Returns a URL the browser can open in a new tab. Uses the bearer
        // token from localStorage; for download we fetch+blob via the helper below.
        return `${API_URL}/invoices/${id}/pdf`;
    },
    downloadPdf: async (id) => {
        const r = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
        return r.data; // Blob
    },
    send: (id, body) => api.post(`/invoices/${id}/send`, body || {}),
    recordPayment: (id, amount, paidAt) =>
        api.post(`/invoices/${id}/payment`, { amount, paidAt }),
    cancel: (id) => api.put(`/invoices/${id}/cancel`)
};

// Phase 4 — Daily Site Reports
export const dsrAPI = {
    list: (params) => api.get('/dsr', { params }),
    get: (id) => api.get(`/dsr/${id}`),
    create: (data) => api.post('/dsr', data),
    update: (id, data) => api.put(`/dsr/${id}`, data),
    submit: (id) => api.put(`/dsr/${id}/submit`),
    acknowledge: (id, acknowledgeNotes) =>
        api.put(`/dsr/${id}/acknowledge`, { acknowledgeNotes }),
    remove: (id) => api.delete(`/dsr/${id}`)
};

// Phase 3 — Documents/photos per project
export const documentsAPI = {
    listByProject: (projectId, params) =>
        api.get(`/project-documents/${projectId}`, { params }),
    upload: (projectId, formData) =>
        api.post(`/project-documents/${projectId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    remove: (id) => api.delete(`/documents/${id}`),
    uploadReceipt: (transactionId, formData) =>
        api.patch(`/transactions/${transactionId}/receipt`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
};

// Tenant approval thresholds (admin-only)
export const tenantAPI = {
    get: () => api.get('/tenant'),
    update: (formData) => api.put('/tenant', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getApprovalThresholds: () => api.get('/tenant/approval-thresholds'),
    updateApprovalThresholds: (thresholds) => api.put('/tenant/approval-thresholds', { thresholds })
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
    recordIncome: (data) => api.post('/transactions/income', data),
    createV2: (data) => api.post('/transactions/v2', data),
    getPending: (params) => api.get('/transactions/pending', { params }), // For manager view
    approve: (id) => api.put(`/transactions/${id}/approve`),
    reject: (id, reason) => api.put(`/transactions/${id}/reject`, { reason }),
    submitDraft: (id, data) => api.put(`/transactions/${id}/submit`, data), // For engineer submitting draft
    transferCustody: (data) => api.post('/transactions/transfer-custody', data), // For custody transfers
    getProjectInventory: (projectId) => api.get(`/transactions/projects/${projectId}/inventory`),
    analyze: (formData) => api.post('/transactions/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getCostCenters: () => api.get('/transactions/cost-centers')
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
    consumeBatch: (id, data) => api.post(`/material-batches/${id}/consume`, data),
    deleteBatch: (id) => api.delete(`/material-batches/${id}`),
    recordUsageV2: (data) => api.post('/transactions/inventory-usage', data)
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
    getMessages: () => api.get('/chat/history'),
    sendMessage: (contentOrFormData, isAudio = false) => {
        if (isAudio) {
            return api.post('/chat/message', contentOrFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return api.post('/chat/message', { message: contentOrFormData });
    },
    clearHistory: () => api.delete('/chat/history')
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

// Project Cost Items API (Work Orders)
export const projectCostItemsAPI = {
    getAll: (params) => api.get('/project-cost-items', { params }),
    getByProject: (projectId) => api.get(`/project-cost-items/project/${projectId}`),
    getOne: (id) => api.get(`/project-cost-items/${id}`),
    create: (data) => api.post('/project-cost-items', data),
    update: (id, data) => api.put(`/project-cost-items/${id}`, data),
    delete: (id) => api.delete(`/project-cost-items/${id}`)
};

export default api;
