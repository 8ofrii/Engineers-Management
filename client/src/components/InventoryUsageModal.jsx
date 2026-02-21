import React, { useState, useEffect } from 'react';
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
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useTranslation } from 'react-i18next';

const InventoryUsageModal = ({
    open,
    onClose,
    projectId,
    onSuccess
}) => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    const [formData, setFormData] = useState({
        materialBatchId: '',
        valueConsumed: '',
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
                                    itemName: item.itemName
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

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Update selected batch info
        if (field === 'materialBatchId') {
            const batch = batches.find(b => b.id === value);
            setSelectedBatch(batch);

            // Calculate profit preview
            if (batch && formData.valueConsumed) {
                calculateProfitPreview(parseFloat(formData.valueConsumed), batch);
            }
        }

        // Calculate profit preview when value changes
        if (field === 'valueConsumed' && selectedBatch) {
            calculateProfitPreview(parseFloat(value), selectedBatch);
        }

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
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

        if (!formData.description.trim()) {
            newErrors.description = isArabic ? 'الوصف مطلوب' : 'Description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/transactions/inventory-usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...formData,
                    projectId,
                    valueConsumed: parseFloat(formData.valueConsumed)
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
            description: ''
        });
        setSelectedBatch(null);
        setProfitPreview(null);
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
                    <Grid item>
                        <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                                <InventoryIcon color="primary" />
                            </Grid>
                            <Grid item>
                                <Typography variant="h6">
                                    {isArabic ? 'تسجيل استهلاك مخزون' : 'Record Inventory Usage'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>
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

                    {/* Material Batch Selection */}
                    <Grid item xs={12}>
                        <FormControl fullWidth error={!!errors.materialBatchId}>
                            <InputLabel>{isArabic ? 'دفعة المخزون' : 'Material Batch'}</InputLabel>
                            <Select
                                value={formData.materialBatchId}
                                onChange={(e) => handleChange('materialBatchId', e.target.value)}
                                label={isArabic ? 'دفعة المخزون' : 'Material Batch'}
                            >
                                {batches.length === 0 && (
                                    <MenuItem disabled>
                                        <em>{isArabic ? 'لا توجد دفعات متاحة' : 'No batches available'}</em>
                                    </MenuItem>
                                )}
                                {batches.map(batch => (
                                    <MenuItem key={batch.id} value={batch.id}>
                                        {batch.itemName} - {batch.description}
                                        <Chip
                                            label={`${batch.remainingValue} ${isArabic ? 'جنيه' : 'EGP'}`}
                                            size="small"
                                            sx={{ ml: 1 }}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Selected Batch Info */}
                    {selectedBatch && (
                        <Grid item xs={12}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {isArabic ? 'معلومات الدفعة' : 'Batch Information'}
                                    </Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                {isArabic ? 'القيمة الأولية:' : 'Initial Value:'}
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedBatch.initialValue} {isArabic ? 'جنيه' : 'EGP'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                {isArabic ? 'المتبقي:' : 'Remaining:'}
                                            </Typography>
                                            <Typography variant="body1" color="primary">
                                                {selectedBatch.remainingValue} {isArabic ? 'جنيه' : 'EGP'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Value Consumed */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'القيمة المستهلكة (جنيه)' : 'Value Consumed (EGP)'}
                            type="number"
                            value={formData.valueConsumed}
                            onChange={(e) => handleChange('valueConsumed', e.target.value)}
                            error={!!errors.valueConsumed}
                            helperText={errors.valueConsumed}
                            inputProps={{
                                min: 0,
                                max: selectedBatch?.remainingValue || undefined,
                                step: 0.01
                            }}
                            required
                        />
                    </Grid>

                    {/* Profit Preview */}
                    {profitPreview && (
                        <Grid item xs={12}>
                            <Alert severity="success">
                                <Typography variant="subtitle2" gutterBottom>
                                    {isArabic ? 'معاينة الربح' : 'Profit Preview'}
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={12}>
                                        <Typography variant="body2">
                                            {isArabic ? 'القيمة المستهلكة:' : 'Value Consumed:'} {profitPreview.valueConsumed} {isArabic ? 'جنيه' : 'EGP'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2">
                                            {isArabic ? 'نسبة الإدارة:' : 'Management Fee:'} {profitPreview.feePercent}%
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            {isArabic ? 'الربح المحقق:' : 'Profit Recognized:'} {profitPreview.profit.toFixed(2)} {isArabic ? 'جنيه' : 'EGP'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body2">
                                            {isArabic ? 'المتبقي بعد الاستهلاك:' : 'Remaining After:'} {profitPreview.remainingAfter.toFixed(2)} {isArabic ? 'جنيه' : 'EGP'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Alert>
                        </Grid>
                    )}

                    {/* Description */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label={isArabic ? 'الوصف / الغرض من الاستخدام' : 'Description / Purpose'}
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            error={!!errors.description}
                            helperText={errors.description || (isArabic ? 'مثال: استخدام الأسمنت لأعمال الأساسات' : 'Example: Used cement for foundation work')}
                            required
                        />
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
                    disabled={loading || !selectedBatch}
                >
                    {loading
                        ? (isArabic ? 'جاري التسجيل...' : 'Recording...')
                        : (isArabic ? 'تسجيل الاستهلاك' : 'Record Usage')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InventoryUsageModal;
