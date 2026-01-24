import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './Modal.css';

export default function AddClientModal({ isOpen, onClose, onSubmit, initialData = null }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        taxId: '',
        status: 'ACTIVE',
        // Address
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        // Contact Person
        contactName: '',
        contactPosition: '',
        contactPhone: '',
        contactEmail: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                company: initialData.company || '',
                taxId: initialData.taxId || '',
                status: initialData.status || 'ACTIVE',
                street: initialData.street || '',
                city: initialData.city || '',
                state: initialData.state || '',
                zipCode: initialData.zipCode || '',
                country: initialData.country || '',
                contactName: initialData.contactName || '',
                contactPosition: initialData.contactPosition || '',
                contactPhone: initialData.contactPhone || '',
                contactEmail: initialData.contactEmail || ''
            });
        } else if (isOpen && !initialData) {
            // Reset form when opening in "Add" mode
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                taxId: '',
                status: 'ACTIVE',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                contactName: '',
                contactPosition: '',
                contactPhone: '',
                contactEmail: ''
            });
        }
    }, [isOpen, initialData]);

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = t('clients.modal.fields.name') + ' is required'; // Ideally move validation messages to i18n too
        if (!formData.email.trim()) newErrors.email = t('clients.modal.fields.email') + ' is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('clients.modal.fields.email') + ' is invalid';
        if (!formData.phone.trim()) newErrors.phone = t('clients.modal.fields.phone') + ' is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
            handleClose();
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            taxId: '',
            status: 'ACTIVE',
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            contactName: '',
            contactPosition: '',
            contactPhone: '',
            contactEmail: ''
        });
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
                                <label htmlFor="email">{t('clients.modal.fields.email')} <span className="required">*</span></label>
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

                            <div className="form-group">
                                <label htmlFor="phone">{t('clients.modal.fields.phone')} <span className="required">*</span></label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className={errors.phone ? 'error' : ''}
                                    placeholder={t('clients.modal.placeholders.phone')}
                                />
                                {errors.phone && <span className="error-message">{errors.phone}</span>}
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
                                >
                                    <option value="ACTIVE">{t('clients.status.active')}</option>
                                    <option value="INACTIVE">{t('clients.status.inactive')}</option>
                                </select>
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

                    {/* Contact Person */}
                    <div className="form-section">
                        <h3 className="section-title">{t('clients.modal.sections.contact')}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="contactName">{t('clients.modal.fields.contactName')}</label>
                                <input
                                    type="text"
                                    id="contactName"
                                    name="contactName"
                                    value={formData.contactName}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.contactName')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contactPosition">{t('clients.modal.fields.contactPosition')}</label>
                                <input
                                    type="text"
                                    id="contactPosition"
                                    name="contactPosition"
                                    value={formData.contactPosition}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.contactPosition')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contactPhone">{t('clients.modal.fields.contactPhone')}</label>
                                <input
                                    type="tel"
                                    id="contactPhone"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.contactPhone')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contactEmail">{t('clients.modal.fields.contactEmail')}</label>
                                <input
                                    type="email"
                                    id="contactEmail"
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    onChange={handleChange}
                                    placeholder={t('clients.modal.placeholders.contactEmail')}
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
