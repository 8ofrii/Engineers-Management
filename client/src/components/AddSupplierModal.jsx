import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Check, Tag } from 'lucide-react';
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
    const [newItemInput, setNewItemInput] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        category: 'OTHER',
        categories: ['OTHER'],
        suppliedItems: [],
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
            categories: ['OTHER'],
            suppliedItems: [],
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
            const initCategories = Array.isArray(initialData.categories) && initialData.categories.length > 0
                ? initialData.categories
                : (initialData.category ? [initialData.category] : ['OTHER']);
            const initItems = Array.isArray(initialData.suppliedItems) ? initialData.suppliedItems : [];

            setFormData({
                name: initialData.name || '',
                category: initCategories[0] || initialData.category || 'OTHER',
                categories: initCategories,
                suppliedItems: initItems,
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
                const draftCategories = Array.isArray(savedDraft.categories) && savedDraft.categories.length > 0
                    ? savedDraft.categories
                    : (savedDraft.category ? [savedDraft.category] : ['OTHER']);
                const draftItems = Array.isArray(savedDraft.suppliedItems) ? savedDraft.suppliedItems : [];

                setFormData({
                    name: savedDraft.name || '',
                    category: draftCategories[0] || savedDraft.category || 'OTHER',
                    categories: draftCategories,
                    suppliedItems: draftItems,
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
                    categories: ['OTHER'],
                    suppliedItems: [],
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
        setNewItemInput('');
        setErrors({});
    }, [initialData, isOpen]);

    useEffect(() => {
        if (!isOpen || initialData) return;
        const hasContent = formData.name || formData.phone || formData.phones?.some(Boolean) || formData.email || formData.contactName || formData.street || formData.notes || (formData.suppliedItems && formData.suppliedItems.length > 0);
        if (hasContent) {
            saveFormDraft(SUPPLIER_DRAFT_KEY, formData);
        }
    }, [formData, isOpen, initialData]);

    const categories = [
        'CONCRETE', 'STEEL', 'CEMENT', 'BRICKS', 'SAND',
        'ELECTRICAL', 'PLUMBING', 'PAINT', 'WOOD', 'TOOLS',
        'MATERIALS', 'EQUIPMENT', 'SERVICES', 'LABOR', 'OTHER'
    ];

    const handleToggleCategory = (cat) => {
        setFormData(prev => {
            const currentCats = Array.isArray(prev.categories) ? prev.categories : [prev.category || 'OTHER'];
            const exists = currentCats.includes(cat);
            let nextCategories;
            if (exists) {
                nextCategories = currentCats.filter(c => c !== cat);
                if (nextCategories.length === 0) nextCategories = ['OTHER'];
            } else {
                nextCategories = [...currentCats.filter(c => c !== 'OTHER'), cat];
            }
            return {
                ...prev,
                categories: nextCategories,
                category: nextCategories[0] || 'OTHER'
            };
        });
        if (errors.categories) {
            setErrors(prev => ({ ...prev, categories: '' }));
        }
    };

    const handleAddItem = () => {
        const trimmed = newItemInput.trim();
        if (!trimmed) return;
        setFormData(prev => {
            const current = Array.isArray(prev.suppliedItems) ? prev.suppliedItems : [];
            if (current.includes(trimmed)) return prev;
            return {
                ...prev,
                suppliedItems: [...current, trimmed]
            };
        });
        setNewItemInput('');
    };

    const handleRemoveItem = (itemToRemove) => {
        setFormData(prev => ({
            ...prev,
            suppliedItems: (prev.suppliedItems || []).filter(item => item !== itemToRemove)
        }));
    };

    const handleItemKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

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

        const hasOther = (formData.categories || []).includes('OTHER');
        if (hasOther && formData.categories.length === 1 && !formData.customCategory?.trim()) {
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
            const cleanCategories = Array.isArray(formData.categories) && formData.categories.length > 0
                ? formData.categories
                : [formData.category || 'OTHER'];
            const cleanItems = (formData.suppliedItems || []).map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);

            const payload = {
                ...formData,
                category: cleanCategories[0] || 'OTHER',
                categories: cleanCategories,
                suppliedItems: cleanItems,
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
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
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

                        {/* Multi-Category Selector */}
                        <div className="form-group full-width">
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 600 }}>
                                    {t('suppliers.fields.categories', 'مجالات وتصنيفات التوريد')}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    ({t('common.multiSelect', 'يمكن اختيار أكثر من مجال')})
                                </span>
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 0' }}>
                                {categories.map(cat => {
                                    const isSelected = (formData.categories || []).includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => handleToggleCategory(cat)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                border: isSelected ? '1px solid var(--color-primary, #3b82f6)' : '1px solid var(--border-color)',
                                                background: isSelected ? 'var(--color-primary, #3b82f6)' : 'var(--bg-secondary)',
                                                color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                                fontSize: '0.85rem',
                                                fontWeight: isSelected ? '600' : '400',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {isSelected && <Check size={14} />}
                                            <span>{t(`suppliers.categories.${cat}`, cat)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {(formData.categories || []).includes('OTHER') && (
                            <div className="form-group full-width">
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

                        {/* Specific Supplied Items / Products Tags Input */}
                        <div className="form-group full-width" style={{ marginTop: '4px' }}>
                            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={16} style={{ color: 'var(--color-primary, #3b82f6)' }} />
                                <span>{t('suppliers.fields.suppliedItems', 'الأصناف والمواد الموردة المحددة')}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>
                                    ({t('common.optional', 'اختياري')})
                                </span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="text"
                                    value={newItemInput}
                                    onChange={(e) => setNewItemInput(e.target.value)}
                                    onKeyDown={handleItemKeyDown}
                                    placeholder={t('suppliers.placeholders.suppliedItems', 'اكتب الصنف واضغط Enter (مثال: حديد عز 12مم، أسمنت السويس)')}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAddItem}
                                    disabled={!newItemInput.trim()}
                                    style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Plus size={16} />
                                    <span>{t('suppliers.placeholders.addItem', 'إضافة صنف')}</span>
                                </button>
                            </div>

                            {Array.isArray(formData.suppliedItems) && formData.suppliedItems.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                    {formData.suppliedItems.map((item, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: 'var(--bg-tertiary, rgba(59, 130, 246, 0.1))',
                                                color: 'var(--text-primary)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.82rem',
                                                fontWeight: 500,
                                                border: '1px solid var(--border-color)'
                                            }}
                                        >
                                            <span>{item}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    color: 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <X size={13} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
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
