import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { clientsAPI } from '../services/api';
import './Modal.css';

export default function AddProjectModal({ isOpen, onClose, onSubmit, initialData = null }) {
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'PLANNING',
        projectType: 'OTHER',
        location: '',
        startDate: '',
        endDate: '',
        budget: '',
        revenueModel: 'EXECUTION_COST_PLUS',
        managementFeePercent: '20',
        totalContractValue: '',
        paymentTerms: 'Net 30',
        clientId: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadClients();
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    description: initialData.description || '',
                    status: initialData.status || 'PLANNING',
                    projectType: initialData.projectType || 'OTHER',
                    location: initialData.location || '',
                    startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
                    endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
                    budget: initialData.budget || '',
                    revenueModel: initialData.revenueModel || 'EXECUTION_COST_PLUS',
                    managementFeePercent: initialData.managementFeePercent || '20',
                    totalContractValue: initialData.totalContractValue || '',
                    paymentTerms: initialData.paymentTerms || 'Net 30',
                    clientId: initialData.clientId || initialData.client?.id || ''
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    status: 'PLANNING',
                    projectType: 'OTHER',
                    location: '',
                    startDate: '',
                    endDate: '',
                    budget: '',
                    revenueModel: 'EXECUTION_COST_PLUS',
                    managementFeePercent: '20',
                    totalContractValue: '',
                    paymentTerms: 'Net 30',
                    clientId: ''
                });
            }
        }
    }, [isOpen, initialData]);

    const loadClients = async () => {
        try {
            const response = await clientsAPI.getAll();
            setClients(response.data.data);
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    };

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

        if (!formData.name.trim()) newErrors.name = t('projects.modal.fields.name') + ' is required';
        if (!formData.clientId) newErrors.clientId = t('projects.modal.options.selectClient');
        if (!formData.startDate) newErrors.startDate = t('projects.modal.fields.startDate') + ' is required';
        if (!formData.budget || formData.budget <= 0) newErrors.budget = t('projects.modal.fields.budget') + ' must be greater than 0';

        if (formData.revenueModel === 'EXECUTION_COST_PLUS') {
            if (!formData.managementFeePercent || formData.managementFeePercent <= 0) {
                newErrors.managementFeePercent = t('projects.modal.fields.managementFee') + ' is required';
            }
        }

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
            description: '',
            status: 'PLANNING',
            projectType: 'OTHER',
            location: '',
            startDate: '',
            endDate: '',
            budget: '',
            revenueModel: 'EXECUTION_COST_PLUS',
            managementFeePercent: '20',
            totalContractValue: '',
            paymentTerms: 'Net 30',
            clientId: ''
        });
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialData ? t('projects.modal.editTitle') : t('projects.modal.title')}</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h3 className="section-title">{t('projects.modal.sections.basic')}</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="name">{t('projects.modal.fields.name')} <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={errors.name ? 'error' : ''}
                                    placeholder={t('projects.modal.fields.name')}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="description">{t('projects.modal.fields.description')}</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder={t('projects.modal.fields.description')}
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="clientId">{t('projects.modal.fields.client')} <span className="required">*</span></label>
                                <select
                                    id="clientId"
                                    name="clientId"
                                    value={formData.clientId}
                                    onChange={handleChange}
                                    className={errors.clientId ? 'error' : ''}
                                >
                                    <option value="">{t('projects.modal.options.selectClient')}</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.company ? `(${client.company})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.clientId && <span className="error-message">{errors.clientId}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="location">{t('projects.modal.fields.location')}</label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder={t('projects.modal.fields.location')}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="projectType">{t('projects.modal.fields.type')}</label>
                                <select
                                    id="projectType"
                                    name="projectType"
                                    value={formData.projectType}
                                    onChange={handleChange}
                                >
                                    <option value="RESIDENTIAL">{t('projects.modal.options.residential')}</option>
                                    <option value="COMMERCIAL">{t('projects.modal.options.commercial')}</option>
                                    <option value="INFRASTRUCTURE">{t('projects.modal.options.infrastructure')}</option>
                                    <option value="INDUSTRIAL">{t('projects.modal.options.industrial')}</option>
                                    <option value="OTHER">{t('projects.modal.options.other')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">{t('projects.modal.fields.status')}</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="PLANNING">{t('projects.status.planning')}</option>
                                    <option value="IN_PROGRESS">{t('projects.status.inProgress')}</option>
                                    <option value="ON_HOLD">{t('projects.status.onHold')}</option>
                                    <option value="COMPLETED">{t('projects.status.completed')}</option>
                                    <option value="CANCELLED">{t('projects.status.cancelled')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="form-section">
                        <h3 className="section-title">{t('projects.modal.sections.timeline')}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="startDate">{t('projects.modal.fields.startDate')} <span className="required">*</span></label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className={errors.startDate ? 'error' : ''}
                                />
                                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="endDate">{t('projects.modal.fields.endDate')}</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    min={formData.startDate}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="form-section">
                        <h3 className="section-title">{t('projects.modal.sections.financial')}</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="paymentTerms">{t('projects.modal.fields.paymentTerms')}</label>
                                <select
                                    id="paymentTerms"
                                    name="paymentTerms"
                                    value={formData.paymentTerms}
                                    onChange={handleChange}
                                >
                                    <option value="Net 15">Net 15 Days</option>
                                    <option value="Net 30">Net 30 Days</option>
                                    <option value="Net 45">Net 45 Days</option>
                                    <option value="Net 60">Net 60 Days</option>
                                    <option value="Due on Receipt">Due on Receipt</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="revenueModel">{t('projects.modal.fields.revenueModel')} <span className="required">*</span></label>
                                <select
                                    id="revenueModel"
                                    name="revenueModel"
                                    value={formData.revenueModel}
                                    onChange={handleChange}
                                >
                                    <option value="DESIGN_ONLY_AREA">{t('projects.modal.options.designOnly')}</option>
                                    <option value="EXECUTION_COST_PLUS">{t('projects.modal.options.costPlus')}</option>
                                    <option value="EXECUTION_LUMP_SUM">{t('projects.modal.options.lumpSum')}</option>
                                </select>
                                <small className="field-hint">
                                    {formData.revenueModel === 'DESIGN_ONLY_AREA' && t('projects.modal.hints.designOnly')}
                                    {formData.revenueModel === 'EXECUTION_COST_PLUS' && t('projects.modal.hints.costPlus')}
                                    {formData.revenueModel === 'EXECUTION_LUMP_SUM' && t('projects.modal.hints.lumpSum')}
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="budget">{t('projects.modal.fields.budget')} <span className="required">*</span></label>
                                <input
                                    type="number"
                                    id="budget"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    className={errors.budget ? 'error' : ''}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                                {errors.budget && <span className="error-message">{errors.budget}</span>}
                            </div>

                            {formData.revenueModel === 'EXECUTION_COST_PLUS' && (
                                <div className="form-group">
                                    <label htmlFor="managementFeePercent">{t('projects.modal.fields.managementFee')} <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        id="managementFeePercent"
                                        name="managementFeePercent"
                                        value={formData.managementFeePercent}
                                        onChange={handleChange}
                                        className={errors.managementFeePercent ? 'error' : ''}
                                        placeholder="20"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                    />
                                    {errors.managementFeePercent && <span className="error-message">{errors.managementFeePercent}</span>}
                                    <small className="field-hint">{t('projects.modal.hints.feeRange')}</small>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="totalContractValue">{t('projects.modal.fields.contractValue')}</label>
                                <input
                                    type="number"
                                    id="totalContractValue"
                                    name="totalContractValue"
                                    value={formData.totalContractValue}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                                <small className="field-hint">{t('projects.modal.hints.contractValue')}</small>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {initialData ? t('common.update') : t('projects.modal.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
