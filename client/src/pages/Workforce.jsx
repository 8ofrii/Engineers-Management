import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Plus, Phone, CreditCard, DollarSign, Edit2, Image as ImageIcon, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';
import AddWorkmanModal from '../components/AddWorkmanModal';
import { workmenAPI, projectsAPI, transactionsAPI } from '../services/api';
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
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [filterProjectId, setFilterProjectId] = useState('ALL');
    const [projects, setProjects] = useState([]);
    const [workmanProjectMap, setWorkmanProjectMap] = useState({}); // workmanId -> Set of projectIds
    const [previewImage, setPreviewImage] = useState(null); // { url, name, nationalId }
    const filterRef = useRef(null);

    useEffect(() => {
        loadWorkmen();
        loadProjects();
    }, []);

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

    const loadProjects = async () => {
        try {
            const [projRes, txRes] = await Promise.all([
                projectsAPI.getAll(),
                transactionsAPI.getAll()
            ]);
            setProjects(projRes.data.data || []);
            // Build a map: workmanId -> [projectId]
            const map = {};
            (txRes.data.data || []).forEach(tx => {
                if (tx.workmanId && tx.projectId) {
                    if (!map[tx.workmanId]) map[tx.workmanId] = new Set();
                    map[tx.workmanId].add(tx.projectId);
                }
            });
            setWorkmanProjectMap(map);
        } catch (e) { /* not critical */ }
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

    // Calculate dynamic trades based on workmen data
    const baseTrades = ['CARPENTER', 'MASON', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'WELDER', 'LABORER', 'FOREMAN', 'CONCRETE', 'PLASTERER', 'FLOORING', 'GYPSUM', 'ALUMINUM'];
    
    const customTrades = Array.from(new Set(
        workmen
            .filter(w => w.trade === 'OTHER' && w.customTrade)
            .map(w => w.customTrade.trim().toUpperCase())
    ));

    const trades = ['ALL', ...baseTrades, ...customTrades];

    // Filter workmen based on selected trades AND selected project
    const filteredWorkmen = workmen.filter(w => {
        // Trade filter
        const tradeMatch = selectedTrades.length === 0 || selectedTrades.includes(w.trade) ||
            (w.trade === 'OTHER' && w.customTrade && selectedTrades.includes(w.customTrade.trim().toUpperCase()));
        // Project filter
        const projMatch = filterProjectId === 'ALL' ||
            (workmanProjectMap[w.id] && workmanProjectMap[w.id].has(filterProjectId));
        return tradeMatch && projMatch;
    });

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
        'BLACKSMITH': { bg: '#37474F', text: 'white', border: '#37474F' }, // Charcoal / Steel
        'WELDER': { bg: '#F57C00', text: 'white', border: '#F57C00' }, // Orange 700
        'LABORER': { bg: '#795548', text: 'white', border: '#795548' }, // Brown 500
        'FOREMAN': { bg: '#303F9F', text: 'white', border: '#303F9F' }, // Indigo 700
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

                {/* Trade Filter Dropdown + Project Filter */}
                <div className="mb-lg flex gap-md flex-wrap" style={{ alignItems: 'flex-start' }}>
                    {/* Project filter (#9) */}
                    <select
                        value={filterProjectId}
                        onChange={e => setFilterProjectId(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            minWidth: 180
                        }}
                    >
                        <option value="ALL">{t('common.allProjects') || 'All Projects'}</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

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
                </div>
                </div>{/* close outer flex wrapper */}

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
                                    {(() => {
                                        const workmanPhones = Array.isArray(workman.phones) && workman.phones.length > 0
                                            ? workman.phones.filter(Boolean)
                                            : (workman.phone ? [workman.phone] : []);
                                        if (workmanPhones.length === 0) return null;
                                        return (
                                            <div className="flex gap-sm" style={{ color: 'var(--text-secondary)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                                <Phone size={16} style={{ marginTop: '3px', flexShrink: 0 }} />
                                                <div className="flex gap-xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {workmanPhones.map((p, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={`tel:${p}`}
                                                            style={{
                                                                direction: 'ltr',
                                                                display: 'inline-block',
                                                                color: 'inherit',
                                                                textDecoration: 'none',
                                                                background: 'var(--bg-secondary)',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                fontWeight: 500
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                        >
                                                            {p}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {workman.nationalId && (
                                        <div className="flex gap-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <CreditCard size={16} />
                                            <span>{workman.nationalId}</span>
                                        </div>
                                    )}
                                    {workman.nationalIdImage && (
                                        <div
                                            className="flex gap-sm items-center"
                                            style={{ color: 'var(--color-primary)', cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => setPreviewImage({
                                                url: workman.nationalIdImage,
                                                name: workman.name,
                                                nationalId: workman.nationalId
                                            })}
                                        >
                                            <ImageIcon size={16} />
                                            <span style={{ textDecoration: 'underline' }}>{t('labor.viewId', 'عرض صورة البطاقة')}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-sm" style={{
                                        background: 'hsla(140, 70%, 45%, 0.12)',
                                        border: '1px solid hsla(140, 70%, 45%, 0.25)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '8px 12px',
                                        marginTop: 8
                                    }}>
                                        <DollarSign size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>{t('labor.totalPaid')}</div>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>{formatCurrency(workman.totalPaid || 0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <AddWorkmanModal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedWorkman(null);
                    }}
                    onSave={handleSaveWorkman}
                    initialData={selectedWorkman}
                />

                {/* National ID Image Preview Modal Popup */}
                {previewImage && (
                    <div
                        className="modal-overlay"
                        onClick={() => setPreviewImage(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.82)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <div
                            className="modal-container"
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: '650px',
                                width: '100%',
                                background: 'var(--bg-secondary, #1e1e1e)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color, #333)',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CreditCard size={20} style={{ color: 'var(--color-primary, #38bdf8)' }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #fff)' }}>
                                            {previewImage.name}
                                        </h3>
                                        {previewImage.nationalId && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #888)' }}>
                                                {t('labor.nationalId', 'الرقم القومي')}: {previewImage.nationalId}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="modal-close"
                                    onClick={() => setPreviewImage(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={22} />
                                </button>
                            </div>

                            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.25)' }}>
                                <img
                                    src={previewImage.url}
                                    alt={previewImage.name}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '65vh',
                                        borderRadius: '10px',
                                        objectFit: 'contain',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                />
                            </div>

                            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                                <a
                                    href={previewImage.url}
                                    download={`NationalID_${previewImage.name}.jpg`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ textDecoration: 'none' }}
                                >
                                    {t('common.download', 'تحميل الصورة')}
                                </a>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setPreviewImage(null)}
                                >
                                    {t('common.close', 'إغلاق')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
