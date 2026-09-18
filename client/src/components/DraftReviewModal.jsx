import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Sparkles, Save, Trash2, RefreshCw, X, Volume2, ImageIcon, AlertCircle, Loader2, FileText, ExternalLink
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import {
    draftsAPI, projectsAPI, suppliersAPI, transactionsAPI, categoriesAPI, userAPI
} from '../services/api';
import { useFormat } from '../utils/format';
import './Modal.css';

// Modal review for an AI-captured draft. Renders over /drafts (or any page
// that opens it) so the user doesn't lose their list context.
//
// Form mirrors AddTransactionModal: full TransactionCategory enum (grouped
// by Arabic group name), Item Name / Quantity / Unit / Unit Price for
// inventory-style purchases, Cost Center, Payment Method, Transaction To.
// The AI pre-fills what it can; the user fills the rest.

const PAYMENT_METHODS = [
    { value: 'CUSTODY_WALLET', label: 'Custody Wallet' },
    { value: 'CASH',           label: 'Cash' },
    { value: 'BANK_TRANSFER',  label: 'Bank Transfer' },
    { value: 'CHECK',          label: 'Check' },
    { value: 'CREDIT_CARD',    label: 'Credit Card' },
    { value: 'OTHER',          label: 'Other' }
];

// Map AI's high-level category back-tag to a sensible TransactionCategory
// default. User can always override.
const HIGH_LEVEL_DEFAULT = {
    MATERIALS: 'MATERIALS',
    LABOR:     'GENERAL_LABOR',
    EQUIPMENT: 'EQUIPMENT',
    SERVICES: 'SERVICES',
    OTHER:     'OTHER'
};

export default function DraftReviewModal({ draftId, isOpen, onClose, onCommitted }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const { currency } = useFormat();

    const [draft, setDraft] = useState(null);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [users, setUsers] = useState([]);
    const [categoryGroups, setCategoryGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [rematching, setRematching] = useState(false);

    const [form, setForm] = useState({
        amount: '',
        category: 'OTHER',
        description: '',
        projectId: '',
        supplierId: '',
        transactionDate: '',
        // Rich fields — match AddTransactionModal
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
                const [dRes, pRes, sRes, uRes, cRes] = await Promise.all([
                    draftsAPI.get(draftId),
                    projectsAPI.getAll(),
                    suppliersAPI.getAll(),
                    userAPI.getAll().catch(() => ({ data: { data: [] } })), // engineer might lack permission
                    categoriesAPI.list(true).catch(() => ({ data: { data: [] } }))
                ]);
                const d = dRes.data.data;
                setDraft(d);
                setProjects(pRes.data.data || []);
                setSuppliers(sRes.data.data || []);
                setUsers(uRes.data?.data || []);
                setCategoryGroups(cRes.data?.data || []);

                const md = d.matchedDraft || {};
                const firstItem = Array.isArray(md.items) && md.items.length ? md.items[0] : null;

                setForm({
                    amount: md.amount != null ? String(md.amount) : '',
                    category: md.category || 'OTHER',
                    description: md.description || '',
                    projectId: md.projectId || '',
                    supplierId: md.supplierId || '',
                    transactionDate: md.transactionDate || new Date().toISOString().slice(0, 10),
                    itemName: firstItem?.name || '',
                    quantity: firstItem?.quantity != null ? String(firstItem.quantity) : '',
                    unit: firstItem?.unit || '',
                    unitPrice: firstItem?.unitPrice != null ? String(firstItem.unitPrice) : '',
                    costCenter: md.costCenter || '',
                    paymentMethod: md.paymentMethod || 'CASH',
                    beneficiary: md.beneficiary || (md.supplierId ? (sRes.data.data || []).find(s => s.id === md.supplierId)?.name : '') || '',
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

    const handleRematch = async () => {
        try {
            setRematching(true);
            const r = await draftsAPI.rematch(draftId);
            const md = r.data.data.matchedDraft || {};
            setForm(prev => ({
                ...prev,
                projectId: md.projectId || prev.projectId || '',
                supplierId: md.supplierId || prev.supplierId || '',
                category: md.category || prev.category || 'OTHER',
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
            message: t('drafts.confirmDiscard', isRTL ? 'هل أنت متأكد من رغبتك في إلغاء هذه المسودة؟ لن تتمكن من استعادتها.' : 'Are you sure you want to discard this draft? This action cannot be undone.'),
            showCancel: true,
            confirmText: isRTL ? 'نعم، إلغاء المسودة' : 'Yes, Discard',
            cancelText: t('common.cancel', isRTL ? 'تراجع' : 'Cancel'),
            onConfirm: async () => {
                try {
                    await draftsAPI.discard(draftId);
                    showAlert({
                        type: 'success',
                        title: t('common.success', isRTL ? 'تم الإلغاء' : 'Discarded'),
                        message: isRTL ? 'تم إلغاء المسودة بنجاح.' : 'Draft discarded successfully.'
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

    // Save edits without committing — user wants to keep iterating on the
    // draft (e.g. add the supplier first, then come back). Persists the
    // current form into matchedDraft via PUT /transaction-drafts/:id.
    const handleSaveDraft = async () => {
        try {
            setSavingDraft(true);
            const matchedDraft = {
                ...(draft.matchedDraft || {}),
                amount: form.amount === '' ? null : Number(form.amount),
                category: form.category,
                description: form.description,
                projectId: form.projectId || null,
                supplierId: form.supplierId || null,
                transactionDate: form.transactionDate || null,
                itemName: form.itemName,
                quantity: form.quantity === '' ? null : Number(form.quantity),
                unit: form.unit,
                unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
                costCenter: form.costCenter,
                paymentMethod: form.paymentMethod,
                payerUserId: form.payerUserId
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
            return showAlert({ type: 'error', title: t('drafts.missingAmount', 'Missing amount'), message: t('drafts.missingAmountHint', 'Please set the amount before saving.') });
        }
        if (!form.projectId) {
            return showAlert({ type: 'error', title: t('drafts.missingProject', 'Missing project'), message: t('drafts.missingProjectHint', 'Please choose the project this transaction belongs to.') });
        }

        try {
            setSaving(true);
            const isVoice = draft?.source === 'VOICE' || (draft?.originalMediaMime && draft?.originalMediaMime.startsWith('audio/'));
            const payload = {
                type: 'EXPENSE',
                amount: Number(form.amount),
                category: form.category,
                projectId: form.projectId,
                description: form.description,
                transactionDate: form.transactionDate || undefined,
                paymentMethod: form.paymentMethod || undefined,
                supplierId: form.supplierId || undefined,
                beneficiary: form.beneficiary || (form.supplierId ? suppliers.find(s => s.id === form.supplierId)?.name : undefined) || undefined,
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
                aiExtractedData: draft?.rawExtraction || undefined
            };

            const txRes = await transactionsAPI.create(payload);
            const newTx = txRes.data.data;
            await draftsAPI.commit(draftId, newTx.id);

            showAlert({ type: 'success', title: t('common.success', 'Saved'), message: t('drafts.committed', 'Transaction saved. Draft moved to history.') });
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 920, width: '95%', maxHeight: '92vh' }}
            >
                <div className="modal-header">
                    <h2 className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <Sparkles size={20} />
                        {t('drafts.reviewTitle', 'Review AI draft')}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 70px)' }}>
                    {loading || !draft ? (
                        <div className="flex-center" style={{ minHeight: 240 }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                                {draft.source === 'VOICE'
                                    ? <Volume2 size={14} style={{ verticalAlign: 'middle' }} />
                                    : <ImageIcon size={14} style={{ verticalAlign: 'middle' }} />}
                                <span style={{ marginInlineStart: 6 }}>
                                    {draft.source} · {draft.confidence || 'medium'} {t('drafts.confidence', 'confidence')}
                                </span>
                            </div>

                            <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
                                {/* LEFT: original media + raw extraction */}
                                <div className="card" style={{ padding: 14 }}>
                                    <h3 style={{ marginTop: 0 }}>{t('drafts.original', 'Your input')}</h3>

                                    {draft.source === 'VOICE' && draft.originalMediaUrl && (
                                        <audio controls src={draft.originalMediaUrl} style={{ width: '100%', marginBottom: 12 }} />
                                    )}
                                    {draft.source === 'RECEIPT' && draft.originalMediaUrl && (
                                        (draft.originalMediaMime === 'application/pdf' || draft.originalMediaUrl.endsWith('.pdf')) ? (
                                            <div style={{ padding: 20, textAlign: 'center', background: 'var(--bg-tertiary, #262626)', borderRadius: 8, marginBottom: 12, border: '1px solid var(--border-color, #2b2b2b)' }}>
                                                <FileText size={44} style={{ color: '#ef4444', marginBottom: 8 }} />
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 10, color: 'var(--text-primary, #fafafa)' }}>PDF Document (Invoice / Receipt)</div>
                                                <a
                                                    href={draft.originalMediaUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                >
                                                    <ExternalLink size={14} />
                                                    {t('common.view', 'Open Document')}
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
                                            <strong style={{ color: 'var(--text-primary, #fafafa)' }}>{t('drafts.transcript', 'Transcript')}</strong>
                                            <p style={{
                                                background: 'var(--bg-tertiary, #262626)',
                                                color: 'var(--text-primary, #fafafa)',
                                                border: '1px solid var(--border-color, #2b2b2b)',
                                                padding: 12, borderRadius: 8, marginTop: 4, whiteSpace: 'pre-wrap'
                                            }}>{draft.transcript}</p>
                                        </div>
                                    )}

                                    {Array.isArray(md.items) && md.items.length > 0 && (
                                        <div style={{ marginTop: 12 }}>
                                            <strong>{t('drafts.itemsDetected', 'Items detected')}</strong>
                                            <ul style={{ marginTop: 4, paddingInlineStart: 18 }}>
                                                {md.items.map((it, i) => (
                                                    <li key={i} style={{ fontSize: '0.9rem' }}>
                                                        {it.name}
                                                        {it.quantity != null ? ` — ${it.quantity}` : ''}
                                                        {it.unit ? ` ${it.unit}` : ''}
                                                        {it.materialMatch
                                                            ? <span style={{ marginInlineStart: 6, fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                                                                → {it.materialMatch.name} ({Math.round((it.materialMatch.confidence || 0) * 100)}%)
                                                              </span>
                                                            : null}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: rich editable form */}
                                <div className="card" style={{ padding: 14 }}>
                                    <h3 style={{ marginTop: 0 }}>{t('drafts.matched', 'Matched fields')}</h3>

                                    {isReadOnly && (
                                        <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                                            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                                            {draft.status === 'COMMITTED'
                                                ? t('drafts.alreadyCommitted', 'This draft was already committed.')
                                                : t('drafts.alreadyDiscarded', 'This draft was discarded.')}
                                        </div>
                                    )}

                                    <FormRow label={t('drafts.amount', 'Amount (EGP)')}>
                                        <input
                                            type="number" inputMode="decimal" step="0.01"
                                            value={form.amount} onChange={handleChange('amount')}
                                            disabled={isReadOnly} placeholder="0.00"
                                        />
                                        {form.amount && <small className="text-secondary">{currency(Number(form.amount))}</small>}
                                    </FormRow>

                                    <FormRow label={t('drafts.category', 'Cost Category')}>
                                        <select value={form.category} onChange={handleChange('category')} disabled={isReadOnly}>
                                            {categoryGroups.length === 0 ? (
                                                // Fallback flat list if /api/categories isn't reachable
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

                                    <FormRow label={t('drafts.project', 'Project')} match={matches.project}>
                                        <select value={form.projectId} onChange={handleChange('projectId')} disabled={isReadOnly}>
                                            <option value="">— {t('common.select', 'select')} —</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </FormRow>

                                    <FormRow label={t('drafts.supplier', 'Supplier (optional)')} match={matches.vendor}>
                                        <select value={form.supplierId} onChange={handleChange('supplierId')} disabled={isReadOnly}>
                                            <option value="">— {t('common.none', 'none')} —</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </FormRow>

                                    <FormRow label={t('drafts.itemName', 'Item Name')}>
                                        <input
                                            type="text" value={form.itemName} onChange={handleChange('itemName')}
                                            disabled={isReadOnly} placeholder="e.g. Cement, Steel"
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
                                                disabled={isReadOnly} placeholder="ton / bag"
                                            />
                                        </FormRow>
                                        <FormRow label={t('drafts.unitPrice', 'Unit Price')}>
                                            <input
                                                type="number" step="0.01" value={form.unitPrice}
                                                onChange={handleChange('unitPrice')} disabled={isReadOnly} placeholder="0.00"
                                            />
                                        </FormRow>
                                    </div>

                                    <FormRow label={t('drafts.paymentMethod', 'Payment Method')}>
                                        <select value={form.paymentMethod} onChange={handleChange('paymentMethod')} disabled={isReadOnly}>
                                            <option value="CUSTODY_WALLET">{t('finance.methods.custodyWallet', 'Custody Wallet')}</option>
                                            <option value="CASH">{t('finance.methods.cash', 'Cash')}</option>
                                            <option value="BANK_TRANSFER">{t('finance.methods.bankTransfer', 'Bank Transfer')}</option>
                                            <option value="CHECK">{t('finance.methods.check', 'Check')}</option>
                                            <option value="CREDIT_CARD">{t('finance.methods.creditCard', 'Credit Card')}</option>
                                            <option value="OTHER">{t('finance.categories.other', 'Other')}</option>
                                        </select>
                                    </FormRow>

                                    <FormRow label={t('finance.beneficiary', 'المستفيد') + ' *'}>
                                        <input
                                            type="text" value={form.beneficiary}
                                            onChange={handleChange('beneficiary')} disabled={isReadOnly}
                                            placeholder={t('finance.beneficiaryPlaceholder', 'اسم المستفيد (المقاول / المورد / الفني)')}
                                            required
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
                                        <FormRow label={t('drafts.payer', 'Paid by (optional)')}>
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
                                                type="button" className="btn btn-primary"
                                                onClick={handleCommit} disabled={saving}
                                            >
                                                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                                {t('drafts.commit', 'Save as transaction')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
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
