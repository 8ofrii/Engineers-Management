import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './Modal.css';
import CurrencyInput from './CurrencyInput';
import { useAlert } from '../context/AlertContext';
import { saveFormDraft, getFormDraft, clearFormDraft } from '../utils/formDraft';
import DraftBanner from './DraftBanner';
import MultiPhoneInput from './MultiPhoneInput';

const WORKMAN_DRAFT_KEY = 'hesaby_draft_workman';

export default function AddWorkmanModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        trade: 'MASON',
        dailyRate: '',
        phone: '',
        phones: [''],
        nationalId: '',
        nationalIdImage: '', // Base64 string
        customTrade: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            const initPhones = Array.isArray(initialData.phones) && initialData.phones.length > 0
                ? initialData.phones
                : (initialData.phone ? [initialData.phone] : ['']);
            
            let initName = (initialData.name || '').trim();
            let initNameAr = (initialData.nameAr || '').trim();

            if (/[\u0600-\u06FF]/.test(initName) && !initNameAr) {
                initNameAr = initName;
                initName = '';
            }

            setFormData({
                name: initName,
                nameAr: initNameAr,
                trade: initialData.trade || 'MASON',
                dailyRate: initialData.dailyRate || '',
                phone: initialData.phone || initPhones[0] || '',
                phones: initPhones,
                nationalId: initialData.nationalId || '',
                nationalIdImage: initialData.nationalIdImage || '',
                customTrade: initialData.customTrade || ''
            });
            setHasRestoredDraft(false);
        } else if (isOpen && !initialData) {
            const draft = getFormDraft(WORKMAN_DRAFT_KEY);
            if (draft) {
                const draftPhones = Array.isArray(draft.phones) && draft.phones.length > 0
                    ? draft.phones
                    : (draft.phone ? [draft.phone] : ['']);
                setFormData(prev => ({
                    ...prev,
                    ...draft,
                    phones: draftPhones,
                    phone: draft.phone || draftPhones[0] || ''
                }));
                setHasRestoredDraft(true);
            } else {
                setFormData({
                    name: '',
                    nameAr: '',
                    trade: 'MASON',
                    dailyRate: '',
                    phone: '',
                    phones: [''],
                    nationalId: '',
                    nationalIdImage: '',
                    customTrade: ''
                });
                setHasRestoredDraft(false);
            }
        }
    }, [initialData, isOpen]);

    const trades = [
        'CARPENTER', 'MASON', 'ELECTRICIAN', 'PLUMBER', 'PAINTER',
        'IRON_WORKER', 'STOCKING_WORKER', 'MARBLE_CRAFTSMAN', 'CONCRETE_CUTTING',
        'GUARD', 'MUNICIPAL_EMPLOYEE', 'INSULATION_CONTRACTOR', 'WELDER', 'LABORER', 'FOREMAN',
        'CONCRETE', 'PLASTERER', 'FLOORING', 'GYPSUM', 'ALUMINUM', 'OTHER'
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (!initialData) {
                saveFormDraft(WORKMAN_DRAFT_KEY, next);
            }
            return next;
        });
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleDiscardDraft = () => {
        clearFormDraft(WORKMAN_DRAFT_KEY);
        setFormData({
            name: '',
            nameAr: '',
            trade: 'MASON',
            dailyRate: '',
            phone: '',
            phones: [''],
            nationalId: '',
            nationalIdImage: '',
            customTrade: ''
        });
        setHasRestoredDraft(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setFormData(prev => ({
                        ...prev,
                        nationalIdImage: dataUrl
                    }));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name?.trim() && !formData.nameAr?.trim()) {
            newErrors.name = t('common.required');
        }

        if (formData.dailyRate && parseFloat(formData.dailyRate) < 0) {
            newErrors.dailyRate = t('common.invalid', 'Invalid amount');
        }

        const primaryPhone = formData.phones?.[0]?.trim() || formData.phone?.trim();
        if (!primaryPhone) {
            newErrors.phone = t('common.required');
        }

        // Validate custom trade if OTHER is selected
        if (formData.trade === 'OTHER' && !formData.customTrade.trim()) {
            newErrors.customTrade = t('common.required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            const cleanPhones = (formData.phones || []).map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            const rate = formData.dailyRate !== '' && formData.dailyRate !== null && !isNaN(parseFloat(formData.dailyRate))
                ? parseFloat(formData.dailyRate)
                : null;

            let rawName = formData.name?.trim() || '';
            let rawNameAr = formData.nameAr?.trim() || '';

            // If user swapped them (Arabic in name, English in nameAr)
            if (/[\u0600-\u06FF]/.test(rawName) && /[A-Za-z]/.test(rawNameAr)) {
                const temp = rawName;
                rawName = rawNameAr;
                rawNameAr = temp;
            } else if (/[\u0600-\u06FF]/.test(rawName) && !rawNameAr) {
                rawNameAr = rawName;
            }

            const primaryName = rawName || rawNameAr || '';
            const primaryNameAr = rawNameAr || null;

            await onSave({
                ...formData,
                name: primaryName,
                nameAr: primaryNameAr,
                dailyRate: rate,
                phone: cleanPhones[0] || formData.phone?.trim() || null,
                phones: cleanPhones
            });
            if (!initialData) {
                clearFormDraft(WORKMAN_DRAFT_KEY);
            }
            handleClose();
        } catch (error) {
            console.error('Failed to save workman:', error);
            const data = error.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: fieldErrors || data?.message || 'Failed to save workman'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('labor.editWorkman') : t('labor.newWorkman')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {hasRestoredDraft && <DraftBanner onDiscard={handleDiscardDraft} />}
                        <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="name">
                                {t('common.name')} <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={errors.name ? 'error' : ''}
                                placeholder="Mohamed Ahmed"
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="nameAr">{t('common.nameAr')}</label>
                            <input
                                type="text"
                                id="nameAr"
                                name="nameAr"
                                value={formData.nameAr}
                                onChange={handleChange}
                                placeholder="محمد أحمد"
                                dir="rtl"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="trade">
                                {t('labor.trade')} <span className="required">*</span>
                            </label>
                            <select
                                id="trade"
                                name="trade"
                                value={formData.trade}
                                onChange={handleChange}
                            >
                                {trades.map(trade => (
                                    <option key={trade} value={trade}>
                                        {t(`labor.trades.${trade}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Trade Field - Shows when OTHER is selected */}
                        {formData.trade === 'OTHER' && (
                            <div className="form-group">
                                <label htmlFor="customTrade">
                                    {t('labor.customTrade')} <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="customTrade"
                                    name="customTrade"
                                    value={formData.customTrade}
                                    onChange={handleChange}
                                    className={errors.customTrade ? 'error' : ''}
                                    placeholder={t('labor.customTradePlaceholder')}
                                />
                                {errors.customTrade && <span className="error-message">{errors.customTrade}</span>}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="dailyRate">
                                {t('labor.dailyRate')}
                            </label>
                            <CurrencyInput
                                id="dailyRate"
                                name="dailyRate"
                                value={formData.dailyRate}
                                onChange={handleChange}
                                className={errors.dailyRate ? 'error' : ''}
                                placeholder="500"
                            />
                            {errors.dailyRate && <span className="error-message">{errors.dailyRate}</span>}
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <MultiPhoneInput
                                phones={formData.phones}
                                onChange={(newPhones) => {
                                    setFormData(prev => {
                                        const next = { ...prev, phones: newPhones, phone: newPhones[0] || '' };
                                        if (!initialData) saveFormDraft(WORKMAN_DRAFT_KEY, next);
                                        return next;
                                    });
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                label={t('labor.phone')}
                                required
                                error={errors.phone}
                                placeholder="01012345678"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="nationalId">{t('labor.nationalId')}</label>
                            <input
                                type="text"
                                id="nationalId"
                                name="nationalId"
                                value={formData.nationalId}
                                onChange={handleChange}
                                placeholder="29501011234567"
                                maxLength="14"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>{t('labor.uploadNationalIdImage')}</label>
                            <div className="file-upload-wrapper" style={{ border: '1px dashed var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-tertiary)' }} onClick={() => document.getElementById('nationalIdImage').click()}>
                                <input
                                    type="file"
                                    id="nationalIdImage"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                {!formData.nationalIdImage ? (
                                    <div className="flex-column flex-center gap-sm">
                                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('labor.clickToUpload') || 'انقر هنا لرفع الصورة'}</span>
                                        <button type="button" className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                                            {t('labor.chooseFile') || 'اختر ملف'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={formData.nationalIdImage}
                                            alt="National ID Preview"
                                            style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormData(prev => ({ ...prev, nationalIdImage: '' }));
                                            }}
                                            className="btn btn-danger btn-sm"
                                            style={{ display: 'block', margin: '10px auto 0' }}
                                        >
                                            {t('labor.removeImage') || 'حذف الصورة'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.loading') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
