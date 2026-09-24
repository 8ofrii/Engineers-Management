import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Wallet, Plus, Upload, Paperclip, Trash2, FileText, FileSpreadsheet, ExternalLink, File, Store, Building2, Briefcase } from 'lucide-react';
import { projectsAPI, materialUsageAPI, transactionsAPI, projectCostItemsAPI, userAPI, workmenAPI, clientsAPI, suppliersAPI, materialsAPI, documentsAPI, safesAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';
import { useFormat } from '../utils/format';
import AddWorkmanModal from './AddWorkmanModal';
import './Modal.css';
import CurrencyInput from './CurrencyInput';
import { saveFormDraft, getFormDraft, clearFormDraft } from '../utils/formDraft';
import DraftBanner from './DraftBanner';

const TRANSACTION_DRAFT_KEY = 'hesaby_draft_transaction';

const DEFAULT_OFFICE_CATEGORIES = [
    { key: 'OFFICE_RENT', ar: 'إيجار المقر / المكتب', en: 'Office Rent' },
    { key: 'OFFICE_ELECTRICITY', ar: 'فاتورة الكهرباء', en: 'Electricity Bill' },
    { key: 'OFFICE_WATER', ar: 'فاتورة المياه', en: 'Water Bill' },
    { key: 'OFFICE_INTERNET', ar: 'الإنترنت والاتصالات', en: 'Internet & Wi-Fi' },
    { key: 'OFFICE_PHONE', ar: 'فواتير الهواتف المحمولة', en: 'Mobile & Telephone Bills' },
    { key: 'OFFICE_BUFFET', ar: 'بوفيه وضيافة ومشروبات', en: 'Buffet & Hospitality' },
    { key: 'OFFICE_STATIONERY', ar: 'أدوات مكتبية ومستلزمات ورقية', en: 'Office Stationery & Supplies' },
    { key: 'OFFICE_PRINTING', ar: 'طباعة ورسومات ومخططات', en: 'Printing & Plotting' },
    { key: 'OFFICE_CLEANING', ar: 'نظافة ومطهرات ومستلزمات', en: 'Cleaning & Janitorial' },
    { key: 'OFFICE_MAINTENANCE', ar: 'صيانة المقر والتكييفات والأجهزة', en: 'Office & AC Maintenance' },
    { key: 'OFFICE_SOFTWARE', ar: 'اشتراكات البرامج والسحابة', en: 'Software & Subscriptions' },
    { key: 'OFFICE_MARKETING', ar: 'تسويق وإعلانات ودعاية', en: 'Marketing & Advertising' },
    { key: 'OFFICE_LEGAL_ACCOUNTING', ar: 'استشارات قانونية ومحاسبية ومراجعة', en: 'Legal & Accounting Fees' },
    { key: 'OFFICE_GOVERNMENT_FEES', ar: 'رسوم حكومية ورخص وضرائب وتأمينات', en: 'Government, Taxes & Licenses' },
    { key: 'OFFICE_TRANSPORT', ar: 'انتقالات ومواصلات وبنزين للإدارة', en: 'HQ Transportation & Fuel' },
    { key: 'OFFICE_POSTAL', ar: 'شحن سريع وطرد وبريد', en: 'Courier & Postal Services' },
    { key: 'OFFICE_FURNITURE', ar: 'أثاث وتجهيزات مكتبية', en: 'Furniture & Fixtures' },
    { key: 'OFFICE_IT_HARDWARE', ar: 'أجهزة كمبيوتر ومعدات IT وشاشات', en: 'IT Hardware & Computers' },
    { key: 'OFFICE_STAFF_WELFARE', ar: 'إكراميات ورعاية وضيافة موظفين', en: 'Staff Welfare & Medical' },
    { key: 'OFFICE_BONUSES', ar: 'مكافآت وحوافز إدارية', en: 'Administrative Bonuses' },
    { key: 'OFFICE_BANK_FEES', ar: 'مصاريف بنكية وعمولات', en: 'Bank Fees & Service Charges' },
    { key: 'OFFICE_HOSPITALITY', ar: 'استضافة واجتماعات عملاء ومناسبات', en: 'Client Meetings & Hospitality' },
    { key: 'OFFICE_SERVICES', ar: 'خدمات متفرقة وصيانة طارئة', en: 'One-time & Miscellaneous Services' },
    { key: 'OFFICE_EXPENSES', ar: 'مصروفات إدارية عامة', en: 'General Office Expenses' },
    { key: 'OTHER', ar: 'أخرى / متنوع', en: 'Other / General' }
];

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

    // Auto-detect unit of measure for a material batch
    const detectBatchUnit = (batch, rawMaterialsList = []) => {
        if (!batch) return null;

        // 1. Direct unit property on batch (if populated by API or model)
        if (batch.unit && typeof batch.unit === 'string') {
            const u = batch.unit.toUpperCase();
            if (['TON', 'KG', 'M3', 'M2', 'M', 'PIECE', 'LITER', 'BAG'].includes(u)) {
                return u;
            }
        }

        // 2. Direct material relation on batch
        if (batch.material?.unit) {
            const u = batch.material.unit.toUpperCase();
            if (['TON', 'KG', 'M3', 'M2', 'M', 'PIECE', 'LITER', 'BAG'].includes(u)) {
                return u;
            }
        }

        // 3. Match by materialId in rawMaterials list
        if (batch.materialId && rawMaterialsList.length > 0) {
            const found = rawMaterialsList.find(m => m.id === batch.materialId);
            if (found?.unit) {
                return found.unit.toUpperCase();
            }
        }

        // 4. Match batch description with rawMaterials list names
        const desc = ((batch.description || '') + ' ' + (batch.descriptionAr || '')).toLowerCase();
        if (rawMaterialsList.length > 0) {
            for (const m of rawMaterialsList) {
                const nameEn = (m.name || '').toLowerCase().trim();
                const nameAr = (m.nameAr || '').trim();
                if (nameEn && (desc === nameEn || desc.includes(nameEn))) {
                    if (m.unit) return m.unit.toUpperCase();
                }
                if (nameAr && desc.includes(nameAr.toLowerCase())) {
                    if (m.unit) return m.unit.toUpperCase();
                }
            }
        }

        // 5. Explicit unit keywords in description (English & Arabic)
        const unitPatterns = [
            { regex: /\b(LITER|LITRE|LITERS|LTR)\b/i, unit: 'LITER' },
            { regex: /\b(BAG|BAGS|SACK|SACKS)\b/i, unit: 'BAG' },
            { regex: /\b(TON|TONS|TONNE|TONNES)\b/i, unit: 'TON' },
            { regex: /\b(KG|KGS|KILO|KILOS|KILOGRAM)\b/i, unit: 'KG' },
            { regex: /\b(M3|CBM|M\^3|CUBIC\s*METER)\b/i, unit: 'M3' },
            { regex: /\b(M2|SQM|M\^2|SQUARE\s*METER)\b/i, unit: 'M2' },
            { regex: /\b(PIECE|PIECES|PCS|PC)\b/i, unit: 'PIECE' },
            { regex: /\b(METER|METERS|LM|LINEAR\s*METER)\b/i, unit: 'M' }
        ];
        for (const { regex, unit } of unitPatterns) {
            if (regex.test(desc)) return unit;
        }

        if (/لتر|ليتر/i.test(desc)) return 'LITER';
        if (/شيكار|شكار|كيس/i.test(desc)) return 'BAG';
        if (/طن/i.test(desc)) return 'TON';
        if (/كيلو|كجم|كغ/i.test(desc)) return 'KG';
        if (/متر\s*مكعب|م3|م³|مكعب/i.test(desc)) return 'M3';
        if (/متر\s*مربع|م2|م²|مربع/i.test(desc)) return 'M2';
        if (/متر\s*طولي|م\s*طولي/i.test(desc)) return 'M';
        if (/قطعة|قطعه|قطع|عدد|حبة|حبه/i.test(desc)) return 'PIECE';

        // 6. Construction material keywords heuristic
        if (/paint|paints|primer|putty|sealer|thinner|varnish|gloss|emulsion|acrylic|دهان|دهانات|بويات|بوية|معجون|سيلر|ورنيش|نفط|ثنر|لاكيه|بلاستيك|جوتن|سايبس|glc/i.test(desc)) {
            return 'LITER';
        }
        if (/cement|gypsum|lime|plaster|grout|mortar|adhesive|أسمنت|اسمنت|جبس|جير|مونه|مونة|غراء/i.test(desc)) {
            return 'BAG';
        }
        if (/sand|gravel|aggregate|crushed\s*stone|concrete|ready\s*mix|soil|backfill|رمل|رملة|زلط|سن|خرسانة|ركام|ردش|دفان/i.test(desc)) {
            return 'M3';
        }
        if (/steel|rebar|iron|reinforcement|حديد|صلب|تسليح|كانات/i.test(desc)) {
            return 'TON';
        }
        if (/tile|tiles|ceramic|porcelain|marble|granite|parquet|flooring|interlock|plastering|gypsum\s*board|سيراميك|بورسلين|رخام|جرانيت|باركيه|بلاط|ارضيات|جبسوم|بورد/i.test(desc)) {
            return 'M2';
        }
        if (/pipe|pipes|cable|cables|wire|wires|conduit|hose|tube|timber|wood|خشب|مواسير|كابلات|أسلاك|اسلاك|خراطيم/i.test(desc)) {
            return 'M';
        }
        if (/brick|bricks|block|blocks|door|doors|window|windows|switch|switches|valve|valves|lamp|lamps|fitting|طوب|بلوك|ورديات|لمبات|مفاتيح|محابس|أبواب|شبابيك/i.test(desc)) {
            return 'PIECE';
        }

        return null;
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
    const [safes, setSafes] = useState([]);
    const [existingCostCenters, setExistingCostCenters] = useState([]);
    const [existingTransactionFroms, setExistingTransactionFroms] = useState([]);
    const [existingTransactionTos, setExistingTransactionTos] = useState([]);
    const [existingBeneficiaries, setExistingBeneficiaries] = useState([]);
    const [existingPhysicalAccounts, setExistingPhysicalAccounts] = useState([]);
    const [existingItemNames, setExistingItemNames] = useState([]);

    const [customInputs, setCustomInputs] = useState({
        costCenter: false,
        beneficiary: false,
        transactionTo: false,
        transactionFrom: false,
        physicalAccount: false
    });

    // Attachment / Proof for Bank Transfer & Check
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [existingReceiptUrl, setExistingReceiptUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);


    // Core State
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    // Expense Mode Specific
    const [isStockPurchase, setIsStockPurchase] = useState(false);
    const [inventoryDestination, setInventoryDestination] = useState('PROJECT'); // 'PROJECT' | 'SUPPLIER'

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
        beneficiary: '',
        transactionFrom: '',
        transactionTo: '',
        paymentMethod: 'CUSTODY_WALLET',
        unitPrice: '',
        quantity: '',
        costCenter: '',
        payerUserId: user?.id || '', // Who paid for this transaction
        projectCostItemId: '', // The linked Work Order
        workmanId: '', // The workman receiving payment (if labor)
        targetSupplierId: '',

        // Income
        invoiceNumber: '',
        physicalAccount: '',

        // Transfer Custody
        toEngineerId: '',

        // Safe & Office Expense
        safeId: initialData?.safeId || '',
        isOfficeExpense: initialData?.isOfficeExpense || false
    });

    // V1.2 UI Logic: New vs Existing Item Switch
    const [costItemMode, setCostItemMode] = useState('NEW'); // NEW | EXISTING

    const [errors, setErrors] = useState({});
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

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
                beneficiary: '',
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
                toEngineerId: '',
                safeId: formData.safeId || '',
                isOfficeExpense: false
            });
            setErrors({});
        }
        setMode(next);
    };
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);

    // Strict category filtering: Office expenses show ONLY Office categories; Project expenses show ONLY Site/Project categories
    const displayCategories = useMemo(() => {
        if (formData.isOfficeExpense) {
            const officeGroup = (categories || []).find(g => g.group === 'OFFICE');
            if (officeGroup && officeGroup.items?.length > 0) {
                return [officeGroup];
            }
            return [{
                group: 'OFFICE',
                groupNameAr: '🏢 مصروفات المقر والمكتب والإدارة',
                groupNameEn: 'Office & Admin Expenses',
                items: DEFAULT_OFFICE_CATEGORIES
            }];
        }
        if (!categories || categories.length === 0) return [];
        return categories.filter(g => g.group !== 'OFFICE');
    }, [categories, formData.isOfficeExpense]);

    const handleExpenseTypeChange = (isOffice) => {
        setFormData(prev => ({
            ...prev,
            isOfficeExpense: isOffice,
            category: isOffice
                ? (prev.category && (prev.category.startsWith('OFFICE_') || prev.category === 'OTHER') ? prev.category : '')
                : (prev.category && !prev.category.startsWith('OFFICE_') && prev.category !== 'OTHER' ? prev.category : ''),
            costCenter: isOffice
                ? (prev.costCenter || (isRTL ? 'المقر الرئيسي' : 'Headquarters'))
                : (prev.costCenter === 'Headquarters' || prev.costCenter === 'المقر الرئيسي' ? '' : prev.costCenter),
            unit: isOffice ? 'PIECE' : (prev.unit === 'PIECE' ? 'TON' : prev.unit),
            workmanId: isOffice ? '' : prev.workmanId
        }));
        if (isOffice) {
            setSelectedProjectId('');
            setSelectedProject(null);
            setCostItemMode('NEW');
            setIsStockPurchase(false);
            if (errors.projectId) setErrors(prev => ({ ...prev, projectId: '' }));
        }
    };

    // Contextual cost center suggestions for office vs site
    const officeCostCenterSuggestions = useMemo(() => {
        const defaults = isRTL ? [
            'المقر الرئيسي',
            'المكتب الإداري',
            'الإدارة العامة',
            'بوفيه وضيافة',
            'أدوات مكتبية ومطبوعات',
            'صيانة ومرافق المقر',
            'انترنت واتصالات',
            'إيجار المقر'
        ] : [
            'Headquarters',
            'Administrative Office',
            'General Management',
            'Buffet & Hospitality',
            'Stationery & Prints',
            'Office Facilities & Maintenance',
            'Internet & Telecom',
            'Office Rent'
        ];
        const combined = [...new Set([...defaults, ...(existingCostCenters || [])])];
        return combined.map(c => ({ value: c, label: c }));
    }, [isRTL, existingCostCenters]);

    // Contextual beneficiary suggestions for office expenses (employees, utilities, stores, without site workmen)
    const officeBeneficiarySuggestions = useMemo(() => {
        const list = [
            ...users.map(u => ({ value: u.name, label: `${u.name} (${formatUserRole(u.role)})` })),
            ...suppliers.map(s => ({ value: s.name, label: `${s.name} (${t('suppliers.title')})` })),
            ...existingBeneficiaries.map(b => ({ value: b, label: b }))
        ];
        return list.reduce((acc, current) => {
            if (!acc.find(item => item.value === current.value)) acc.push(current);
            return acc;
        }, []);
    }, [users, suppliers, existingBeneficiaries, isRTL, t]);

    // Dynamic Creation State
    const [isWorkmanModalOpen, setIsWorkmanModalOpen] = useState(false);

    const handleDiscardDraft = () => {
        clearFormDraft(TRANSACTION_DRAFT_KEY);
        setHasRestoredDraft(false);
        setMode('EXPENSE');
        setSelectedProjectId('');
        setSelectedProject(null);
        setIsStockPurchase(false);
        setMaterialBatches([]);
        setSelectedBatchId('');
        setSelectedBatch(null);
        setCostItemMode('NEW');
        setFormData({
            amount: '',
            description: '',
            transactionDate: getLocalDateTime(),
            category: '',
            itemName: '',
            unit: 'TON',
            invoiceNumber: '',
            beneficiary: '',
            transactionFrom: '',
            transactionTo: '',
            paymentMethod: 'CUSTODY_WALLET',
            unitPrice: '',
            quantity: '',
            costCenter: '',
            physicalAccount: '',
            payerUserId: user?.id || '',
            projectCostItemId: '',
            workmanId: '',
            clientId: '',
            paidByClientContact: '',
            toEngineerId: '',
            safeId: formData.safeId || '',
            isOfficeExpense: false
        });
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setExistingReceiptUrl(null);
        setIsDragging(false);
        setErrors({});
    };

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
                setHasRestoredDraft(false);
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

                const isOffice = Boolean(initialData.isOfficeExpense);
                setFormData({
                    amount: initialData.amount || '',
                    description: parsedDesc,
                    transactionDate: initialData.transactionDate ? getLocalDateTime(new Date(initialData.transactionDate)) : getLocalDateTime(),
                    category: initialData.category || (isOffice ? 'OFFICE_EXPENSES' : ''),
                    itemName: parsedDesc, // Use description as itemName for stock mode too
                    unit: parsedUnit || (isOffice ? 'PIECE' : 'TON'),
                    clientId: initialData.clientId || initialData.client?.id || '',
                    paidByClientContact: initialData.paidByClientContact || '',
                    beneficiary: initialData.beneficiary || initialData.supplier?.name || initialData.workman?.name || '',
                    transactionFrom: initialData.transactionFrom || '',
                    transactionTo: initialData.transactionTo || '',
                    paymentMethod: initialData.paymentMethod || (initialData.type === 'INCOME' ? 'BANK_TRANSFER' : 'CUSTODY_WALLET'),
                    unitPrice: parsedPrice,
                    quantity: parsedQty,
                    costCenter: initialData.costCenter || (isOffice ? (isRTL ? 'المقر الرئيسي' : 'Headquarters') : ''),
                    physicalAccount: initialData.physicalAccount || '',
                    invoiceNumber: initialData.invoiceNumber || '',
                    payerUserId: initialData.payerUserId || user?.id || '',
                    projectCostItemId: isOffice ? '' : (initialData.projectCostItemId || ''),
                    toEngineerId: '',
                    safeId: initialData.safeId || formData.safeId || '',
                    isOfficeExpense: isOffice
                });
                if (isOffice) {
                    setCostItemMode('NEW');
                    setIsStockPurchase(false);
                    setSelectedProjectId('');
                    setSelectedProject(null);
                }
                setAttachmentFile(null);
                setAttachmentPreview(null);
                setExistingReceiptUrl(initialData.receiptPhotoUrl || null);
                setIsDragging(false);

            } else {
                setAttachmentFile(null);
                setAttachmentPreview(null);
                setExistingReceiptUrl(null);
                setIsDragging(false);
                // Check if there is a saved draft in localStorage
                const savedDraft = getFormDraft(TRANSACTION_DRAFT_KEY);
                if (savedDraft && typeof savedDraft === 'object') {
                    if (savedDraft.mode) setMode(savedDraft.mode);
                    if (savedDraft.selectedProjectId) {
                        setSelectedProjectId(savedDraft.selectedProjectId);
                        loadCostItems(savedDraft.selectedProjectId);
                    }
                    if (savedDraft.costItemMode) setCostItemMode(savedDraft.costItemMode);
                    if (savedDraft.isStockPurchase !== undefined) setIsStockPurchase(savedDraft.isStockPurchase);
                    if (savedDraft.inventoryDestination) setInventoryDestination(savedDraft.inventoryDestination);
                    if (savedDraft.selectedBatchId) setSelectedBatchId(savedDraft.selectedBatchId);

                    setFormData({
                        amount: savedDraft.formData?.amount || '',
                        description: savedDraft.formData?.description || '',
                        transactionDate: savedDraft.formData?.transactionDate || getLocalDateTime(),
                        category: savedDraft.formData?.category || '',
                        itemName: savedDraft.formData?.itemName || '',
                        unit: savedDraft.formData?.unit || 'TON',
                        invoiceNumber: savedDraft.formData?.invoiceNumber || '',
                        beneficiary: savedDraft.formData?.beneficiary || '',
                        transactionFrom: savedDraft.formData?.transactionFrom || '',
                        transactionTo: savedDraft.formData?.transactionTo || '',
                        paymentMethod: savedDraft.formData?.paymentMethod || 'CUSTODY_WALLET',
                        unitPrice: savedDraft.formData?.unitPrice || '',
                        quantity: savedDraft.formData?.quantity || '',
                        costCenter: savedDraft.formData?.costCenter || '',
                        physicalAccount: savedDraft.formData?.physicalAccount || '',
                        payerUserId: savedDraft.formData?.payerUserId || user?.id || '',
                        projectCostItemId: savedDraft.formData?.projectCostItemId || '',
                        workmanId: savedDraft.formData?.workmanId || '',
                        clientId: savedDraft.formData?.clientId || '',
                        paidByClientContact: savedDraft.formData?.paidByClientContact || '',
                        toEngineerId: savedDraft.formData?.toEngineerId || '',
                        safeId: savedDraft.formData?.safeId || formData.safeId || '',
                        targetSupplierId: savedDraft.formData?.targetSupplierId || '',
                        isOfficeExpense: Boolean(savedDraft.formData?.isOfficeExpense)
                    });
                    setHasRestoredDraft(true);
                } else {
                    // Reset for Create
                    setHasRestoredDraft(false);
                    setMode('EXPENSE');
                    setSelectedProjectId('');
                    setSelectedProject(null);
                    setIsStockPurchase(false);
                    setInventoryDestination('PROJECT');
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
                        beneficiary: '',
                        transactionFrom: '',
                        transactionTo: '',
                        paymentMethod: 'CUSTODY_WALLET',
                        unitPrice: '',
                        quantity: '',
                        costCenter: '',
                        physicalAccount: '',
                        payerUserId: user?.id || '',
                        projectCostItemId: '',
                        workmanId: '',
                        clientId: '',
                        paidByClientContact: '',
                        toEngineerId: '',
                        safeId: formData.safeId || '',
                        isOfficeExpense: false
                    });
                    setCostItemMode('NEW');
                }
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    // Auto-save form draft to localStorage whenever fields change in create mode
    useEffect(() => {
        if (!isOpen || initialData) return;
        const hasContent = formData.amount ||
            formData.description ||
            formData.itemName ||
            formData.invoiceNumber ||
            formData.beneficiary ||
            formData.transactionFrom ||
            formData.transactionTo ||
            formData.costCenter ||
            formData.physicalAccount ||
            formData.workmanId ||
            formData.clientId ||
            formData.paidByClientContact ||
            formData.toEngineerId ||
            selectedProjectId;

        if (hasContent) {
            saveFormDraft(TRANSACTION_DRAFT_KEY, {
                mode,
                selectedProjectId,
                costItemMode,
                isStockPurchase,
                inventoryDestination,
                selectedBatchId,
                formData
            });
        }
    }, [formData, selectedProjectId, mode, costItemMode, isStockPurchase, inventoryDestination, selectedBatchId, isOpen, initialData]);

    // Load Batches in USAGE mode or on open
    useEffect(() => {
        if (mode === 'USAGE' || isOpen) {
            loadBatches(selectedProjectId || undefined);
        }
        if (isOpen) {
            loadSafes();
        }
    }, [mode, selectedProjectId, isOpen]);

    const loadSafes = async () => {
        try {
            const res = await safesAPI.list();
            if (res?.data?.data) {
                const list = res.data.data;
                setSafes(list);
                if (!initialData) {
                    const defSafe = list.find(s => s.isDefault) || list[0];
                    if (defSafe) {
                        setFormData(prev => prev.safeId ? prev : ({ ...prev, safeId: defSafe.id }));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load company safes', e);
        }
    };

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
                setExistingBeneficiaries(res.data.data.beneficiaries || []);
                setExistingPhysicalAccounts(res.data.data.physicalAccounts || []);
                setExistingItemNames(res.data.data.itemNames || []);
            }
        } catch (e) { console.error("Failed to load options", e); }
    };

    const handleProjectChange = (e) => {
        const pId = e.target.value;
        setSelectedProjectId(pId);
        const proj = projects.find(p => p.id === pId);
        setSelectedProject(proj || null);
        if (proj?.client) {
            setFormData(prev => ({
                ...prev,
                clientId: proj.client.id,
                transactionFrom: prev.transactionFrom || proj.client.name
            }));
        }
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

            const detectedUnit = detectBatchUnit(batch, rawMaterials);
            const batchUnitPrice = batch.material?.unitPrice 
                ? batch.material.unitPrice.toString() 
                : (rawMaterials.find(m => m.id === batch.materialId)?.unitPrice?.toString() || '');

            setFormData(prev => ({
                ...prev,
                amount: prev.amount || (batch.remainingValue ? batch.remainingValue.toString() : ''),
                category: prev.category || 'MATERIALS',
                description: prev.description || (isRTL ? `استهلاك من دفعة: ${batch.description}` : `Usage from batch: ${batch.description}`),
                unit: detectedUnit || prev.unit || 'TON',
                unitPrice: prev.unitPrice || batchUnitPrice
            }));
            if (errors.batchId) setErrors(prev => ({ ...prev, batchId: '' }));
        }
    };

    // Auto-sync selectedBatch and unit when materialBatches or rawMaterials loads
    useEffect(() => {
        if (mode === 'USAGE' && selectedBatchId && materialBatches.length > 0) {
            const batch = materialBatches.find(b => b.id === selectedBatchId);
            if (batch) {
                setSelectedBatch(batch);
                const detectedUnit = detectBatchUnit(batch, rawMaterials);
                if (detectedUnit) {
                    setFormData(prev => {
                        if (!prev.unit || prev.unit === 'TON' || prev.unit !== detectedUnit) {
                            return { ...prev, unit: detectedUnit };
                        }
                        return prev;
                    });
                }
            }
        }
    }, [mode, selectedBatchId, materialBatches, rawMaterials]);

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

        if (mode === 'EXPENSE') {
            const isSupplierInv = (costItemMode === 'MATERIAL' || isStockPurchase) && inventoryDestination === 'SUPPLIER';

            if (!formData.isOfficeExpense && !isSupplierInv && !selectedProjectId) newErrors.projectId = t('common.required');
            if (!formData.safeId) newErrors.safeId = isRTL ? 'يرجى تحديد خزينة الصرف (إلزامي)' : 'Source safe is mandatory';
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (!formData.beneficiary?.trim() && !formData.workmanId && !formData.supplierId && !formData.targetSupplierId) {
                newErrors.beneficiary = t('finance.beneficiaryRequired') || (isRTL ? 'يرجى تحديد أو إدخال اسم المستفيد' : 'Beneficiary is required');
            }
            if (costItemMode === 'MATERIAL' || isStockPurchase) {
                if (!formData.materialId) newErrors.materialId = isRTL ? 'يرجى اختيار الخامة' : 'Please select material';
                if (isSupplierInv && !formData.targetSupplierId && !formData.supplierId) {
                    newErrors.targetSupplierId = isRTL ? 'يرجى اختيار المورد صاحب المخزون' : 'Please select supplier holding the inventory';
                }
            } else if (costItemMode === 'EXISTING') {
                if (!formData.projectCostItemId) newErrors.projectCostItemId = t('common.required');
            } else {
                if (!formData.category) newErrors.category = t('common.required');
            }
        }
        else if (mode === 'INCOME') {
            if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = t('common.required');
            if (!formData.safeId) newErrors.safeId = isRTL ? 'يرجى تحديد خزينة الإيداع (إلزامي)' : 'Destination safe is mandatory';
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
                const isOffice = Boolean(formData.isOfficeExpense);
                const isMaterial = (costItemMode === 'MATERIAL' || isStockPurchase) && !isOffice;
                const isSupplierInv = isMaterial && inventoryDestination === 'SUPPLIER';
                const chosenMaterial = isMaterial ? rawMaterials.find(m => m.id === formData.materialId) : null;
                const resolvedCategory = isMaterial ? 'MATERIALS' : (formData.category || (isOffice ? 'OFFICE_EXPENSES' : 'MATERIALS'));
                const resolvedItemName = isMaterial
                    ? (formData.itemName || (chosenMaterial ? (isRTL ? (chosenMaterial.nameAr || chosenMaterial.name) : chosenMaterial.name) : 'خامة مخزنية'))
                    : undefined;

                const effectiveSupplierId = isSupplierInv
                    ? (formData.targetSupplierId || formData.supplierId)
                    : (chosenMaterial?.supplierId || formData.supplierId);

                const resolvedBeneficiary = formData.beneficiary?.trim() || (!isOffice && formData.workmanId ? workmen.find(w => w.id === formData.workmanId)?.name : (effectiveSupplierId ? suppliers.find(s => s.id === effectiveSupplierId)?.name : undefined));

                payload = {
                    type: 'EXPENSE',
                    category: resolvedCategory,
                    amount: Number(formData.amount),
                    projectId: (isOffice || isSupplierInv) ? undefined : (selectedProjectId || undefined),
                    safeId: formData.safeId || undefined,
                    isOfficeExpense: isOffice,
                    projectCostItemId: (!isOffice && costItemMode === 'EXISTING') ? formData.projectCostItemId : undefined,
                    payerUserId: formData.payerUserId || user?.id,
                    workmanId: isOffice ? undefined : (formData.workmanId || undefined),
                    supplierId: effectiveSupplierId || undefined,
                    targetSupplierId: isSupplierInv ? effectiveSupplierId : undefined,
                    inventoryDestination: isSupplierInv ? 'SUPPLIER' : 'PROJECT',
                    beneficiary: resolvedBeneficiary || undefined,
                    createBatch: isMaterial,
                    materialId: (isMaterial && formData.materialId) ? formData.materialId : undefined,
                    description: formData.description?.trim() || (isOffice ? (isRTL ? 'مصروف مقر ومكتب' : 'Office Expense') : (resolvedItemName || t(`finance.categories.${resolvedCategory?.toLowerCase()}`) || resolvedCategory || 'Site Expense')),
                    transactionDate: formData.transactionDate,
                    paymentMethod: formData.paymentMethod,
                    itemName: resolvedItemName,
                    unit: isOffice ? (formData.unit || undefined) : (isMaterial ? (formData.unit || chosenMaterial?.unit) : (costItemMode === 'NEW' ? formData.unit : undefined)),
                    unitPrice: isOffice ? (formData.unitPrice ? Number(formData.unitPrice) : undefined) : (isMaterial ? (formData.unitPrice ? Number(formData.unitPrice) : (chosenMaterial?.unitPrice ? Number(chosenMaterial.unitPrice) : undefined)) : (costItemMode === 'NEW' && formData.unitPrice ? Number(formData.unitPrice) : undefined)),
                    quantity: formData.quantity ? Number(formData.quantity) : undefined,
                    costCenter: formData.costCenter || (isOffice ? (isRTL ? 'المقر الرئيسي' : 'Headquarters') : (isSupplierInv ? (isRTL ? 'مخزون مورد' : 'Supplier Inventory') : (selectedProject ? (isRTL ? `موقع ${selectedProject.name}` : `${selectedProject.name} Site`) : (isRTL ? 'المخزن الرئيسي' : 'Main Warehouse')))),
                    transactionTo: formData.transactionTo?.trim() || undefined,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'INCOME') {
                const resolvedClientId = formData.clientId || selectedProject?.client?.id || undefined;
                const chosenClient = clients.find(c => c.id === resolvedClientId);
                const clientName = chosenClient?.name || selectedProject?.client?.name || formData.transactionFrom || undefined;

                payload = {
                    type: 'INCOME',
                    category: 'PAYMENT',
                    amount: Number(formData.amount),
                    projectId: selectedProjectId || undefined,
                    safeId: formData.safeId || undefined,
                    isOfficeExpense: Boolean(formData.isOfficeExpense),
                    projectCostItemId: formData.projectCostItemId || undefined,
                    description: formData.description?.trim() || t('finance.categories.payment') || 'Client Payment',
                    transactionDate: formData.transactionDate,
                    clientId: resolvedClientId,
                    paidByClientContact: formData.paidByClientContact?.trim() || undefined,
                    paymentMethod: formData.paymentMethod || 'BANK_TRANSFER',
                    physicalAccount: formData.physicalAccount || undefined,
                    transactionFrom: clientName,
                    costCenter: formData.costCenter || undefined,
                    invoiceNumber: formData.invoiceNumber
                };
            }
            else if (mode === 'USAGE') {
                payload = {
                    materialBatchId: selectedBatchId,
                    valueConsumed: Number(formData.amount),
                    quantityConsumed: formData.quantity ? Number(formData.quantity) : undefined,
                    unit: formData.unit,
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

            let resTx = null;
            if (initialData && initialData.id && mode !== 'USAGE' && mode !== 'TRANSFER') {
                // UPDATE MODE
                resTx = await transactionsAPI.update(initialData.id, payload);
            } else {
                // CREATE MODE
                if (mode === 'USAGE') {
                    resTx = await materialUsageAPI.recordUsageV2(payload);
                } else if (mode === 'TRANSFER') {
                    resTx = await transactionsAPI.transferCustody(payload);
                } else {
                    // Both Income and Expense use V2 logic for profit splitting
                    resTx = await transactionsAPI.createV2(payload);
                }
            }

            // Upload attachment (receipt / check copy / transfer proof) if provided
            const targetTxId = initialData?.id || resTx?.data?.data?.id || resTx?.data?.id;
            if (targetTxId && attachmentFile) {
                try {
                    const fd = new FormData();
                    fd.append('file', attachmentFile);
                    await documentsAPI.uploadReceipt(targetTxId, fd);
                } catch (uploadErr) {
                    console.error("Attachment upload failed", uploadErr);
                }
            }

            if (onSubmit) onSubmit();
            if (!initialData) {
                clearFormDraft(TRANSACTION_DRAFT_KEY);
                setHasRestoredDraft(false);
            }
            onClose();
        } catch (error) {
            console.error("Submission Failed", error);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: "Failed to submit transaction: " + (error.response?.data?.message || error.message) });
        } finally {
            setLoading(false);
        }
    };

    const renderDropdownWithCustom = (name, label, options, placeholder, required = false, onSelect = null, error = null, containerStyle = {}) => {
        const hasValueNotInOptions = !!(formData[name] && !options.some(opt => opt.value === formData[name]));
        const isCustom = customInputs[name] || hasValueNotInOptions;

        const handleSelectChange = (e) => {
            const val = e.target.value;
            if (val === '__NEW__') {
                setCustomInputs(prev => ({ ...prev, [name]: true }));
                setFormData(prev => ({ ...prev, [name]: '' }));
                if (onSelect) onSelect('__NEW__', null);
            } else {
                handleChange(e);
                if (onSelect) {
                    const foundOpt = options.find(o => o.value === val);
                    onSelect(val, foundOpt);
                }
            }
        };

        const handleCancelCustom = () => {
            setCustomInputs(prev => ({ ...prev, [name]: false }));
            setFormData(prev => ({ ...prev, [name]: '' }));
            if (onSelect) onSelect('', null);
        };

        return (
            <div className="form-group" style={containerStyle}>
                <label>
                    {label} {required && <span className="required">*</span>}
                </label>
                {isCustom ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            name={name}
                            value={formData[name]}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={error ? 'error' : ''}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            onClick={handleCancelCustom}
                            className="btn-icon"
                            title={t('common.cancel') || 'Cancel'}
                            style={{ padding: '0 8px', color: '#ef4444', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <select
                        name={name}
                        value={formData[name]}
                        onChange={handleSelectChange}
                        className={error ? 'error' : ''}
                    >
                        <option value="">-- {t('common.select') || 'Select'} --</option>
                        {options.map((opt, i) => (
                            <option key={`${name}-${i}`} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                        <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            + {t('common.add_new') || (isRTL ? 'إضافة جديد...' : 'Add New...')}
                        </option>
                    </select>
                )}
                {error && <span className="error-message" style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{error}</span>}
            </div>
        );
    };

    const renderAttachmentUploader = () => {
        const isCheck = formData.paymentMethod === 'CHECK';
        const isBank = formData.paymentMethod === 'BANK_TRANSFER';
        const isCash = formData.paymentMethod === 'CASH';

        const title = isCheck
            ? (isRTL ? 'صورة الشيك / المرفق' : 'Check Attachment / Photo')
            : isBank
            ? (isRTL ? 'إيصال التحويل البنكي / إنستاباي' : 'Bank Transaction / InstaPay Receipt')
            : isCash
            ? (isRTL ? 'صورة الفاتورة / الإيصال الورقي' : 'Cash Receipt / Invoice Copy')
            : (isRTL ? 'المرفقات / صورة الإيصال أو الفاتورة' : 'Attachment / Receipt or Invoice Proof');

        const subtitle = isRTL
            ? 'اضغط هنا أو اسحب الملف لرفع المرفق (صور، PDF، ملفات CSV، إكسيل، أو مستندات)'
            : 'Click or drag & drop receipt / document (Images, PDFs, CSV, Excel, Word, Docs)';

        const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

        const handleFileSelection = (file) => {
            if (!file) return;
            if (file.size > MAX_FILE_SIZE) {
                showAlert({
                    type: 'warning',
                    title: isRTL ? 'حجم الملف كبير' : 'File Too Large',
                    message: isRTL ? 'الحد الأقصى لحجم الملف المرفوع هو 25 ميجابايت.' : 'Maximum allowed file size is 25 MB.'
                });
                return;
            }
            setAttachmentFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => setAttachmentPreview(ev.target.result);
                reader.readAsDataURL(file);
            } else {
                setAttachmentPreview(null);
            }
        };

        const handleFileChange = (e) => {
            const file = e.target.files?.[0];
            handleFileSelection(file);
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer?.files?.[0];
            handleFileSelection(file);
        };

        const handleRemove = () => {
            setAttachmentFile(null);
            setAttachmentPreview(null);
            setExistingReceiptUrl(null);
        };

        const getFileInfo = () => {
            let name = attachmentFile?.name || '';
            let ext = '';
            let sizeStr = '';

            if (attachmentFile) {
                ext = (name.split('.').pop() || '').toLowerCase();
                const sizeKB = attachmentFile.size / 1024;
                sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB.toFixed(1)} KB`;
            } else if (existingReceiptUrl) {
                const parts = existingReceiptUrl.split('/');
                name = parts[parts.length - 1]?.split('?')[0] || (isRTL ? 'مرفق سابق' : 'Stored Attachment');
                ext = (name.split('.').pop() || '').toLowerCase();
                sizeStr = isRTL ? 'ملف محفوظ مسبقاً' : 'Existing Attachment';
            }

            const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp', 'svg'].includes(ext) || attachmentFile?.type?.startsWith('image/');
            const isPdf = ext === 'pdf' || attachmentFile?.type === 'application/pdf';
            const isSpreadsheet = ['csv', 'xlsx', 'xls'].includes(ext) || attachmentFile?.type?.includes('csv') || attachmentFile?.type?.includes('spreadsheet') || attachmentFile?.type?.includes('excel');
            const isDoc = ['doc', 'docx', 'txt', 'rtf'].includes(ext) || attachmentFile?.type?.includes('word') || attachmentFile?.type?.includes('text');

            return { name, ext: ext.toUpperCase() || 'FILE', sizeStr, isImg, isPdf, isSpreadsheet, isDoc };
        };

        const fileInfo = (attachmentFile || existingReceiptUrl) ? getFileInfo() : null;
        const ACCEPT_TYPES = "image/*,application/pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

        return (
            <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Paperclip size={16} style={{ color: 'var(--color-primary)' }} />
                    {title}
                </label>

                {attachmentFile || existingReceiptUrl ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                            {fileInfo?.isImg && (attachmentPreview || existingReceiptUrl) ? (
                                <img
                                    src={attachmentPreview || (existingReceiptUrl.startsWith('http') ? existingReceiptUrl : `/uploads/${existingReceiptUrl.replace(/^(\/|uploads\/)/, '')}`)}
                                    alt="Receipt preview"
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        flexShrink: 0
                                    }}
                                />
                            ) : fileInfo?.isPdf ? (
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#ef4444',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <FileText size={20} />
                                    <span style={{ fontSize: '0.62rem', fontWeight: 'bold', marginTop: '1px' }}>PDF</span>
                                </div>
                            ) : fileInfo?.isSpreadsheet ? (
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '6px',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    color: '#10b981',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <FileSpreadsheet size={20} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', marginTop: '1px' }}>{fileInfo.ext}</span>
                                </div>
                            ) : (
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '6px',
                                    background: 'rgba(59, 130, 246, 0.12)',
                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                    color: '#3b82f6',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <FileText size={20} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', marginTop: '1px' }}>{fileInfo?.ext || 'DOC'}</span>
                                </div>
                            )}

                            <div style={{ overflow: 'hidden' }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={fileInfo?.name}>
                                    {fileInfo?.name}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {fileInfo?.sizeStr}
                                    </span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        fontWeight: 600
                                    }}>
                                        {fileInfo?.ext}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {existingReceiptUrl && !attachmentFile && (
                                <a
                                    href={existingReceiptUrl.startsWith('http') ? existingReceiptUrl : `/uploads/${existingReceiptUrl.replace(/^(\/|uploads\/)/, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-ghost"
                                    style={{ textDecoration: 'none', padding: '5px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    title={isRTL ? 'معاينة / فتح' : 'View / Open'}
                                >
                                    <ExternalLink size={14} />
                                    <span>{isRTL ? 'عرض' : 'View'}</span>
                                </a>
                            )}
                            <label
                                className="btn btn-sm btn-ghost"
                                style={{ cursor: 'pointer', margin: 0, padding: '5px 10px', fontSize: '0.8rem' }}
                            >
                                {isRTL ? 'تغيير' : 'Change'}
                                <input
                                    type="file"
                                    accept={ACCEPT_TYPES}
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="btn-icon"
                                title={isRTL ? 'حذف' : 'Remove'}
                                style={{ padding: '6px', color: '#ef4444', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '18px 14px',
                            borderRadius: '8px',
                            border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-color)',
                            background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                        }}
                    >
                        <Upload size={26} style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-secondary)', marginBottom: '8px' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {title}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {subtitle}
                        </span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '8px',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            color: 'var(--text-tertiary)'
                        }}>
                            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>📷 JPG/PNG/WebP</span>
                            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>📑 PDF</span>
                            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>📊 CSV/Excel</span>
                            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>📝 Word/Text</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>≤ 25 MB</span>
                        </div>
                        <input
                            type="file"
                            accept={ACCEPT_TYPES}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </label>
                )}
            </div>
        );
    };

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

                {/* Sub-Tabs under Expense Mode */}
                {mode === 'EXPENSE' && (
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-tertiary, rgba(0,0,0,0.03))',
                        borderBottom: '2px solid var(--border-color)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <button
                            type="button"
                            onClick={() => handleExpenseTypeChange(false)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                background: !formData.isOfficeExpense ? 'var(--bg-primary, #ffffff)' : 'transparent',
                                border: 'none',
                                borderBottom: !formData.isOfficeExpense ? '3px solid var(--color-primary)' : '3px solid transparent',
                                color: !formData.isOfficeExpense ? 'var(--color-primary)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Building2 size={16} />
                            <span>{isRTL ? 'مصاريف المشاريع والمواقع' : 'Project / Site Expense'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExpenseTypeChange(true)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                background: formData.isOfficeExpense ? 'var(--bg-primary, #ffffff)' : 'transparent',
                                border: 'none',
                                borderBottom: formData.isOfficeExpense ? '3px solid var(--color-primary)' : '3px solid transparent',
                                color: formData.isOfficeExpense ? 'var(--color-primary)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Briefcase size={16} />
                            <span>{isRTL ? 'مصاريف المقر والمكتب الإداري' : 'Office & Headquarters Expense'}</span>
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="modal-body">
                    {hasRestoredDraft && !initialData && (
                        <DraftBanner onDiscard={handleDiscardDraft} />
                    )}
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
                                {t('nav.projects')} {mode !== 'TRANSFER' && !formData.isOfficeExpense && !(costItemMode === 'MATERIAL' && inventoryDestination === 'SUPPLIER') ? <span className="required">*</span> : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>({isRTL ? 'غير مطلوب' : 'Not required'})</span>}
                            </label>
                            {formData.isOfficeExpense ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.09)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: 'var(--text-primary)'
                                }}>
                                    <span style={{ fontSize: '1.2rem' }}>🏢</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                            {isRTL ? 'المقر الرئيسي / المكتب الإداري' : 'Headquarters / Main Office'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {isRTL ? 'مصروف عام للشركة بدون ربط بمشروع محدد' : 'General company expense without project association'}
                                        </div>
                                    </div>
                                </div>
                            ) : (costItemMode === 'MATERIAL' && inventoryDestination === 'SUPPLIER') ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(124, 58, 237, 0.09)',
                                    border: '1px solid rgba(124, 58, 237, 0.35)',
                                    color: 'var(--text-primary)'
                                }}>
                                    <Store size={22} style={{ color: '#7c3aed', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7c3aed' }}>
                                            {isRTL ? 'مخزون مورد (بدون مشروع)' : "Supplier's Inventory (No Project)"}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {isRTL ? 'يُحفظ برصيد المورد كأصل خامات للاستهلاك لاحقاً بالمشاريع' : 'Stored in supplier balance as a material asset for future site usage'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
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
                            )}
                            {errors.projectId && !(costItemMode === 'MATERIAL' && inventoryDestination === 'SUPPLIER') && <span className="error-message">{errors.projectId}</span>}
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

                        {/* Transaction Payer - Inside primary card for expenses */}
                        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'PROJECT_MANAGER') && (mode === 'EXPENSE') && (
                            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0, marginTop: 'var(--spacing-sm)' }}>
                                <label style={{ fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>{t('finance.paidBy') || 'مين اللي دفع من الشركة؟'}</label>
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



                        {/* Mandatory Safe Selector for Expense and Income */}
                        {(mode === 'EXPENSE' || mode === 'INCOME') && (
                            <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '10px', marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700 }}>
                                    <Wallet size={16} style={{ color: mode === 'INCOME' ? '#10b981' : '#f59e0b' }} />
                                    <span>
                                        {mode === 'EXPENSE'
                                            ? (isRTL ? 'خزينة الصرف (الخزينة/الحساب المالي الذي خرجت منه الأموال)' : 'Source Safe / Account')
                                            : (isRTL ? 'خزينة الإيداع (الخزينة/الحساب المالي الذي أودعت فيه الأموال)' : 'Destination Safe / Account')}
                                    </span>
                                    <span className="required" style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    name="safeId"
                                    value={formData.safeId || ''}
                                    onChange={handleChange}
                                    className={errors.safeId ? 'error' : ''}
                                    style={{
                                        fontSize: '0.95rem',
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-secondary)',
                                        border: errors.safeId ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        width: '100%',
                                        fontWeight: 500
                                    }}
                                >
                                    <option value="">
                                        -- {isRTL ? 'اختر الخزينة أو الحساب المالي (إلزامي)' : 'Select Safe / Account (Mandatory)'} --
                                    </option>
                                    {safes.map(s => {
                                        const typeLabel = s.type === 'BANK_ACCOUNT' ? (isRTL ? `حساب بنكي - ${s.bankName || ''}` : `Bank - ${s.bankName || ''}`)
                                            : s.type === 'MOBILE_WALLET' ? (isRTL ? 'محفظة إلكترونية' : 'Mobile Wallet')
                                            : s.type === 'OWNER_ACCOUNT' ? (isRTL ? 'حساب شريك/مدير' : 'Owner/Manager Account')
                                            : (isRTL ? 'خزينة نقدية (كاش)' : 'Cash Safe');
                                        const custodianText = s.assignedUser ? ` • ${isRTL ? 'المسؤول' : 'Custodian'}: ${s.assignedUser.name}` : '';
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({typeLabel}{custodianText}) - {isRTL ? 'الرصيد' : 'Balance'}: {fmtCurrency(s.balance)}
                                            </option>
                                        );
                                    })}
                                </select>
                                {errors.safeId && (
                                    <span className="error-message" style={{ color: '#ef4444', fontSize: '0.8rem', display: 'block', marginTop: '3px' }}>
                                        {errors.safeId}
                                    </span>
                                )}
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
                                        {/* 3-Way Item Type Toggle: Only for Project Expenses */}
                                        {!formData.isOfficeExpense && (
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
                                        )}

                                        {/* Option 1: Registered Raw Material Selector & Inventory Destination */}
                                        {!formData.isOfficeExpense && costItemMode === 'MATERIAL' && (
                                            <>
                                                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                        {isRTL ? 'جهة تخزين وتوريد الخامة (أين سيتم حفظ الرصيد؟):' : 'Stock Destination (Where will the stock be stored?):'}
                                                    </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', background: 'var(--bg-tertiary, rgba(0,0,0,0.05))', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${inventoryDestination === 'PROJECT' ? 'btn-primary' : 'btn-ghost'}`}
                                                            onClick={() => {
                                                                setInventoryDestination('PROJECT');
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    costCenter: selectedProject ? (isRTL ? `مخزن مشروع ${selectedProject.name}` : `${selectedProject.name} Site Warehouse`) : prev.costCenter
                                                                }));
                                                            }}
                                                            style={{ borderRadius: '7px', fontSize: '0.85rem', fontWeight: inventoryDestination === 'PROJECT' ? '700' : '500' }}
                                                        >
                                                            🏗️ {isRTL ? 'مخزون المشروع (في الموقع)' : 'Project Inventory (On Site)'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${inventoryDestination === 'SUPPLIER' ? 'btn-primary' : 'btn-ghost'}`}
                                                            onClick={() => {
                                                                setInventoryDestination('SUPPLIER');
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    costCenter: isRTL ? 'مخزن لدى المورد' : 'Supplier Inventory'
                                                                }));
                                                            }}
                                                            style={{ 
                                                                borderRadius: '7px', 
                                                                fontSize: '0.85rem', 
                                                                fontWeight: inventoryDestination === 'SUPPLIER' ? '700' : '500',
                                                                background: inventoryDestination === 'SUPPLIER' ? '#8b5cf6' : 'transparent',
                                                                color: inventoryDestination === 'SUPPLIER' ? '#ffffff' : 'inherit'
                                                            }}
                                                        >
                                                            🏬 {isRTL ? 'مخزون لدى المورد (حساب المورد)' : 'Supplier Inventory (Held at Supplier)'}
                                                        </button>
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '5px', padding: '0 4px' }}>
                                                        {inventoryDestination === 'SUPPLIER'
                                                            ? (isRTL 
                                                                ? 'ℹ️ سيتم شراء الخامة وإضافتها في رصيد مخزن المورد دون خصم تكلفة من المشروع الآن. وعند صرفها لاحقاً لأي مشروع يتم توجيه التكلفة والأرباح للمشروع المستفيد.'
                                                                : 'ℹ️ Material is held in the supplier’s inventory balance without debiting a project now. When disbursed later, costs & profits are assigned to the consuming project.')
                                                            : (isRTL 
                                                                ? 'ℹ️ سيتم إدخال الخامة مباشرة في رصيد ومخزن المشروع المختار وتظهر في بطاقات مخزون المشروع.'
                                                                : 'ℹ️ Material will be stored directly in the selected project inventory.')
                                                        }
                                                    </div>
                                                </div>

                                                {inventoryDestination === 'SUPPLIER' && (
                                                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                                            <Store size={16} style={{ color: '#8b5cf6' }} />
                                                            <span>{isRTL ? 'المورد المحتفظ بالمخزون لديه' : 'Supplier Storing the Stock'}</span>
                                                            <span className="required" style={{ color: '#ef4444' }}>*</span>
                                                        </label>
                                                        <select
                                                            name="targetSupplierId"
                                                            value={formData.targetSupplierId || ''}
                                                            onChange={(e) => {
                                                                const sId = e.target.value;
                                                                const supp = suppliers.find(s => s.id === sId);
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    targetSupplierId: sId,
                                                                    beneficiary: supp?.name || prev.beneficiary,
                                                                    costCenter: supp ? (isRTL ? `مخزن مورد: ${supp.name}` : `Supplier: ${supp.name}`) : prev.costCenter
                                                                }));
                                                                if (errors.targetSupplierId) setErrors(prev => ({ ...prev, targetSupplierId: '' }));
                                                            }}
                                                            className={errors.targetSupplierId ? 'error' : ''}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600' }}
                                                        >
                                                            <option value="">-- {isRTL ? 'اختر المورد الذي ستبقى الخامة في مخزنه' : 'Select Supplier Holding the Inventory'} --</option>
                                                            {suppliers.map(s => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name} {s.phone ? `(${s.phone})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {errors.targetSupplierId && (
                                                            <span className="error-message" style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                                                {errors.targetSupplierId}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

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
                                            </>
                                        )}

                                        {/* Option 2: Band Selection (If Existing Band) */}
                                        {!formData.isOfficeExpense && costItemMode === 'EXISTING' && (
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

                                        {/* Option 3: Category (If Direct Category Expense) */}
                                        {(formData.isOfficeExpense || costItemMode === 'NEW') && (
                                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <label style={{ marginBottom: 0 }}>
                                                        {formData.isOfficeExpense
                                                            ? (isRTL ? 'بند مصروفات المقر والمكتب' : 'Office Cost Category')
                                                            : t('finance.category')} <span className="required">*</span>
                                                    </label>
                                                    {formData.isOfficeExpense && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                            🏢 {isRTL ? 'تصنيفات خاصة بالمقر والمكتب الإداري' : 'Dedicated HQ & Office Categories'}
                                                        </span>
                                                    )}
                                                </div>
                                                <select
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className={errors.category ? 'error' : ''}
                                                    style={{ fontSize: '0.95rem', padding: '10px' }}
                                                >
                                                    <option value="">
                                                        -- {formData.isOfficeExpense
                                                            ? (isRTL ? 'اختر بند مصروف المقر (إيجار، فواتير، صيانة...)' : 'Select Office Category (Rent, Bills, etc.)')
                                                            : t('finance.selectCategory')} --
                                                    </option>
                                                    {displayCategories.map(group => (
                                                        <optgroup key={group.group} label={isRTL ? group.groupNameAr : (group.groupNameEn || group.groupNameAr)}>
                                                            {group.items.map(item => (
                                                                <option key={item.key} value={item.key}>
                                                                    {isRTL ? item.ar : (item.en || item.ar)}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                {errors.category && <span className="error-message" style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{errors.category}</span>}
                                            </div>
                                        )}

                                        {renderDropdownWithCustom(
                                            "costCenter",
                                            formData.isOfficeExpense
                                                ? (isRTL ? 'مركز التكلفة / القسم' : 'Cost Center / Department')
                                                : t('finance.costCenter'),
                                            formData.isOfficeExpense
                                                ? officeCostCenterSuggestions
                                                : existingCostCenters.map(cc => ({ value: cc, label: cc })),
                                            formData.isOfficeExpense
                                                ? (isRTL ? 'المقر الرئيسي، الإدارة، بوفيه، صيانة المكتب...' : 'e.g. Headquarters, Admin, Buffet...')
                                                : "e.g. Block A"
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

                                        {renderDropdownWithCustom(
                                            "beneficiary",
                                            formData.isOfficeExpense
                                                ? (isRTL ? 'الجهة المستفيدة / المستلم' : 'Beneficiary / Payee')
                                                : (t('finance.beneficiary') || (isRTL ? 'المستفيد' : 'Beneficiary')),
                                            formData.isOfficeExpense
                                                ? officeBeneficiarySuggestions
                                                : [
                                                    ...suppliers.map(s => ({ value: s.name, label: `${s.name} (${t('suppliers.title')})` })),
                                                    ...workmen.map(w => ({ value: w.name, label: `${w.name} (${formatTrade(w.trade)})` })),
                                                    ...clients.map(c => ({ value: c.name, label: `${c.name} (${t('clients.title')})` })),
                                                    ...users.map(u => ({ value: u.name, label: `${u.name} (${formatUserRole(u.role)})` })),
                                                    ...existingBeneficiaries.map(b => ({ value: b, label: b }))
                                                ].reduce((acc, current) => {
                                                    const x = acc.find(item => item.value === current.value);
                                                    if (!x) { return acc.concat([current]); } else { return acc; }
                                                }, []),
                                            formData.isOfficeExpense
                                                ? (isRTL ? "اسم المستفيد (مالك المقر / الكهرباء / مزود النت / الموظف / سوبرماركت)..." : "e.g. Landlord, Utility Co, ISP, Employee...")
                                                : (t('finance.beneficiaryPlaceholder') || (isRTL ? "أدخل اسم المستفيد (الشركة / المورد / المقاول / الصنايعي)..." : "e.g. Supplier, Subcontractor, Beneficiary...")),
                                            true,
                                            null,
                                            errors.beneficiary
                                        )}

                                        {renderDropdownWithCustom(
                                            "transactionTo",
                                            t('finance.transactionTo') || (isRTL ? 'المستلم / باليد' : 'Handover Recipient / Handed to'),
                                            [
                                                ...users.map(u => ({ value: u.name, label: `${u.name} (${formatUserRole(u.role)})` })),
                                                ...workmen.map(w => ({ value: w.name, label: `${w.name} (${formatTrade(w.trade)})` })),
                                                ...clients.map(c => ({ value: c.name, label: `${c.name} (${t('clients.title')})` })),
                                                ...suppliers.map(s => ({ value: s.name, label: `${s.name} (${t('suppliers.title')})` })),
                                                ...existingTransactionTos.map(tt => ({ value: tt, label: tt }))
                                            ].reduce((acc, current) => {
                                                const x = acc.find(item => item.value === current.value);
                                                if (!x) { return acc.concat([current]); } else { return acc; }
                                            }, []),
                                            formData.isOfficeExpense
                                                ? (isRTL ? "اسم الشخص المستلم فعلياً (إن كان مختلفاً عن المستفيد)..." : "Handover person (if different from payee)...")
                                                : (t('finance.transactionToPlaceholder') || (isRTL ? "اسم الشخص المستلم فعلياً (إن كان مختلفاً عن المستفيد)..." : "e.g. Courier, Foreman, Site rep (if different)...")),
                                            false
                                        )}

                                        {renderAttachmentUploader()}

                                        {/* Workman Selection (Only for Labor Categories in Site Projects) */}
                                        {(() => {
                                            if (formData.isOfficeExpense) return null;
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
                                        {formData.isOfficeExpense ? (
                                            <>
                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                                                        {t('finance.amount')} (EGP) <span className="required" style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <CurrencyInput
                                                        name="amount"
                                                        value={formData.amount}
                                                        onChange={handleChange}
                                                        placeholder="0.00"
                                                        className={errors.amount ? 'error' : ''}
                                                        style={{ fontWeight: 'bold', fontSize: '1.25rem', padding: '12px' }}
                                                    />
                                                    {errors.amount && <span className="error-message">{errors.amount}</span>}
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('finance.quantity')} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({isRTL ? 'اختياري' : 'Optional'})</span></label>
                                                    <input
                                                        type="number"
                                                        name="quantity"
                                                        value={formData.quantity}
                                                        onChange={handleChange}
                                                        step="0.01"
                                                        placeholder="1"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('finance.uom')} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({isRTL ? 'اختياري' : 'Optional'})</span></label>
                                                    <select name="unit" value={formData.unit || 'PIECE'} onChange={handleChange}>
                                                        <option value="PIECE">{isRTL ? 'قطعة / عدد' : 'Piece / Item'}</option>
                                                        <option value="MONTH">{isRTL ? 'شهر (إيجار / اشتراك)' : 'Month (Rent / Sub)'}</option>
                                                        <option value="PACKAGE">{isRTL ? 'علبة / باقة / كرتونة' : 'Package / Box'}</option>
                                                        <option value="KG">{t('finance.uom_options.kg')}</option>
                                                        <option value="LITER">{t('finance.uom_options.liter')}</option>
                                                        <option value="OTHER">{isRTL ? 'أخرى' : 'Other'}</option>
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
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
                                            <label style={{ fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
                                                {t('clients.title', 'الجهة الدافعة (العميل)')} <span className="required">*</span>
                                            </label>
                                            <select
                                                name="clientId"
                                                value={formData.clientId || selectedProject?.client?.id || ''}
                                                onChange={(e) => {
                                                    const cId = e.target.value;
                                                    const chosen = clients.find(c => c.id === cId);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        clientId: cId,
                                                        transactionFrom: chosen ? chosen.name : prev.transactionFrom
                                                    }));
                                                }}
                                                style={{ fontSize: '0.95rem', padding: '10px', width: '100%' }}
                                            >
                                                <option value="">-- {t('clients.selectClient', 'اختر العميل')} --</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} {c.company ? `(${c.company})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
                                                {isRTL ? 'اسم القائم بالدفع من طرف العميل / المفوض' : 'Who Paid (Client Representative)'}
                                            </label>
                                            <input
                                                type="text"
                                                name="paidByClientContact"
                                                value={formData.paidByClientContact || ''}
                                                onChange={handleChange}
                                                placeholder={isRTL ? 'مثال: م/ يوسف للشيخ أو المحاسب أحمد' : 'e.g. Eng. Youssef / Rep'}
                                                style={{ fontSize: '0.95rem', padding: '10px', width: '100%' }}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
                                                {t('finance.paymentMethod', 'طريقة الدفع')}
                                            </label>
                                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} style={{ fontSize: '0.95rem', padding: '10px', width: '100%' }}>
                                                <option value="BANK_TRANSFER">{t('finance.methods.bankTransfer', isRTL ? 'تحويل بنكي / إنستاباي' : 'Bank Transaction / InstaPay')}</option>
                                                <option value="CASH">{t('finance.methods.cash', 'نقداً (كاش)')}</option>
                                                <option value="CHECK">{t('finance.methods.check', 'شيك')}</option>
                                                <option value="CREDIT_CARD">{t('finance.methods.creditCard', 'بطاقة ائتمان')}</option>
                                            </select>
                                        </div>

                                        {renderDropdownWithCustom(
                                            "physicalAccount",
                                            `${t('finance.physicalAccount')} (Safe)`,
                                            existingPhysicalAccounts.map(pa => ({ value: pa, label: pa })),
                                            "e.g. Main Safe"
                                        )}

                                        {renderAttachmentUploader()}
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

                                    {selectedProject && selectedProject.revenueModel === 'EXECUTION_COST_PLUS' && (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '14px 18px',
                                            background: 'rgba(59, 130, 246, 0.08)',
                                            border: '1px solid rgba(59, 130, 246, 0.25)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }}>
                                            <div style={{ fontSize: '1.3rem', marginTop: '1px' }}>💡</div>
                                            <div style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                                                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>
                                                    {isRTL ? 'إيداع كامل في خزينة المشروع التشغيلية (100%)' : '100% Credited to Project Safe'}
                                                </strong>
                                                {isRTL
                                                    ? `كامل مبلغ الإيداع المستلم يُضاف إلى رصيد خزينة/عهدة المشروع لتغطية بنود وتكاليف التنفيذ. وتُحسب نسبة أتعاب الإدارة والإشراف (${selectedProject.managementFeePercent || 15}%) آلياً من المصروفات الفعلية المنفذة في المشروع.`
                                                    : `100% of this payment will be credited to the project operational safe. The management fee (${selectedProject.managementFeePercent || 15}%) is automatically calculated and transferred upon actual project expenditures.`
                                                }
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
                                            <label>
                                                {t('finance.uom')}
                                                {selectedBatch && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginInlineStart: '6px', fontWeight: 600 }}>
                                                        ({isRTL ? 'محدد تلقائياً حسب الخامة' : 'Auto-selected for material'})
                                                    </span>
                                                )}
                                            </label>
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

                                        {renderAttachmentUploader()}
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

                                        {renderAttachmentUploader()}
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
                                placeholder={mode === 'TRANSFER' ? t('finance.transferNotesPlaceholder', 'مثال: عهدة موقع لتغطية مشتريات عاجلة...') : (formData.isOfficeExpense ? (isRTL ? 'بيان المصروف بالتفصيل (مثل: فاتورة كهرباء شهر 9، شراء مستلزمات بوفيه، إيجار المقر...)' : 'Office expense details (e.g. Electricity bill, Buffet supplies, Office rent...)') : t('finance.usagePlaceholder'))} 
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
