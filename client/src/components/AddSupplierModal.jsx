import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './Modal.css';

export default function AddSupplierModal({ isOpen, onClose, onSave, initialData = null }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        category: 'GENERAL',
        contact: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                category: initialData.category || 'GENERAL',
                contact: initialData.contact || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                address: initialData.address || '',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                name: '',
                category: 'GENERAL',
                contact: '',
                email: '',
                phone: '',
                address: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    const categories = [
        'GENERAL', 'CONCRETE', 'STEEL', 'CEMENT', 'BRICKS',
        'ELECTRICAL', 'PLUMBING', 'PAINT', 'WOOD', 'TOOLS'
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

        if (!formData.phone.trim()) {
            newErrors.phone = t('common.required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            await onSave(formData);
            handleClose();
        } catch (error) {
            console.error('Failed to save supplier:', error);
            // alert(t('common.error'));
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
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label htmlFor="name">
                                {t('suppliers.fields.name')} <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={errors.name ? 'error' : ''}
                                placeholder="Supplier Name"
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">
                                {t('suppliers.fields.category')}
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                {t('suppliers.fields.phone')} <span className="required">*</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={errors.phone ? 'error' : ''}
                                placeholder="Phone Number"
                            />
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                {t('suppliers.fields.email')}
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contact">
                                {t('suppliers.fields.contactPerson')}
                            </label>
                            <input
                                type="text"
                                id="contact"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                placeholder="Contact Person Name"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="address">
                                {t('suppliers.fields.address')}
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Address"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="notes">
                                {t('common.notes')}
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Additional notes..."
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
