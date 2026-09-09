import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Resolution order:
//   1. EXPO_PUBLIC_API_URL env (set in .env, useful per-developer override)
//   2. expo.extra.apiUrl from app.json (default for the project)
//   3. Android emulator fallback (10.0.2.2 maps to host machine's localhost)
const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'http://10.0.2.2:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'user']);
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    me: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
    registerCompany: (data) => api.post('/auth/register-company', data),
    verifyEmail: (data) => api.post('/auth/verify-email', data)
};

export const projectsApi = {
    list: () => api.get('/projects'),
    get: (id) => api.get(`/projects/${id}`),
    financials: (id) => api.get(`/projects/${id}/financials`)
};

export const transactionsApi = {
    stats: () => api.get('/transactions/stats'),
    list: (params) => api.get('/transactions', { params }),
    pendingApprovals: () => api.get('/transactions/pending-approvals'),
    create: (data) => api.post('/transactions/v2', data),
    approve: (id) => api.put(`/transactions/${id}/approve`),
    reject: (id, reason) => api.put(`/transactions/${id}/reject`, { reason })
};

export const notificationsApi = {
    list: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all')
};

export const custodyApi = {
    balance: (engineerId) => api.get(`/custody/balance/${engineerId}`),
    history: (engineerId) => api.get(`/custody/history/${engineerId}`),
    all: () => api.get('/custody/all'),
    fund: (engineerId, amount, description) =>
        api.post('/custody/transfer', { engineerId, amount, description }),
    return: (amount, description) =>
        api.post('/custody/return', { amount, description })
};

export const clientsApi = {
    list: () => api.get('/clients')
};

export const suppliersApi = {
    list: () => api.get('/suppliers')
};

export const workmenApi = {
    list: () => api.get('/workmen')
};

export const usersApi = {
    list: () => api.get('/users')
};

// Phase 7 — AI extraction (voice / receipt → persisted draft) + drafts CRUD.
// audio: pass { uri, name, type } object the way React Native FormData expects.
// image: same shape (uri, name, type).
export const aiExtractApi = {
    voice: ({ uri, name = 'voice.m4a', type = 'audio/m4a' }) => {
        const fd = new FormData();
        fd.append('audio', { uri, name, type });
        return api.post('/ai/extract/voice', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    receipt: ({ uri, name = 'receipt.jpg', type = 'image/jpeg' }) => {
        const fd = new FormData();
        fd.append('image', { uri, name, type });
        return api.post('/ai/extract/receipt', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

export const draftsApi = {
    list: (params) => api.get('/transaction-drafts', { params }),
    get: (id) => api.get(`/transaction-drafts/${id}`),
    update: (id, matchedDraft) => api.put(`/transaction-drafts/${id}`, { matchedDraft }),
    rematch: (id) => api.post(`/transaction-drafts/${id}/rematch`),
    commit: (id, transactionId) => api.post(`/transaction-drafts/${id}/commit`, { transactionId }),
    discard: (id) => api.delete(`/transaction-drafts/${id}`)
};

export const dsrApi = {
    list: (params) => api.get('/dsr', { params }),
    get: (id) => api.get(`/dsr/${id}`),
    update: (id, data) => api.put(`/dsr/${id}`, data),
    submit: (id) => api.put(`/dsr/${id}/submit`),
    acknowledge: (id, acknowledgeNotes) =>
        api.put(`/dsr/${id}/acknowledge`, { acknowledgeNotes })
};

export const materialsApi = {
    list: () => api.get('/materials'),
    batches: () => api.get('/material-batches')
};

export const invoicesApi = {
    list: (params) => api.get('/invoices', { params }),
    get: (id) => api.get(`/invoices/${id}`)
};

export const aiChatApi = {
    send: (messageOrFormData, history = [], isAudio = false) => {
        if (isAudio) {
            return api.post('/chat/message', messageOrFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        return api.post('/chat/message', { message: messageOrFormData, history });
    },
    history: () => api.get('/chat/history'),
    clear: () => api.delete('/chat/history')
};

export const billingApi = {
    subscription: () => api.get('/billing/subscription')
};

export const getWebBillingUrl = () => {
    return process.env.EXPO_PUBLIC_WEB_URL || 'http://148.251.171.147/billing';
};

export default api;

