import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './Modal.css';

export default function AddWorkmanModal({ isOpen, onClose, onSave }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        trade: 'MASON',
        dailyRate: '',
        phone: '',
        nationalId: '',
        customTrade: '' // For when OTHER is selected
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const trades = [
        'CARPENTER', 'MASON', 'ELECTRICIAN', 'PLUMBER', 'PAINTER',
        'WELDER', 'LABORER', 'FOREMAN', 'CONCRETE', 'PLASTERER',
        'FLOORING', 'GYPSUM', 'ALUMINUM', 'OTHER'
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

        if (!formData.dailyRate || parseFloat(formData.dailyRate) <= 0) {
            newErrors.dailyRate = t('common.required');
        }

        if (!formData.phone.trim()) {
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
            await onSave({
                ...formData,
                dailyRate: parseFloat(formData.dailyRate)
            });
            handleClose();
        } catch (error) {
            console.error('Failed to save workman:', error);
            alert(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            nameAr: '',
            trade: 'MASON',
            dailyRate: '',
            phone: '',
            nationalId: '',
            customTrade: ''
        });
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{t('labor.newWorkman')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
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
                                {t('labor.dailyRate')} <span className="required">*</span>
                            </label>
                            <div className="number-input-wrapper">
                                <input
                                    type="number"
                                    id="dailyRate"
                                    name="dailyRate"
                                    value={formData.dailyRate}
                                    onChange={handleChange}
                                    className={errors.dailyRate ? 'error' : ''}
                                    placeholder="500"
                                    step="50"
                                    min="0"
                                />
                                <div className="number-spinners">
                                    <button
                                        type="button"
                                        className="spinner-btn"
                                        onClick={() => {
                                            const newValue = (parseFloat(formData.dailyRate) || 0) + 50;
                                            handleChange({ target: { name: 'dailyRate', value: newValue.toString() } });
                                        }}
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        className="spinner-btn"
                                        onClick={() => {
                                            const newValue = Math.max(0, (parseFloat(formData.dailyRate) || 0) - 50);
                                            handleChange({ target: { name: 'dailyRate', value: newValue.toString() } });
                                        }}
                                        disabled={!formData.dailyRate || parseFloat(formData.dailyRate) <= 0}
                                    >
                                        ▼
                                    </button>
                                </div>
                            </div>
                            {errors.dailyRate && <span className="error-message">{errors.dailyRate}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                {t('labor.phone')} <span className="required">*</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={errors.phone ? 'error' : ''}
                                placeholder="01012345678"
                            />
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
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
