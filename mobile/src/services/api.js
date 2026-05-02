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
    me: () => api.get('/auth/me')
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

export const dsrApi = {
    list: (params) => api.get('/dsr', { params }),
    get: (id) => api.get(`/dsr/${id}`),
    create: (data) => api.post('/dsr', data),
    update: (id, data) => api.put(`/dsr/${id}`, data),
    submit: (id) => api.put(`/dsr/${id}/submit`),
    acknowledge: (id, acknowledgeNotes) =>
        api.put(`/dsr/${id}/acknowledge`, { acknowledgeNotes })
};

export default api;
