import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initI18n } from './src/i18n';

function AppContent() {
    const { theme } = useTheme();
    return (
        <>
            <StatusBar style={theme.statusBarStyle} />
            <AppNavigator />
        </>
    );
}

export default function App() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        initI18n().finally(() => setReady(true));
    }, []);

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

