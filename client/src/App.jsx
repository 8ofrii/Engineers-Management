import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import Workforce from './pages/Workforce';
import ChatAssistant from './pages/ChatAssistant';
import Reports from './pages/Reports';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

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
                        path="/reports"
                        element={
                            <PrivateRoute>
                                <Reports />
                            </PrivateRoute>
                        }
                    />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
