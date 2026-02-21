import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, MicOff, Wallet } from 'lucide-react';
import { projectsAPI, materialUsageAPI, transactionsAPI, projectCostItemsAPI, userAPI } from '../services/api';
import './Modal.css';
import CurrencyInput from './CurrencyInput';

export default function AddTransactionModal({ isOpen, onClose, onSubmit, initialData = null, user }) {
    const { t } = useTranslation();

    // Helper to get local ISO string for datetime-local
    const getLocalDateTime = (date = new Date()) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };


    // Modes: EXPENSE (default), INCOME, USAGE
    const [mode, setMode] = useState('EXPENSE');

    // Data Loading
    const [projects, setProjects] = useState([]);
    const [materialBatches, setMaterialBatches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]); // Company employees for payer selection
    const [costItems, setCostItems] = useState([]); // Project cost items (Work Orders)
    const [workmen, setWorkmen] = useState([]); // Site workmen for labor payments

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
    });

    // V1.2 UI Logic: New vs Existing Item Switch
    const [costItemMode, setCostItemMode] = useState('NEW'); // NEW | EXISTING

    const [errors, setErrors] = useState({});
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial Load & Edit Mode Setup
    useEffect(() => {
        if (isOpen) {
            loadProjects();
            loadCategories();
            loadUsers(); // Load company employees for payer selection
            loadWorkforce();
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
                    projectCostItemId: initialData.projectCostItemId || ''
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
                    projectCostItemId: ''
                });
                setCostItemMode('NEW');
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    // Load Batches in USAGE mode
    useEffect(() => {
        if (mode === 'USAGE' && selectedProjectId) {
            loadBatches(selectedProjectId);
        }
    }, [mode, selectedProjectId]);

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
            const res = await materialUsageAPI.getBatches({ projectId, status: 'AVAILABLE' });
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
            const res = await fetch('/api/categories?grouped=true', {
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
            const res = await fetch('/api/users', {
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
    };

    const handleBatchChange = (e) => {
        const bId = e.target.value;
        setSelectedBatchId(bId);
        const batch = materialBatches.find(b => b.id === bId);
        setSelectedBatch(batch || null);
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

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await analyzeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Recording failed", error);
            alert("Could not start recording. Please check microphone permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const analyzeAudio = async (blob) => {
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'transaction.webm');

            const res = await transactionsAPI.analyze(formData);
            const data = res.data.data;
            const parsed = data.parsed_data;

            // Map AI response to form fields
            setFormData(prev => ({
                ...prev,
                amount: parsed.amount ? parsed.amount.toString() : prev.amount,
                description: parsed.summary || prev.description,
                category: parsed.category || prev.category,
                transactionTo: parsed.vendor || prev.transactionTo,
            }));

            // Handle Stock Purchase mapping
            if (parsed.is_stock_purchase || parsed.category === 'MATERIALS') {
                setIsStockPurchase(true);
                if (parsed.items && parsed.items.length > 0) {
                    const item = parsed.items[0];
                    setFormData(prev => ({
                        ...prev,
                        itemName: item.name || prev.itemName,
                        quantity: item.quantity ? item.quantity.toString() : prev.quantity,
                        unit: item.unit ? item.unit.toUpperCase() : prev.unit
                    }));
                }
            }

            // Map to mode (AI returns type INCOME or EXPENSE)
            if (parsed.type === 'INCOME') setMode('INCOME');
            else if (parsed.type === 'EXPENSE') setMode('EXPENSE');

        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Failed to analyze voice note. Please enter details manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleVoiceInput = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!selectedProjectId) newErrors.projectId = t('common.required');

        if (mode === 'EXPENSE') {
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (formData.paymentMethod === 'CUSTODY_WALLET' && Number(formData.amount) > Number(user?.currentCustodyBalance || 0)) {
                newErrors.amount = t('finance.insufficientFunds');
            }
            if (!formData.description) newErrors.description = t('common.required');

            // Category is always required
            if (!formData.category) newErrors.category = t('common.required');
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
                payload = {
                    type: 'EXPENSE',
                    category: isStockPurchase ? 'MATERIALS' : formData.category,
                    amount: Number(formData.amount),
                    projectId: selectedProjectId,
                    projectCostItemId: (costItemMode === 'EXISTING' || isStockPurchase) ? formData.projectCostItemId : undefined,
                    payerUserId: formData.payerUserId || user?.id,
                    workmanId: formData.workmanId || undefined,
                    createBatch: isStockPurchase,
                    description: formData.description,
                    transactionDate: formData.transactionDate,
                    paymentMethod: formData.paymentMethod,
                    itemName: (costItemMode === 'NEW' || isStockPurchase) ? formData.itemName : undefined,
                    unit: (costItemMode === 'NEW' || isStockPurchase) ? formData.unit : undefined,
                    unitPrice: (costItemMode === 'NEW' || isStockPurchase) ? (formData.unitPrice ? Number(formData.unitPrice) : undefined) : undefined,
                    quantity: (costItemMode === 'NEW' || isStockPurchase) ? (formData.quantity ? Number(formData.quantity) : undefined) : undefined,
                    costCenter: formData.costCenter,
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
                    description: formData.description || 'Client Payment',
                    transactionDate: formData.transactionDate,
                    clientId: selectedProject?.client?.id,
                    paymentMethod: formData.paymentMethod,
                    physicalAccount: formData.physicalAccount,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'USAGE') {
                payload = {
                    materialBatchId: selectedBatchId,
                    valueConsumed: Number(formData.amount),
                    projectId: selectedProjectId,
                    description: formData.description || 'Inventory Usage',
                    category: formData.category
                };
            }

            if (initialData && initialData.id && mode !== 'USAGE') {
                // UPDATE MODE
                await transactionsAPI.update(initialData.id, payload);
            } else {
                // CREATE MODE
                if (mode === 'USAGE') {
                    await materialUsageAPI.recordUsageV2(payload);
                } else {
                    // Both Income and Expense use V2 logic for profit splitting
                    await transactionsAPI.createV2(payload);
                }
            }

            if (onSubmit) onSubmit();
            onClose();
        } catch (error) {
            console.error("Submission Failed", error);
            alert("Failed to submit transaction: " + (error.response?.data?.message || error.message));
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
                                <span style={{ fontWeight: 'bold' }}>{Number(user?.currentCustodyBalance || 0).toLocaleString()} EGP</span>
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
                        onClick={() => setMode('EXPENSE')}
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
                        onClick={() => setMode('INCOME')}
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
                        onClick={() => setMode('USAGE')}
                        style={{
                            flex: 1, padding: '16px', background: 'transparent', border: 'none',
                            borderBottom: mode === 'USAGE' ? '3px solid var(--color-primary)' : '3px solid transparent',
                            color: mode === 'USAGE' ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {t('finance.usage')}
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
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{t('nav.projects')} <span className="required">*</span></label>
                            <select
                                value={selectedProjectId}
                                onChange={handleProjectChange}
                                className={errors.projectId ? 'error' : ''}
                                style={{ fontSize: '1rem', padding: '10px' }}
                            >
                                <option value="">-- {t('finance.selectProject')} --</option>
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
                        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'PROJECT_MANAGER') && mode !== 'USAGE' && (
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
                                            {u.name} ({t(`teamManagement.roles.${u.role}`) || u.role})
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
                                    <label className="flex items-center gap-sm cursor-pointer" style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <input
                                            type="checkbox"
                                            checked={isStockPurchase}
                                            onChange={(e) => setIsStockPurchase(e.target.checked)}
                                            style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
                                        />
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t('finance.addToInventory')}</span>
                                    </label>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">{t('projects.modal.sections.financial')}</h3>
                                    <div className="form-grid">
                                        {/* New vs Existing Smart Toggle */}
                                        <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 'var(--spacing-sm)' }}>
                                            <div style={{ display: 'flex', gap: '4px', padding: '3px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${costItemMode === 'NEW' ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => {
                                                        setCostItemMode('NEW');
                                                        setFormData(prev => ({ ...prev, projectCostItemId: '' }));
                                                    }}
                                                    style={{ flex: 1, borderRadius: '8px', fontSize: '0.85rem' }}
                                                >
                                                    {t('finance.newCostItem')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${costItemMode === 'EXISTING' ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => setCostItemMode('EXISTING')}
                                                    style={{ flex: 1, borderRadius: '8px', fontSize: '0.85rem' }}
                                                    disabled={!selectedProjectId}
                                                >
                                                    {t('finance.existingCostItem')}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 1. Band Selection (If Existing) or Category (if New) */}
                                        {costItemMode === 'EXISTING' ? (
                                            <>
                                                <div className="form-group">
                                                    <label>{t('finance.existingCostItem')}</label>
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
                                                            <option key={item.key} value={item.key}>{item.ar}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
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
                                                            <optgroup key={group.group} label={group.groupNameAr}>
                                                                {group.items.map(item => (
                                                                    <option key={item.key} value={item.key}>{item.ar}</option>
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

                                        <div className="form-group">
                                            <label>{t('finance.costCenter')}</label>
                                            <input
                                                name="costCenter"
                                                value={formData.costCenter}
                                                onChange={handleChange}
                                                placeholder="e.g. Block A"
                                            />
                                        </div>

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
                                            <input
                                                name="transactionTo"
                                                value={formData.transactionTo}
                                                onChange={handleChange}
                                                placeholder={t('finance.transactionToPlaceholder')}
                                            />
                                        </div>

                                        {/* Workman Selection (Only for Labor Categories) */}
                                        {(() => {
                                            const selectedCat = categories.flatMap(g => g.items).find(i => i.key === formData.category);
                                            if (selectedCat?.group === 'LABOR') {
                                                return (
                                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                        <label>{t('labor.title')} <span className="required">*</span></label>
                                                        <select
                                                            name="workmanId"
                                                            value={formData.workmanId}
                                                            onChange={handleChange}
                                                            className={errors.workmanId ? 'error' : ''}
                                                        >
                                                            <option value="">-- {t('labor.selectWorkman') || 'نقي الصنيعي'} --</option>
                                                            {workmen.map(w => (
                                                                <option key={w.id} value={w.id}>
                                                                    {w.name} ({t(`labor.trades.${w.trade}`)})
                                                                </option>
                                                            ))}
                                                        </select>
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
                                        <div className="form-group relative">
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

                                            <button
                                                type="button"
                                                onClick={handleVoiceInput}
                                                style={{
                                                    position: 'absolute', right: '10px', top: '35px',
                                                    background: isRecording ? '#ef4444' : '#f97316',
                                                    color: 'white', border: 'none', borderRadius: '50%',
                                                    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                }}
                                            >
                                                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                            </button>
                                            {isAnalyzing && (
                                                <div className="absolute top-10 right-0 bg-brand-orange text-white text-xs px-2 py-1 rounded-md animate-pulse z-10">
                                                    {t('finance.ai_analyzing') || 'Analyzing...'}
                                                </div>
                                            )}
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
                                        <div className="form-group">
                                            <label>{t('finance.transactionFrom')}</label>
                                            <input
                                                name="transactionFrom"
                                                value={formData.transactionFrom}
                                                onChange={handleChange}
                                                placeholder={t('finance.clientName')}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.paymentMethod')}</label>
                                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                                                <option value="CASH">{t('finance.methods.cash')}</option>
                                                <option value="CHECK">{t('finance.methods.check')}</option>
                                                <option value="BANK_TRANSFER">{t('finance.methods.bankTransfer')}</option>
                                                <option value="CREDIT_CARD">{t('finance.methods.creditCard')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('finance.physicalAccount')} (Safe)</label>
                                            <input
                                                name="physicalAccount"
                                                value={formData.physicalAccount}
                                                onChange={handleChange}
                                                placeholder="e.g. Main Safe"
                                            />
                                        </div>
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
                                        <label>{t('finance.sourceBatch')} <span className="required">*</span></label>
                                        <select
                                            value={selectedBatchId}
                                            onChange={handleBatchChange}
                                            className={errors.batchId ? 'error' : ''}
                                            disabled={!selectedProjectId}
                                        >
                                            <option value="">-- {t('finance.selectBatch')} --</option>
                                            {materialBatches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.description} (Rem: {Number(b.remainingValue).toLocaleString()} EGP)
                                                </option>
                                            ))}
                                        </select>
                                        {errors.batchId && <span className="error-message">{errors.batchId}</span>}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">Consumption Details</h3>
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

                    <div className="form-section">
                        <div className="form-group full-width">
                            <label>{t('finance.description')} / {t('common.notes')}</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="2" style={{ resize: 'none' }} placeholder={t('finance.usagePlaceholder')} />
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
        </div >
    );
}
