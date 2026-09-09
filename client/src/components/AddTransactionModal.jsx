import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Wallet, Plus } from 'lucide-react';
import { projectsAPI, materialUsageAPI, transactionsAPI, projectCostItemsAPI, userAPI, workmenAPI, clientsAPI, suppliersAPI, materialsAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useFormat } from '../utils/format';
import AddWorkmanModal from './AddWorkmanModal';
import './Modal.css';
import CurrencyInput from './CurrencyInput';

export default function AddTransactionModal({ isOpen, onClose, onSubmit, initialData = null, user }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const { currency: fmtCurrency } = useFormat();

    // Helper to get local ISO string for datetime-local
    const getLocalDateTime = (date = new Date()) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    // Robust natural language formatter for user roles (prevents raw code key leakage)
    const formatUserRole = (role) => {
        if (!role) return '';
        const key = `teamManagement.roles.${role}`;
        const translated = t(key);
        if (translated && !translated.startsWith('teamManagement.roles.')) {
            return translated;
        }
        const roleMap = {
            'SUPER_ADMIN': isRTL ? 'مدير النظام' : 'Super Admin',
            'ADMIN': isRTL ? 'مدير الشركة' : 'Company Owner',
            'PROJECT_MANAGER': isRTL ? 'مدير مشروع' : 'Project Manager',
            'ENGINEER': isRTL ? 'مهندس موقع' : 'Site Engineer',
            'SITE_ENGINEER': isRTL ? 'مهندس موقع' : 'Site Engineer',
            'ACCOUNTANT': isRTL ? 'محاسب' : 'Accountant',
            'FINANCIAL_MANAGER': isRTL ? 'مدير مالي' : 'Financial Manager',
            'GENERAL_MANAGER': isRTL ? 'مدير عام' : 'General Manager',
            'VIEWER': isRTL ? 'مشاهد' : 'Viewer',
            'CLIENT': isRTL ? 'عميل' : 'Client',
            'AUDITOR': isRTL ? 'مراجع حسابات' : 'Auditor',
            'HR': isRTL ? 'موارد بشرية' : 'HR Manager',
            'PROCUREMENT': isRTL ? 'مسؤول المشتريات' : 'Procurement Officer',
            'STOREKEEPER': isRTL ? 'أمين مخزن' : 'Storekeeper'
        };
        return roleMap[role] || role;
    };

    // Robust natural language formatter for workman trades
    const formatTrade = (trade) => {
        if (!trade) return '';
        const key = `labor.trades.${trade}`;
        const translated = t(key);
        if (translated && !translated.startsWith('labor.trades.')) return translated;
        return trade;
    };

    // Modes: EXPENSE (default), INCOME, USAGE, TRANSFER
    const [mode, setMode] = useState('EXPENSE');

    // Data Loading
    const [projects, setProjects] = useState([]);
    const [materialBatches, setMaterialBatches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]); // Company employees for payer selection
    const [costItems, setCostItems] = useState([]); // Project cost items (Work Orders)
    const [workmen, setWorkmen] = useState([]); // Site workmen for labor payments
    const [clients, setClients] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [existingCostCenters, setExistingCostCenters] = useState([]);
    const [existingTransactionFroms, setExistingTransactionFroms] = useState([]);
    const [existingTransactionTos, setExistingTransactionTos] = useState([]);
    const [existingPhysicalAccounts, setExistingPhysicalAccounts] = useState([]);

    const [customInputs, setCustomInputs] = useState({
        costCenter: false,
        transactionTo: false,
        transactionFrom: false,
        physicalAccount: false
    });


    // Core State
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    // Expense Mode Specific
    const [isStockPurchase, setIsStockPurchase] = useState(false);

    // Usage Mode Specific
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        transactionDate: getLocalDateTime(), // Format: YYYY-MM-DDTHH:mm (Local)
        category: '',

        // Stock/Expense
        materialId: '',
        itemName: '',
        unit: 'TON',
        transactionFrom: '',
        transactionTo: '',
        paymentMethod: 'CUSTODY_WALLET',
        unitPrice: '',
        quantity: '',
        costCenter: '',
        payerUserId: user?.id || '', // Who paid for this transaction
        projectCostItemId: '', // The linked Work Order
        workmanId: '', // The workman receiving payment (if labor)

        // Income
        invoiceNumber: '',
        physicalAccount: '',

        // Transfer Custody
        toEngineerId: '',
    });

    // V1.2 UI Logic: New vs Existing Item Switch
    const [costItemMode, setCostItemMode] = useState('NEW'); // NEW | EXISTING

    const [errors, setErrors] = useState({});

    // Switch tabs (Expense / Income / Usage / Transfer) AND wipe per-tab
    // form state so the next tab opens clean. Without this, fields filled
    // in for an Expense leak into an Income or Usage entry — confusing and
    // dangerous for accounting accuracy. Skipped when we're in edit mode
    // (initialData) since edit-mode is single-tab anyway.
    const switchMode = (next) => {
        if (next === mode) return;
        if (!initialData) {
            setFormData({
                amount: '',
                description: '',
                transactionDate: getLocalDateTime(),
                category: '',
                itemName: '',
                unit: 'TON',
                transactionFrom: '',
                transactionTo: '',
                paymentMethod: 'CUSTODY_WALLET',
                unitPrice: '',
                quantity: '',
                costCenter: '',
                payerUserId: user?.id || '',
                projectCostItemId: '',
                workmanId: '',
                invoiceNumber: '',
                physicalAccount: '',
                toEngineerId: ''
            });
            setErrors({});
        }
        setMode(next);
    };
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);

    // Dynamic Creation State
    const [isWorkmanModalOpen, setIsWorkmanModalOpen] = useState(false);

    // Initial Load & Edit Mode Setup
    useEffect(() => {
        if (isOpen) {
            loadProjects();
            loadCategories();
            loadUsers(); // Load company employees for payer selection
            loadWorkforce();
            loadClients();
            loadSuppliers();
            loadMaterials();
            loadCostCenters();
            if (initialData) {
                // Populate for Editing
                setMode(initialData.type || 'EXPENSE');
                // Handle nested project object (Prisma default) or flat ID
                const projId = initialData.projectId || initialData.project?.id || '';
                setSelectedProjectId(projId);

                // If the project list is loaded, we can set selectedProject
                // If not, handleProjectChange logic might be needed or we rely on just ID for submission
                // But calculateSplit and others need selectedProject object.
                // We will try to find it in 'projects' state, but 'projects' might be empty if this runs before loadProjects completes.
                // However, loadProjects() is called above. Since it is async, 'projects' won't be ready immediately in this render.
                // The 'projects' state dependency will solve this if we add a separate effect or logic.

                // Attempt to parse description for extended fields if they follow "Desc | Qty Unit @ Price" pattern
                let parsedDesc = initialData.description || '';
                let parsedQty = '';
                let parsedUnit = 'TON';
                let parsedPrice = '';

                if (initialData.description && initialData.description.includes('|')) {
                    const parts = initialData.description.split('|');
                    if (parts.length > 1) {
                        const descPart = parts[0].trim();
                        const statsPart = parts[1].trim(); // "2.98 TON @ 0"

                        parsedDesc = descPart;

                        // Regex to match "Qty Unit @ Price"
                        // Examples: "50 BAG @ 100", "2.98 @ 0", "10 @ 50"
                        // Since unit is optional (sometimes just digit + space + @), we need to be careful.
                        // Match: Start -> Number -> Optional Space -> Optional String -> Space -> @ -> Space -> Number
                        const match = statsPart.match(/^([\d\.]+)\s*(\w*)\s*@\s*([\d\.]+)$/);

                        if (match) {
                            parsedQty = match[1];
                            parsedUnit = match[2] || 'TON'; // Default if missing
                            // If unit matches a number or is empty, maybe fallback?
                            // But \w* matches alphanumeric.
                            parsedPrice = match[3];
                        }
                    }
                }

                setFormData({
                    amount: initialData.amount || '',
                    description: parsedDesc,
                    transactionDate: initialData.transactionDate ? getLocalDateTime(new Date(initialData.transactionDate)) : getLocalDateTime(),
                    category: initialData.category || '',
                    itemName: parsedDesc, // Use description as itemName for stock mode too
                    unit: parsedUnit,
                    transactionFrom: initialData.transactionFrom || '',
                    transactionTo: initialData.transactionTo || '',
                    paymentMethod: initialData.paymentMethod || 'CUSTODY_WALLET',
                    unitPrice: parsedPrice,
                    quantity: parsedQty,
                    costCenter: initialData.costCenter || '',
                    physicalAccount: initialData.physicalAccount || '',
                    invoiceNumber: initialData.invoiceNumber || '',
                    payerUserId: initialData.payerUserId || '',
                    projectCostItemId: initialData.projectCostItemId || '',
                    toEngineerId: ''
                });

            } else {
                // Reset for Create
                setMode('EXPENSE');
                setSelectedProjectId('');
                setSelectedProject(null);
                setIsStockPurchase(false);
                setMaterialBatches([]);
                setSelectedBatchId('');
                setSelectedBatch(null);
                setFormData({
                    amount: '',
                    description: '',
                    transactionDate: getLocalDateTime(),
                    category: '',
                    itemName: '',
                    unit: 'TON',
                    invoiceNumber: '',
                    transactionFrom: '',
                    transactionTo: '',
                    paymentMethod: 'CUSTODY_WALLET',
                    unitPrice: '',
                    quantity: '',
                    costCenter: '',
                    physicalAccount: '',
                    payerUserId: user?.id || '',
                    projectCostItemId: '',
                    toEngineerId: ''
                });
                setCostItemMode('NEW');
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    // Load Batches in USAGE mode or on open
    useEffect(() => {
        if (mode === 'USAGE' || isOpen) {
            loadBatches(selectedProjectId || undefined);
        }
    }, [mode, selectedProjectId, isOpen]);

    const loadProjects = async () => {
        try {
            const res = await projectsAPI.getAll();
            setProjects(res.data.data || []);
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    };

    const loadBatches = async (projectId) => {
        try {
            const params = { status: 'AVAILABLE,PARTIALLY_USED' };
            if (projectId) params.projectId = projectId;
            const res = await materialUsageAPI.getBatches(params);
            setMaterialBatches(res.data.data || []);
        } catch (error) {
            console.error("Failed to load batches", error);
        }
    };

    const loadCostItems = async (projectId) => {
        try {
            const res = await projectCostItemsAPI.getByProject(projectId);
            setCostItems(res.data.data || []);
        } catch (error) {
            console.error("Failed to load cost items", error);
        }
    };

    const loadCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const res = await fetch(`${API_URL}/categories?grouped=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error("Failed to load categories", error);
        }
    };

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const res = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data || []);
            }
        } catch (error) {
            console.error("Failed to load users", error);
        }
    };

    const loadWorkforce = async () => {
        try {
            const res = await workmenAPI.getAll();
            setWorkmen(res.data.data || []);
        } catch (error) {
            console.error("Failed to load workforce", error);
        }
    };

    const loadClients = async () => {
        try {
            const res = await clientsAPI.getAll();
            setClients(res.data.data || []);
        } catch (e) { console.error("Failed to load clients", e); }
    };

    const loadSuppliers = async () => {
        try {
            const res = await suppliersAPI.getAll();
            setSuppliers(res.data.data || []);
        } catch (e) { console.error("Failed to load suppliers", e); }
    };

    const loadMaterials = async () => {
        try {
            const res = await materialsAPI.getAll();
            setRawMaterials(res.data.data || []);
        } catch (e) { console.error("Failed to load materials", e); }
    };

    const loadCostCenters = async () => {
        try {
            const res = await transactionsAPI.getCostCenters();
            if (res.data.data) {
                setExistingCostCenters(res.data.data.costCenters || []);
                setExistingTransactionFroms(res.data.data.transactionFroms || []);
                setExistingTransactionTos(res.data.data.transactionTos || []);
                setExistingPhysicalAccounts(res.data.data.physicalAccounts || []);
            }
        } catch (e) { console.error("Failed to load options", e); }
    };

    const handleProjectChange = (e) => {
        const pId = e.target.value;
        setSelectedProjectId(pId);
        const proj = projects.find(p => p.id === pId);
        setSelectedProject(proj || null);
        if (pId) {
            loadCostItems(pId);
        } else {
            setCostItems([]);
        }
        if (mode === 'USAGE') {
            loadBatches(pId || undefined);
            if (selectedBatch && selectedBatch.projectId !== pId) {
                setSelectedBatchId('');
                setSelectedBatch(null);
            }
        }
    };

    const handleBatchChange = (e) => {
        const bId = e.target.value;
        setSelectedBatchId(bId);
        const batch = materialBatches.find(b => b.id === bId);
        setSelectedBatch(batch || null);
        if (batch) {
            if (batch.projectId && batch.projectId !== selectedProjectId) {
                setSelectedProjectId(batch.projectId);
                const proj = projects.find(p => p.id === batch.projectId) || batch.project;
                setSelectedProject(proj || null);
                loadCostItems(batch.projectId);
            }
            setFormData(prev => ({
                ...prev,
                amount: prev.amount || (batch.remainingValue ? batch.remainingValue.toString() : ''),
                category: prev.category || 'MATERIALS',
                description: prev.description || (isRTL ? `استهلاك من دفعة: ${batch.description}` : `Usage from batch: ${batch.description}`)
            }));
            if (errors.batchId) setErrors(prev => ({ ...prev, batchId: '' }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-calculate amount
        if (name === 'quantity' || name === 'unitPrice') {
            const qty = name === 'quantity' ? parseFloat(value) : parseFloat(formData.quantity);
            const price = name === 'unitPrice' ? parseFloat(value) : parseFloat(formData.unitPrice);
            if (!isNaN(qty) && !isNaN(price)) {
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    amount: (qty * price).toString()
                }));
            }
        }

        if (name === 'projectCostItemId' && value) {
            const selectedItem = costItems.find(item => item.id === value);
            if (selectedItem && selectedItem.category) {
                setFormData(prev => ({ ...prev, category: selectedItem.category, [name]: value }));
            }
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Sync selectedProject when projects load or selection changes
    useEffect(() => {
        if (selectedProjectId && projects.length > 0) {
            const proj = projects.find(p => p.id === selectedProjectId);
            setSelectedProject(proj || null);
            loadCostItems(selectedProjectId);
        }
    }, [selectedProjectId, projects]);

    const validate = () => {
        const newErrors = {};
        if (mode !== 'TRANSFER' && !selectedProjectId) newErrors.projectId = t('common.required');

        if (mode === 'EXPENSE') {
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (costItemMode === 'MATERIAL') {
                if (!formData.materialId) newErrors.materialId = t('common.required');
            } else if (costItemMode === 'EXISTING') {
                if (!formData.projectCostItemId) newErrors.projectCostItemId = t('common.required');
            } else {
                if (!formData.category) newErrors.category = t('common.required');
                if (!formData.itemName) newErrors.itemName = t('common.required');
            }
        }
        else if (mode === 'INCOME') {
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
        }
        else if (mode === 'USAGE') {
            if (!selectedBatchId) newErrors.batchId = t('common.required');
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (selectedBatch && Number(formData.amount) > Number(selectedBatch.remainingValue)) {
                newErrors.amount = `${t('finance.exceedsRemaining')} (${selectedBatch.remainingValue})`;
            }
            if (!formData.category) newErrors.category = t('common.required');
        }
        else if (mode === 'TRANSFER') {
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (!formData.toEngineerId) newErrors.toEngineerId = t('common.required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            let payload = {};
            // Shared payload construction
            if (mode === 'EXPENSE') {
                const isMaterial = costItemMode === 'MATERIAL' || isStockPurchase;
                const chosenMaterial = isMaterial ? rawMaterials.find(m => m.id === formData.materialId) : null;
                const resolvedCategory = isMaterial ? 'MATERIALS' : (formData.category || 'MATERIALS');
                const resolvedItemName = isMaterial
                    ? (formData.itemName || (chosenMaterial ? (isRTL ? (chosenMaterial.nameAr || chosenMaterial.name) : chosenMaterial.name) : 'خامة مخزنية'))
                    : (costItemMode === 'NEW' ? formData.itemName : undefined);

                payload = {
                    type: 'EXPENSE',
                    category: resolvedCategory,
                    amount: Number(formData.amount),
                    projectId: selectedProjectId,
                    projectCostItemId: costItemMode === 'EXISTING' ? formData.projectCostItemId : undefined,
                    payerUserId: formData.payerUserId || user?.id,
                    workmanId: formData.workmanId || undefined,
                    createBatch: isMaterial,
                    materialId: (isMaterial && formData.materialId) ? formData.materialId : undefined,
                    description: formData.description?.trim() || resolvedItemName || t(`finance.categories.${resolvedCategory?.toLowerCase()}`) || resolvedCategory || 'Site Expense',
                    transactionDate: formData.transactionDate,
                    paymentMethod: formData.paymentMethod,
                    itemName: resolvedItemName,
                    unit: isMaterial ? (formData.unit || chosenMaterial?.unit) : (costItemMode === 'NEW' ? formData.unit : undefined),
                    unitPrice: isMaterial ? (formData.unitPrice ? Number(formData.unitPrice) : (chosenMaterial?.unitPrice ? Number(chosenMaterial.unitPrice) : undefined)) : (costItemMode === 'NEW' && formData.unitPrice ? Number(formData.unitPrice) : undefined),
                    quantity: formData.quantity ? Number(formData.quantity) : undefined,
                    costCenter: formData.costCenter || (isMaterial ? (selectedProject ? (isRTL ? `موقع ${selectedProject.name}` : `${selectedProject.name} Site`) : (isRTL ? 'المخزن الرئيسي' : 'Main Warehouse')) : undefined),
                    transactionTo: formData.transactionTo || undefined,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'INCOME') {
                payload = {
                    type: 'INCOME',
                    category: 'PAYMENT',
                    amount: Number(formData.amount),
                    projectId: selectedProjectId,
                    projectCostItemId: formData.projectCostItemId || undefined,
                    payerUserId: formData.payerUserId || user?.id,
                    description: formData.description?.trim() || t('finance.categories.payment') || 'Client Payment',
                    transactionDate: formData.transactionDate,
                    clientId: selectedProject?.client?.id,
                    paymentMethod: formData.paymentMethod,
                    physicalAccount: formData.physicalAccount || undefined,
                    transactionFrom: formData.transactionFrom || undefined,
                    costCenter: formData.costCenter || undefined,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'USAGE') {
                payload = {
                    materialBatchId: selectedBatchId,
                    valueConsumed: Number(formData.amount),
                    projectId: selectedProjectId,
                    description: formData.description?.trim() || t('inventory.recordUsage') || 'Material Usage',
                    category: formData.category
                };
            }

            else if (mode === 'TRANSFER') {
                payload = {
                    amount: Number(formData.amount),
                    fromEngineerId: user?.id,
                    toEngineerId: formData.toEngineerId,
                    description: formData.description?.trim() || 'Custody Transfer'
                };
            }

            if (initialData && initialData.id && mode !== 'USAGE' && mode !== 'TRANSFER') {
                // UPDATE MODE
                await transactionsAPI.update(initialData.id, payload);
            } else {
                // CREATE MODE
                if (mode === 'USAGE') {
                    await materialUsageAPI.recordUsageV2(payload);
                } else if (mode === 'TRANSFER') {
                    await transactionsAPI.transferCustody(payload);
                } else {
                    // Both Income and Expense use V2 logic for profit splitting
                    await transactionsAPI.createV2(payload);
                }
            }

            if (onSubmit) onSubmit();
            onClose();
        } catch (error) {
            console.error("Submission Failed", error);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: "Failed to submit transaction: " + (error.response?.data?.message || error.message) });
        } finally {
            setLoading(false);
        }
    };

    const calculateSplit = () => {
        if (!formData.amount || !selectedProject || selectedProject.revenueModel !== 'EXECUTION_COST_PLUS') return null;
        const total = Number(formData.amount);
        const feePercent = Number(selectedProject.managementFeePercent) || 0;
        const officeProfit = (total * feePercent) / 100;
        const opsFund = total - officeProfit;
        return { opsFund, officeProfit, feePercent };
    };

    const renderDropdownWithCustom = (name, label, options, placeholder) => {
        const isCustom = customInputs[name];

        const handleSelectChange = (e) => {
            if (e.target.value === '__NEW__') {
                setCustomInputs(prev => ({ ...prev, [name]: true }));
                setFormData(prev => ({ ...prev, [name]: '' }));
            } else {
                handleChange(e);
            }
        };

        const handleCancelCustom = () => {
            setCustomInputs(prev => ({ ...prev, [name]: false }));
            setFormData(prev => ({ ...prev, [name]: '' }));
        };

        return (
            <div className="form-group">
                <label>{label}</label>
                {isCustom ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            name={name}
                            value={formData[name]}
                            onChange={handleChange}
                            placeholder={placeholder}
                            style={{ flex: 1 }}
                        />
                        <button type="button" onClick={handleCancelCustom} className="btn-icon" style={{ padding: '0 8px', color: '#ef4444', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <select name={name} value={formData[name]} onChange={handleSelectChange}>
                        <option value="">-- {t('common.select') || 'Select'} --</option>
                        {options.map((opt, i) => (
                            <option key={`${name}-${i}`} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                        <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>+ {t('common.add_new') || 'Add New'}</option>
                    </select>
                )}
            </div>
        );
    };

    const incomeSplit = calculateSplit();

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>

                {/* Header */}
                <div className="modal-header">
                    <h2>
                        {initialData ? t('common.edit') : ''} {mode === 'EXPENSE' ? t('finance.recordExpense') : mode === 'INCOME' ? t('finance.recordIncome') : t('finance.consumeMaterial')}
                    </h2>

                    <div className="flex gap-sm items-center">
                        {mode === 'EXPENSE' && (
                            <div className="badge badge-warning flex gap-xs items-center">
                                <Wallet size={14} />
                                <span style={{ fontWeight: 'bold' }}>{fmtCurrency(user?.currentCustodyBalance || 0)}</span>
                            </div>
                        )}
                        <button className="modal-close" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Styled Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    <button
                        className={`tab-btn ${mode === 'EXPENSE' ? 'active' : ''}`}
                        onClick={() => switchMode('EXPENSE')}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            borderBottom: mode === 'EXPENSE' ? '3px solid var(--color-primary)' : '3px solid transparent',
                            color: mode === 'EXPENSE' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t('finance.expense')}
                    </button>
                    <button
                        className={`tab-btn ${mode === 'INCOME' ? 'active' : ''}`}
                        onClick={() => switchMode('INCOME')}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            borderBottom: mode === 'INCOME' ? '3px solid var(--color-primary)' : '3px solid transparent',
                            color: mode === 'INCOME' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t('finance.income')}
                    </button>
                    <button
                        className={`tab-btn ${mode === 'USAGE' ? 'active' : ''}`}
                        onClick={() => switchMode('USAGE')}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            borderBottom: mode === 'USAGE' ? '3px solid var(--color-primary)' : '3px solid transparent',
                            color: mode === 'USAGE' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t('finance.usage')}
                    </button>
                    <button
                        className={`tab-btn ${mode === 'TRANSFER' ? 'active' : ''}`}
                        onClick={() => switchMode('TRANSFER')}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            borderBottom: mode === 'TRANSFER' ? '3px solid var(--color-primary)' : '3px solid transparent',
                            color: mode === 'TRANSFER' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t('finance.transferCustody') || 'تحويل عهدة'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 'var(--spacing-md)',
                        alignItems: 'end',
                        marginBottom: 'var(--spacing-lg)',
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                    }}>
                        {/* Project Selection */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                {t('nav.projects')} {mode !== 'TRANSFER' ? <span className="required">*</span> : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>({isRTL ? 'اختياري' : 'Optional'})</span>}
                            </label>
                            <select
                                value={selectedProjectId}
                                onChange={handleProjectChange}
                                className={errors.projectId ? 'error' : ''}
                                style={{ fontSize: '1rem', padding: '10px' }}
                            >
                                <option value="">-- {mode === 'TRANSFER' ? (isRTL ? 'بدون ربط بمشروع محدد' : 'General / No specific project') : t('finance.selectProject')} --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.projectId && <span className="error-message">{errors.projectId}</span>}
                        </div>

                        {/* Compact Transaction Date & Time */}
                        <div style={{ width: '180px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '2px',
                                padding: '0 2px'
                            }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {t('common.date') || 'التاريخ'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, transactionDate: getLocalDateTime() }))}
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        opacity: 0.8
                                    }}
                                >
                                    {t('common.now') || 'الآن'}
                                </button>
                            </div>
                            <input
                                type="datetime-local"
                                name="transactionDate"
                                value={formData.transactionDate}
                                onChange={handleChange}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '6px',
                                    width: '100%',
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '5px'
                                }}
                            />
                        </div>

                        {/* Transaction Payer - Inside primary card as per user image */}
                        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'PROJECT_MANAGER') && (mode === 'EXPENSE' || mode === 'INCOME') && (
                            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0, marginTop: 'var(--spacing-sm)' }}>
                                <label style={{ fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>{t('finance.paidBy') || 'مين اللي دفع؟'}</label>
                                <select
                                    name="payerUserId"
                                    value={formData.payerUserId}
                                    onChange={handleChange}
                                    style={{ fontSize: '1rem', padding: '10px', width: '100%' }}
                                >
                                    <option value="">-- {t('finance.selectPayer')} --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({formatUserRole(u.role)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* --- MODE A: EXPENSE --- */}
                    {
                        mode === 'EXPENSE' && (
                            <>
                                <div className="form-section">
                                    <h3 className="section-title">{t('projects.modal.sections.financial')}</h3>
                                    <div className="form-grid">
                                        {/* 3-Way Item Type Toggle: New Cost Item vs Existing Project Band vs Registered Raw Material */}
                                        <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 'var(--spacing-sm)' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                {isRTL ? 'نوع بند المصروف / الشراء:' : 'Expense / Purchase Item Type:'}
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.3fr', gap: '6px', padding: '4px', background: 'var(--bg-tertiary, rgba(0,0,0,0.05))', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${costItemMode === 'NEW' ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => {
                                                        setCostItemMode('NEW');
                                                        setIsStockPurchase(false);
                                                        setFormData(prev => ({ ...prev, projectCostItemId: '', materialId: '' }));
                                                    }}
                                                    style={{ borderRadius: '7px', fontSize: '0.85rem', fontWeight: costItemMode === 'NEW' ? '700' : '500' }}
                                                >
                                                    {t('finance.newCostItem', 'بند جديد')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${costItemMode === 'EXISTING' ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => {
                                                        setCostItemMode('EXISTING');
                                                        setIsStockPurchase(false);
                                                        setFormData(prev => ({ ...prev, materialId: '' }));
                                                    }}
                                                    style={{ borderRadius: '7px', fontSize: '0.85rem', fontWeight: costItemMode === 'EXISTING' ? '700' : '500' }}
                                                    disabled={!selectedProjectId}
                                                >
                                                    {t('finance.existingCostItem', 'بند مقايسة مسجل')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${costItemMode === 'MATERIAL' ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => {
                                                        setCostItemMode('MATERIAL');
                                                        setIsStockPurchase(true);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            projectCostItemId: '',
                                                            category: 'MATERIALS',
                                                            costCenter: prev.costCenter || (selectedProject ? (isRTL ? `موقع ${selectedProject.name}` : `${selectedProject.name} Site`) : (isRTL ? 'المخزن الرئيسي' : 'Main Warehouse'))
                                                        }));
                                                    }}
                                                    style={{ borderRadius: '7px', fontSize: '0.85rem', fontWeight: costItemMode === 'MATERIAL' ? '700' : '500' }}
                                                >
                                                    📦 {isRTL ? 'شراء خامة للمخزن' : 'Buy Material for Stock'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Option 1: Registered Raw Material Selector */}
                                        {costItemMode === 'MATERIAL' && (
                                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                <label>{isRTL ? 'اختر الخامة المسجلة لشحن رصيدها المخزني' : 'Select Registered Material to Recharge'} <span className="required">*</span></label>
                                                <select
                                                    name="materialId"
                                                    value={formData.materialId || ''}
                                                    onChange={(e) => {
                                                        const matId = e.target.value;
                                                        const found = rawMaterials.find(m => m.id === matId);
                                                        setFormData(prev => {
                                                            const uPrice = found?.unitPrice ? found.unitPrice.toString() : prev.unitPrice;
                                                            const qty = prev.quantity ? parseFloat(prev.quantity) : 0;
                                                            const amt = (qty > 0 && uPrice) ? (qty * parseFloat(uPrice)).toString() : prev.amount;
                                                            return {
                                                                ...prev,
                                                                materialId: matId,
                                                                itemName: found ? (isRTL ? (found.nameAr || found.name) : found.name) : '',
                                                                category: 'MATERIALS',
                                                                unit: found?.unit || prev.unit,
                                                                unitPrice: uPrice,
                                                                amount: amt,
                                                                costCenter: prev.costCenter || (selectedProject ? (isRTL ? `مخزن مشروع ${selectedProject.name}` : `${selectedProject.name} Site Warehouse`) : (isRTL ? 'المخزن الرئيسي' : 'Main Warehouse'))
                                                            };
                                                        });
                                                        if (errors.materialId) setErrors(prev => ({ ...prev, materialId: '' }));
                                                    }}
                                                    className={errors.materialId ? 'error' : ''}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600' }}
                                                >
                                                    <option value="">-- {isRTL ? 'اختر خامة من المخزن لتزويد رصيدها' : 'Select Material to Recharge Stock'} --</option>
                                                    {rawMaterials.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {isRTL ? (m.nameAr || m.name) : m.name} ({m.unit}) — {isRTL ? 'الرصيد الحالي:' : 'Current Stock:'} {m.stockLevel} {m.unit} {m.unitPrice ? `(${m.unitPrice} EGP)` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.materialId && <span className="error-message" style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{errors.materialId}</span>}
                                            </div>
                                        )}

                                        {/* Option 2: Band Selection (If Existing Band) */}
                                        {costItemMode === 'EXISTING' && (
                                            <>
                                                <div className="form-group">
                                                    <label>{t('finance.existingCostItem')} <span className="required">*</span></label>
                                                    <select
                                                        name="projectCostItemId"
                                                        value={formData.projectCostItemId}
                                                        onChange={handleChange}
                                                        className={errors.projectCostItemId ? 'error' : ''}
                                                    >
                                                        <option value="">-- {t('finance.selectBand')} --</option>
                                                        {costItems.map(item => (
                                                            <option key={item.id} value={item.id}>
                                                                {item.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('finance.category')}</label>
                                                    <select
                                                        name="category"
                                                        value={formData.category}
                                                        onChange={handleChange}
                                                        disabled // Auto-filled from Band
                                                    >
                                                        <option value="">-- {t('finance.autoFilled')} --</option>
                                                        {categories.flatMap(g => g.items).map(item => (
                                                            <option key={item.key} value={item.key}>
                                                                {isRTL ? item.ar : (item.en || item.ar)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* Option 3: Category & Item Name (If New Item) */}
                                        {costItemMode === 'NEW' && (
                                            <>
                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                    <label>{t('finance.category')} <span className="required">*</span></label>
                                                    <select
                                                        name="category"
                                                        value={formData.category}
                                                        onChange={handleChange}
                                                        className={errors.category ? 'error' : ''}
                                                    >
                                                        <option value="">-- {t('finance.selectCategory')} --</option>
                                                        {categories.map(group => (
                                                            <optgroup key={group.group} label={isRTL ? group.groupNameAr : (group.groupNameEn || group.groupNameAr)}>
                                                                {group.items.map(item => (
                                                                    <option key={item.key} value={item.key}>
                                                                        {isRTL ? item.ar : (item.en || item.ar)}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                    <label>{t('finance.itemName')} ({t('finance.newCostItem')}) <span className="required">*</span></label>
                                                    <input
                                                        name="itemName"
                                                        value={formData.itemName}
                                                        onChange={handleChange}
                                                        placeholder={t('finance.itemNamePlaceholder')}
                                                        className={errors.itemName ? 'error' : ''}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {renderDropdownWithCustom(
                                            "costCenter",
                                            t('finance.costCenter'),
                                            existingCostCenters.map(cc => ({ value: cc, label: cc })),
                                            "e.g. Block A"
                                        )}

                                        <div className="form-group">
                                            <label>{t('finance.paymentMethod')}</label>
                                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                                                <option value="CUSTODY_WALLET">{t('finance.methods.custodyWallet')}</option>
                                                <option value="CASH">{t('finance.methods.cash')}</option>
                                                <option value="CHECK">{t('finance.methods.check')}</option>
                                                <option value="BANK_TRANSFER">{t('finance.methods.bankTransfer')}</option>
                                                <option value="CREDIT_CARD">{t('finance.methods.creditCard')}</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>{t('finance.transactionTo')}</label>
                                            <select
                                                name="transactionTo"
                                                value={formData.transactionTo}
                                                onChange={handleChange}
                                            >
                                                <option value="">-- {t('common.select') || 'Select'} --</option>
                                                {[
                                                    ...users.map(u => ({ value: u.name, label: `${u.name} (${formatUserRole(u.role)})` })),
                                                    ...workmen.map(w => ({ value: w.name, label: `${w.name} (${formatTrade(w.trade)})` })),
                                                    ...clients.map(c => ({ value: c.name, label: `${c.name} (${t('clients.title')})` })),
                                                    ...suppliers.map(s => ({ value: s.name, label: `${s.name} (${t('suppliers.title')})` })),
                                                    ...existingTransactionTos.map(tt => ({ value: tt, label: tt }))
                                                ].reduce((acc, current) => {
                                                    const x = acc.find(item => item.value === current.value);
                                                    if (!x) { return acc.concat([current]); } else { return acc; }
                                                }, []).map((opt, i) => (
                                                    <option key={`txTo-${i}`} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Workman Selection (Only for Labor Categories) */}
                                        {(() => {
                                            const selectedCat = categories.flatMap(g => g.items).find(i => i.key === formData.category);
                                            if (selectedCat?.group === 'LABOR') {
                                                return (
                                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                        <label>{t('labor.title')} <span className="required">*</span></label>
                                                        <div className="flex gap-sm">
                                                            <select
                                                                name="workmanId"
                                                                value={formData.workmanId}
                                                                onChange={handleChange}
                                                                className={errors.workmanId ? 'error' : ''}
                                                                style={{ flex: 1 }}
                                                            >
                                                                <option value="">-- {t('labor.selectWorkman') || 'اختر الفني / الصنايعي'} --</option>
                                                                {workmen.map(w => (
                                                                    <option key={w.id} value={w.id}>
                                                                        {w.name} ({t(`labor.trades.${w.trade}`)})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                title={t('labor.newWorkman')}
                                                                onClick={() => setIsWorkmanModalOpen(true)}
                                                                style={{ padding: '0 12px' }}
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </div>
                                                        {errors.workmanId && <span className="error-message">{errors.workmanId}</span>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">{t('finance.detailsAndAmount') || 'التفاصيل والمبلغ'}</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>{t('finance.quantity')}</label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.uom')}</label>
                                            <select name="unit" value={formData.unit} onChange={handleChange}>
                                                <option value="TON">{t('finance.uom_options.ton')}</option>
                                                <option value="KG">{t('finance.uom_options.kg')}</option>
                                                <option value="M3">{t('finance.uom_options.m3')}</option>
                                                <option value="M2">{t('finance.uom_options.m2')}</option>
                                                <option value="M">{t('finance.uom_options.m')}</option>
                                                <option value="PIECE">{t('finance.uom_options.piece')}</option>
                                                <option value="LITER">{t('finance.uom_options.liter')}</option>
                                                <option value="BAG">{t('finance.uom_options.bag')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.unitPrice')}</label>
                                            <input
                                                type="number"
                                                name="unitPrice"
                                                value={formData.unitPrice}
                                                onChange={handleChange}
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.amount')} (EGP) <span className="required">*</span></label>
                                            <CurrencyInput
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                className={errors.amount ? 'error' : ''}
                                                style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                            />
                                            {errors.amount && <span className="error-message">{errors.amount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* --- MODE B: INCOME --- */}
                    {
                        mode === 'INCOME' && (
                            <>
                                <div className="form-section">
                                    <div className="form-grid">
                                        {renderDropdownWithCustom(
                                            "transactionFrom",
                                            t('finance.transactionFrom'),
                                            [
                                                ...users.map(u => ({ value: u.name, label: `${u.name} (${formatUserRole(u.role)})` })),
                                                ...clients.map(c => ({ value: c.name, label: `${c.name} (${t('clients.title')})` })),
                                                ...existingTransactionFroms.map(tf => ({ value: tf, label: tf }))
                                            ].reduce((acc, current) => {
                                                const x = acc.find(item => item.value === current.value);
                                                if (!x) { return acc.concat([current]); } else { return acc; }
                                            }, []),
                                            t('finance.clientName')
                                        )}
                                        <div className="form-group">
                                            <label>{t('finance.paymentMethod')}</label>
                                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                                                <option value="CASH">{t('finance.methods.cash')}</option>
                                                <option value="CHECK">{t('finance.methods.check')}</option>
                                                <option value="BANK_TRANSFER">{t('finance.methods.bankTransfer')}</option>
                                                <option value="CREDIT_CARD">{t('finance.methods.creditCard')}</option>
                                            </select>
                                        </div>
                                        {renderDropdownWithCustom(
                                            "physicalAccount",
                                            `${t('finance.physicalAccount')} (Safe)`,
                                            existingPhysicalAccounts.map(pa => ({ value: pa, label: pa })),
                                            "e.g. Main Safe"
                                        )}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <div className="form-group">
                                        <label>{t('finance.amountReceived')} (EGP) <span className="required">*</span></label>
                                        <CurrencyInput
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className={errors.amount ? 'error' : ''}
                                            style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#22c55e' }}
                                        />
                                        {errors.amount && <span className="error-message">{errors.amount}</span>}
                                    </div>

                                    {incomeSplit && (
                                        <div className="splitter-container mb-md" style={{ marginTop: '16px' }}>
                                            <div style={{ display: 'flex', height: '32px', borderRadius: '8px', overflow: 'hidden', fontSize: '12px', color: 'white', fontWeight: 'bold' }}>
                                                <div style={{ width: `${100 - incomeSplit.feePercent}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {t('finance.ops')}: {incomeSplit.opsFund.toFixed(0)}
                                                </div>
                                                <div style={{ width: `${incomeSplit.feePercent}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {t('dashboard.profit')}: {incomeSplit.officeProfit.toFixed(0)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )
                    }

                    {/* --- MODE C: USAGE --- */}
                    {
                        mode === 'USAGE' && (
                            <>
                                <div className="form-section">
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ marginBottom: 0, fontWeight: 600 }}>
                                                {t('finance.sourceBatch', 'دفعة المواد المصدرية')} <span className="required">*</span>
                                            </label>
                                            {selectedProjectId && (
                                                <button
                                                    type="button"
                                                    onClick={() => loadBatches(undefined)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    {isRTL ? 'عرض كل الدفعات لجميع المشاريع' : 'Show batches across all projects'}
                                                </button>
                                            )}
                                        </div>
                                        <select
                                            value={selectedBatchId}
                                            onChange={handleBatchChange}
                                            className={errors.batchId ? 'error' : ''}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '500' }}
                                        >
                                            <option value="">
                                                -- {materialBatches.length > 0 
                                                    ? (isRTL ? `اختر دفعة المواد المصدر (${materialBatches.length} دفعة متاحة)` : `Select Source Batch (${materialBatches.length} available)`) 
                                                    : (isRTL ? 'لا توجد دفعات مواد متاحة' : 'No available material batches found')} --
                                            </option>
                                            {materialBatches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.description} {b.project?.name ? `(${b.project.name})` : ''} — {isRTL ? 'المتبقي:' : 'Remaining:'} {fmtCurrency(b.remainingValue)}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.batchId && <span className="error-message">{errors.batchId}</span>}

                                        {/* Helper card for selected batch */}
                                        {selectedBatch ? (
                                            <div style={{
                                                marginTop: '10px',
                                                padding: '10px 14px',
                                                background: 'rgba(59, 130, 246, 0.08)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {isRTL ? 'الرصيد المالي المتاح للصرف:' : 'Available balance to consume:'}
                                                    </div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                        {fmtCurrency(selectedBatch.remainingValue)}
                                                    </div>
                                                    {selectedBatch.project?.name && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                            {isRTL ? 'المشروع:' : 'Project:'} <strong>{selectedBatch.project.name}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => setFormData(prev => ({ ...prev, amount: selectedBatch.remainingValue.toString() }))}
                                                    style={{ border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '4px 10px' }}
                                                >
                                                    {isRTL ? '⚡ استخدام كامل الرصيد' : '⚡ Use Full Balance'}
                                                </button>
                                            </div>
                                        ) : materialBatches.length === 0 && (
                                            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#b45309' }}>
                                                {isRTL 
                                                    ? '⚠️ لا توجد دفعات مواد مسجلة لهذا المشروع برصيد متاح. يمكنك شراء خامة للمخزن من تبويب المصروفات أولاً.' 
                                                    : '⚠️ No material batches with available balance found for this project. You can purchase materials for stock in the Expense tab first.'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">{t('finance.detailsAndAmount') || 'تفاصيل الاستهلاك'}</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>{t('finance.quantity')}</label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.uom')}</label>
                                            <select name="unit" value={formData.unit} onChange={handleChange}>
                                                <option value="TON">{t('finance.uom_options.ton')}</option>
                                                <option value="KG">{t('finance.uom_options.kg')}</option>
                                                <option value="M3">{t('finance.uom_options.m3')}</option>
                                                <option value="M2">{t('finance.uom_options.m2')}</option>
                                                <option value="M">{t('finance.uom_options.m')}</option>
                                                <option value="PIECE">{t('finance.uom_options.piece')}</option>
                                                <option value="LITER">{t('finance.uom_options.liter')}</option>
                                                <option value="BAG">{t('finance.uom_options.bag')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.usedForCategory')} <span className="required">*</span></label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className={errors.category ? 'error' : ''}
                                            >
                                                <option value="">-- {t('finance.selectUsageArea')} --</option>
                                                <option value="CIVIL_WORKS">{t('finance.categories.civil')}</option>
                                                <option value="MEP">{t('finance.categories.mep')}</option>
                                                <option value="FINISHING">{t('finance.categories.finishing')}</option>
                                                <option value="OTHER">{t('finance.categories.other')}</option>
                                            </select>
                                            {errors.category && <span className="error-message">{errors.category}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.consumptionValue')} (EGP) <span className="required">*</span></label>
                                            <CurrencyInput
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder={t('finance.enterValue')}
                                                className={errors.amount ? 'error' : ''}
                                            />
                                            {errors.amount && <span className="error-message">{errors.amount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* --- MODE D: TRANSFER --- */}
                    {
                        mode === 'TRANSFER' && (
                            <>
                                <div className="form-section">
                                    <h3 className="section-title">{t('finance.transferCustody', 'تحويل عهدة')}</h3>
                                    
                                    {/* Sender Info Badge */}
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'rgba(59, 130, 246, 0.08)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        borderRadius: '10px',
                                        marginBottom: 'var(--spacing-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '10px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                {t('finance.senderCustody', 'المُحوّل (من عهدة):')}
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>
                                                {user?.name} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({formatUserRole(user?.role)})</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {t('finance.currentCustodyBalance', 'رصيد العهدة الحالي')}:
                                            </div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                {fmtCurrency(user?.currentCustodyBalance || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-grid">
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label>{t('finance.transferToEngineer', 'المستلم (المهندس المحول إليه)')} <span className="required">*</span></label>
                                            <select
                                                name="toEngineerId"
                                                value={formData.toEngineerId}
                                                onChange={handleChange}
                                                className={errors.toEngineerId ? 'error' : ''}
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.95rem' }}
                                            >
                                                <option value="">-- {t('finance.selectReceiver', 'اختر المهندس المستلم')} --</option>
                                                {users.filter(u => u.id !== user?.id).map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name} — {formatUserRole(u.role)}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.toEngineerId && <span className="error-message">{errors.toEngineerId}</span>}
                                        </div>

                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label style={{ marginBottom: 0 }}>{t('finance.amountToTransfer', 'مبلغ التحويل')} (EGP) <span className="required">*</span></label>
                                                {Number(user?.currentCustodyBalance) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, amount: String(user.currentCustodyBalance) }))}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--color-primary)',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline'
                                                        }}
                                                    >
                                                        ⚡ {isRTL ? 'تحويل كامل الرصيد' : 'Use Full Balance'}
                                                    </button>
                                                )}
                                            </div>
                                            <CurrencyInput
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                className={errors.amount ? 'error' : ''}
                                                style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                                            />
                                            {errors.amount && <span className="error-message">{errors.amount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    <div className="form-section">
                        <div className="form-group full-width">
                            <label>{mode === 'TRANSFER' ? t('finance.transferNotes', 'سبب التحويل / ملاحظات') : `${t('finance.description')} / ${t('common.notes')}`}</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                rows="2" 
                                style={{ resize: 'none' }} 
                                placeholder={mode === 'TRANSFER' ? t('finance.transferNotesPlaceholder', 'مثال: عهدة موقع لتغطية مشتريات عاجلة...') : t('finance.usagePlaceholder')} 
                            />
                            {errors.description && <span className="error-message">{errors.description}</span>}
                        </div>
                    </div>


                    <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.loading') : initialData ? t('common.update') : t('common.save')}
                        </button>
                    </div>

                </form >
            </div >

            <AddWorkmanModal
                isOpen={isWorkmanModalOpen}
                initialData={null}
                onClose={() => setIsWorkmanModalOpen(false)}
                onSave={async (workmanData) => {
                    try {
                        const response = await workmenAPI.create(workmanData);
                        const newWorkman = response.data.data;
                        await loadWorkforce();
                        setFormData(prev => ({ ...prev, workmanId: newWorkman.id }));
                        setIsWorkmanModalOpen(false);
                    } catch (error) {
                        console.error('Failed to save workman:', error);
                        showAlert({ type: 'error', title: 'Error', message: 'Failed to create workman.' });
                    }
                }}
            />
        </div >
    );
}
