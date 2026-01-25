import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Plus, Phone, CreditCard, DollarSign } from 'lucide-react';
import Layout from '../components/Layout';
import AddWorkmanModal from '../components/AddWorkmanModal';
import { workmenAPI } from '../services/api';

export default function Workforce() {
    const { t } = useTranslation();
    const [workmen, setWorkmen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTrades, setSelectedTrades] = useState([]); // Changed to array for multiple selection

    useEffect(() => {
        loadWorkmen();
    }, []);

    const loadWorkmen = async () => {
        try {
            const response = await workmenAPI.getAll();
            setWorkmen(response.data.data);
        } catch (error) {
            console.error('Failed to load workmen:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWorkman = async (workmanData) => {
        try {
            await workmenAPI.create(workmanData);
            await loadWorkmen();
            setModalOpen(false);
        } catch (error) {
            console.error('Failed to save workman:', error);
            throw error;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

    // Toggle trade filter
    const toggleTrade = (trade) => {
        if (trade === 'ALL') {
            setSelectedTrades([]);
        } else {
            setSelectedTrades(prev =>
                prev.includes(trade)
                    ? prev.filter(t => t !== trade)
                    : [...prev, trade]
            );
        }
    };

    // Filter workmen based on selected trades
    const filteredWorkmen = selectedTrades.length === 0
        ? workmen
        : workmen.filter(w => selectedTrades.includes(w.trade));

    const trades = ['ALL', 'MASON', 'CONCRETE', 'PLASTERER', 'PAINTER', 'PLUMBER', 'ELECTRICIAN', 'FLOORING', 'CARPENTER', 'GYPSUM', 'ALUMINUM'];

    // Color mapping for each trade - High contrast and distinct
    const tradeColors = {
        'ALL': { bg: 'var(--color-primary)', text: 'white', border: 'var(--color-primary)' },
        'MASON': { bg: '#D32F2F', text: 'white', border: '#D32F2F' }, // Red 700
        'CONCRETE': { bg: '#263238', text: 'white', border: '#263238' }, // Blue Grey 900
        'PLASTERER': { bg: '#009688', text: 'white', border: '#009688' }, // Teal 500
        'PAINTER': { bg: '#E91E63', text: 'white', border: '#E91E63' }, // Pink 500
        'PLUMBER': { bg: '#1976D2', text: 'white', border: '#1976D2' }, // Blue 700
        'ELECTRICIAN': { bg: '#FFC107', text: '#212121', border: '#FFC107' }, // Amber 400 (Black text)
        'FLOORING': { bg: '#5D4037', text: 'white', border: '#5D4037' }, // Brown 700
        'CARPENTER': { bg: '#2E7D32', text: 'white', border: '#2E7D32' }, // Green 800
        'GYPSUM': { bg: '#7B1FA2', text: 'white', border: '#7B1FA2' }, // Purple 700
        'ALUMINUM': { bg: '#546E7A', text: 'white', border: '#546E7A' }, // Blue Grey 600
        'OTHER': { bg: '#9E9E9E', text: 'white', border: '#9E9E9E' } // Grey 500
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
                            <HardHat size={32} />
                            {t('labor.title')}
                        </h1>
                        <p className="text-secondary">{t('labor.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                        <Plus size={20} />
                        {t('labor.newWorkman')}
                    </button>
                </div>

                {/* Trade Filter Buttons */}
                <div className="mb-lg" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {trades.map(trade => {
                        const isActive = trade === 'ALL'
                            ? selectedTrades.length === 0
                            : selectedTrades.includes(trade);
                        // Fallback to OTHER color if trade not found in map
                        const colors = tradeColors[trade] || tradeColors['OTHER'];

                        return (
                            <button
                                key={trade}
                                onClick={() => toggleTrade(trade)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? '600' : '500',
                                    border: isActive ? `2px solid ${colors.border}` : '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    background: isActive ? colors.bg : 'var(--bg-tertiary)',
                                    color: isActive ? colors.text : 'var(--text-primary)',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.target.style.background = colors.bg;
                                        e.target.style.color = colors.text;
                                        e.target.style.borderColor = colors.border;
                                        e.target.style.opacity = '0.8';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.target.style.background = 'var(--bg-tertiary)';
                                        e.target.style.color = 'var(--text-primary)';
                                        e.target.style.borderColor = 'var(--border-color)';
                                        e.target.style.opacity = '1';
                                    }
                                }}
                            >
                                {trade === 'ALL' ? t('common.all') : t(`labor.trades.${trade}`)}
                            </button>
                        );
                    })}
                </div>

                {filteredWorkmen.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <HardHat size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('labor.noWorkmen')}</h3>
                        <p className="text-secondary mb-lg">{t('labor.addFirst')}</p>
                        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                            <Plus size={20} />
                            {t('labor.newWorkman')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {filteredWorkmen.map((workman) => (
                            <div key={workman.id} className="card">
                                <div className="flex-between mb-md">
                                    <div>
                                        <h3 style={{ marginBottom: '4px' }}>{workman.name}</h3>
                                        {workman.nameAr && (
                                            <p className="text-secondary" style={{ fontSize: '13px' }}>{workman.nameAr}</p>
                                        )}
                                    </div>
                                    <span className={`badge ${workman.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                        {workman.isActive ? t('common.active') : t('common.inactive')}
                                    </span>
                                </div>

                                <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                                    <span
                                        className="badge"
                                        style={{
                                            backgroundColor: (tradeColors[workman.trade] || tradeColors['OTHER']).bg,
                                            color: (tradeColors[workman.trade] || tradeColors['OTHER']).text,
                                            border: `1px solid ${(tradeColors[workman.trade] || tradeColors['OTHER']).border}`
                                        }}
                                    >
                                        {workman.trade === 'OTHER' && workman.customTrade
                                            ? workman.customTrade
                                            : t(`labor.trades.${workman.trade}`)}
                                    </span>
                                    <span className="badge badge-info">
                                        {formatCurrency(workman.dailyRate)}/day
                                    </span>
                                </div>

                                <div className="divider"></div>

                                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                                    {workman.phone && (
                                        <div className="flex gap-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <Phone size={16} />
                                            <span>{workman.phone}</span>
                                        </div>
                                    )}
                                    {workman.nationalId && (
                                        <div className="flex gap-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <CreditCard size={16} />
                                            <span>{workman.nationalId}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-sm" style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                                        <DollarSign size={16} />
                                        <span>{t('labor.totalPaid')}: {formatCurrency(workman.totalPaid)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <AddWorkmanModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveWorkman}
                />
            </div>
        </Layout>
    );
}
