import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { projectsAPI, materialsAPI } from '../services/api';
import './Modal.css';

export default function AddMaterialUsageModal({ isOpen, onClose, onSubmit }) {
    const { t } = useTranslation();

    const [projects, setProjects] = useState([]);
    const [materials, setMaterials] = useState([]);

    const [formData, setFormData] = useState({
        projectId: '',
        materialId: '',
        quantity: '',
        usageDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadDropdownData();
            // Reset form
            setFormData({
                projectId: '',
                materialId: '',
                quantity: '',
                usageDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setErrors({});
        }
    }, [isOpen]);

    const loadDropdownData = async () => {
        try {
            const [projectsRes, materialsRes] = await Promise.all([
                projectsAPI.getAll(),
                materialsAPI.getAll()
            ]);
            setProjects(projectsRes.data.data || []);
            setMaterials(materialsRes.data.data || []);
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
        if (!formData.materialId) newErrors.materialId = t('common.required');
        if (!formData.quantity || Number(formData.quantity) <= 0) newErrors.quantity = t('common.required');

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
                    <h2>Record Material Usage</h2>
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

                            {/* Material */}
                            <div className="form-group">
                                <label>{t('inventory.title')} <span className="required">*</span></label>
                                <select
                                    name="materialId"
                                    value={formData.materialId}
                                    onChange={handleChange}
                                    className={errors.materialId ? 'error' : ''}
                                >
                                    <option value="">-- Select Material --</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.unit}) - Stock: {m.stockLevel}
                                        </option>
                                    ))}
                                </select>
                                {errors.materialId && <span className="error-message">{errors.materialId}</span>}
                            </div>

                            {/* Quantity */}
                            <div className="form-group">
                                <label>Quantity Used <span className="required">*</span></label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    step="0.01"
                                    placeholder="0.00"
                                    className={errors.quantity ? 'error' : ''}
                                />
                                {errors.quantity && <span className="error-message">{errors.quantity}</span>}
                            </div>

                            {/* Date */}
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="usageDate"
                                    value={formData.usageDate}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Notes */}
                            <div className="form-group full-width">
                                <label>Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
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
                            {t('common.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
