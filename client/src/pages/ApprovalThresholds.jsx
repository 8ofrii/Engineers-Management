import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Plus, Trash2, Save, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { tenantAPI } from '../services/api';
import { useFormat } from '../utils/format';

// Phase 2 admin UI for the multi-level approval threshold matrix.
//
// Backend endpoints (already shipped):
//   GET  /api/tenant/approval-thresholds  → returns the tier array (or defaults)
//   PUT  /api/tenant/approval-thresholds  → replaces it (validated server-side)
//
// Data shape: ordered array of { maxAmount: number|null, minRole: string }.
// The first tier whose maxAmount >= transaction amount (or maxAmount=null
// fallback) decides the minimum role required to approve. lib/approvalThresholds.js
// has the full reference; we just edit it here.

const ROLES = ['ENGINEER', 'ACCOUNTANT', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const DEFAULT_TIERS = [
    { maxAmount: 5000,  minRole: 'ENGINEER' },
    { maxAmount: 50000, minRole: 'PROJECT_MANAGER' },
    { maxAmount: null,  minRole: 'ADMIN' }
];

export default function ApprovalThresholds() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const { currency } = useFormat();
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const r = await tenantAPI.getApprovalThresholds();
            const fromServer = r.data?.data?.thresholds || r.data?.thresholds || r.data?.data;
            const arr = Array.isArray(fromServer) && fromServer.length ? fromServer : DEFAULT_TIERS;
            setTiers(arr.map(normalizeTier));
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Failed to load thresholds'
            });
            setTiers(DEFAULT_TIERS.map(normalizeTier));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAddTier = () => {
        // Insert above the null-cap fallback if present, otherwise append
        const fallbackIdx = tiers.findIndex(t => t.maxAmount === null);
        const newTier = { maxAmount: 100000, minRole: 'PROJECT_MANAGER' };
        const next = fallbackIdx >= 0
            ? [...tiers.slice(0, fallbackIdx), newTier, ...tiers.slice(fallbackIdx)]
            : [...tiers, newTier];
        setTiers(next);
    };

    const handleRemoveTier = (idx) => {
        if (tiers.length <= 1) {
            return showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('approvalThresholds.atLeastOne', 'You need at least one tier.') });
        }
        setTiers(tiers.filter((_, i) => i !== idx));
    };

    const handleTierChange = (idx, field, value) => {
        setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    const handleResetDefaults = () => {
        showAlert({
            type: 'warning',
            title: i18n.language === 'ar' ? 'استعادة الإعدادات الافتراضية' : 'Reset Defaults',
            message: t('approvalThresholds.confirmReset', i18n.language === 'ar' ? 'هل أنت متأكد من استعادة المستويات الافتراضية للنظام؟' : 'Reset to system defaults?'),
            showCancel: true,
            confirmText: i18n.language === 'ar' ? 'نعم، استعادة' : 'Reset',
            cancelText: i18n.language === 'ar' ? 'تراجع' : 'Cancel',
            onConfirm: () => {
                setTiers(DEFAULT_TIERS.map(normalizeTier));
            }
        });
    };

    const handleSave = async () => {
        // Coerce numeric input + run client-side sanity check that mirrors the
        // server validator. Server is authoritative; this just shortcuts UX.
        const cleaned = tiers.map(t => ({
            maxAmount: t.maxAmount === null || t.maxAmount === '' ? null : Number(t.maxAmount),
            minRole: t.minRole
        }));

        const localError = validateLocally(cleaned);
        if (localError) {
            return showAlert({ type: 'error', title: t('common.error', 'Error'), message: localError });
        }

        try {
            setSaving(true);
            await tenantAPI.updateApprovalThresholds(cleaned);
            showAlert({
                type: 'success',
                title: t('common.success', 'Saved'),
                message: t('approvalThresholds.saved', 'Approval thresholds updated.')
            });
            load();
        } catch (err) {
            const data = err.response?.data;
            const fieldErrors = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.map(e => `${e.path}: ${e.message}`).join('\n')
                : null;
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: fieldErrors || data?.message || 'Save failed'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div>
                <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <ShieldCheck size={28} />
                            {t('approvalThresholds.title', 'Approval Thresholds')}
                        </h1>
                        <p className="text-secondary">
                            {t('approvalThresholds.subtitle', 'Set the minimum role required to approve a transaction by amount tier. The first tier whose ceiling covers the amount decides the approver.')}
                        </p>
                    </div>
                </div>

                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                    {t('approvalThresholds.lastTierHint', 'The last tier should have an empty ceiling — it acts as the fallback for amounts above all other tiers.')}
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'start', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                                <th style={{ padding: 8 }}>{t('approvalThresholds.tier', 'Tier')}</th>
                                <th style={{ padding: 8 }}>{t('approvalThresholds.maxAmount', 'Up to (EGP)')}</th>
                                <th style={{ padding: 8 }}>{t('approvalThresholds.minRole', 'Minimum role to approve')}</th>
                                <th style={{ padding: 8 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tiers.map((tier, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #f3f4f6)' }}>
                                    <td style={{ padding: 8, fontWeight: 600 }}>#{idx + 1}</td>
                                    <td style={{ padding: 8 }}>
                                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                step="100"
                                                min="0"
                                                value={tier.maxAmount === null ? '' : tier.maxAmount}
                                                onChange={(e) => handleTierChange(idx, 'maxAmount',
                                                    e.target.value === '' ? null : e.target.value)}
                                                placeholder={t('approvalThresholds.unlimited', 'unlimited')}
                                                style={{ width: 140 }}
                                            />
                                            {tier.maxAmount && Number(tier.maxAmount) > 0 && (
                                                <small className="text-secondary">{currency(Number(tier.maxAmount))}</small>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <select
                                            value={tier.minRole}
                                            onChange={(e) => handleTierChange(idx, 'minRole', e.target.value)}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r} value={r}>{t(`approvalThresholds.roles.${r}`, r)}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ padding: 8, textAlign: 'end' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleRemoveTier(idx)}
                                            style={{ color: '#dc2626', borderColor: '#dc2626' }}
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex gap-sm" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTier}>
                            <Plus size={14} />
                            {t('approvalThresholds.addTier', 'Add tier')}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetDefaults}>
                            <RotateCcw size={14} />
                            {t('approvalThresholds.resetDefaults', 'Reset to defaults')}
                        </button>
                        <div style={{ flex: 1 }} />
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            {t('approvalThresholds.saveChanges', 'Save changes')}
                        </button>
                    </div>
                </div>

                <PreviewBox tiers={tiers} currency={currency} t={t} />
            </div>
        </Layout>
    );
}

// Convert maxAmount: null/undefined into the canonical null. Coerces strings → numbers.
const normalizeTier = (t) => ({
    maxAmount: t.maxAmount === undefined || t.maxAmount === null
        ? null
        : (typeof t.maxAmount === 'string' && t.maxAmount.trim() === '' ? null : Number(t.maxAmount)),
    minRole: t.minRole || 'ADMIN'
});

// Mirrors the server-side validator so users see errors instantly without a round trip.
const validateLocally = (tiers) => {
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return 'At least one tier is required.';
    }
    let sawNullCap = false;
    let prevMax = -1;
    for (let i = 0; i < tiers.length; i++) {
        const { maxAmount, minRole } = tiers[i];
        if (!ROLES.includes(minRole)) {
            return `Tier #${i + 1}: Invalid role ${minRole}`;
        }
        if (sawNullCap) {
            return 'The unlimited ceiling tier must be the very last tier.';
        }
        if (maxAmount !== null && (typeof maxAmount !== 'number' || isNaN(maxAmount) || maxAmount <= 0)) {
            return `Tier #${i + 1}: Max amount must be a positive number or empty.`;
        }
        if (maxAmount !== null) {
            if (maxAmount <= prevMax) {
                return `Tier #${i + 1}: Ceiling (${maxAmount}) must be greater than previous tier (${prevMax}).`;
            }
            prevMax = maxAmount;
        }
        if (maxAmount === null) {
            if (sawNullCap) return 'Only one tier can have an unlimited ceiling.';
            sawNullCap = true;
        }
    }
    if (!sawNullCap) {
        return 'You need one fallback tier with an unlimited ceiling — leave the last "Up to" empty.';
    }
    return null;
};

// Visual rule preview — shows what the matrix means in plain English
function PreviewBox({ tiers, currency, t }) {
    return (
        <div className="card" style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary, #f9fafb)' }}>
            <h3 style={{ marginTop: 0 }}>{t('approvalThresholds.preview', 'Preview')}</h3>
            <ol style={{ paddingInlineStart: 18, margin: 0 }}>
                {tiers.map((tier, idx) => {
                    const cap = tier.maxAmount === null
                        ? t('approvalThresholds.anyAmountAbove', 'anything above the previous tier')
                        : `${t('approvalThresholds.upTo', 'up to')} ${currency(Number(tier.maxAmount) || 0)}`;
                    const roleName = t(`approvalThresholds.roles.${tier.minRole}`, tier.minRole);
                    return (
                        <li key={idx} style={{ marginBottom: 6 }}>
                            <strong>{cap}</strong>
                            {' → '}
                            {t('approvalThresholds.requires', 'requires')} <strong>{roleName}</strong>
                            {' '}{t('approvalThresholds.orHigher', 'or higher')}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
