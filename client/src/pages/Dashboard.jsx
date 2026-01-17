import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { projectsAPI, transactionsAPI, clientsAPI, suppliersAPI } from '../services/api';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Building2,
    Package,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        projects: { total: 0, active: 0 },
        clients: { total: 0 },
        suppliers: { total: 0 },
        transactions: { income: 0, expense: 0, balance: 0 }
    });
    const [recentProjects, setRecentProjects] = useState([]);
    const [transactionStats, setTransactionStats] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [projectsRes, clientsRes, suppliersRes, transactionsRes, statsRes] = await Promise.all([
                projectsAPI.getAll(),
                clientsAPI.getAll(),
                suppliersAPI.getAll(),
                transactionsAPI.getAll(),
                transactionsAPI.getStats()
            ]);

            const projects = projectsRes.data.data;
            const transactions = transactionsRes.data.data;

            // Calculate stats
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const expense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            setStats({
                projects: {
                    total: projects.length,
                    active: projects.filter(p => p.status === 'in-progress').length
                },
                clients: { total: clientsRes.data.count },
                suppliers: { total: suppliersRes.data.count },
                transactions: {
                    income,
                    expense,
                    balance: income - expense
                }
            });

            setRecentProjects(projects.slice(0, 5));
            setTransactionStats(statsRes.data.data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const COLORS = ['hsl(210, 100%, 60%)', 'hsl(280, 70%, 60%)', 'hsl(160, 80%, 50%)', 'hsl(35, 100%, 60%)', 'hsl(0, 85%, 60%)'];

    if (loading) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard">
                <div className="dashboard-header">
                    <div>
                        <h1>
                            <LayoutDashboard size={32} />
                            {t('dashboard.title')}
                        </h1>
                        <p>{t('dashboard.welcome', { name: user?.name })}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(210, 100%, 60%, 0.15)' }}>
                            <FolderKanban size={24} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.totalProjects')}</div>
                            <div className="stat-value">{stats.projects.total}</div>
                            <div className="stat-meta">
                                <span className="badge badge-primary">{stats.projects.active} {t('dashboard.activeProjects')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(140, 70%, 55%, 0.15)' }}>
                            <TrendingUp size={24} style={{ color: 'var(--color-success)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.totalIncome')}</div>
                            <div className="stat-value">{formatCurrency(stats.transactions.income)}</div>
                            <div className="stat-meta">
                                <ArrowUpRight size={16} style={{ color: 'var(--color-success)' }} />
                                <span style={{ color: 'var(--color-success)' }}>{t('dashboard.revenue')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(0, 85%, 60%, 0.15)' }}>
                            <TrendingDown size={24} style={{ color: 'var(--color-danger)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.totalExpenses')}</div>
                            <div className="stat-value">{formatCurrency(stats.transactions.expense)}</div>
                            <div className="stat-meta">
                                <ArrowDownRight size={16} style={{ color: 'var(--color-danger)' }} />
                                <span style={{ color: 'var(--color-danger)' }}>{t('dashboard.costs')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(280, 70%, 60%, 0.15)' }}>
                            <DollarSign size={24} style={{ color: 'var(--color-secondary)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.netBalance')}</div>
                            <div className="stat-value">{formatCurrency(stats.transactions.balance)}</div>
                            <div className="stat-meta">
                                <span className={stats.transactions.balance >= 0 ? 'text-success' : 'text-danger'}>
                                    {stats.transactions.balance >= 0 ? t('dashboard.profit') : t('dashboard.loss')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(160, 80%, 50%, 0.15)' }}>
                            <Users size={24} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.activeClients')}</div>
                            <div className="stat-value">{stats.clients.total}</div>
                            <div className="stat-meta">
                                <Link to="/clients" className="stat-link">{t('dashboard.viewAll')}</Link>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'hsla(35, 100%, 60%, 0.15)' }}>
                            <Package size={24} style={{ color: 'var(--color-warning)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">{t('dashboard.suppliers')}</div>
                            <div className="stat-value">{stats.suppliers.total}</div>
                            <div className="stat-meta">
                                <Link to="/suppliers" className="stat-link">{t('dashboard.viewAll')}</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                {transactionStats && (
                    <div className="charts-grid">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">{t('dashboard.expensesByCategory')}</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={transactionStats.byCategory}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ _id, percent }) => `${_id}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="total"
                                            nameKey="_id"
                                        >
                                            {transactionStats.byCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">{t('dashboard.incomeVsExpenses')}</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={transactionStats.byType}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="_id" stroke="var(--text-secondary)" />
                                        <YAxis stroke="var(--text-secondary)" />
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                        />
                                        <Bar dataKey="total" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Projects */}
                <div className="card">
                    <div className="card-header flex-between">
                        <h3 className="card-title">{t('dashboard.recentProjects')}</h3>
                        <Link to="/projects" className="btn btn-secondary btn-sm">
                            {t('dashboard.viewAll')}
                        </Link>
                    </div>
                    <div className="card-body">
                        {recentProjects.length === 0 ? (
                            <p className="text-center text-secondary">{t('projects.noProjects')}. {t('projects.createFirst')}</p>
                        ) : (
                            <div className="projects-list">
                                {recentProjects.map((project) => (
                                    <div key={project._id} className="project-item">
                                        <div className="project-info">
                                            <h4>{project.name}</h4>
                                            <p>{project.client?.name || 'No client'}</p>
                                        </div>
                                        <div className="project-meta">
                                            <span className={`badge badge-${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                            <span className="project-budget">{formatCurrency(project.budget)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function getStatusColor(status) {
    const colors = {
        'planning': 'warning',
        'in-progress': 'primary',
        'on-hold': 'warning',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'primary';
}
