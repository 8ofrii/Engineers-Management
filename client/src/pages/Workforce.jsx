<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Plus, Phone, CreditCard, DollarSign, Edit2, Image as ImageIcon, Trash2, X } from 'lucide-react';
=======
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Plus, Phone, CreditCard, DollarSign, Edit2, Image as ImageIcon, Trash2 } from 'lucide-react';
>>>>>>> main
import Layout from '../components/Layout';
import AddWorkmanModal from '../components/AddWorkmanModal';
import { workmenAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { apiErrorMessage } from '../utils/apiError';
import { useFormat } from '../utils/format';

export default function Workforce() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const { currency: formatCurrency } = useFormat();
    const [workmen, setWorkmen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedWorkman, setSelectedWorkman] = useState(null);
    const [selectedTrades, setSelectedTrades] = useState([]); // Changed to array for multiple selection
<<<<<<< HEAD
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterRef = useRef(null);
=======
>>>>>>> main

    useEffect(() => {
        loadWorkmen();
    }, []);

<<<<<<< HEAD
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

=======
>>>>>>> main
    const loadWorkmen = async () => {
        try {
            const response = await workmenAPI.getAll();
            setWorkmen(response.data.data);
        } catch (error) {
            console.error('Failed to load workmen:', error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to load workforce data.') });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWorkman = async (workmanData) => {
        try {
            if (selectedWorkman) {
                await workmenAPI.update(selectedWorkman.id, workmanData);
                showAlert({ type: 'success', title: 'Success', message: 'Workman updated successfully.' });
            } else {
                await workmenAPI.create(workmanData);
                showAlert({ type: 'success', title: 'Success', message: 'Workman added successfully.' });
            }
            await loadWorkmen();
            setModalOpen(false);
            setSelectedWorkman(null);
        } catch (error) {
            console.error('Failed to save workman:', error);
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to save workman data.') });
            throw error;
        }
    };

    const handleDeleteClick = (workman) => {
        showAlert({
            type: 'warning',
            title: t('common.deleteConfirmTitle'),
            message: `${t('common.deleteConfirmMessage')} "${workman.name}"?`,
            showCancel: true,
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await workmenAPI.delete(workman.id);
                    showAlert({ type: 'success', title: 'Deleted', message: 'Workman deleted successfully' });
                    loadWorkmen();
                } catch (error) {
                    console.error('Failed to delete workman:', error);
                    showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(error, 'Failed to delete workman.') });
                }
            }
        });
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

<<<<<<< HEAD
    // Calculate dynamic trades based on workmen data
    const baseTrades = ['CARPENTER', 'MASON', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'WELDER', 'LABORER', 'FOREMAN', 'CONCRETE', 'PLASTERER', 'FLOORING', 'GYPSUM', 'ALUMINUM'];
    
    const customTrades = Array.from(new Set(
        workmen
            .filter(w => w.trade === 'OTHER' && w.customTrade)
            .map(w => w.customTrade.trim().toUpperCase())
    ));

    const trades = ['ALL', ...baseTrades, ...customTrades];

    // Filter workmen based on selected trades
    const filteredWorkmen = selectedTrades.length === 0
        ? workmen
        : workmen.filter(w => {
            if (selectedTrades.includes(w.trade)) return true;
            if (w.trade === 'OTHER' && w.customTrade) {
                return selectedTrades.includes(w.customTrade.trim().toUpperCase());
            }
            return false;
        });
=======
    // Filter workmen based on selected trades
    const filteredWorkmen = selectedTrades.length === 0
        ? workmen
        : workmen.filter(w => selectedTrades.includes(w.trade));

    const trades = ['ALL', 'MASON', 'CONCRETE', 'PLASTERER', 'PAINTER', 'PLUMBER', 'ELECTRICIAN', 'FLOORING', 'CARPENTER', 'GYPSUM', 'ALUMINUM'];
>>>>>>> main

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
<<<<<<< HEAD
        'WELDER': { bg: '#F57C00', text: 'white', border: '#F57C00' }, // Orange 700
        'LABORER': { bg: '#795548', text: 'white', border: '#795548' }, // Brown 500
        'FOREMAN': { bg: '#303F9F', text: 'white', border: '#303F9F' }, // Indigo 700
=======
>>>>>>> main
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
                <div className="flex-between mb-xl flex-wrap gap-md">
                    <div>
                        <h1 className="flex gap-md items-center">
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

<<<<<<< HEAD
                {/* Trade Filter Dropdown */}
                <div className="mb-lg" style={{ position: 'relative', width: '300px' }} ref={filterRef}>
                    <div 
                        className="form-group" 
                        style={{ marginBottom: 0, position: 'relative' }}
                    >
                        <div 
                            style={{ 
                                padding: '6px 12px', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-md)', 
                                background: 'var(--bg-tertiary)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                alignItems: 'center',
                                minHeight: '42px'
                            }}
                            onClick={(e) => {
                                // Only toggle if not clicking on a chip remove button
                                if (!e.target.closest('.chip-remove')) {
                                    setIsFilterDropdownOpen(!isFilterDropdownOpen);
                                }
                            }}
                        >
                            {selectedTrades.length === 0 ? (
                                <span style={{ padding: '4px 4px', color: 'var(--text-secondary)' }}>
                                    {t('common.all')}
                                </span>
                            ) : (
                                selectedTrades.map(trade => (
                                    <span 
                                        key={trade}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '16px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {baseTrades.includes(trade) ? t(`labor.trades.${trade}`) : trade}
                                        <div 
                                            className="chip-remove"
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                cursor: 'pointer', 
                                                opacity: 0.7,
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: '50%',
                                                padding: '2px',
                                                marginLeft: '4px'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTrade(trade);
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                            <X size={12} />
                                        </div>
                                    </span>
                                ))
                            )}
                            <span style={{ marginLeft: 'auto', transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', padding: '4px' }}>▼</span>
                        </div>

                        {isFilterDropdownOpen && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-md)',
                                    zIndex: 100,
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                            >
                                {trades.map(trade => {
                                    const isActive = trade === 'ALL'
                                        ? selectedTrades.length === 0
                                        : selectedTrades.includes(trade);
                                    
                                    // Use 'OTHER' color for custom trades
                                    const colors = tradeColors[trade] || tradeColors['OTHER'];
                                    
                                    return (
                                        <div 
                                            key={trade}
                                            onClick={() => {
                                                toggleTrade(trade);
                                            }}
                                            style={{
                                                padding: '10px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderBottom: '1px solid var(--border-color)',
                                                background: isActive ? 'var(--bg-tertiary)' : 'transparent'
                                            }}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isActive}
                                                onChange={() => {}} // Handle click on parent div
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <span style={{ 
                                                display: 'inline-block',
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: colors.bg
                                            }}></span>
                                            <span>
                                                {trade === 'ALL' 
                                                    ? t('common.all') 
                                                    : (baseTrades.includes(trade) ? t(`labor.trades.${trade}`) : trade)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
=======
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
>>>>>>> main
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
                            <div key={workman.id} className="card" style={{ position: 'relative' }}>
                                <div className="flex-between mb-md" style={{ alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ marginBottom: '4px', fontSize: '1.1rem' }}>{workman.name}</h3>
                                        {workman.nameAr && (
                                            <p className="text-secondary" style={{ fontSize: '13px' }}>{workman.nameAr}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-sm">
                                        <span className={`badge ${workman.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                            {workman.isActive ? t('common.active') : t('common.inactive')}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedWorkman(workman);
                                                setModalOpen(true);
                                            }}
                                            className="btn-icon"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                marginLeft: '8px',
                                                cursor: 'pointer'
                                            }}
                                            title={t('common.edit')}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(workman)}
                                            className="btn-icon"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ef4444',
                                                background: 'transparent',
                                                border: '1px solid #ef4444',
                                                borderRadius: 'var(--radius-md)',
                                                marginLeft: '8px',
                                                cursor: 'pointer'
                                            }}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
                                    {workman.nationalIdImage && (
                                        <div className="flex gap-sm" style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => {
                                            // Open image in new tab or modal
                                            const win = window.open();
                                            win.document.write('<iframe src="' + workman.nationalIdImage + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                        }}>
                                            <ImageIcon size={16} />
                                            <span>{t('labor.viewId')}</span>
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
                )}                <AddWorkmanModal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedWorkman(null);
                    }}
                    onSave={handleSaveWorkman}
                    initialData={selectedWorkman}
                />
            </div>
        </Layout>
    );
}
