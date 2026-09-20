import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { saveFormDraft, getFormDraft, clearFormDraft } from '../utils/formDraft';
import DraftBanner from './DraftBanner';
import MultiPhoneInput from './MultiPhoneInput';
import './Modal.css';

const CLIENT_DRAFT_KEY = 'hesaby_draft_client';

export default function AddClientModal({ isOpen, onClose, onSubmit, initialData = null }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        phones: [''],
        company: '',
        taxId: '',
        status: 'INACTIVE',
        // Address
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            const initPhones = Array.isArray(initialData.phones) && initialData.phones.length > 0
                ? initialData.phones
                : (initialData.phone ? [initialData.phone] : ['']);
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || initPhones[0] || '',
                phones: initPhones,
                company: initialData.company || '',
                taxId: initialData.taxId || '',
                status: initialData.status || 'ACTIVE',
                street: initialData.street || '',
                city: initialData.city || '',
                state: initialData.state || '',
                zipCode: initialData.zipCode || '',
                country: initialData.country || ''
            });
            setHasRestoredDraft(false);
        } else if (isOpen && !initialData) {
            // Check for saved draft in browser storage
            const draft = getFormDraft(CLIENT_DRAFT_KEY);
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
                    email: '',
                    phone: '',
                    phones: [''],
                    company: '',
                    taxId: '',
                    status: 'INACTIVE',
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: ''
                });
                setHasRestoredDraft(false);
            }
        }
    }, [isOpen, initialData]);

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (!initialData) {
                saveFormDraft(CLIENT_DRAFT_KEY, next);
            }
            return next;
        });
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleDiscardDraft = () => {
        clearFormDraft(CLIENT_DRAFT_KEY);
        setFormData({
            name: '',
            email: '',
            phone: '',
            phones: [''],
            company: '',
            taxId: '',
            status: 'INACTIVE',
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        });
        setHasRestoredDraft(false);
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = t('clients.modal.fields.name') + ' is required';
        if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
            newErrors.email = t('clients.modal.fields.email') + ' is invalid';
        }
        const primaryPhone = formData.phones?.[0]?.trim() || formData.phone?.trim();
        if (!primaryPhone) newErrors.phone = t('clients.modal.fields.phone') + ' is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            const cleanPhones = (formData.phones || []).map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
            const dataToClean = {
                ...formData,
                phone: cleanPhones[0] || formData.phone?.trim() || '',
                phones: cleanPhones
            };
            const payload = Object.fromEntries(
                Object.entries(dataToClean).map(([k, v]) => [
                    k,
                    typeof v === 'string' && v.trim() === '' ? (initialData ? null : undefined) : (typeof v === 'string' ? v.trim() : v)
                ])
            );
            if (!initialData) {
                Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
                clearFormDraft(CLIENT_DRAFT_KEY);
            }
            onSubmit(payload);
            handleClose();
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('clients.modal.editTitle') : t('clients.modal.title')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {hasRestoredDraft && <DraftBanner onDiscard={handleDiscardDraft} />}

                    {/* Basic Information */}
                    <div className="form-section">
                        <h3 className="section-title">{t('clients.modal.sections.basic')}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">{t('clients.modal.fields.name')} <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={errors.name ? 'error' : ''}
                                    placeholder={t('clients.modal.placeholders.name')}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="company">{t('clients.modal.fields.company')}</label>
                                <input
                                    type="text"
                                    id="company"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.company')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">{t('clients.modal.fields.email')}</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={errors.email ? 'error' : ''}
                                    placeholder={t('clients.modal.placeholders.email')}
                                />
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <MultiPhoneInput
                                    phones={formData.phones}
                                    onChange={(newPhones) => {
                                        setFormData(prev => {
                                            const next = { ...prev, phones: newPhones, phone: newPhones[0] || '' };
                                            if (!initialData) saveFormDraft(CLIENT_DRAFT_KEY, next);
                                            return next;
                                        });
                                        if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                    }}
                                    label={t('clients.modal.fields.phone')}
                                    required
                                    error={errors.phone}
                                    placeholder={t('clients.modal.placeholders.phone')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="taxId">{t('clients.modal.fields.taxId')}</label>
                                <input
                                    type="text"
                                    id="taxId"
                                    name="taxId"
                                    value={formData.taxId}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.taxId')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">{t('clients.modal.fields.status')}</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    style={{ fontWeight: 600 }}
                                >
                                    <option value="ACTIVE">{t('clients.status.active', 'Active')}</option>
                                    <option value="INACTIVE">{t('clients.status.inactive', 'Inactive')}</option>
                                    <option value="PENDING">{t('clients.status.pending', 'Pending')}</option>
                                </select>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                                    {isArabic
                                        ? 'نشط: لديه مشاريع جارية | غير نشط: لا توجد مشاريع حالية'
                                        : 'Active: ongoing projects | Inactive: no current projects'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="form-section">
                        <h3 className="section-title">{t('clients.modal.sections.address')}</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="street">{t('clients.modal.fields.street')}</label>
                                <input
                                    type="text"
                                    id="street"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.street')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">{t('clients.modal.fields.city')}</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.city')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="state">{t('clients.modal.fields.state')}</label>
                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.state')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="zipCode">{t('clients.modal.fields.zipCode')}</label>
                                <input
                                    type="text"
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.zipCode')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="country">{t('clients.modal.fields.country')}</label>
                                <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.country')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {initialData ? t('common.update') : t('clients.modal.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
