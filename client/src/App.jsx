import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { CopilotProvider } from './context/CopilotContext';
import { PrivateRoute } from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import RegisterCompany from './pages/RegisterCompany'; // New SaaS Sign-up
import VerifyInvite from './pages/VerifyInvite';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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
import OfficeFinances from './pages/OfficeFinances';
import Inventory from './pages/Inventory';
import TwoFactorSettings from './pages/TwoFactorSettings';
import AuditLog from './pages/AuditLog';
import ProjectDocuments from './pages/ProjectDocuments';
import DailySiteReports from './pages/DailySiteReports';
import Invoices from './pages/Invoices';
import Drafts from './pages/Drafts';
import ApprovalThresholds from './pages/ApprovalThresholds';
import BankReconciliation from './pages/BankReconciliation';
import BankStatementReview from './pages/BankStatementReview';
import Billing from './pages/Billing';
import PlatformPayments from './pages/PlatformPayments';
import Landing from './pages/Landing';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from './pages/NotFound';

function App() {
    return (
        <AuthProvider>
            <AlertProvider>
                <CopilotProvider>
                    <BrowserRouter>
                        <ErrorBoundary>
                            <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<RegisterCompany />} />
                        <Route path="/verify-invite" element={<VerifyInvite />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />

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
                            path="/projects/:projectId"
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
                            path="/office-finances"
                            element={
                                <PrivateRoute>
                                    <OfficeFinances />
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
                        <Route
                            path="/inventory"
                            element={
                                <PrivateRoute>
                                    <Inventory />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/security/two-factor"
                            element={
                                <PrivateRoute>
                                    <TwoFactorSettings />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/audit-log"
                            element={
                                <PrivateRoute roles={['SUPER_ADMIN']}>
                                    <AuditLog />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/projects/:projectId/documents"
                            element={
                                <PrivateRoute>
                                    <ProjectDocuments />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/dsr"
                            element={
                                <PrivateRoute>
                                    <DailySiteReports />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/invoices"
                            element={
                                <PrivateRoute>
                                    <Invoices />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/drafts"
                            element={
                                <PrivateRoute>
                                    <Drafts />
                                </PrivateRoute>
                            }
                        />
                        {/* /drafts/:id deep-link opens the same page with the
                            review modal pre-opened (Drafts reads the param). */}
                        <Route
                            path="/drafts/:id"
                            element={
                                <PrivateRoute>
                                    <Drafts />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/settings/approval-thresholds"
                            element={
                                <PrivateRoute>
                                    <ApprovalThresholds />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/reconcile"
                            element={
                                <PrivateRoute>
                                    <BankReconciliation />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/reconcile/:id"
                            element={
                                <PrivateRoute>
                                    <BankStatementReview />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/billing"
                            element={
                                <PrivateRoute>
                                    <Billing />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/platform/payments"
                            element={
                                <PrivateRoute roles={['SUPER_ADMIN']}>
                                    <PlatformPayments />
                                </PrivateRoute>
                            }
                        />

                        {/* Public marketing landing page */}
                        <Route path="/" element={<Landing />} />
                        {/* Catch-all → marketing page (logged-in users see "Open App" CTA) */}
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                        </ErrorBoundary>
                </BrowserRouter>
                </CopilotProvider>
            </AlertProvider>
        </AuthProvider>
    );
}

export default App;
