import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [token, storedUser] = await Promise.all([
                    AsyncStorage.getItem('token'),
                    AsyncStorage.getItem('user')
                ]);
                if (token && storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await authApi.login(email, password);
        if (!data?.token || !data?.user) {
            throw new Error('Invalid login response');
        }
        await AsyncStorage.multiSet([
            ['token', data.token],
            ['user', JSON.stringify(data.user)]
        ]);
        setUser(data.user);
        return data.user;
    }, []);

    const setSession = useCallback(async (token, userData) => {
        await AsyncStorage.multiSet([
            ['token', token],
            ['user', JSON.stringify(userData)]
        ]);
        setUser(userData);
        return userData;
    }, []);

    const logout = useCallback(async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, setSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
