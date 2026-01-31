import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { PrivateRoute } from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import RegisterCompany from './pages/RegisterCompany'; // New SaaS Sign-up
import VerifyInvite from './pages/VerifyInvite';
import Dashboard from './pages/Dashboard';
import CompanySettings from './pages/CompanySettings';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import Workforce from './pages/Workforce';
import ChatAssistant from './pages/ChatAssistant';
import Reports from './pages/Reports';
import TeamManagement from './pages/TeamManagement';
import Finance from './pages/Finance';

function App() {
    return (
        <AuthProvider>
            <AlertProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<RegisterCompany />} />
                        <Route path="/verify-invite" element={<VerifyInvite />} />

                        {/* Protected Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/projects"
                            element={
                                <PrivateRoute>
                                    <Projects />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/clients"
                            element={
                                <PrivateRoute>
                                    <Clients />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/suppliers"
                            element={
                                <PrivateRoute>
                                    <Suppliers />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/workforce"
                            element={
                                <PrivateRoute>
                                    <Workforce />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/chat"
                            element={
                                <PrivateRoute>
                                    <ChatAssistant />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/team"
                            element={
                                <PrivateRoute>
                                    <TeamManagement />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/reports"
                            element={
                                <PrivateRoute>
                                    <Reports />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/finance"
                            element={
                                <PrivateRoute>
                                    <Finance />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <PrivateRoute>
                                    <CompanySettings />
                                </PrivateRoute>
                            }
                        />

                        {/* Default Route */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </AlertProvider>
        </AuthProvider>
    );
}

export default App;
