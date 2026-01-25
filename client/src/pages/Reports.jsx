import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../services/api';
import { FileText, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';

export default function Reports() {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const response = await transactionsAPI.getStats();
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

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
            <div>
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md">
                            <FileText size={32} />
                            {t('reports.title')}
                        </h1>
                        <p className="text-secondary">{t('reports.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary">
                        <Download size={20} />
                        {t('reports.exportReport')}
                    </button>
                </div>

                {!stats || (stats.byType && stats.byType.length === 0) ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <FileText size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('reports.noData')}</h3>
                        <p className="text-secondary">{t('reports.addTransactions')}</p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">{t('dashboard.incomeVsExpenses')}</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.byType}>
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

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">{t('dashboard.expensesByCategory')}</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.byCategory}>
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
                                        <Bar dataKey="total" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
