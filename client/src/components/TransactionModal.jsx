import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Typography,
    IconButton,
    Autocomplete,
    Switch,
    FormControlLabel,
    Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const TransactionModal = ({
    open,
    onClose,
    onSubmit,
    projectId,
    currentUser
}) => {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(currentUser?.role);

    // Form state
    const [formData, setFormData] = useState({
        type: 'EXPENSE',
        category: '',
        amount: '',
        description: '',
        projectCostItemId: '',
        transactionDate: new Date(),
        paymentMethod: 'CASH',
        payerUserId: currentUser?.id,
        invoiceNumber: '',
        createBatch: false
    });

    const [categories, setCategories] = useState([]);
    const [costItems, setCostItems] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showCostItemModal, setShowCostItemModal] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/categories?grouped=true', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setCategories(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        };

        if (open) {
            fetchCategories();
        }
    }, [open]);

    // Fetch cost items for project
    useEffect(() => {
        const fetchCostItems = async () => {
            if (!projectId) return;

            try {
                const response = await fetch(`/api/project-cost-items/project/${projectId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setCostItems(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch cost items:', error);
            }
        };

        if (open && projectId) {
            fetchCostItems();
        }
    }, [open, projectId]);

    // Fetch employees (for managers)
    useEffect(() => {
        const fetchEmployees = async () => {
            if (!isManager) return;

            try {
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setEmployees(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch employees:', error);
            }
        };

        if (open && isManager) {
            fetchEmployees();
        }
    }, [open, isManager]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.type) {
            newErrors.type = isArabic ? 'النوع مطلوب' : 'Type is required';
        }
        if (!formData.category) {
            newErrors.category = isArabic ? 'الفئة مطلوبة' : 'Category is required';
        }
        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = isArabic ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than 0';
        }
        if (!formData.description) {
            newErrors.description = isArabic ? 'الوصف مطلوب' : 'Description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const submitData = {
            ...formData,
            projectId,
            amount: parseFloat(formData.amount)
        };

        onSubmit(submitData);
        handleClose();
    };

    const handleClose = () => {
        setFormData({
            type: 'EXPENSE',
            category: '',
            amount: '',
            description: '',
            projectCostItemId: '',
            transactionDate: new Date(),
            paymentMethod: 'CASH',
            payerUserId: currentUser?.id,
            invoiceNumber: '',
            createBatch: false
        });
        setErrors({});
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <DialogTitle>
                    <Grid container justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {isArabic ? 'إضافة معاملة جديدة' : 'New Transaction'}
                        </Typography>
                        <IconButton onClick={handleClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Grid>
                </DialogTitle>

                <DialogContent dividers>
                    <Grid container spacing={3}>
                        {/* Transaction Type */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.type}>
                                <InputLabel>{isArabic ? 'نوع المعاملة' : 'Transaction Type'}</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                    label={isArabic ? 'نوع المعاملة' : 'Transaction Type'}
                                >
                                    <MenuItem value="INCOME">{isArabic ? 'دخل' : 'Income'}</MenuItem>
                                    <MenuItem value="EXPENSE">{isArabic ? 'مصروف' : 'Expense'}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Category */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.category}>
                                <InputLabel>{isArabic ? 'الفئة' : 'Category'}</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    label={isArabic ? 'الفئة' : 'Category'}
                                >
                                    {categories.map(group => [
                                        <MenuItem key={group.group} disabled>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {isArabic ? group.groupNameAr : group.groupNameEn}
                                            </Typography>
                                        </MenuItem>,
                                        ...group.items.map(item => (
                                            <MenuItem key={item.key} value={item.key} sx={{ pl: 4 }}>
                                                {isArabic ? item.ar : item.en}
                                            </MenuItem>
                                        ))
                                    ])}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Amount */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={isArabic ? 'المبلغ (جنيه)' : 'Amount (EGP)'}
                                type="number"
                                value={formData.amount}
                                onChange={(e) => handleChange('amount', e.target.value)}
                                error={!!errors.amount}
                                helperText={errors.amount}
                                inputProps={{ min: 0, step: 0.01 }}
                            />
                        </Grid>

                        {/* Transaction Date */}
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DateTimePicker
                                    label={isArabic ? 'تاريخ ووقت المعاملة' : 'Transaction Date & Time'}
                                    value={formData.transactionDate}
                                    onChange={(newValue) => handleChange('transactionDate', newValue)}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* Work Order / Cost Item */}
                        <Grid item xs={12}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid item xs>
                                    <FormControl fullWidth>
                                        <InputLabel>{isArabic ? 'بند التكلفة / أمر العمل' : 'Cost Item / Work Order'}</InputLabel>
                                        <Select
                                            value={formData.projectCostItemId}
                                            onChange={(e) => handleChange('projectCostItemId', e.target.value)}
                                            label={isArabic ? 'بند التكلفة / أمر العمل' : 'Cost Item / Work Order'}
                                        >
                                            <MenuItem value="">
                                                <em>{isArabic ? 'بدون ربط' : 'No Link'}</em>
                                            </MenuItem>
                                            {costItems.map(item => (
                                                <MenuItem key={item.id} value={item.id}>
                                                    {item.name} ({item.totalPaid}/{item.estimatedTotal || '∞'})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setShowCostItemModal(true)}
                                        size="large"
                                        sx={{ height: 56 }}
                                    >
                                        {isArabic ? 'جديد' : 'New'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={isArabic ? 'الوصف' : 'Description'}
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                            />
                        </Grid>

                        {/* Payment Method */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>{isArabic ? 'طريقة الدفع' : 'Payment Method'}</InputLabel>
                                <Select
                                    value={formData.paymentMethod}
                                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                    label={isArabic ? 'طريقة الدفع' : 'Payment Method'}
                                >
                                    <MenuItem value="CASH">{isArabic ? 'نقدي' : 'Cash'}</MenuItem>
                                    <MenuItem value="BANK_TRANSFER">{isArabic ? 'تحويل بنكي' : 'Bank Transfer'}</MenuItem>
                                    <MenuItem value="CHECK">{isArabic ? 'شيك' : 'Check'}</MenuItem>
                                    <MenuItem value="CREDIT_CARD">{isArabic ? 'بطاقة ائتمان' : 'Credit Card'}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Invoice Number */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={isArabic ? 'رقم الفاتورة' : 'Invoice Number'}
                                value={formData.invoiceNumber}
                                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                            />
                        </Grid>

                        {/* Payer Selection (Manager Only) */}
                        {isManager && (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>{isArabic ? 'الدافع' : 'Paid By'}</InputLabel>
                                    <Select
                                        value={formData.payerUserId}
                                        onChange={(e) => handleChange('payerUserId', e.target.value)}
                                        label={isArabic ? 'الدافع' : 'Paid By'}
                                    >
                                        {employees.map(emp => (
                                            <MenuItem key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.role})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {/* Inventory Purchase Toggle */}
                        {formData.type === 'EXPENSE' && (
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.createBatch}
                                            onChange={(e) => handleChange('createBatch', e.target.checked)}
                                        />
                                    }
                                    label={isArabic ? 'شراء مخزون (تأجيل الربح)' : 'Inventory Purchase (Defer Profit)'}
                                />
                                {formData.createBatch && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        {isArabic
                                            ? 'سيتم إنشاء دفعة مخزون. الربح سيتم احتسابه عند الاستخدام.'
                                            : 'A material batch will be created. Profit will be recognized upon usage.'}
                                    </Alert>
                                )}
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} color="inherit">
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {isArabic ? 'حفظ' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cost Item Creation Modal */}
            {showCostItemModal && (
                <CostItemModal
                    open={showCostItemModal}
                    onClose={() => setShowCostItemModal(false)}
                    projectId={projectId}
                    onSuccess={(newItem) => {
                        setCostItems(prev => [...prev, newItem]);
                        setFormData(prev => ({ ...prev, projectCostItemId: newItem.id }));
                        setShowCostItemModal(false);
                    }}
                />
            )}
        </>
    );
};

export default TransactionModal;
