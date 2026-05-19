import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { projectsAPI, workmenAPI } from '../services/api';
import './Modal.css';
import CurrencyInput from './CurrencyInput';

export default function AddWorkmanshipModal({ isOpen, onClose, onSubmit }) {
    const { t } = useTranslation();

    const [projects, setProjects] = useState([]);
    const [workmen, setWorkmen] = useState([]);

    const [formData, setFormData] = useState({
        projectId: '',
        workmanId: '',
        description: '',
        agreedAmount: '',
        status: 'PENDING',
        startDate: new Date().toISOString().split('T')[0]
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadDropdownData();
            setFormData({
                projectId: '',
                workmanId: '',
                description: '',
                agreedAmount: '',
                status: 'PENDING',
                startDate: new Date().toISOString().split('T')[0]
            });
            setErrors({});
        }
    }, [isOpen]);

    const loadDropdownData = async () => {
        try {
            const [projectsRes, workmenRes] = await Promise.all([
                projectsAPI.getAll(),
                workmenAPI.getAll()
            ]);
            setProjects(projectsRes.data.data || []);
            setWorkmen(workmenRes.data.data || []);
        } catch (error) {
            console.error("Failed to load dropdown data", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.projectId) newErrors.projectId = t('common.required');
        if (!formData.workmanId) newErrors.workmanId = t('common.required');
        if (!formData.description) newErrors.description = t('common.required');
        if (!formData.agreedAmount || Number(formData.agreedAmount) <= 0) newErrors.agreedAmount = t('common.required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Record Workmanship (Musanaiyah)</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-section">
                        <div className="form-grid">

                            {/* Project */}
                            <div className="form-group">
                                <label>{t('nav.projects')} <span className="required">*</span></label>
                                <select
                                    name="projectId"
                                    value={formData.projectId}
                                    onChange={handleChange}
                                    className={errors.projectId ? 'error' : ''}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                {errors.projectId && <span className="error-message">{errors.projectId}</span>}
                            </div>

                            {/* Workman */}
                            <div className="form-group">
                                <label>{t('labor.title')} <span className="required">*</span></label>
                                <select
                                    name="workmanId"
                                    value={formData.workmanId}
                                    onChange={handleChange}
                                    className={errors.workmanId ? 'error' : ''}
                                >
                                    <option value="">-- Select Workman --</option>
                                    {workmen.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.trade})
                                        </option>
                                    ))}
                                </select>
                                {errors.workmanId && <span className="error-message">{errors.workmanId}</span>}
                            </div>

                            {/* Description */}
                            <div className="form-group full-width">
                                <label>{t('finance.description')} <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="e.g. Plastering Ground Floor"
                                    className={errors.description ? 'error' : ''}
                                />
                                {errors.description && <span className="error-message">{errors.description}</span>}
                            </div>

                            {/* Amount */}
                            <div className="form-group">
                                <label>{t('workmanship.agreedAmount')} <span className="required">*</span></label>
                                <CurrencyInput
                                    name="agreedAmount"
                                    value={formData.agreedAmount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={errors.agreedAmount ? 'error' : ''}
                                />
                                {errors.agreedAmount && <span className="error-message">{errors.agreedAmount}</span>}
                            </div>

                            {/* Status */}
                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="PAID">Paid</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                />
                            </div>

                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {t('common.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
