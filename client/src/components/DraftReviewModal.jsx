import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    Sparkles, Save, Trash2, RefreshCw, X, Volume2, ImageIcon, AlertCircle, Loader2, FileText, ExternalLink,
    Building2, Briefcase, ArrowUpRight, ArrowDownLeft, Users, Wallet
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import {
    draftsAPI, projectsAPI, suppliersAPI, clientsAPI, transactionsAPI, categoriesAPI, userAPI
} from '../services/api';
import { useFormat } from '../utils/format';
import './Modal.css';

// Modal review for an AI-captured draft. Renders over /drafts (or any page
// that opens it) so the user doesn't lose their list context.
//
// Supports:
// - EXPENSE (Site Project Expense OR Office/HQ Overhead)
// - INCOME (Client payments, revenues, collections)
// - Full category tree, multi-item breakdown, and bilingual AI matching badges.

const PAYMENT_METHODS = [
    { value: 'CUSTODY_WALLET', label: 'Custody Wallet', labelAr: 'عهدة مهندس' },
    { value: 'CASH',           label: 'Cash',           labelAr: 'كاش / نقدي' },
    { value: 'BANK_TRANSFER',  label: 'Bank Transfer',  labelAr: 'تحويل بنكي / إنستاباي' },
    { value: 'CHECK',          label: 'Check',          labelAr: 'شيك' },
    { value: 'CREDIT_CARD',    label: 'Credit Card',    labelAr: 'بطاقة ائتمان' },
    { value: 'OTHER',          label: 'Other',          labelAr: 'أخرى' }
];

export default function DraftReviewModal({ draftId, isOpen, onClose, onCommitted }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const { currency } = useFormat();

    const [draft, setDraft] = useState(null);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [categoryGroups, setCategoryGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [rematching, setRematching] = useState(false);

    const [form, setForm] = useState({
        type: 'EXPENSE',
        isOfficeExpense: false,
        amount: '',
        category: 'OTHER',
        description: '',
        projectId: '',
        supplierId: '',
        clientId: '',
        transactionDate: '',
        // Rich fields
        itemName: '',
        quantity: '',
        unit: '',
        unitPrice: '',
        costCenter: '',
        paymentMethod: 'CUSTODY_WALLET',
        beneficiary: '',
        transactionTo: '',
        payerUserId: ''
    });

    useEffect(() => {
        if (!isOpen || !draftId) return;
        const load = async () => {
            try {
                setLoading(true);
                const [dRes, pRes, sRes, clRes, uRes, cRes] = await Promise.all([
                    draftsAPI.get(draftId),
                    projectsAPI.getAll(),
                    suppliersAPI.getAll(),
                    clientsAPI.getAll().catch(() => ({ data: { data: [] } })),
                    userAPI.getAll().catch(() => ({ data: { data: [] } })),
                    categoriesAPI.list(true).catch(() => ({ data: { data: [] } }))
                ]);

                const d = dRes.data.data;
                setDraft(d);
                setProjects(pRes.data.data || []);
                setSuppliers(sRes.data.data || []);
                setClients(clRes.data.data || []);
                setUsers(uRes.data?.data || []);
                setCategoryGroups(cRes.data?.data || []);

                const md = d.matchedDraft || {};
                const firstItem = Array.isArray(md.items) && md.items.length ? md.items[0] : null;
                const detectedType = md.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
                const isOffice = Boolean(md.isOfficeExpense);

                setForm({
                    type: detectedType,
                    isOfficeExpense: isOffice,
                    amount: md.amount != null ? String(md.amount) : '',
                    category: md.category || (detectedType === 'INCOME' ? 'PAYMENT' : (isOffice ? 'OFFICE_EXPENSES' : 'OTHER')),
                    description: md.description || '',
                    projectId: isOffice ? '' : (md.projectId || ''),
                    supplierId: md.supplierId || '',
                    clientId: md.clientId || '',
                    transactionDate: md.transactionDate || new Date().toISOString().slice(0, 10),
                    itemName: firstItem?.name || '',
                    quantity: firstItem?.quantity != null ? String(firstItem.quantity) : '',
                    unit: firstItem?.unit || '',
                    unitPrice: firstItem?.unitPrice != null ? String(firstItem.unitPrice) : '',
                    costCenter: md.costCenter || '',
                    paymentMethod: md.paymentMethod || (detectedType === 'INCOME' ? 'BANK_TRANSFER' : (isOffice ? 'CASH' : 'CUSTODY_WALLET')),
                    beneficiary: md.beneficiary || (md.supplierId ? (sRes.data.data || []).find(s => s.id === md.supplierId)?.name : '') || (md.clientId ? (clRes.data.data || []).find(c => c.id === md.clientId)?.name : '') || '',
                    transactionTo: md.transactionTo || '',
                    payerUserId: md.payerUserId || d.createdById || ''
                });
            } catch (err) {
                showAlert({
                    type: 'error',
                    title: t('common.error', 'Error'),
                    message: err.response?.data?.message || 'Failed to load draft'
                });
                onClose?.();
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftId, isOpen]);

    if (!isOpen || !draftId) return null;

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleTypeSwitch = (newType) => {
        setForm(prev => ({
            ...prev,
            type: newType,
            isOfficeExpense: newType === 'INCOME' ? false : prev.isOfficeExpense,
            category: newType === 'INCOME' ? 'PAYMENT' : (prev.isOfficeExpense ? 'OFFICE_EXPENSES' : 'OTHER'),
            paymentMethod: newType === 'INCOME' && prev.paymentMethod === 'CUSTODY_WALLET' ? 'BANK_TRANSFER' : prev.paymentMethod
        }));
    };

    const handleOfficeExpenseToggle = (isOffice) => {
        setForm(prev => ({
            ...prev,
            isOfficeExpense: isOffice,
            projectId: isOffice ? '' : prev.projectId,
            category: isOffice ? 'OFFICE_EXPENSES' : (prev.category === 'OFFICE_EXPENSES' ? 'OTHER' : prev.category)
        }));
    };

    const handleRematch = async () => {
        try {
            setRematching(true);
            const r = await draftsAPI.rematch(draftId);
            const md = r.data.data.matchedDraft || {};
            const isOffice = Boolean(md.isOfficeExpense);
            const rematchedType = md.type === 'INCOME' ? 'INCOME' : 'EXPENSE';

            setForm(prev => ({
                ...prev,
                type: rematchedType,
                isOfficeExpense: isOffice,
                projectId: isOffice ? '' : (md.projectId || prev.projectId || ''),
                supplierId: md.supplierId || prev.supplierId || '',
                clientId: md.clientId || prev.clientId || '',
                category: md.category || prev.category || (rematchedType === 'INCOME' ? 'PAYMENT' : 'OTHER'),
                paymentMethod: md.paymentMethod || prev.paymentMethod || 'CASH',
                payerUserId: md.payerUserId || prev.payerUserId || ''
            }));
            setDraft(r.data.data);
            showAlert({ type: 'success', title: t('common.success', 'Done'), message: t('drafts.rematched', 'Re-matched against your latest data') });
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Re-match failed'
            });
        } finally {
            setRematching(false);
        }
    };

    const handleDiscard = () => {
        showAlert({
            type: 'warning',
            title: isRTL ? 'إلغاء المسودة' : 'Discard Draft',
            message: isRTL ? 'هل أنت متأكد من إلغاء هذه المسودة؟ لن تظهر في قائمة المراجعة مجدداً.' : 'Are you sure you want to discard this draft? It will be archived.',
            confirmText: isRTL ? 'نعم، إلغاء' : 'Yes, discard',
            cancelText: isRTL ? 'تراجع' : 'Cancel',
            onConfirm: async () => {
                try {
                    await draftsAPI.discard(draftId);
                    showAlert({
                        type: 'info',
                        title: t('common.done', 'Done'),
                        message: t('drafts.discarded', 'Draft discarded.')
                    });
                    onCommitted?.();
                    onClose?.();
                } catch (err) {
                    showAlert({
                        type: 'error',
                        title: t('common.error', 'Error'),
                        message: err.response?.data?.message || 'Discard failed'
                    });
                }
            }
        });
    };

    const handleSaveDraft = async () => {
        try {
            setSavingDraft(true);
            const matchedDraft = {
                ...(draft.matchedDraft || {}),
                type: form.type,
                isOfficeExpense: form.isOfficeExpense,
                amount: form.amount === '' ? null : Number(form.amount),
                category: form.category,
                description: form.description,
                projectId: form.isOfficeExpense ? null : (form.projectId || null),
                supplierId: form.supplierId || null,
                clientId: form.clientId || null,
                transactionDate: form.transactionDate || null,
                itemName: form.itemName,
                quantity: form.quantity === '' ? null : Number(form.quantity),
                unit: form.unit,
                unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
                costCenter: form.costCenter,
                paymentMethod: form.paymentMethod,
                payerUserId: form.payerUserId,
                beneficiary: form.beneficiary,
                transactionTo: form.transactionTo
            };
            const r = await draftsAPI.update(draftId, matchedDraft);
            setDraft(r.data.data);
            showAlert({
                type: 'success',
                title: t('common.success', 'Saved'),
                message: t('drafts.draftSaved', 'Draft saved. You can come back and finish later.')
            });
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: fieldErrors || data?.message || 'Failed to save draft'
            });
        } finally {
            setSavingDraft(false);
        }
    };

    const handleCommit = async () => {
        if (!form.amount || Number(form.amount) <= 0) {
            return showAlert({
                type: 'error',
                title: t('drafts.missingAmount', 'Missing amount'),
                message: t('drafts.missingAmountHint', 'Please set the amount before saving.')
            });
        }

        // Project is required ONLY for site project expenses
        if (form.type === 'EXPENSE' && !form.isOfficeExpense && !form.projectId) {
            return showAlert({
                type: 'error',
                title: t('drafts.missingProject', 'Missing project'),
                message: t('drafts.missingProjectHint', 'Please choose the project this transaction belongs to.')
            });
        }

        try {
            setSaving(true);
            const isVoice = draft?.source === 'VOICE' || (draft?.originalMediaMime && draft?.originalMediaMime.startsWith('audio/'));

            const payload = {
                type: form.type || 'EXPENSE',
                isOfficeExpense: form.type === 'EXPENSE' ? Boolean(form.isOfficeExpense) : false,
                amount: Number(form.amount),
                category: form.category,
                projectId: form.isOfficeExpense ? undefined : (form.projectId || undefined),
                clientId: form.type === 'INCOME' ? (form.clientId || undefined) : undefined,
                supplierId: form.type === 'EXPENSE' ? (form.supplierId || undefined) : undefined,
                beneficiary: form.beneficiary || (form.type === 'INCOME' && form.clientId ? clients.find(c => c.id === form.clientId)?.name : undefined) || (form.supplierId ? suppliers.find(s => s.id === form.supplierId)?.name : undefined) || undefined,
                payerUserId: form.payerUserId || undefined,
                costCenter: form.costCenter || undefined,
                transactionTo: form.transactionTo || undefined,
                itemName: form.itemName || undefined,
                unit: form.unit || undefined,
                quantity: form.quantity ? Number(form.quantity) : undefined,
                unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
                voiceNoteUrl: isVoice ? draft?.originalMediaUrl : undefined,
                receiptPhotoUrl: !isVoice ? draft?.originalMediaUrl : undefined,
                aiRawText: draft?.transcript || (typeof draft?.rawExtraction?.summary === 'string' ? draft.rawExtraction.summary : undefined),
                aiExtractedData: draft?.rawExtraction || undefined,
                description: form.description,
                transactionDate: form.transactionDate || undefined,
                paymentMethod: form.paymentMethod || undefined
            };

            const txRes = await transactionsAPI.create(payload);
            const newTx = txRes.data.data;
            await draftsAPI.commit(draftId, newTx.id);

            showAlert({
                type: 'success',
                title: t('common.success', 'Saved'),
                message: isRTL ? 'تم حفظ المعاملة بنجاح ونقل المسودة إلى السجل.' : 'Transaction saved. Draft moved to history.'
            });
            onCommitted?.();
            onClose?.();
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: fieldErrors || data?.message || 'Failed to save transaction'
            });
        } finally {
            setSaving(false);
        }
    };

    const md = draft?.matchedDraft || {};
    const matches = draft?.matches || {};
    const isReadOnly = draft && draft.status !== 'PENDING_REVIEW';
    const isVoice = draft?.source === 'VOICE' || (draft?.originalMediaMime && draft?.originalMediaMime?.startsWith('audio/'));

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 940, width: '95%', maxHeight: '92vh' }}
            >
                <div className="modal-header">
                    <h2 className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <Sparkles size={20} style={{ color: '#f59e0b' }} />
                        {t('drafts.reviewTitle', 'Review AI draft')}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto' }}>
                    {loading ? (
                        <div className="flex-center" style={{ minHeight: 280 }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="grid grid-2" style={{ gap: 20, alignItems: 'start' }}>
                            {/* LEFT: Media & AI Analysis Review */}
                            <div className="card" style={{ padding: 16 }}>
                                <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: 12 }}>
                                    {isVoice ? <Volume2 size={18} style={{ color: '#10b981' }} /> : <ImageIcon size={18} style={{ color: '#3b82f6' }} />}
                                    <strong style={{ color: 'var(--text-primary, #fafafa)' }}>
                                        {isVoice ? t('drafts.voiceAudio', 'Recorded Audio') : t('drafts.originalReceipt', 'Original Receipt')}
                                    </strong>
                                </div>

                                {draft.originalMediaUrl && (
                                    isVoice ? (
                                        <div style={{ marginBottom: 14 }}>
                                            <audio
                                                controls
                                                src={draft.originalMediaUrl}
                                                style={{ width: '100%', borderRadius: 8, outline: 'none' }}
                                            />
                                            <a
                                                href={draft.originalMediaUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-secondary"
                                                style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                                            >
                                                <ExternalLink size={12} /> {t('common.download', 'Open original')}
                                            </a>
                                        </div>
                                    ) : (
                                        <img
                                            src={draft.originalMediaUrl}
                                            alt="Receipt"
                                            style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 360, objectFit: 'contain', background: 'var(--bg-tertiary, #262626)', border: '1px solid var(--border-color, #2b2b2b)' }}
                                        />
                                    )
                                )}

                                {draft.transcript && (
                                    <div style={{ marginTop: 12 }}>
                                        <strong style={{ color: 'var(--text-primary, #fafafa)', fontSize: '0.9rem' }}>
                                            {t('drafts.transcript', 'Verbatim Transcript')}
                                        </strong>
                                        <p style={{
                                            background: 'var(--bg-tertiary, #262626)',
                                            color: 'var(--text-primary, #fafafa)',
                                            border: '1px solid var(--border-color, #2b2b2b)',
                                            padding: 12, borderRadius: 8, marginTop: 6, whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.6
                                        }}>{draft.transcript}</p>
                                    </div>
                                )}

                                {Array.isArray(md.items) && md.items.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <strong style={{ color: 'var(--text-primary, #fafafa)', fontSize: '0.9rem' }}>
                                            {t('drafts.itemsDetected', 'Items detected')} ({md.items.length})
                                        </strong>
                                        <ul style={{ marginTop: 6, paddingInlineStart: 18, color: 'var(--text-secondary, #a3a3a3)' }}>
                                            {md.items.map((it, i) => (
                                                <li key={i} style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                                                    <span style={{ color: 'var(--text-primary, #fafafa)', fontWeight: 600 }}>{it.name}</span>
                                                    {it.quantity != null ? ` — ${it.quantity}` : ''}
                                                    {it.unit ? ` ${it.unit}` : ''}
                                                    {it.unitPrice != null ? ` @ ${it.unitPrice} EGP` : ''}
                                                    {it.materialMatch ? (
                                                        <span style={{ marginInlineStart: 6, fontSize: '0.75rem', color: '#60a5fa' }}>
                                                            → {it.materialMatch.name} ({Math.round((it.materialMatch.confidence || 0) * 100)}%)
                                                        </span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Rich Editable Form with Type & Office toggles */}
                            <div className="card" style={{ padding: 16 }}>
                                <div className="flex justify-between" style={{ alignItems: 'center', marginBottom: 14 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #fafafa)' }}>
                                        {t('drafts.matched', 'Matched fields')}
                                    </h3>
                                    {md.type && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            background: md.type === 'INCOME' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: md.type === 'INCOME' ? '#10b981' : '#f87171',
                                            border: md.type === 'INCOME' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                                        }}>
                                            AI: {md.type === 'INCOME' ? (isRTL ? 'إيراد' : 'Income') : (isRTL ? 'مصروف' : 'Expense')}
                                        </span>
                                    )}
                                </div>

                                {isReadOnly && (
                                    <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                                        <AlertCircle size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                                        {draft.status === 'COMMITTED'
                                            ? t('drafts.alreadyCommitted', 'This draft was already committed.')
                                            : t('drafts.alreadyDiscarded', 'This draft was discarded.')}
                                    </div>
                                )}

                                {/* PRIMARY TYPE SWITCHER: EXPENSE vs INCOME */}
                                <div style={{
                                    display: 'flex',
                                    borderRadius: 10,
                                    background: 'var(--bg-tertiary, #262626)',
                                    padding: 3,
                                    marginBottom: 14,
                                    border: '1px solid var(--border-color, #333)'
                                }}>
                                    <button
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => handleTypeSwitch('EXPENSE')}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.88rem',
                                            cursor: isReadOnly ? 'default' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            background: form.type === 'EXPENSE' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                                            color: form.type === 'EXPENSE' ? '#f87171' : 'var(--text-secondary, #a3a3a3)',
                                            outline: form.type === 'EXPENSE' ? '1px solid rgba(239, 68, 68, 0.4)' : 'none'
                                        }}
                                    >
                                        <ArrowDownLeft size={16} />
                                        {isRTL ? 'مصروف (صادر)' : 'Expense'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => handleTypeSwitch('INCOME')}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.88rem',
                                            cursor: isReadOnly ? 'default' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            background: form.type === 'INCOME' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                                            color: form.type === 'INCOME' ? '#34d399' : 'var(--text-secondary, #a3a3a3)',
                                            outline: form.type === 'INCOME' ? '1px solid rgba(16, 185, 129, 0.4)' : 'none'
                                        }}
                                    >
                                        <ArrowUpRight size={16} />
                                        {isRTL ? 'إيراد / دفعة عميل (وارد)' : 'Income / Client Payment'}
                                    </button>
                                </div>

                                {/* SCOPE SWITCHER (Only for Expenses: Site Project vs Office HQ) */}
                                {form.type === 'EXPENSE' && (
                                    <div style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 14,
                                        padding: '6px 8px',
                                        borderRadius: 8,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-color, #2b2b2b)'
                                    }}>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => handleOfficeExpenseToggle(false)}
                                            style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                borderRadius: 6,
                                                border: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                cursor: isReadOnly ? 'default' : 'pointer',
                                                background: !form.isOfficeExpense ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                color: !form.isOfficeExpense ? '#60a5fa' : 'var(--text-secondary, #a3a3a3)'
                                            }}
                                        >
                                            <Building2 size={14} />
                                            {isRTL ? 'مصروف مشروع موقع' : 'Site Project'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => handleOfficeExpenseToggle(true)}
                                            style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                borderRadius: 6,
                                                border: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                cursor: isReadOnly ? 'default' : 'pointer',
                                                background: form.isOfficeExpense ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                                                color: form.isOfficeExpense ? '#c084fc' : 'var(--text-secondary, #a3a3a3)'
                                            }}
                                        >
                                            <Briefcase size={14} />
                                            {isRTL ? 'مصروف مقر الشركة (إداري)' : 'Office Overhead'}
                                        </button>
                                    </div>
                                )}

                                {/* AMOUNT */}
                                <FormRow label={t('drafts.amount', 'Amount (EGP)') + ' *'}>
                                    <input
                                        type="number" inputMode="decimal" step="0.01"
                                        value={form.amount} onChange={handleChange('amount')}
                                        disabled={isReadOnly} placeholder="0.00"
                                        style={{ fontWeight: 700, fontSize: '1.05rem' }}
                                    />
                                    {form.amount && <small style={{ color: form.type === 'INCOME' ? '#10b981' : '#f87171', fontWeight: 600 }}>{currency(Number(form.amount))}</small>}
                                </FormRow>

                                {/* CATEGORY */}
                                <FormRow label={t('drafts.category', 'Category')}>
                                    <select value={form.category} onChange={handleChange('category')} disabled={isReadOnly}>
                                        {categoryGroups.length === 0 ? (
                                            <option value={form.category}>{form.category}</option>
                                        ) : (
                                            categoryGroups.map(group => (
                                                <optgroup key={group.group} label={(isRTL ? group.groupNameAr : group.groupNameEn) || group.group}>
                                                    {group.items.map(item => (
                                                        <option key={item.key} value={item.key}>
                                                            {isRTL ? item.ar : (item.en || item.ar || item.key)}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))
                                        )}
                                    </select>
                                </FormRow>

                                {/* CLIENT SELECTOR (Prominent in INCOME mode) */}
                                {form.type === 'INCOME' && (
                                    <FormRow label={(isRTL ? 'العميل المستلم منه الدفعة' : 'Client') + ' *'} match={matches.client}>
                                        <select value={form.clientId} onChange={handleChange('clientId')} disabled={isReadOnly}>
                                            <option value="">— {t('common.select', 'select')} —</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.company ? `(${c.company})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </FormRow>
                                )}

                                {/* PROJECT SELECTOR */}
                                <FormRow
                                    label={
                                        form.isOfficeExpense
                                            ? (isRTL ? 'المشروع (غير مطلوب للمصروفات الإدارية)' : 'Project (Not required for office expenses)')
                                            : (t('drafts.project', 'Project') + (form.type === 'EXPENSE' ? ' *' : ' (اختياري)'))
                                    }
                                    match={form.isOfficeExpense ? null : matches.project}
                                >
                                    <select
                                        value={form.projectId}
                                        onChange={handleChange('projectId')}
                                        disabled={isReadOnly || form.isOfficeExpense}
                                        style={form.isOfficeExpense ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                        <option value="">{form.isOfficeExpense ? (isRTL ? '— غير محدد (مقر الشركة الرئيسي) —' : '— Headquarters / General Overhead —') : `— ${t('common.select', 'select')} —`}</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </FormRow>

                                {/* SUPPLIER SELECTOR (Only for Expenses) */}
                                {form.type === 'EXPENSE' && (
                                    <FormRow label={t('drafts.supplier', 'Supplier (optional)')} match={matches.vendor}>
                                        <select value={form.supplierId} onChange={handleChange('supplierId')} disabled={isReadOnly}>
                                            <option value="">— {t('common.none', 'none')} —</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
                                            ))}
                                        </select>
                                    </FormRow>
                                )}

                                {/* ITEM DETAILS (For Material / Stock Purchases) */}
                                {form.type === 'EXPENSE' && !form.isOfficeExpense && (
                                    <>
                                        <FormRow label={t('drafts.itemName', 'Item Name')}>
                                            <input
                                                type="text" value={form.itemName} onChange={handleChange('itemName')}
                                                disabled={isReadOnly} placeholder="e.g. أسمنت بورتلاندي، حديد تسليح"
                                            />
                                        </FormRow>

                                        <div className="grid grid-3" style={{ gap: 8 }}>
                                            <FormRow label={t('drafts.quantity', 'Qty')}>
                                                <input
                                                    type="number" step="0.01" value={form.quantity}
                                                    onChange={handleChange('quantity')} disabled={isReadOnly} placeholder="0"
                                                />
                                            </FormRow>
                                            <FormRow label={t('drafts.unit', 'Unit')}>
                                                <input
                                                    type="text" value={form.unit} onChange={handleChange('unit')}
                                                    disabled={isReadOnly} placeholder="طن / شيكارة"
                                                />
                                            </FormRow>
                                            <FormRow label={t('drafts.unitPrice', 'Unit Price')}>
                                                <input
                                                    type="number" step="0.01" value={form.unitPrice}
                                                    onChange={handleChange('unitPrice')} disabled={isReadOnly} placeholder="0.00"
                                                />
                                            </FormRow>
                                        </div>
                                    </>
                                )}

                                {/* PAYMENT METHOD */}
                                <FormRow label={t('drafts.paymentMethod', 'Payment Method')}>
                                    <select value={form.paymentMethod} onChange={handleChange('paymentMethod')} disabled={isReadOnly}>
                                        {PAYMENT_METHODS.map(pm => (
                                            <option key={pm.value} value={pm.value}>
                                                {isRTL ? pm.labelAr : pm.label}
                                            </option>
                                        ))}
                                    </select>
                                </FormRow>

                                {/* BENEFICIARY */}
                                <FormRow label={form.type === 'INCOME' ? (isRTL ? 'المودع / جهة التحويل' : 'Depositor') : (t('finance.beneficiary', 'المستفيد') + ' *')}>
                                    <input
                                        type="text" value={form.beneficiary}
                                        onChange={handleChange('beneficiary')} disabled={isReadOnly}
                                        placeholder={form.type === 'INCOME' ? (isRTL ? 'اسم المودع أو المحول' : 'Depositor name') : t('finance.beneficiaryPlaceholder', 'اسم المستفيد (المقاول / المورد / الفني)')}
                                        required={form.type === 'EXPENSE'}
                                    />
                                </FormRow>

                                <FormRow label={t('finance.transactionTo', 'المستلم / باليد (اختياري)')}>
                                    <input
                                        type="text" value={form.transactionTo}
                                        onChange={handleChange('transactionTo')} disabled={isReadOnly}
                                        placeholder={t('finance.transactionToPlaceholder', 'اسم المستلم الفعلي (اختياري)')}
                                    />
                                </FormRow>

                                <FormRow label={t('drafts.costCenter', 'Cost Center (optional)')}>
                                    <input
                                        type="text" value={form.costCenter}
                                        onChange={handleChange('costCenter')} disabled={isReadOnly}
                                    />
                                </FormRow>

                                {users.length > 0 && (
                                    <FormRow label={form.type === 'INCOME' ? (isRTL ? 'المستلم المسجل' : 'Received by') : t('drafts.payer', 'Paid by (optional)')}>
                                        <select value={form.payerUserId} onChange={handleChange('payerUserId')} disabled={isReadOnly}>
                                            <option value="">— {t('common.default', 'default')} —</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </FormRow>
                                )}

                                <FormRow label={t('drafts.description', 'Description')}>
                                    <textarea
                                        value={form.description} onChange={handleChange('description')}
                                        disabled={isReadOnly} rows={2}
                                    />
                                </FormRow>

                                <FormRow label={t('drafts.date', 'Date')}>
                                    <input
                                        type="date" value={form.transactionDate}
                                        onChange={handleChange('transactionDate')} disabled={isReadOnly}
                                    />
                                </FormRow>

                                {!isReadOnly && (
                                    <div className="flex gap-sm" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                                        <button
                                            type="button" className="btn btn-secondary btn-sm"
                                            onClick={handleRematch} disabled={rematching}
                                        >
                                            {rematching ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                            {t('drafts.rematch', 'Re-match')}
                                        </button>
                                        <button
                                            type="button" className="btn btn-secondary btn-sm"
                                            onClick={handleDiscard}
                                            style={{ color: '#dc2626', borderColor: '#dc2626' }}
                                        >
                                            <Trash2 size={14} />
                                            {t('drafts.discard', 'Discard')}
                                        </button>
                                        <div style={{ flex: 1 }} />
                                        <button
                                            type="button" className="btn btn-secondary btn-sm"
                                            onClick={handleSaveDraft} disabled={savingDraft}
                                            title={t('drafts.saveDraftHint', 'Save your edits without committing yet')}
                                        >
                                            {savingDraft ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                            {t('drafts.saveDraft', 'Save draft')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCommit}
                                            disabled={saving}
                                            style={{
                                                background: form.type === 'INCOME' ? '#059669' : undefined,
                                                borderColor: form.type === 'INCOME' ? '#059669' : undefined
                                            }}
                                        >
                                            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                            {form.type === 'INCOME' ? (isRTL ? 'حفظ كإيراد' : 'Save as income') : t('drafts.commit', 'Save as transaction')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function FormRow({ label, match, children }) {
    return (
        <div className="form-group" style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary, #fafafa)', fontWeight: 600 }}>{label}</span>
                {match?.matched && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 600
                    }}>AI · {Math.round((match.matched.confidence || 0) * 100)}%</span>
                )}
                {match?.raw && !match?.matched && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 600
                    }}>"{match.raw}" — no match</span>
                )}
            </label>
            {children}
        </div>
    );
}
