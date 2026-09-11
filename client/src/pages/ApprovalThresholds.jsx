import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ShieldCheck, Plus, Trash2, Save, RotateCcw, Loader2,
    AlertCircle, Sparkles, Hash, ArrowRight, ArrowLeft,
    CheckCircle2, Layers
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { tenantAPI } from '../services/api';
import { useFormat } from '../utils/format';
import RoleCombobox, { ROLE_CONFIG } from '../components/RoleCombobox';
import CurrencyThresholdInput from '../components/CurrencyThresholdInput';
import { cn } from '../lib/utils';
import './ApprovalThresholds.css';

const ROLES = ['ENGINEER', 'ACCOUNTANT', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const DEFAULT_TIERS = [
    { maxAmount: 5000, minRole: 'ENGINEER' },
    { maxAmount: 50000, minRole: 'PROJECT_MANAGER' },
    { maxAmount: null, minRole: 'ADMIN' }
];

export default function ApprovalThresholds() {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
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
                message: err.response?.data?.message || (isAr ? 'فشل تحميل حدود الموافقات' : 'Failed to load thresholds')
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
        const lastAmount = fallbackIdx > 0 && tiers[fallbackIdx - 1]?.maxAmount
            ? Number(tiers[fallbackIdx - 1].maxAmount) + 50000
            : 100000;
        const newTier = { maxAmount: lastAmount, minRole: 'PROJECT_MANAGER' };
        const next = fallbackIdx >= 0
            ? [...tiers.slice(0, fallbackIdx), newTier, ...tiers.slice(fallbackIdx)]
            : [...tiers, newTier];
        setTiers(next);
    };

    const handleRemoveTier = (idx) => {
        if (tiers.length <= 1) {
            return showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: t('approvalThresholds.atLeastOne', isAr ? 'يجب الإبقاء على شريحة واحدة على الأقل.' : 'You need at least one tier.')
            });
        }
        setTiers(tiers.filter((_, i) => i !== idx));
    };

    const handleTierChange = (idx, field, value) => {
        setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    const handleResetDefaults = () => {
        showAlert({
            type: 'warning',
            title: isAr ? 'استعادة الإعدادات الافتراضية' : 'Reset Defaults',
            message: t('approvalThresholds.confirmReset', isAr ? 'هل أنت متأكد من استعادة المستويات الافتراضية للنظام؟' : 'Reset to system defaults?'),
            showCancel: true,
            confirmText: isAr ? 'نعم، استعادة' : 'Reset',
            cancelText: isAr ? 'تراجع' : 'Cancel',
            onConfirm: () => {
                setTiers(DEFAULT_TIERS.map(normalizeTier));
            }
        });
    };

    const handleSave = async () => {
        const cleaned = tiers.map(t => ({
            maxAmount: t.maxAmount === null || t.maxAmount === '' ? null : Number(t.maxAmount),
            minRole: t.minRole
        }));

        const localError = validateLocally(cleaned, isAr);
        if (localError) {
            return showAlert({ type: 'error', title: t('common.error', 'Error'), message: localError });
        }

        try {
            setSaving(true);
            await tenantAPI.updateApprovalThresholds(cleaned);
            showAlert({
                type: 'success',
                title: t('common.success', 'Saved'),
                message: t('approvalThresholds.saved', isAr ? 'تم حفظ وتفعيل حدود الموافقات بنجاح.' : 'Approval thresholds updated.')
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
                message: fieldErrors || data?.message || (isAr ? 'فشل حفظ التعديلات' : 'Save failed')
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
            <div className="thresholds-container">
                {/* Header */}
                <div className="thresholds-header">
                    <div className="thresholds-eyebrow">
                        <Layers size={13} />
                        <span>{isAr ? 'إدارة حوكمة المصروفات' : 'Expense Governance'}</span>
                    </div>
                    <h1 className="thresholds-title">
                        <ShieldCheck size={28} />
                        <span>{t('approvalThresholds.title', 'Approval Thresholds')}</span>
                    </h1>
                    <p className="thresholds-subtitle">
                        {t('approvalThresholds.subtitle', 'Set the minimum role required to approve a transaction by amount tier. The first tier whose ceiling covers the amount decides the approver.')}
                    </p>
                </div>

                {/* Info Guidance Banner */}
                <div className="thresholds-banner">
                    <AlertCircle size={18} className="thresholds-banner-icon" />
                    <div>
                        {t('approvalThresholds.lastTierHint', 'The last tier should have an empty ceiling — it acts as the fallback for amounts above all other tiers.')}
                    </div>
                </div>

                {/* Main Card: Tiers Matrix */}
                <div className="thresholds-card">
                    {/* Header Row */}
                    <div className="thresholds-table-header">
                        <div className="flex items-center gap-1.5">
                            <Hash size={13} className="opacity-70" />
                            <span>{t('approvalThresholds.tier', 'Tier')}</span>
                        </div>
                        <div>{t('approvalThresholds.maxAmount', 'Up to (EGP)')}</div>
                        <div>{t('approvalThresholds.minRole', 'Minimum role to approve')}</div>
                        <div></div>
                    </div>

                    {/* Tier Rows */}
                    <div className="thresholds-table-body">
                        {tiers.map((tier, idx) => {
                            const isFallback = idx === tiers.length - 1 && tier.maxAmount === null;
                            return (
                                <div
                                    key={idx}
                                    className={cn('thresholds-row', isFallback && 'is-fallback')}
                                >
                                    {/* Tier Badge */}
                                    <div>
                                        <span className={cn('tier-badge', isFallback && 'fallback')}>
                                            <Hash size={13} />
                                            <span>{isFallback ? (isAr ? 'احتياطي' : 'Fallback') : `#${idx + 1}`}</span>
                                        </span>
                                    </div>

                                    {/* Amount Ceiling Input */}
                                    <div>
                                        <CurrencyThresholdInput
                                            value={tier.maxAmount}
                                            isFallback={isFallback}
                                            onChange={(val) => handleTierChange(idx, 'maxAmount', val)}
                                        />
                                    </div>

                                    {/* Role Combobox from 21st.dev / shadcn */}
                                    <div>
                                        <RoleCombobox
                                            value={tier.minRole}
                                            onChange={(val) => handleTierChange(idx, 'minRole', val)}
                                        />
                                    </div>

                                    {/* Delete Row Action */}
                                    <div className="text-end">
                                        <button
                                            type="button"
                                            className="tier-delete-btn"
                                            onClick={() => handleRemoveTier(idx)}
                                            disabled={tiers.length <= 1}
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Actions Toolbar */}
                    <div className="thresholds-toolbar">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 px-3.5 py-2 rounded-xl"
                            onClick={handleAddTier}
                        >
                            <Plus size={15} />
                            <span>{t('approvalThresholds.addTier', 'Add tier')}</span>
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 px-3.5 py-2 rounded-xl"
                            onClick={handleResetDefaults}
                        >
                            <RotateCcw size={15} />
                            <span>{t('approvalThresholds.resetDefaults', 'Reset to defaults')}</span>
                        </button>

                        <button
                            type="button"
                            className="thresholds-save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 size={17} className="animate-spin" />
                            ) : (
                                <Save size={17} />
                            )}
                            <span>{saving ? t('approvalThresholds.saving', 'Saving...') : t('approvalThresholds.saveChanges', 'Save changes')}</span>
                        </button>
                    </div>
                </div>

                {/* Visual Rule Pipeline Preview */}
                <PreviewPipeline tiers={tiers} currency={currency} t={t} isAr={isAr} />
            </div>
        </Layout>
    );
}

// Convert maxAmount: null/undefined into canonical null
const normalizeTier = (t) => ({
    maxAmount: t.maxAmount === undefined || t.maxAmount === null
        ? null
        : (typeof t.maxAmount === 'string' && t.maxAmount.trim() === '' ? null : Number(t.maxAmount)),
    minRole: t.minRole || 'ADMIN'
});

// Client-side validator matching backend rules
const validateLocally = (tiers, isAr = false) => {
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return isAr ? 'يجب تحديد شريحة موافقة واحدة على الأقل.' : 'At least one tier is required.';
    }
    let sawNullCap = false;
    let prevMax = -1;
    for (let i = 0; i < tiers.length; i++) {
        const { maxAmount, minRole } = tiers[i];
        if (!ROLES.includes(minRole)) {
            return isAr ? `الشريحة #${i + 1}: صلاحية غير صالحة ${minRole}` : `Tier #${i + 1}: Invalid role ${minRole}`;
        }
        if (sawNullCap) {
            return isAr ? 'الشريحة ذات السقف المفتوح (غير المحدود) يجب أن تكون الشريحة الأخيرة دائماً.' : 'The unlimited ceiling tier must be the very last tier.';
        }
        if (maxAmount !== null && (typeof maxAmount !== 'number' || isNaN(maxAmount) || maxAmount <= 0)) {
            return isAr ? `الشريحة #${i + 1}: يجب إدخال مبلغ صحيح أكبر من الصفر أو تركه فارغاً للشريحة الأخيرة.` : `Tier #${i + 1}: Max amount must be a positive number or empty.`;
        }
        if (maxAmount !== null) {
            if (maxAmount <= prevMax) {
                return isAr
                    ? `الشريحة #${i + 1}: سقف المبلغ (${maxAmount}) يجب أن يكون أكبر من سقف الشريحة السابقة (${prevMax}).`
                    : `Tier #${i + 1}: Ceiling (${maxAmount}) must be greater than previous tier (${prevMax}).`;
            }
            prevMax = maxAmount;
        }
        if (maxAmount === null) {
            if (sawNullCap) return isAr ? 'يمكن تحديد شريحة واحدة فقط بسقف غير محدود.' : 'Only one tier can have an unlimited ceiling.';
            sawNullCap = true;
        }
    }
    if (!sawNullCap) {
        return isAr
            ? 'يجب وجود شريحة نهائية بسقف غير محدود — اترك خانة "الحد الأقصى" للشريحة الأخيرة فارغة.'
            : 'You need one fallback tier with an unlimited ceiling — leave the last "Up to" empty.';
    }
    return null;
};

// Visual rule preview pipeline
function PreviewPipeline({ tiers, currency, t, isAr }) {
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    return (
        <div className="preview-card">
            <div className="preview-header">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                    <Sparkles size={17} />
                </div>
                <div>
                    <h3 className="preview-title">
                        {isAr ? 'معاينة مسار الاعتمادات المالي المباشر' : 'Live Transaction Routing Matrix'}
                    </h3>
                    <p className="preview-subtitle">
                        {isAr
                            ? 'كيف سيقوم النظام بتوجيه معاملات الصرف والعهد والمصروفات حسب الشرائح الحالية'
                            : 'How transaction vouchers are routed to the required authority based on amount'}
                    </p>
                </div>
            </div>

            <div className="pipeline-grid">
                {tiers.map((tier, idx) => {
                    const prevTier = idx > 0 ? tiers[idx - 1] : null;
                    const prevMax = prevTier && prevTier.maxAmount !== null ? Number(prevTier.maxAmount) : 0;
                    const isFallback = tier.maxAmount === null;

                    let amountRangeText = '';
                    if (idx === 0) {
                        amountRangeText = isFallback
                            ? (isAr ? 'أي مبلغ (غير محدود)' : 'Any Amount (Unlimited)')
                            : `${isAr ? 'حتى' : 'Up to'} ${currency(Number(tier.maxAmount) || 0)}`;
                    } else if (isFallback) {
                        amountRangeText = isAr
                            ? `أعلى من ${currency(prevMax)} (بدون سقف)`
                            : `Above ${currency(prevMax)} (Unlimited)`;
                    } else {
                        amountRangeText = `${currency(prevMax + 1)} — ${currency(Number(tier.maxAmount))}`;
                    }

                    const cfg = ROLE_CONFIG[tier.minRole] || ROLE_CONFIG.ADMIN;
                    const Icon = cfg.icon || ShieldCheck;
                    const roleName = isAr ? cfg.nameAr : cfg.nameEn;
                    const roleLevel = isAr ? cfg.levelAr : cfg.levelEn;

                    return (
                        <div key={idx} className="pipeline-step-card">
                            <div className="pipeline-step-header">
                                <span className="pipeline-step-num">
                                    {isFallback ? (isAr ? 'الشريحة الاحتياطية' : 'Fallback Tier') : `${isAr ? 'شريحة' : 'Tier'} #${idx + 1}`}
                                </span>
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                            </div>

                            <div className="pipeline-amount-range">
                                {amountRangeText}
                            </div>

                            <div className="pipeline-role-target">
                                <div
                                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                    style={{ background: cfg.bg, color: cfg.color }}
                                >
                                    <Icon size={17} strokeWidth={2.3} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                        {isAr ? 'يتطلب موافقة' : 'Requires Approval By'}
                                    </span>
                                    <span className="font-bold text-[13.5px] text-slate-900 dark:text-zinc-100 truncate">
                                        {roleName}
                                    </span>
                                </div>
                                <span
                                    className="text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0"
                                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                                >
                                    {roleLevel}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
