import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    IconButton,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const CostItemModal = ({
    open,
    onClose,
    projectId,
    onSuccess,
    editItem = null
}) => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const isEdit = !!editItem;

    const [formData, setFormData] = useState({
        name: editItem?.name || '',
        totalQuantity: editItem?.totalQuantity || '',
        unitOfMeasure: editItem?.unitOfMeasure || '',
        unitPrice: editItem?.unitPrice || '',
        estimatedTotal: editItem?.estimatedTotal || ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate estimated total
            if (field === 'totalQuantity' || field === 'unitPrice') {
                const qty = parseFloat(field === 'totalQuantity' ? value : updated.totalQuantity) || 0;
                const price = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0;
                updated.estimatedTotal = (qty * price).toFixed(2);
            }

            return updated;
        });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = isArabic ? 'اسم البند مطلوب' : 'Item name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const url = isEdit
                ? `${API_URL}/api/project-cost-items/${editItem.id}`
                : `${API_URL}/api/project-cost-items`;

            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...formData,
                    projectId,
                    totalQuantity: formData.totalQuantity ? parseFloat(formData.totalQuantity) : null,
                    unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
                    estimatedTotal: formData.estimatedTotal ? parseFloat(formData.estimatedTotal) : null
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess(data.data);
                handleClose();
            } else {
                setErrors({ submit: data.message || 'Failed to save cost item' });
            }
        } catch (error) {
            setErrors({ submit: error.message || 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            totalQuantity: '',
            unitOfMeasure: '',
            unitPrice: '',
            estimatedTotal: ''
        });
        setErrors({});
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <DialogTitle>
                <Grid container justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {isEdit
                            ? (isArabic ? 'تعديل بند التكلفة' : 'Edit Cost Item')
                            : (isArabic ? 'إضافة بند تكلفة جديد' : 'New Cost Item')}
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Grid>
            </DialogTitle>

            <DialogContent dividers>
                <Grid container spacing={3}>
                    {errors.submit && (
                        <Grid item xs={12}>
                            <Alert severity="error">{errors.submit}</Alert>
                        </Grid>
                    )}

                    {/* Item Name */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'اسم البند / أمر العمل' : 'Item Name / Work Order'}
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name || (isArabic ? 'مثال: تركيب سيراميك الطابق الأرضي' : 'Example: Ground Floor Ceramic Installation')}
                            required
                        />
                    </Grid>

                    {/* Quantity */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'الكمية الإجمالية' : 'Total Quantity'}
                            type="number"
                            value={formData.totalQuantity}
                            onChange={(e) => handleChange('totalQuantity', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            helperText={isArabic ? 'اختياري' : 'Optional'}
                        />
                    </Grid>

                    {/* Unit of Measure */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'وحدة القياس' : 'Unit of Measure'}
                            value={formData.unitOfMeasure}
                            onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                            placeholder={isArabic ? 'م², كيس، متر، إلخ' : 'M2, Bag, Meter, etc.'}
                            helperText={isArabic ? 'اختياري' : 'Optional'}
                        />
                    </Grid>

                    {/* Unit Price */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'سعر الوحدة (جنيه)' : 'Unit Price (EGP)'}
                            type="number"
                            value={formData.unitPrice}
                            onChange={(e) => handleChange('unitPrice', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            helperText={isArabic ? 'اختياري' : 'Optional'}
                        />
                    </Grid>

                    {/* Estimated Total */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'الإجمالي المقدر (جنيه)' : 'Estimated Total (EGP)'}
                            type="number"
                            value={formData.estimatedTotal}
                            onChange={(e) => handleChange('estimatedTotal', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            helperText={isArabic ? 'يحسب تلقائياً' : 'Auto-calculated'}
                        />
                    </Grid>

                    {/* Info Alert */}
                    <Grid item xs={12}>
                        <Alert severity="info">
                            {isArabic
                                ? 'بند التكلفة يساعد في تتبع التقدم والمصروفات لأعمال محددة في المشروع.'
                                : 'Cost items help track progress and expenses for specific work orders in the project.'}
                        </Alert>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="inherit" disabled={loading}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading}
                >
                    {loading
                        ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                        : (isArabic ? 'حفظ' : 'Save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CostItemModal;
