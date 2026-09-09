import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import FinanceScreen from '../screens/FinanceScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OperationsHubScreen from '../screens/OperationsHubScreen';
import ClientsScreen from '../screens/ClientsScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import WorkmenScreen from '../screens/WorkmenScreen';
import InventoryScreen from '../screens/InventoryScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import AIChatScreen from '../screens/AIChatScreen';
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
        <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
);

const FinanceStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FinanceList" component={FinanceScreen} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Stack.Screen name="DraftsList" component={DraftsListScreen} />
        <Stack.Screen name="DraftReview" component={DraftReviewScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
);

const DSRStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DSRList" component={DSRListScreen} />
        <Stack.Screen name="DSRDetail" component={DSRDetailScreen} />
        <Stack.Screen name="DSRCreate" component={DSRCreateScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
);

const OperationsStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OperationsHub" component={OperationsHubScreen} />
        <Stack.Screen name="Workmen" component={WorkmenScreen} />
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Invoices" component={InvoicesScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="Clients" component={ClientsScreen} />
        <Stack.Screen name="Suppliers" component={SuppliersScreen} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="FundEngineer" component={FundEngineerScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
);

const TabBar = () => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
    const barHeight = Platform.OS === 'ios' ? 56 + insets.bottom : 64;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.subtext,
                tabBarStyle: {
                    backgroundColor: theme.tabBar,
                    borderTopColor: theme.tabBorder,
                    borderTopWidth: 1,
                    paddingTop: 8,
                    paddingBottom: bottomPadding,
                    height: barHeight
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    marginTop: 2,
                    marginBottom: Platform.OS === 'ios' ? 0 : 4
                },
                tabBarIcon: ({ color, size }) => {
                    const icons = {
                        ProjectsTab: 'business-outline',
                        FinanceTab: 'wallet-outline',
                        DSRTab: 'clipboard-outline',
                        OperationsTab: 'grid-outline',
                        ProfileTab: 'person-outline'
                    };
                    return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
                }
            })}
        >
            <Tab.Screen
                name="ProjectsTab"
                component={ProjectsStack}
                options={{ title: isArabic ? 'المشاريع' : 'Projects' }}
            />
            <Tab.Screen
                name="FinanceTab"
                component={FinanceStack}
                options={{ title: isArabic ? 'المالية' : 'Finance' }}
            />
            <Tab.Screen
                name="DSRTab"
                component={DSRStack}
                options={{ title: isArabic ? 'التقارير' : 'Reports' }}
            />
            <Tab.Screen
                name="OperationsTab"
                component={OperationsStack}
                options={{ title: isArabic ? 'العمليات' : 'Operations' }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStack}
                options={{ title: isArabic ? 'حسابي' : 'Profile' }}
            />
        </Tab.Navigator>
    );
};

export default function AppNavigator() {
    const { user, loading } = useAuth();
    const { theme } = useTheme();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <TabBar /> : (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
}

