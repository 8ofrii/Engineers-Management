import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { suppliersAPI } from '../services/api';
import { saveFormDraft, getFormDraft, clearFormDraft } from '../utils/formDraft';
import DraftBanner from './DraftBanner';
import './Modal.css';

const MATERIAL_DRAFT_KEY = 'hesaby_draft_material';

export default function AddMaterialModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const [suppliers, setSuppliers] = useState([]);
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        description: '',
        unit: 'TON',
        stockLevel: '',
        unitPrice: '',
        reorderLevel: '',
        supplierId: ''
    });

    const [errors, setErrors] = useState({});

    const handleDiscardDraft = () => {
        clearFormDraft(MATERIAL_DRAFT_KEY);
        setHasRestoredDraft(false);
        setFormData({
            name: '',
            nameAr: '',
            description: '',
            unit: 'TON',
            stockLevel: '',
            unitPrice: '',
            reorderLevel: '',
            supplierId: ''
        });
        setErrors({});
    };

    useEffect(() => {
        if (isOpen) {
            loadSuppliers();
            if (initialData) {
                setHasRestoredDraft(false);
                setFormData({
                    name: initialData.name || '',
                    nameAr: initialData.nameAr || '',
                    description: initialData.description || '',
                    unit: initialData.unit || 'TON',
                    stockLevel: initialData.stockLevel !== undefined && initialData.stockLevel !== null ? initialData.stockLevel.toString() : '',
                    unitPrice: initialData.unitPrice?.toString() || '',
                    reorderLevel: initialData.reorderLevel?.toString() || '',
                    supplierId: initialData.supplierId || ''
                });
            } else {
                const savedDraft = getFormDraft(MATERIAL_DRAFT_KEY);
                if (savedDraft && typeof savedDraft === 'object') {
                    setFormData({
                        name: savedDraft.name || '',
                        nameAr: savedDraft.nameAr || '',
                        description: savedDraft.description || '',
                        unit: savedDraft.unit || 'TON',
                        stockLevel: savedDraft.stockLevel !== undefined && savedDraft.stockLevel !== null ? savedDraft.stockLevel.toString() : '',
                        unitPrice: savedDraft.unitPrice?.toString() || '',
                        reorderLevel: savedDraft.reorderLevel?.toString() || '',
                        supplierId: savedDraft.supplierId || ''
                    });
                    setHasRestoredDraft(true);
                } else {
                    setHasRestoredDraft(false);
                    setFormData({
                        name: '',
                        nameAr: '',
                        description: '',
                        unit: 'TON',
                        stockLevel: '',
                        unitPrice: '',
                        reorderLevel: '',
                        supplierId: ''
                    });
                }
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (!isOpen || initialData) return;
        const hasContent = formData.name || formData.nameAr || formData.description || formData.unitPrice || formData.stockLevel || formData.supplierId;
        if (hasContent) {
            saveFormDraft(MATERIAL_DRAFT_KEY, formData);
        }
    }, [formData, isOpen, initialData]);

    const loadSuppliers = async () => {
        try {
            const res = await suppliersAPI.getAll();
            setSuppliers(res.data.data || []);
        } catch (error) {
            console.error("Failed to load suppliers", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name?.trim() && !formData.nameAr?.trim()) {
            newErrors.name = isAr ? 'اسم الخامة مطلوب' : 'Material name is required';
        }
        if (!formData.unit) newErrors.unit = t('common.required');
        if (!formData.unitPrice || Number(formData.unitPrice) <= 0) {
            newErrors.unitPrice = isAr ? 'سعر الوحدة مطلوب' : 'Unit price is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            const payload = {
                name: formData.name.trim() || formData.nameAr.trim(),
                nameAr: formData.nameAr?.trim() || formData.name.trim(),
                description: formData.description?.trim() || null,
                unit: formData.unit,
                stockLevel: formData.stockLevel !== '' && formData.stockLevel !== null ? parseFloat(formData.stockLevel) : 0,
                unitPrice: parseFloat(formData.unitPrice),
                reorderLevel: formData.reorderLevel !== '' && formData.reorderLevel !== null ? parseFloat(formData.reorderLevel) : null,
                supplierId: formData.supplierId || null
            };
            if (!initialData) {
                clearFormDraft(MATERIAL_DRAFT_KEY);
                setHasRestoredDraft(false);
            }
            onSave(payload);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('common.edit') : t('common.add')} {isAr ? 'خامة جديدة' : 'Raw Material'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {hasRestoredDraft && !initialData && (
                        <DraftBanner onDiscard={handleDiscardDraft} />
                    )}
                    <div className="form-section">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{isAr ? 'اسم الخامة بالعربية' : 'Material Name (Arabic)'} <span className="required">*</span></label>
                                <input
                                    name="nameAr"
                                    value={formData.nameAr}
                                    onChange={handleChange}
                                    placeholder={isAr ? 'مثال: أسمنت بورتلاندي' : 'e.g. Portland Cement (AR)'}
                                    className={errors.name ? 'error' : ''}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label>{isAr ? 'اسم الخامة بالإنجليزية' : 'Material Name (English)'}</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Portland Cement"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('finance.uom')} <span className="required">*</span></label>
                                <select
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                >
                                    <option value="TON">{t('finance.uom_options.ton', 'طن (Ton)')}</option>
                                    <option value="KG">{t('finance.uom_options.kg', 'كيلوجرام (KG)')}</option>
                                    <option value="M3">{t('finance.uom_options.m3', 'متر مكعب (M³)')}</option>
                                    <option value="M2">{t('finance.uom_options.m2', 'متر مربع (M²)')}</option>
                                    <option value="M">{t('finance.uom_options.m', 'متر طولي (M)')}</option>
                                    <option value="PIECE">{t('finance.uom_options.piece', 'قطعة / عدد (Piece)')}</option>
                                    <option value="LITER">{t('finance.uom_options.liter', 'لتر (Liter)')}</option>
                                    <option value="BAG">{t('finance.uom_options.bag', 'شيكارة (Bag)')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{isAr ? `الرصيد / الكمية الحالية (${formData.unit})` : `Current Stock Quantity (${formData.unit})`}</label>
                                <input
                                    type="number"
                                    name="stockLevel"
                                    value={formData.stockLevel}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    style={{ fontWeight: 'bold' }}
                                />
                            </div>

                            <div className="form-group">
                                <label>{isAr ? 'سعر الوحدة (EGP)' : 'Unit Price (EGP)'} <span className="required">*</span></label>
                                <input
                                    type="number"
                                    name="unitPrice"
                                    value={formData.unitPrice}
                                    onChange={handleChange}
                                    step="0.01"
                                    placeholder="0.00"
                                    className={errors.unitPrice ? 'error' : ''}
                                />
                                {errors.unitPrice && <span className="error-message">{errors.unitPrice}</span>}
                            </div>

                            <div className="form-group">
                                <label>{isAr ? 'حد تنبيه نقص المخزون (اختياري)' : 'Min Stock Alert Level (Optional)'}</label>
                                <input
                                    type="number"
                                    name="reorderLevel"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                    step="0.01"
                                    placeholder={isAr ? 'مثال: 5' : 'e.g. 5'}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('nav.suppliers', 'المورد الافتراضي')}</label>
                                <select
                                    name="supplierId"
                                    value={formData.supplierId}
                                    onChange={handleChange}
                                >
                                    <option value="">-- {isAr ? 'بدون مورد افتراضي' : 'No Supplier'} --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label>{t('projects.modal.fields.description', 'الوصف / ملاحظات')}</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder={isAr ? 'ملاحظات حول الخامة أو مواصفاتها...' : 'Notes or specifications...'}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {initialData ? t('common.update', 'تحديث') : t('common.save', 'حفظ')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
