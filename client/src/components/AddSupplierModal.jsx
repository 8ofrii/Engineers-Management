import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { saveFormDraft, getFormDraft, clearFormDraft } from '../utils/formDraft';
import DraftBanner from './DraftBanner';
import MultiPhoneInput from './MultiPhoneInput';
import './Modal.css';

const SUPPLIER_DRAFT_KEY = 'hesaby_draft_supplier';

export default function AddSupplierModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'OTHER',
        customCategory: '',
        contactName: '',
        email: '',
        phone: '',
        phones: [''],
        street: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleDiscardDraft = () => {
        clearFormDraft(SUPPLIER_DRAFT_KEY);
        setHasRestoredDraft(false);
        setFormData({
            name: '',
            category: 'OTHER',
            customCategory: '',
            contactName: '',
            email: '',
            phone: '',
            phones: [''],
            street: '',
            notes: ''
        });
        setErrors({});
    };

    useEffect(() => {
        if (initialData) {
            setHasRestoredDraft(false);
            const initPhones = Array.isArray(initialData.phones) && initialData.phones.length > 0
                ? initialData.phones
                : (initialData.phone ? [initialData.phone] : ['']);
            setFormData({
                name: initialData.name || '',
                category: initialData.category || 'OTHER',
                customCategory: initialData.customCategory || '',
                contactName: initialData.contactName || '',
                email: initialData.email || '',
                phone: initialData.phone || initPhones[0] || '',
                phones: initPhones,
                street: initialData.street || '',
                notes: initialData.notes || ''
            });
        } else if (isOpen) {
            const savedDraft = getFormDraft(SUPPLIER_DRAFT_KEY);
            if (savedDraft && typeof savedDraft === 'object') {
                const draftPhones = Array.isArray(savedDraft.phones) && savedDraft.phones.length > 0
                    ? savedDraft.phones
                    : (savedDraft.phone ? [savedDraft.phone] : ['']);
                setFormData({
                    name: savedDraft.name || '',
                    category: savedDraft.category || 'OTHER',
                    customCategory: savedDraft.customCategory || '',
                    contactName: savedDraft.contactName || '',
                    email: savedDraft.email || '',
                    phone: savedDraft.phone || draftPhones[0] || '',
                    phones: draftPhones,
                    street: savedDraft.street || '',
                    notes: savedDraft.notes || ''
                });
                setHasRestoredDraft(true);
            } else {
                setHasRestoredDraft(false);
                setFormData({
                    name: '',
                    category: 'OTHER',
                    customCategory: '',
                    contactName: '',
                    email: '',
                    phone: '',
                    phones: [''],
                    street: '',
                    notes: ''
                });
            }
        }
        setErrors({});
    }, [initialData, isOpen]);

    useEffect(() => {
        if (!isOpen || initialData) return;
        const hasContent = formData.name || formData.phone || formData.phones?.some(Boolean) || formData.email || formData.contactName || formData.street || formData.notes;
        if (hasContent) {
            saveFormDraft(SUPPLIER_DRAFT_KEY, formData);
        }
    }, [formData, isOpen, initialData]);

    const categories = [
        'CONCRETE', 'STEEL', 'CEMENT', 'BRICKS',
        'ELECTRICAL', 'PLUMBING', 'PAINT', 'WOOD', 'TOOLS',
        'MATERIALS', 'EQUIPMENT', 'SERVICES', 'LABOR', 'OTHER'
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = t('common.required');
        }

        const primaryPhone = formData.phones?.[0]?.trim() || formData.phone?.trim();
        if (!primaryPhone) {
            newErrors.phone = t('common.required');
        }

        if (formData.category === 'OTHER' && !formData.customCategory?.trim()) {
            newErrors.customCategory = t('common.required');
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
            const payload = {
                ...formData,
                phone: cleanPhones[0] || formData.phone?.trim() || '',
                phones: cleanPhones
            };
            await onSave(payload);
            if (!initialData) {
                clearFormDraft(SUPPLIER_DRAFT_KEY);
                setHasRestoredDraft(false);
            }
            handleClose();
        } catch (error) {
            console.error('Failed to save supplier:', error);
            const data = error.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: fieldErrors || data?.message || 'Failed to save supplier'
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

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('suppliers.editTitle') : t('suppliers.newTitle')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {hasRestoredDraft && !initialData && (
                        <DraftBanner onDiscard={handleDiscardDraft} />
                    )}
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label htmlFor="name">
                                {t('suppliers.fields.name', 'Supplier Name')} <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={errors.name ? 'error' : ''}
                                placeholder={t('suppliers.placeholders.name', 'Enter supplier name')}
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">
                                {t('suppliers.fields.category', 'Category')}
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {t(`suppliers.categories.${cat}`, cat)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formData.category === 'OTHER' && (
                            <div className="form-group">
                                <label htmlFor="customCategory">
                                    {t('suppliers.fields.customCategory', 'Specify Category')} <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="customCategory"
                                    name="customCategory"
                                    value={formData.customCategory}
                                    onChange={handleChange}
                                    className={errors.customCategory ? 'error' : ''}
                                    placeholder={t('suppliers.placeholders.customCategory', 'Enter custom category')}
                                />
                                {errors.customCategory && <span className="error-message">{errors.customCategory}</span>}
                            </div>
                        )}
                        <div style={{ gridColumn: 'span 2' }}>
                            <MultiPhoneInput
                                phones={formData.phones}
                                onChange={(newPhones) => {
                                    setFormData(prev => {
                                        const next = { ...prev, phones: newPhones, phone: newPhones[0] || '' };
                                        if (!initialData) saveFormDraft(SUPPLIER_DRAFT_KEY, next);
                                        return next;
                                    });
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                label={t('suppliers.fields.phone', 'Phone Number')}
                                required
                                error={errors.phone}
                                placeholder={t('suppliers.placeholders.phone', '+20 123 456 7890')}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                {t('suppliers.fields.email', 'Email')}
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('suppliers.placeholders.email', 'supplier@example.com')}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactName">
                                {t('suppliers.fields.contactPerson', 'Contact Person')}
                            </label>
                            <input
                                type="text"
                                id="contactName"
                                name="contactName"
                                value={formData.contactName}
                                onChange={handleChange}
                                placeholder={t('suppliers.placeholders.contactPerson', 'Contact Person Name')}
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="street">
                                {t('suppliers.fields.address', 'Address')}
                            </label>
                            <input
                                type="text"
                                id="street"
                                name="street"
                                value={formData.street}
                                onChange={handleChange}
                                placeholder={t('suppliers.placeholders.address', 'Warehouse or office address')}
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="notes">
                                {t('common.notes', 'Notes')}
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows="3"
                                placeholder={t('suppliers.placeholders.notes', 'Additional notes...')}
                            />
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
        </div>
    );
}
