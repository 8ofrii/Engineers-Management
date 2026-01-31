import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, MicOff, Wallet } from 'lucide-react';
import { projectsAPI, materialUsageAPI, transactionsAPI } from '../services/api';
import './Modal.css';
import CurrencyInput from './CurrencyInput';

export default function AddTransactionModal({ isOpen, onClose, onSubmit, initialData = null, user }) {
    const { t } = useTranslation();

    // Modes: EXPENSE (default), INCOME, USAGE
    const [mode, setMode] = useState('EXPENSE');

    // Data Loading
    const [projects, setProjects] = useState([]);
    const [materialBatches, setMaterialBatches] = useState([]);

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
        transactionDate: new Date().toISOString().split('T')[0],
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

        // Income
        invoiceNumber: '',
        physicalAccount: '',
    });

    const [errors, setErrors] = useState({});
    const [isRecording, setIsRecording] = useState(false);

    // Initial Load & Edit Mode Setup
    useEffect(() => {
        if (isOpen) {
            loadProjects();

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
                    transactionDate: initialData.transactionDate ? new Date(initialData.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
                    invoiceNumber: initialData.invoiceNumber || ''
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
                    transactionDate: new Date().toISOString().split('T')[0],
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
                });
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

    const handleProjectChange = (e) => {
        const pId = e.target.value;
        setSelectedProjectId(pId);
        const proj = projects.find(p => p.id === pId);
        setSelectedProject(proj || null);
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
                setFormData(prev => ({ ...prev, [name]: value, amount: (qty * price).toString() }));
            }
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Sync selectedProject when projects load or selection changes
    useEffect(() => {
        if (selectedProjectId && projects.length > 0) {
            const proj = projects.find(p => p.id === selectedProjectId);
            setSelectedProject(proj || null);
        }
    }, [selectedProjectId, projects]);

    const handleVoiceInput = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            setTimeout(() => {
                alert("Voice input simulation");
                setIsRecording(false);
            }, 1000);
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

            if (isStockPurchase) {
                if (!formData.itemName) newErrors.itemName = t('common.required');
            } else {
                if (!formData.category) newErrors.category = t('common.required');
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            let payload = {};
            // Shared payload construction
            if (mode === 'EXPENSE') {
                payload = {
                    type: 'EXPENSE',
                    category: isStockPurchase ? 'MATERIALS' : formData.category,
                    amount: Number(formData.amount),
                    projectId: selectedProjectId,
                    custodyWalletId: formData.paymentMethod === 'CUSTODY_WALLET' ? user.id : undefined,
                    createBatch: isStockPurchase,
                    description: formData.description,
                    transactionDate: formData.transactionDate,
                    paymentMethod: formData.paymentMethod,
                    itemName: isStockPurchase ? formData.itemName : undefined,
                    unit: isStockPurchase ? formData.unit : undefined,
                    transactionFrom: formData.transactionFrom,
                    transactionTo: formData.transactionTo,
                    unitPrice: formData.unitPrice ? Number(formData.unitPrice) : undefined,
                    quantity: formData.quantity ? Number(formData.quantity) : undefined,
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
                    description: formData.description || 'Client Payment',
                    transactionDate: formData.transactionDate,
                    clientId: selectedProject?.client?.id,
                    paymentMethod: formData.paymentMethod,
                    transactionFrom: formData.transactionFrom,
                    transactionTo: formData.transactionTo,
                    physicalAccount: formData.physicalAccount,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'USAGE') {
                // Usage typically isn't 'edited' in the same way, but handled via consumption API
                // For now keeping create logic.
                payload = {
                    valueConsumed: Number(formData.amount),
                    costCategory: formData.category,
                    notes: formData.description,
                    quantity: formData.quantity ? Number(formData.quantity) : undefined,
                    unit: formData.unit
                };
            }

            if (initialData && initialData.id && mode !== 'USAGE') {
                // UPDATE MODE
                await transactionsAPI.update(initialData.id, payload);
            } else {
                // CREATE MODE
                if (mode === 'USAGE') {
                    await materialUsageAPI.consumeBatch(selectedBatchId, payload);
                } else if (mode === 'INCOME') {
                    await transactionsAPI.recordIncome(payload);
                } else {
                    await transactionsAPI.create(payload);
                }
            }

            if (onSubmit) onSubmit();
            onClose();
        } catch (error) {
            console.error("Submission Failed", error);
            alert("Failed to submit transaction: " + (error.response?.data?.message || error.message));
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

                    {/* Project Selection (Always Top) */}
                    <div className="form-section">
                        <div className="form-group">
                            <label>{t('nav.projects')} <span className="required">*</span></label>
                            <select
                                value={selectedProjectId}
                                onChange={handleProjectChange}
                                className={errors.projectId ? 'error' : ''}
                                style={{ fontSize: '1.1rem', padding: '12px' }}
                            >
                                <option value="">-- {t('finance.selectProject')} --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.projectId && <span className="error-message">{errors.projectId}</span>}
                        </div>
                    </div>

                    {/* --- MODE A: EXPENSE --- */}
                    {mode === 'EXPENSE' && (
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
                                    {isStockPurchase ? (
                                        <div className="form-group">
                                            <label>{t('finance.itemName')} <span className="required">*</span></label>
                                            <input
                                                name="itemName"
                                                value={formData.itemName}
                                                onChange={handleChange}
                                                placeholder={t('finance.itemNamePlaceholder')}
                                                className={errors.itemName ? 'error' : ''}
                                            />
                                            {errors.itemName && <span className="error-message">{errors.itemName}</span>}
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label>{t('finance.category')} <span className="required">*</span></label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className={errors.category ? 'error' : ''}
                                            >
                                                <option value="">-- {t('finance.selectCategory')} --</option>
                                                <option value="MATERIALS">{t('finance.categories.materials')}</option>
                                                <option value="LABOR">{t('finance.categories.labor')}</option>
                                                <option value="EQUIPMENT">{t('finance.categories.equipment')}</option>
                                                <option value="SERVICES">{t('finance.categories.services')}</option>
                                                <option value="OTHER">{t('finance.categories.other')}</option>
                                            </select>
                                            {errors.category && <span className="error-message">{errors.category}</span>}
                                        </div>
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
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">Details & Amount</h3>
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
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- MODE B: INCOME --- */}
                    {mode === 'INCOME' && (
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
                    )}

                    {/* --- MODE C: USAGE --- */}
                    {mode === 'USAGE' && (
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
                    )}

                    <div className="form-section">
                        <div className="form-group full-width">
                            <label>{t('finance.description')} / {t('common.notes')}</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="2" style={{ resize: 'none' }} placeholder={t('finance.usagePlaceholder')} />
                            {errors.description && <span className="error-message">{errors.description}</span>}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary bg-brand-orange hover:bg-orange-600">
                            {t('common.submit')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
