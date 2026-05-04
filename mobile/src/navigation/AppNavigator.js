import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import FinanceScreen from '../screens/FinanceScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ClientsScreen from '../screens/ClientsScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import WorkmenScreen from '../screens/WorkmenScreen';
import FundEngineerScreen from '../screens/FundEngineerScreen';
import DSRListScreen from '../screens/DSRListScreen';
import DSRDetailScreen from '../screens/DSRDetailScreen';
import DSRCreateScreen from '../screens/DSRCreateScreen';
import DraftsListScreen from '../screens/DraftsListScreen';
import DraftReviewScreen from '../screens/DraftReviewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ProjectsStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </Stack.Navigator>
);

const FinanceStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FinanceList" component={FinanceScreen} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Stack.Screen name="DraftsList" component={DraftsListScreen} />
        <Stack.Screen name="DraftReview" component={DraftReviewScreen} />
    </Stack.Navigator>
);

const DSRStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DSRList" component={DSRListScreen} />
        <Stack.Screen name="DSRDetail" component={DSRDetailScreen} />
        <Stack.Screen name="DSRCreate" component={DSRCreateScreen} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="Clients" component={ClientsScreen} />
        <Stack.Screen name="Suppliers" component={SuppliersScreen} />
        <Stack.Screen name="Workmen" component={WorkmenScreen} />
        <Stack.Screen name="FundEngineer" component={FundEngineerScreen} />
    </Stack.Navigator>
);

const TabBar = () => {
    const { t } = useTranslation();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarStyle: { paddingTop: 6, paddingBottom: 6, height: 60 },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarIcon: ({ color, size }) => {
                    const icons = {
                        ProjectsTab: 'folder-open-outline',
                        FinanceTab: 'cash-outline',
                        DSRTab: 'clipboard-outline',
                        NotificationsTab: 'notifications-outline',
                        ProfileTab: 'person-circle-outline'
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                }
            })}
        >
            <Tab.Screen name="ProjectsTab" component={ProjectsStack} options={{ title: t('tabs.projects') }} />
            <Tab.Screen name="FinanceTab" component={FinanceStack} options={{ title: t('tabs.finance') }} />
            <Tab.Screen name="DSRTab" component={DSRStack} options={{ title: t('tabs.dsr') || 'Reports' }} />
            <Tab.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: t('tabs.notifications') }} />
            <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: t('tabs.profile') }} />
        </Tab.Navigator>
    );
};

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <TabBar /> : (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
}
