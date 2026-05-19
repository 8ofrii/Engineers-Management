import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { suppliersAPI } from '../services/api';
import './Modal.css';

export default function AddMaterialModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        description: '',
        unit: 'TON',
        unitPrice: '',
        reorderLevel: '',
        supplierId: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadSuppliers();
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    nameAr: initialData.nameAr || '',
                    description: initialData.description || '',
                    unit: initialData.unit || 'TON',
                    unitPrice: initialData.unitPrice?.toString() || '',
                    reorderLevel: initialData.reorderLevel?.toString() || '',
                    supplierId: initialData.supplierId || ''
                });
            } else {
                setFormData({
                    name: '',
                    nameAr: '',
                    description: '',
                    unit: 'TON',
                    unitPrice: '',
                    reorderLevel: '',
                    supplierId: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

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
        if (!formData.name) newErrors.name = t('common.required');
        if (!formData.unit) newErrors.unit = t('common.required');
        if (!formData.unitPrice || Number(formData.unitPrice) <= 0) newErrors.unitPrice = t('common.required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('common.edit') : t('common.add')} {t('inventory.title')}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-section">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('common.name')} (EN) <span className="required">*</span></label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Portland Cement"
                                    className={errors.name ? 'error' : ''}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label>{t('common.nameAr')} (AR)</label>
                                <input
                                    name="nameAr"
                                    value={formData.nameAr}
                                    onChange={handleChange}
                                    placeholder="مثال: أسمنت بورتلاندي"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('finance.uom')} <span className="required">*</span></label>
                                <select
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                >
                                    <option value="TON">{t('finance.uom_options.ton')}</option>
                                    <option value="KG">{t('finance.uom_options.kg')}</option>
                                    <option value="M3">{t('finance.uom_options.m3')}</option>
                                    <option value="M2">{t('finance.uom_options.m2')}</option>
                                    <option value="M">{t('finance.uom_options.m')}</option>
                                    <option value="PIECE">{t('finance.uom_options.piece')}</option>
                                    <option value="LITER">{t('finance.uom_options.liter')}</option>
                                    <option value="BAG">{t('finance.uom_options.bag')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('finance.unitPrice')} <span className="required">*</span></label>
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
                                <label>Reorder Level</label>
                                <input
                                    type="number"
                                    name="reorderLevel"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('nav.suppliers')}</label>
                                <select
                                    name="supplierId"
                                    value={formData.supplierId}
                                    onChange={handleChange}
                                >
                                    <option value="">-- No Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label>{t('projects.modal.fields.description')}</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
