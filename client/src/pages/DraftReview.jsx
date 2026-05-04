import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Save, Trash2, RefreshCw, ArrowLeft, Volume2, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { draftsAPI, projectsAPI, suppliersAPI, transactionsAPI } from '../services/api';
import { useFormat } from '../utils/format';

const CATEGORIES_HIGH_LEVEL = ['MATERIALS', 'LABOR', 'EQUIPMENT', 'SERVICES', 'OTHER'];

export default function DraftReview() {
    const { id } = useParams();
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { currency } = useFormat();

    const [draft, setDraft] = useState(null);
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rematching, setRematching] = useState(false);

    // Editable form state — initialized from draft.matchedDraft
    const [form, setForm] = useState({
        type: 'EXPENSE',
        amount: '',
        category: 'OTHER',
        description: '',
        projectId: '',
        supplierId: '',
        transactionDate: ''
    });

    const load = async () => {
        try {
            setLoading(true);
            const [dRes, pRes, sRes] = await Promise.all([
                draftsAPI.get(id),
                projectsAPI.getAll(),
                suppliersAPI.getAll()
            ]);
            const d = dRes.data.data;
            setDraft(d);
            setProjects(pRes.data.data || []);
            setSuppliers(sRes.data.data || []);

            const md = d.matchedDraft || {};
            setForm({
                type: md.type || 'EXPENSE',
                amount: md.amount ?? '',
                category: md.category || 'OTHER',
                description: md.description || '',
                projectId: md.projectId || '',
                supplierId: md.supplierId || '',
                transactionDate: md.transactionDate || new Date().toISOString().slice(0, 10)
            });
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Failed to load draft'
            });
            navigate('/drafts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleRematch = async () => {
        try {
            setRematching(true);
            const r = await draftsAPI.rematch(id);
            const md = r.data.data.matchedDraft || {};
            // Only update fields that are still empty — don't clobber user edits
            setForm(prev => ({
                ...prev,
                projectId: prev.projectId || md.projectId || '',
                supplierId: prev.supplierId || md.supplierId || ''
            }));
            setDraft(r.data.data);
            showAlert({
                type: 'success',
                title: t('common.success') || 'Done',
                message: 'Re-matched against your latest data'
            });
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Re-match failed'
            });
        } finally {
            setRematching(false);
        }
    };

    const handleDiscard = async () => {
        if (!confirm(t('drafts.confirmDiscard') || 'Discard this draft?')) return;
        try {
            await draftsAPI.discard(id);
            navigate('/drafts');
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Discard failed'
            });
        }
    };

    const handleCommit = async () => {
        // Validate the bare minimum the transaction endpoint requires
        if (!form.amount || Number(form.amount) <= 0) {
            return showAlert({ type: 'error', title: 'Missing amount', message: 'Please set the amount before saving.' });
        }
        if (!form.projectId) {
            return showAlert({ type: 'error', title: 'Missing project', message: 'Please choose the project this transaction belongs to.' });
        }

        try {
            setSaving(true);
            // Step 1: create the real Transaction via the existing endpoint
            // — this is what runs the V1.2 profit engine, multi-level approval
            // routing, etc. We deliberately go through it rather than building
            // a parallel path.
            const txRes = await transactionsAPI.create({
                type: form.type,
                amount: Number(form.amount),
                category: form.category,
                projectId: form.projectId,
                supplierId: form.supplierId || undefined,
                description: form.description,
                transactionDate: form.transactionDate || undefined
            });
            const newTx = txRes.data.data;

            // Step 2: link the draft so it drops out of the queue
            await draftsAPI.commit(id, newTx.id);

            showAlert({
                type: 'success',
                title: t('common.success') || 'Saved',
                message: t('drafts.committed') || 'Transaction saved. Draft moved to history.'
            });
            navigate('/drafts');
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: fieldErrors || data?.message || 'Failed to save transaction'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !draft) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const md = draft.matchedDraft || {};
    const matches = draft.matches || {};
    const isReadOnly = draft.status !== 'PENDING_REVIEW';

    return (
        <Layout>
            <div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/drafts')}
                    style={{ marginBottom: 16 }}
                >
                    <ArrowLeft size={16} />
                    {t('common.back') || 'Back'}
                </button>

                <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                        <Sparkles size={26} />
                        {t('drafts.reviewTitle') || 'Review AI draft'}
                    </h1>
                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                        {draft.source === 'VOICE' ? <Volume2 size={14} style={{ verticalAlign: 'middle' }} /> : <ImageIcon size={14} style={{ verticalAlign: 'middle' }} />}
                        <span style={{ marginInlineStart: 6 }}>
                            {draft.source} · {draft.confidence || 'medium'} confidence
                        </span>
                    </div>
                </div>

                <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
                    {/* LEFT: original media + raw AI extraction */}
                    <div className="card" style={{ padding: 16 }}>
                        <h3 style={{ marginTop: 0 }}>{t('drafts.original') || 'Your input'}</h3>

                        {draft.source === 'VOICE' && draft.originalMediaUrl && (
                            <audio controls src={draft.originalMediaUrl} style={{ width: '100%', marginBottom: 12 }} />
                        )}

                        {draft.source === 'RECEIPT' && draft.originalMediaUrl && (
                            <img
                                src={draft.originalMediaUrl}
                                alt="Receipt"
                                style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 480, objectFit: 'contain', background: '#f3f4f6' }}
                            />
                        )}

                        {draft.transcript && (
                            <div style={{ marginTop: 12 }}>
                                <strong>{t('drafts.transcript') || 'Transcript'}</strong>
                                <p style={{
                                    background: 'var(--bg-secondary, #f9fafb)',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginTop: 4,
                                    whiteSpace: 'pre-wrap'
                                }}>{draft.transcript}</p>
                            </div>
                        )}

                        {/* AI-extracted line items the form doesn't expose yet */}
                        {Array.isArray(md.items) && md.items.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <strong>{t('drafts.itemsDetected') || 'Items detected'}</strong>
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

                    {/* RIGHT: editable form pre-filled from matchedDraft */}
                    <div className="card" style={{ padding: 16 }}>
                        <h3 style={{ marginTop: 0 }}>{t('drafts.matched') || 'Matched fields'}</h3>

                        {isReadOnly && (
                            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                                <AlertCircle size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                                {draft.status === 'COMMITTED'
                                    ? (t('drafts.alreadyCommitted') || 'This draft was already committed.')
                                    : (t('drafts.alreadyDiscarded') || 'This draft was discarded.')}
                            </div>
                        )}

                        <FormRow
                            label={t('drafts.amount') || 'Amount (EGP)'}
                            input={
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={handleChange('amount')}
                                    disabled={isReadOnly}
                                    placeholder="0.00"
                                />
                            }
                            hint={form.amount ? currency(Number(form.amount)) : null}
                        />

                        <FormRow
                            label={t('drafts.category') || 'Category'}
                            input={
                                <select value={form.category} onChange={handleChange('category')} disabled={isReadOnly}>
                                    {CATEGORIES_HIGH_LEVEL.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            }
                        />

                        <FormRow
                            label={t('drafts.project') || 'Project'}
                            input={
                                <select value={form.projectId} onChange={handleChange('projectId')} disabled={isReadOnly}>
                                    <option value="">— select —</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            }
                            match={matches.project}
                        />

                        <FormRow
                            label={t('drafts.supplier') || 'Supplier (optional)'}
                            input={
                                <select value={form.supplierId} onChange={handleChange('supplierId')} disabled={isReadOnly}>
                                    <option value="">— none —</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            }
                            match={matches.vendor}
                        />

                        <FormRow
                            label={t('drafts.description') || 'Description'}
                            input={
                                <textarea
                                    value={form.description}
                                    onChange={handleChange('description')}
                                    disabled={isReadOnly}
                                    rows={2}
                                />
                            }
                        />

                        <FormRow
                            label={t('drafts.date') || 'Date'}
                            input={
                                <input
                                    type="date"
                                    value={form.transactionDate}
                                    onChange={handleChange('transactionDate')}
                                    disabled={isReadOnly}
                                />
                            }
                        />

                        {!isReadOnly && (
                            <div className="flex gap-sm" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleRematch}
                                    disabled={rematching}
                                >
                                    {rematching ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                    {t('drafts.rematch') || 'Re-match'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleDiscard}
                                    style={{ color: '#dc2626', borderColor: '#dc2626' }}
                                >
                                    <Trash2 size={14} />
                                    {t('drafts.discard') || 'Discard'}
                                </button>
                                <div style={{ flex: 1 }} />
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCommit}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                    {t('drafts.commit') || 'Save as transaction'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Small presentational helper — input + optional match-confidence pill
function FormRow({ label, input, match, hint }) {
    return (
        <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{label}</span>
                {match?.matched && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 8px',
                        borderRadius: 10
                    }}>
                        AI matched · {Math.round((match.matched.confidence || 0) * 100)}%
                    </span>
                )}
                {match?.raw && !match?.matched && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: 10
                    }}>
                        AI heard "{match.raw}" — no match
                    </span>
                )}
            </label>
            {input}
            {hint && <small className="text-secondary">{hint}</small>}
        </div>
    );
}
