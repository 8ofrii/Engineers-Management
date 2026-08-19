import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Package } from 'lucide-react';
import './Modal.css';

const InventoryUsageModal = ({
    open,
    onClose,
    projectId,
    preselectedBatchId,
    onSuccess
}) => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    const [formData, setFormData] = useState({
        materialBatchId: '',
        valueConsumed: '',
        quantityConsumed: '',
        description: ''
    });

    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [profitPreview, setProfitPreview] = useState(null);

    // Fetch available batches
    useEffect(() => {
        const fetchBatches = async () => {
            if (!projectId || !open) return;

            try {
                const API_URL = import.meta.env.VITE_API_URL || '/api';
                const response = await fetch(`${API_URL}/transactions/projects/${projectId}/inventory`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (data.success) {
                    // Flatten batches from inventory items
                    const allBatches = [];
                    data.data.forEach(item => {
                        item.batches?.forEach(batch => {
                            if (batch.status !== 'DEPLETED') {
                                allBatches.push({
                                    ...batch,
                                    itemName: item.itemName,
                                    unit: item.unitOfMeasure
                                });
                            }
                        });
                    });
                    setBatches(allBatches);
                }
            } catch (error) {
                console.error('Failed to fetch batches:', error);
            }
        };

        fetchBatches();
    }, [projectId, open]);

    // Auto-select batch if provided
    useEffect(() => {
        if (batches.length > 0 && preselectedBatchId && !formData.materialBatchId) {
            handleChange({ target: { name: 'materialBatchId', value: preselectedBatchId } });
        }
    }, [batches, preselectedBatchId]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Handle auto-calculation if one of the fields is changed
        let updates = { [name]: value };

        if (name === 'quantityConsumed' && selectedBatch?.unitPrice && value !== '') {
            const calculatedValue = (parseFloat(value) * parseFloat(selectedBatch.unitPrice)).toFixed(2);
            updates.valueConsumed = calculatedValue;
        } else if (name === 'valueConsumed' && selectedBatch?.unitPrice && value !== '' && selectedBatch.unitPrice > 0) {
            const calculatedQuantity = (parseFloat(value) / parseFloat(selectedBatch.unitPrice)).toFixed(2);
            updates.quantityConsumed = calculatedQuantity;
        }

        setFormData(prev => {
            const newData = { ...prev, ...updates };

            // Update selected batch info when batch changes
            if (name === 'materialBatchId') {
                const batch = batches.find(b => b.id === value);
                setSelectedBatch(batch);

                // Keep the current input value but apply auto calc if price exists
                if (batch && batch.unitPrice && newData.quantityConsumed) {
                    newData.valueConsumed = (parseFloat(newData.quantityConsumed) * parseFloat(batch.unitPrice)).toFixed(2);
                }

                if (batch && newData.valueConsumed) {
                    calculateProfitPreview(parseFloat(newData.valueConsumed), batch);
                } else {
                    setProfitPreview(null);
                }
            } else if ((name === 'valueConsumed' || name === 'quantityConsumed') && selectedBatch) {
                if (newData.valueConsumed) {
                    calculateProfitPreview(parseFloat(newData.valueConsumed), selectedBatch);
                } else {
                    setProfitPreview(null);
                }
            }

            return newData;
        });

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        if (updates.valueConsumed && errors['valueConsumed']) {
            setErrors(prev => ({ ...prev, valueConsumed: null }));
        }
    };

    const calculateProfitPreview = async (valueConsumed, batch) => {
        if (!valueConsumed || !batch) {
            setProfitPreview(null);
            return;
        }

        try {
            // Fetch project to get management fee
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                const feePercent = parseFloat(data.data.managementFeePercent) || 0;
                const profit = valueConsumed * (feePercent / 100);

                setProfitPreview({
                    valueConsumed,
                    feePercent,
                    profit,
                    remainingAfter: batch.remainingValue - valueConsumed
                });
            }
        } catch (error) {
            console.error('Failed to calculate profit preview:', error);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.materialBatchId) {
            newErrors.materialBatchId = isArabic ? 'يجب اختيار دفعة مخزون' : 'Material batch is required';
        }

        if (!formData.valueConsumed || formData.valueConsumed <= 0) {
            newErrors.valueConsumed = isArabic ? 'القيمة المستهلكة يجب أن تكون أكبر من صفر' : 'Value consumed must be greater than 0';
        }

        if (selectedBatch && parseFloat(formData.valueConsumed) > selectedBatch.remainingValue) {
            newErrors.valueConsumed = isArabic
                ? `القيمة المستهلكة تتجاوز المتاح (${selectedBatch.remainingValue} جنيه)`
                : `Value exceeds available (${selectedBatch.remainingValue} EGP)`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);

        try {
            const fallbackDescription = formData.description?.trim() || 
                (isArabic ? `صرف خامات: ${selectedBatch?.itemName || 'مخزون'}` : `Material usage: ${selectedBatch?.itemName || 'Inventory'}`);

            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/transactions/inventory-usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...formData,
                    description: fallbackDescription,
                    projectId,
                    valueConsumed: parseFloat(formData.valueConsumed),
                    quantityConsumed: formData.quantityConsumed ? parseFloat(formData.quantityConsumed) : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess(data.data, data.profitInfo);
                handleClose();
            } else {
                setErrors({ submit: data.message || 'Failed to record usage' });
            }
        } catch (error) {
            setErrors({ submit: error.message || 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            materialBatchId: '',
            valueConsumed: '',
            quantityConsumed: '',
            description: ''
        });
        setSelectedBatch(null);
        setProfitPreview(null);
        setErrors({});
        onClose();
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} dir={isArabic ? 'rtl' : 'ltr'} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2 className="flex gap-sm items-center">
                        <Package size={24} className="text-primary" />
                        {t('inventory.recordUsage')}
                    </h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {errors.submit && (
                        <div className="alert alert-error mb-md" style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px' }}>
                            {errors.submit}
                        </div>
                    )}

                    <div className="form-group full-width">
                        <label>{isArabic ? 'دفعة المخزون' : 'Material Batch'} <span className="required">*</span></label>
                        <select
                            name="materialBatchId"
                            value={formData.materialBatchId}
                            onChange={handleChange}
                            className={errors.materialBatchId ? 'error' : ''}
                        >
                            <option value="">{isArabic ? '-- اختر دفعة مخزون --' : '-- Select Material Batch --'}</option>
                            {batches.map(batch => (
                                <option key={batch.id} value={batch.id}>
                                    {batch.itemName} - {batch.description} ({batch.remainingValue} {isArabic ? 'جنيه' : 'EGP'})
                                </option>
                            ))}
                        </select>
                        {errors.materialBatchId && <span className="error-message">{errors.materialBatchId}</span>}
                    </div>

                    {selectedBatch && (
                        <div className="card mb-md" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{isArabic ? 'معلومات الدفعة' : 'Batch Information'}</h4>
                            <div className="flex-between">
                                <div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{isArabic ? 'القيمة الأولية:' : 'Initial Value:'}</span>
                                    <div style={{ fontWeight: 'bold' }}>{selectedBatch.initialValue} {isArabic ? 'جنيه' : 'EGP'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{isArabic ? 'المتبقي:' : 'Remaining:'}</span>
                                    <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedBatch.remainingValue} {isArabic ? 'جنيه' : 'EGP'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group mb-0">
                            <label>{isArabic ? 'الكمية المستهلكة' : 'Quantity Consumed'} {selectedBatch?.unitPrice && '*'}</label>
                            <input
                                type="number"
                                name="quantityConsumed"
                                value={formData.quantityConsumed}
                                onChange={handleChange}
                                min="0"
                                step="any"
                                placeholder={isArabic ? `الكمية (${selectedBatch?.unit || '-'})` : `Quantity (${selectedBatch?.unit || '-'})`}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label>{isArabic ? 'القيمة المستهلكة (جنيه)' : 'Value Consumed (EGP)'} <span className="required">*</span></label>
                            <input
                                type="number"
                                name="valueConsumed"
                                value={formData.valueConsumed}
                                onChange={handleChange}
                                min="0"
                                max={selectedBatch?.remainingValue || undefined}
                                step="any"
                                className={errors.valueConsumed ? 'error' : ''}
                                placeholder="0.00"
                            />
                            {errors.valueConsumed && <span className="error-message">{errors.valueConsumed}</span>}
                        </div>
                    </div>

                    {profitPreview && (
                        <div className="alert alert-success mt-md mb-md" style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{isArabic ? 'معاينة الربح' : 'Profit Preview'}</h4>
                            <div className="grid grid-2" style={{ gap: '8px', fontSize: '13px' }}>
                                <div>
                                    <span style={{ display: 'block' }}>{isArabic ? 'القيمة المستهلكة:' : 'Value Consumed:'}</span>
                                    <strong>{profitPreview.valueConsumed} {isArabic ? 'جنيه' : 'EGP'}</strong>
                                </div>
                                <div>
                                    <span style={{ display: 'block' }}>{isArabic ? 'نسبة الإدارة:' : 'Management Fee:'}</span>
                                    <strong>{profitPreview.feePercent}%</strong>
                                </div>
                                <div>
                                    <span style={{ display: 'block' }}>{isArabic ? 'المتبقي بعد الاستهلاك:' : 'Remaining After:'}</span>
                                    <strong>{profitPreview.remainingAfter.toFixed(2)} {isArabic ? 'جنيه' : 'EGP'}</strong>
                                </div>
                                <div style={{ color: '#059669' }}>
                                    <span style={{ display: 'block' }}>{isArabic ? 'الربح المحقق:' : 'Profit Recognized:'}</span>
                                    <strong>{profitPreview.profit.toFixed(2)} {isArabic ? 'جنيه' : 'EGP'}</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-group full-width mb-0">
                        <label>{isArabic ? 'الوصف / الغرض من الاستخدام (اختياري)' : 'Description / Purpose (Optional)'}</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className={errors.description ? 'error' : ''}
                            placeholder={isArabic ? 'مثال: استخدام الأسمنت لأعمال الأساسات' : 'Example: Used cement for foundation work'}
                            style={{ resize: 'vertical' }}
                        />
                        {errors.description && <span className="error-message">{errors.description}</span>}
                    </div>

                    <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !selectedBatch}>
                            {loading
                                ? (isArabic ? 'جاري التسجيل...' : 'Recording...')
                                : (isArabic ? 'تسجيل الاستهلاك' : 'Record Usage')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryUsageModal;
