import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    CreditCard, HardDrive, Check, Loader2, ExternalLink, Calendar, 
    AlertCircle, AlertTriangle, X, Zap, Layers, Users, Sparkles, ShieldCheck, ShieldAlert, 
    ArrowRight, CheckCircle2, RefreshCw, MessageCircle, Mail,
    Smartphone, Clock, Lock, Crown
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';
import InstaPayModal from '../components/billing/InstaPayModal';
import DowngradeSafeguardModal from '../components/billing/DowngradeSafeguardModal';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function Billing() {
    const { t, i18n } = useTranslation();
    const { showAlert } = useAlert();
    const { user } = useAuth();
    const { currency } = useFormat();
    const isAr = i18n.language === 'ar';

    const [plans, setPlans] = useState([]);
    const [addOns, setAddOns] = useState([]);
    const [billingEnabled, setBillingEnabled] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
    const [loading, setLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [showAddOnsModal, setShowAddOnsModal] = useState(false);

    // InstaPay State
    const [instaPayModalOpen, setInstaPayModalOpen] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState({ type: 'PLAN', key: 'PREMIUM' });
    const [adminApprovalsOpen, setAdminApprovalsOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);

    // Custom UI Confirmation Modal State
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        warning: '',
        confirmText: '',
        cancelText: '',
        confirmVariant: 'danger',
        loading: false,
        onConfirm: null
    });

    const load = async () => {
        try {
            setLoading(true);
            const [plansRes, subRes, pendingRes] = await Promise.all([
                billingAPI.listPlans(),
                billingAPI.getSubscription(),
                billingAPI.listPendingPayments('tenant').catch(() => ({ data: { data: [] } }))
            ]);
            setPlans(plansRes.data.data || []);
            setAddOns(plansRes.data.addOns || []);
            setBillingEnabled(plansRes.data.billingEnabled);
            setSubscription(subRes.data.data);

            const pendings = pendingRes.data?.data || [];
            setPendingPayment(pendings.find(p => p.status === 'PENDING') || null);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: apiErrorMessage(err, 'Failed to load billing data.')
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleConfirmDowngrade = async ({ reason, feedback }) => {
        try {
            setActionInProgress('FREE');
            const r = await billingAPI.selectPlan('FREE', {
                confirmDowngrade: true,
                reason,
                feedback
            });
            setDowngradeModalOpen(false);
            showAlert({
                type: 'success',
                title: t('common.success', 'Success'),
                message: isAr
                    ? (r.data.messageAr || 'تم تخفيض الباقة إلى الباقة المجانية بنجاح.')
                    : (r.data.message || 'Plan downgraded to Free plan successfully.')
            });
            await load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: apiErrorMessage(err, 'Failed to downgrade plan.')
            });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleSelectPlan = async (planKey) => {
        if (planKey === currentPlanKey) {
            return; // Already active on this plan
        }
        const isCurrentlyPaid = (currentPlanConfig?.priceEgp > 0 || currentPlanKey !== 'FREE');
        if (planKey === 'FREE' && isCurrentlyPaid) {
            setDowngradeModalOpen(true);
            return;
        }
        if (pendingPayment) {
            showAlert({
                type: 'warning',
                title: isAr ? 'طلب ترقية قيد المراجعة بالفعل' : 'Pending Request Active',
                message: isAr
                    ? `لديك بالفعل طلب ترقية للباقة (${pendingPayment.plan || pendingPayment.rawWebhook?.itemKey}) قيد المراجعة الفورية من إدارة المنصة. لا يمكنك تقديم طلب جديد حتى تتم الموافقة عليه أو إلغاؤه أولاً.`
                    : `You already have a pending payment request for ${pendingPayment.plan}. Please wait for approval or cancel it first.`
            });
            return;
        }

        if (planKey === 'FREE') {
            try {
                setActionInProgress(planKey);
                const r = await billingAPI.selectPlan(planKey);
                showAlert({
                    type: 'success',
                    title: t('common.success', 'Success'),
                    message: r.data.message || t('billing.planUpdated', 'Plan updated successfully.')
                });
                await load();
            } catch (err) {
                showAlert({
                    type: 'error',
                    title: t('common.error', 'Error'),
                    message: apiErrorMessage(err, 'Failed to update plan.')
                });
            } finally {
                setActionInProgress(null);
            }
            return;
        }

        // Open InstaPay Instant Checkout Modal for paid plans
        setPaymentTarget({ type: 'PLAN', key: planKey });
        setInstaPayModalOpen(true);
    };

    const handleBuyAddOn = async (addOnKey) => {
        if (!isAddonEligible) {
            showAlert({
                type: 'warning',
                title: isAr ? 'الباقات الإضافية حصرية' : 'Exclusive Add-Ons',
                message: isAr
                    ? 'باقات شحن رصيد الذكاء الاصطناعي متاحة فقط لمشتركي الباقة المميزة والشركات. يرجى ترقية باقتك للاستفادة منها.'
                    : 'AI Token Add-On packs are exclusively available to Premium and Enterprise members. Please upgrade your plan first.'
            });
            return;
        }
        if (pendingPayment) {
            showAlert({
                type: 'warning',
                title: isAr ? 'طلب قيد المراجعة' : 'Pending Request Active',
                message: isAr
                    ? 'لديك طلب ترقية قيد المراجعة بالفعل. يرجى انتظار اعتماده أولاً.'
                    : 'You have a pending payment request. Please wait for approval first.'
            });
            return;
        }
        setShowAddOnsModal(false);
        setPaymentTarget({ type: 'ADDON', key: addOnKey });
        setInstaPayModalOpen(true);
    };

    const handleCancel = () => {
        setDowngradeModalOpen(true);
    };

    const handleCancelPendingRequest = (paymentAttemptId) => {
        setConfirmDialog({
            isOpen: true,
            title: isAr ? 'إلغاء طلب الترقية المعلق' : 'Cancel Upgrade Request',
            message: isAr
                ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب المعلق؟'
                : 'Are you sure you want to cancel this pending verification request?',
            warning: isAr
                ? 'سيتم إيقاف المراجعة وإلغاء الطلب، وستتمكن من اختيار أي باقة أخرى أو إعادة التحويل مرة أخرى.'
                : 'The active review will be stopped and you will be able to select another plan.',
            confirmText: isAr ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Request',
            cancelText: isAr ? 'متابعة المراجعة' : 'Keep Request Active',
            confirmVariant: 'warning',
            onConfirm: async () => {
                try {
                    await billingAPI.cancelPendingPayment(paymentAttemptId);
                    setPendingPayment(null);
                    showAlert({
                        type: 'info',
                        title: isAr ? 'تم إلغاء الطلب' : 'Request Cancelled',
                        message: isAr ? 'تم إلغاء طلب التحقق بنجاح.' : 'Pending verification request has been cancelled.'
                    });
                    await load();
                } catch (err) {
                    showAlert({
                        type: 'error',
                        title: t('common.error', 'Error'),
                        message: apiErrorMessage(err, 'Failed to cancel request.')
                    });
                }
            }
        });
    };

    if (loading || !subscription) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const normalizePlanKey = (k) => {
        if (!k) return 'FREE';
        const u = String(k).toUpperCase();
        if (u === 'BUSINESS' || u === 'PRO' || u === 'BASIC' || u === 'PREMIUM') return 'PREMIUM';
        if (u === 'ENTERPRISE') return 'ENTERPRISE';
        return 'FREE';
    };

    const currentPlanKey = normalizePlanKey(subscription.planConfig?.key || subscription.plan);
    const currentPlanConfig = subscription.planConfig || getPlan(currentPlanKey);
    const isAddonEligible = currentPlanKey === 'PREMIUM' || currentPlanKey === 'ENTERPRISE' || (currentPlanConfig && currentPlanConfig.priceEgp > 0);
    const usage = subscription.usage || {};

    // Progress calculations
    const projectUsagePct = usage.projects?.isUnlimited 
        ? 0 
        : Math.min(100, Math.round(((usage.projects?.current || 0) / (usage.projects?.max || 1)) * 100));
    
    const userUsagePct = usage.users?.isUnlimited 
        ? 0 
        : Math.min(100, Math.round(((usage.users?.current || 0) / (usage.users?.max || 1)) * 100));

    const aiUsagePct = Math.min(100, Math.round(((usage.aiActions?.current || 0) / (usage.aiActions?.max || 1)) * 100));
    const storageUsagePct = usage.storage?.isUnlimited
        ? 0
        : (usage.storage?.usedPercent ?? Math.min(100, Math.round(((usage.storage?.currentMb || 0) / (usage.storage?.maxMb || 50)) * 100)));

    return (
        <Layout>
            <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>
                {/* Header */}
                <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center', margin: '0 0 6px 0', fontSize: '1.85rem' }}>
                            <CreditCard size={28} className="text-primary" />
                            {t('billing.title', 'Billing & Subscription')}
                        </h1>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.95rem' }}>
                            {t('billing.subtitle', 'Manage your company subscription plan, capacity limits, and AI token add-ons.')}
                        </p>
                    </div>
                    <button 
                        className="btn btn-secondary btn-sm flex gap-sm" 
                        onClick={load}
                        style={{ alignItems: 'center' }}
                    >
                        <RefreshCw size={14} />
                        {t('common.refresh', 'Refresh')}
                    </button>
                </div>

                {/* Active InstaPay Verification & Review Hub */}
                {pendingPayment && (
                    <div style={{
                        marginTop: 24,
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
                        border: '1.5px solid rgba(245, 158, 11, 0.45)',
                        borderRadius: 16,
                        padding: '24px',
                        boxShadow: '0 8px 30px rgba(245, 158, 11, 0.12)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Glowing Accent Bar */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)',
                            backgroundSize: '200% 100%',
                            animation: 'pulse 2s infinite linear'
                        }} />

                        {/* Hub Header */}
                        <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 6px 16px rgba(245, 158, 11, 0.35)'
                                }}>
                                    <Clock size={26} className="spin" style={{ animationDuration: '4s' }} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {isAr ? 'طلب الترقية قيد المراجعة الفورية' : 'Subscription Upgrade Under Verification'}
                                        </h3>
                                        <span style={{
                                            background: '#f59e0b',
                                            color: '#000',
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            letterSpacing: '0.5px'
                                        }}>
                                            {pendingPayment.plan || pendingPayment.rawWebhook?.itemKey}
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {isAr
                                            ? `تم إرسال إيصال التحويل بمبلغ ${Number(pendingPayment.amountEgp).toLocaleString()} ج.م (كود العملية: ${pendingPayment.paymobOrderId || pendingPayment.rawWebhook?.referenceCode}). يتم تدقيق الإيصال وتفعيل باقتك خلال دقائق.`
                                            : `Payment proof of ${Number(pendingPayment.amountEgp).toLocaleString()} EGP received (Ref: ${pendingPayment.paymobOrderId || pendingPayment.rawWebhook?.referenceCode}). Being verified by admin for instant activation.`}
                                    </p>
                                </div>
                            </div>

                            {/* Hub Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <a
                                    href={`https://wa.me/201092041908?text=${encodeURIComponent(isAr ? `مرحباً، أود الاستفسار عن تفعيل طلبي برقم ${pendingPayment.paymobOrderId || pendingPayment.rawWebhook?.referenceCode}` : `Hello, Inquiring about status for order ${pendingPayment.paymobOrderId || pendingPayment.rawWebhook?.referenceCode}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: '#25D366',
                                        color: 'white',
                                        padding: '9px 16px',
                                        borderRadius: 8,
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
                                    }}
                                >
                                    <MessageCircle size={16} />
                                    <span>{isAr ? 'متابعة وتأكيد عبر واتساب' : 'WhatsApp Support'}</span>
                                </a>

                                <button
                                    onClick={() => handleCancelPendingRequest(pendingPayment.id)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        padding: '8px 14px',
                                        borderRadius: 8,
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isAr ? 'إلغاء الطلب' : 'Cancel Request'}
                                </button>
                            </div>
                        </div>

                        {/* 3-Step Visual Progress Stepper */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 12,
                            paddingTop: 16,
                            borderTop: '1px solid rgba(245, 158, 11, 0.25)'
                        }}>
                            {/* Step 1 */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 10
                            }}>
                                <CheckCircle2 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {isAr ? '1. إرسال الإيصال' : '1. Proof Submitted'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {fmtDate(pendingPayment.rawWebhook?.submittedAt || pendingPayment.createdAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1.5px solid #f59e0b',
                                borderRadius: 10,
                                boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)'
                            }}>
                                <Clock size={20} className="spin" style={{ color: '#f59e0b', flexShrink: 0, animationDuration: '3s' }} />
                                <div>
                                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#f59e0b' }}>
                                        {isAr ? '2. التحقق والمطابقة' : '2. Admin Verification'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {isAr ? 'قيد المراجعة الفورية ⏳' : 'In Progress ⏳'}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 10,
                                opacity: 0.65
                            }}>
                                <Zap size={20} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {isAr ? '3. تفعيل الباقة' : '3. Plan Activation'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                        {isAr ? 'تلقائي فور التأكيد' : 'Instant upon approval'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Usage & Capacity Overview */}
                <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={18} className="text-primary" />
                        {t('billing.usageOverview', 'Company Capacity & Quota Usage')}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                        {/* Projects Meter */}
                        <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between" style={{ marginBottom: 8 }}>
                                <span className="flex gap-sm text-secondary" style={{ alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Layers size={15} />
                                    {t('billing.projectsUsed', 'Active Projects')}
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: projectUsagePct >= 90 ? '#ef4444' : 'var(--text-primary)' }}>
                                    {usage.projects?.current || 0} / {usage.projects?.isUnlimited ? t('billing.unlimited', 'Unlimited') : usage.projects?.max}
                                </span>
                            </div>
                            <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: usage.projects?.isUnlimited ? '15%' : `${projectUsagePct}%`, 
                                    background: projectUsagePct >= 90 ? '#ef4444' : projectUsagePct >= 70 ? '#f59e0b' : '#3b82f6',
                                    borderRadius: 4,
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                                {usage.projects?.isUnlimited 
                                    ? t('billing.unlimitedProjects', 'Uncapped projects on Enterprise')
                                    : `${(usage.projects?.max || 0) - (usage.projects?.current || 0)} ${t('billing.remaining', 'remaining')}`}
                            </div>
                        </div>

                        {/* Team Members Meter */}
                        <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between" style={{ marginBottom: 8 }}>
                                <span className="flex gap-sm text-secondary" style={{ alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Users size={15} />
                                    {t('billing.usersUsed', 'Team Member Seats')}
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: userUsagePct >= 90 ? '#ef4444' : 'var(--text-primary)' }}>
                                    {usage.users?.current || 0} / {usage.users?.isUnlimited ? t('billing.unlimited', 'Unlimited') : usage.users?.max}
                                </span>
                            </div>
                            <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: usage.users?.isUnlimited ? '15%' : `${userUsagePct}%`, 
                                    background: userUsagePct >= 90 ? '#ef4444' : userUsagePct >= 70 ? '#f59e0b' : '#10b981',
                                    borderRadius: 4,
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                                {usage.users?.isUnlimited 
                                    ? t('billing.unlimitedUsers', 'Uncapped seats on Enterprise')
                                    : `${(usage.users?.max || 0) - (usage.users?.current || 0)} ${t('billing.remaining', 'remaining')}`}
                            </div>
                        </div>

                        {/* AI Quota Meter */}
                        <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between" style={{ marginBottom: 8 }}>
                                <span className="flex gap-sm text-secondary" style={{ alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Sparkles size={15} className="text-primary" />
                                    {t('billing.aiActionsUsed', 'Monthly AI Actions')}
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: aiUsagePct >= 90 ? '#ef4444' : '#10b981' }}>
                                    {usage.aiActions?.current || 0} / {usage.aiActions?.max || 15}
                                </span>
                            </div>
                            <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${aiUsagePct}%`, 
                                    background: aiUsagePct >= 90 ? '#ef4444' : aiUsagePct >= 70 ? '#f59e0b' : 'linear-gradient(90deg, #10b981, #06b6d4)',
                                    borderRadius: 4,
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <div className="text-secondary flex-between" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                                <span>{usage.aiActions?.remaining || 0} {t('billing.remaining', 'remaining')}</span>
                                {subscription.currentPeriodEnd && (
                                    <span>{t('billing.resetsOn', 'Resets')} {fmtDate(subscription.currentPeriodEnd)}</span>
                                )}
                            </div>
                        </div>

                        {/* Storage Meter */}
                        <div className="card" style={{ padding: '18px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between" style={{ marginBottom: 8 }}>
                                <span className="flex gap-sm text-secondary" style={{ alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <HardDrive size={15} className="text-primary" />
                                    {t('billing.storageUsed', 'Media Storage')}
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: storageUsagePct >= 90 ? '#ef4444' : 'var(--text-primary)' }}>
                                    {usage.storage?.isUnlimited ? `${usage.storage?.currentMb || 0} MB` : `${usage.storage?.currentMb || 0} / ${usage.storage?.maxMb || 50} MB`}
                                </span>
                            </div>
                            <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: usage.storage?.isUnlimited ? '15%' : `${storageUsagePct}%`, 
                                    background: storageUsagePct >= 90 ? '#ef4444' : storageUsagePct >= 70 ? '#f59e0b' : '#8b5cf6',
                                    borderRadius: 4,
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <div className="text-secondary flex-between" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                                <span>
                                    {usage.storage?.isUnlimited 
                                        ? t('billing.unlimitedStorage', 'Uncapped on Enterprise')
                                        : `${usage.storage?.remainingMb || 0} MB ${t('billing.remaining', 'remaining')}`}
                                </span>
                                <span>
                                    {isAr ? `حد الملف: ${usage.storage?.maxUploadFileMb || 3} م.ب/ملف` : `Max: ${usage.storage?.maxUploadFileMb || 3} MB/file`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan Selection Header & Billing Interval Switcher */}
                <div className="flex-between" style={{ marginTop: 40, flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>{t('billing.choosePlan', 'Subscription Plans')}</h2>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem', maxWidth: 650 }}>
                            {t('billing.plansSubtitle', '100% of all ERP features are unlocked across all plans. Plans scale purely by projects, user seats, and AI agent quota.')}
                        </p>
                    </div>

                    {/* Monthly vs Annual Toggle */}
                    <div style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: 4, 
                        borderRadius: 10, 
                        border: '1px solid var(--border-color)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 7,
                                border: 'none',
                                fontSize: '0.85rem',
                                fontWeight: billingCycle === 'monthly' ? 700 : 500,
                                background: billingCycle === 'monthly' ? 'var(--color-primary, #0284c7)' : 'transparent',
                                color: billingCycle === 'monthly' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {t('billing.monthly', 'Monthly')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle('annual')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 7,
                                border: 'none',
                                fontSize: '0.85rem',
                                fontWeight: billingCycle === 'annual' ? 700 : 500,
                                background: billingCycle === 'annual' ? 'var(--color-primary, #0284c7)' : 'transparent',
                                color: billingCycle === 'annual' ? '#ffffff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {t('billing.annually', 'Annually')}
                            <span style={{
                                background: '#10b981',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 6,
                                letterSpacing: 0.2
                            }}>
                                {t('billing.saveTwoMonths', '2 MOS FREE')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 3-Tier Plans Grid - Perfectly Aligned Horizontal Rows */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 20,
                    marginTop: 24,
                    alignItems: 'stretch'
                }}>
                    {plans.map(plan => {
                        const isCurrent = plan.key === currentPlanKey;
                        const isPopular = plan.popular;
                        const isPendingUpgrade = pendingPayment && (pendingPayment.plan === plan.key || pendingPayment.rawWebhook?.itemKey === plan.key);
                        
                        // Calculate price for selected cycle
                        const isEnterprise = plan.key === 'ENTERPRISE' || plan.isCustom;
                        const planName = isAr && plan.nameAr ? plan.nameAr : plan.name;
                        const planDesc = isAr && plan.descriptionAr ? plan.descriptionAr : plan.description;

                        // Calculate pricing based on cycle (Annual gives 2 months free = pay for 10)
                        const rawMonthlyEgp = plan.priceEgp || 0;
                        const rawMonthlyUsd = plan.priceUsd || 0;
                        const displayPriceEgp = billingCycle === 'annual' ? Math.round(rawMonthlyEgp * 10) : rawMonthlyEgp;
                        const displayPriceUsd = billingCycle === 'annual' ? Math.round(rawMonthlyUsd * 10) : rawMonthlyUsd;

                        return (
                            <div
                                key={plan.key}
                                className="card"
                                style={{
                                    padding: '24px 20px',
                                    border: isPendingUpgrade
                                        ? '2px solid #f59e0b'
                                        : isCurrent 
                                            ? '2px solid #3b82f6' 
                                            : isPopular 
                                                ? '2px solid #10b981' 
                                                : '1px solid var(--border-color)',
                                    background: isPendingUpgrade
                                        ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-secondary) 100%)'
                                        : isPopular 
                                            ? 'rgba(16, 185, 129, 0.03)' 
                                            : isCurrent 
                                                ? 'rgba(59, 130, 246, 0.03)' 
                                                : 'var(--bg-secondary)',
                                    borderRadius: 14,
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                    boxShadow: isPendingUpgrade ? '0 0 20px rgba(245, 158, 11, 0.2)' : undefined
                                }}
                            >
                                {/* Top Badges (Aligned across all cards) */}
                                <div style={{ position: 'absolute', top: -11, insetInlineEnd: 16, display: 'flex', gap: 6, height: 22 }}>
                                    {isPendingUpgrade && (
                                        <div style={{
                                            background: '#f59e0b',
                                            color: '#000000',
                                            padding: '2px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                                        }}>
                                            {isAr ? '⏳ قيد المراجعة والتفعيل' : '⏳ VERIFYING PROOF'}
                                        </div>
                                    )}
                                    {isCurrent && !isPendingUpgrade && (
                                        <div style={{
                                            background: '#3b82f6',
                                            color: '#ffffff',
                                            padding: '2px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                        }}>
                                            {t('billing.current', 'CURRENT PLAN')}
                                        </div>
                                    )}
                                    {isPopular && !isPendingUpgrade && !isCurrent && (
                                        <div style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '2px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                        }}>
                                            {t('billing.popular', 'MOST POPULAR')}
                                        </div>
                                    )}
                                    {isEnterprise && !isPendingUpgrade && !isCurrent && (
                                        <div style={{
                                            background: '#0284c7',
                                            color: '#ffffff',
                                            padding: '2px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                        }}>
                                            {isAr ? 'مخصص للشركات' : 'ENTERPRISE SCALE'}
                                        </div>
                                    )}
                                    {plan.key === 'FREE' && !isCurrent && !isPendingUpgrade && (
                                        <div style={{
                                            background: '#64748b',
                                            color: '#ffffff',
                                            padding: '2px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                        }}>
                                            {isAr ? 'الباقة الأساسية' : 'FREE FOREVER'}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Plan Title & Description (Fixed height to keep price line identical) */}
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 700, minHeight: 28, display: 'flex', alignItems: 'center' }}>
                                        {planName}
                                    </h3>
                                    <p className="text-secondary" style={{ fontSize: '0.82rem', margin: '0 0 16px 0', minHeight: 40, lineHeight: 1.4, display: 'flex', alignItems: 'center' }}>
                                        {planDesc}
                                    </p>

                                    {/* Pricing Block (Exact same height and divider line across all 3 cards) */}
                                    <div style={{
                                        marginBottom: 16,
                                        borderBottom: '1px solid var(--border-color)',
                                        paddingBottom: 16,
                                        minHeight: 76,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center'
                                    }}>
                                        {isEnterprise ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                    <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        {t('billing.customPrice', 'Custom Pricing')}
                                                    </span>
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                                    {t('billing.enterpriseTailored', 'Tailored for large firms & custom SLA')}
                                                </div>
                                            </>
                                        ) : displayPriceEgp === 0 ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        {t('billing.free', 'Free')}
                                                    </span>
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                                    {isAr ? 'مجاناً مدى الحياة · بدون بطاقة بنكية' : 'Free forever · No credit card required'}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        {currency(displayPriceEgp)}
                                                    </span>
                                                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                        {billingCycle === 'annual' ? t('billing.perYear', '/ year') : t('billing.perMonth', '/ month')}
                                                    </span>
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                                    ≈ ${displayPriceUsd} USD · {billingCycle === 'annual' ? t('billing.billedAnnually', 'Billed annually (2 mos free)') : t('billing.billedMonthly', 'Billed monthly')}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Capacity Quota Specs (Exact same 4 rows & height across all cards) */}
                                    <div style={{
                                        background: 'var(--bg-primary, rgba(0,0,0,0.02))',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 10,
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                        marginBottom: 14,
                                        minHeight: 146
                                    }}>
                                        {/* Projects */}
                                        <div className="flex-between" style={{ fontSize: '0.83rem' }}>
                                            <span className="flex gap-sm text-secondary" style={{ alignItems: 'center' }}>
                                                <Layers size={14} />
                                                {t('billing.projects', 'Projects')}
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                {plan.limits.maxProjects === -1 || isEnterprise ? t('billing.unlimited', 'Unlimited') : `${plan.limits.maxProjects} ${t('billing.activeProjects', 'Projects')}`}
                                            </span>
                                        </div>

                                        {/* Users / Team Seats */}
                                        <div className="flex-between" style={{ fontSize: '0.83rem' }}>
                                            <span className="flex gap-sm text-secondary" style={{ alignItems: 'center' }}>
                                                <Users size={14} />
                                                {t('billing.teamSeats', 'Team Seats')}
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                {plan.limits.maxUsers === -1 || isEnterprise ? t('billing.unlimited', 'Unlimited') : `${plan.limits.maxUsers} ${t('billing.users', 'Users')}`}
                                            </span>
                                        </div>

                                        {/* AI Quota */}
                                        <div className="flex-between" style={{ fontSize: '0.83rem' }}>
                                            <span className="flex gap-sm text-secondary" style={{ alignItems: 'center' }}>
                                                <Sparkles size={14} className="text-primary" />
                                                {t('billing.aiQuota', 'AI Actions')}
                                            </span>
                                            <span style={{ fontWeight: 700, color: '#10b981' }}>
                                                {plan.limits.aiExtractionsPerMonth === -1 || isEnterprise ? t('billing.unlimited', 'Unlimited / Custom') : `${plan.limits.aiExtractionsPerMonth.toLocaleString()} ${t('billing.perMonthShort', '/ mo')}`}
                                            </span>
                                        </div>

                                        {/* Media Storage Capacity */}
                                        <div className="flex-between" style={{ fontSize: '0.83rem' }}>
                                            <span className="flex gap-sm text-secondary" style={{ alignItems: 'center' }}>
                                                <HardDrive size={14} />
                                                {t('billing.storageUsed', 'Media Storage')}
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                {plan.limits.maxStorageMb === -1 || isEnterprise ? t('billing.unlimited', 'Unlimited') : plan.limits.maxStorageMb >= 1024 ? `${Math.round(plan.limits.maxStorageMb / 1024)} GB` : `${plan.limits.maxStorageMb} MB`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Feature Callout Badge (Exact same height and position across all cards) */}
                                    <div style={{
                                        background: isEnterprise ? 'rgba(2, 132, 199, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                        color: isEnterprise ? '#38bdf8' : '#10b981',
                                        border: `1px solid ${isEnterprise ? 'rgba(2, 132, 199, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        minHeight: 34
                                    }}>
                                        <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                                        <span>
                                            {isEnterprise
                                                ? (isAr ? 'جميع الميزات + أولوية الدعم الفني SLA' : 'Full Suite + Dedicated Priority SLA')
                                                : t('billing.allFeaturesUnlocked', '100% Full ERP Features Unlocked')}
                                        </span>
                                    </div>
                                </div>

                                {/* Plan Action Button (Exact same 44px height & pinned to bottom baseline across all cards) */}
                                <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                                    {isEnterprise ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 44 }}>
                                            <a
                                                href={`https://wa.me/201092041908?text=${encodeURIComponent(isAr ? 'مرحباً، أود الاستفسار عن باقة الشركات (Enterprise) لنظام حسابي ERP' : "Hello, I'm interested in Hesaby ERP Enterprise Plan")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    height: 44,
                                                    background: '#25D366',
                                                    borderColor: '#25D366',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    textDecoration: 'none',
                                                    padding: '0 8px',
                                                    borderRadius: 8,
                                                    fontSize: '0.84rem',
                                                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
                                                }}
                                            >
                                                <MessageCircle size={15} />
                                                <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                                            </a>
                                            <a
                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=nooraldeenahmed04@gmail.com&su=${encodeURIComponent(isAr ? 'استفسار عن باقة الشركات Enterprise - نظام حسابي ERP' : 'Hesaby ERP Enterprise Plan Inquiry')}&body=${encodeURIComponent(isAr ? 'مرحباً فريق مبيعات حسابي، نود الاستفسار عن باقة الشركات وتفاصيل الاشتراك المخصص لشركتنا.' : 'Hello Hesaby Sales Team, We would like to inquire about the Enterprise Plan and custom quotation.')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    height: 44,
                                                    background: '#0284c7',
                                                    borderColor: '#0284c7',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    textDecoration: 'none',
                                                    padding: '0 8px',
                                                    borderRadius: 8,
                                                    fontSize: '0.84rem',
                                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                                }}
                                            >
                                                <Mail size={15} />
                                                <span>{isAr ? 'إيميل المبيعات' : 'Email Sales'}</span>
                                            </a>
                                        </div>
                                    ) : isPendingUpgrade ? (
                                        <button
                                            className="btn btn-secondary"
                                            disabled
                                            style={{
                                                width: '100%',
                                                height: 44,
                                                borderColor: '#f59e0b',
                                                color: '#f59e0b',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                cursor: 'default',
                                                borderRadius: 8
                                            }}
                                        >
                                            <Clock size={15} className="spin" style={{ animationDuration: '3s' }} />
                                            {isAr ? 'جاري التحقق من الإيصال والتفعيل ⏳' : 'Verifying Receipt ⏳'}
                                        </button>
                                    ) : isCurrent ? (
                                        <button 
                                            className="btn" 
                                            disabled 
                                            style={{ 
                                                width: '100%', 
                                                height: 44, 
                                                opacity: 0.92, 
                                                cursor: 'default', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                gap: 8,
                                                background: 'var(--bg-secondary)',
                                                border: '1.5px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                fontWeight: 700,
                                                borderRadius: 10
                                            }}
                                        >
                                            <Check size={16} style={{ color: '#10b981', strokeWidth: 2.5 }} />
                                            <span>{t('billing.currentPlanLabel', 'Your current plan')}</span>
                                        </button>
                                    ) : (
                                        (() => {
                                            const isDowngradeToFree = plan.key === 'FREE' && currentPlanKey !== 'FREE';
                                            return (
                                                <button
                                                    className="btn"
                                                    style={{ 
                                                        width: '100%',
                                                        height: 44,
                                                        background: isDowngradeToFree 
                                                            ? '#dc2626' 
                                                            : isPopular 
                                                                ? '#10b981' 
                                                                : 'var(--bg-secondary)',
                                                        borderColor: isDowngradeToFree 
                                                            ? '#dc2626' 
                                                            : isPopular 
                                                                ? '#10b981' 
                                                                : 'var(--border-color)',
                                                        color: (isDowngradeToFree || isPopular) ? '#ffffff' : 'var(--text-primary)',
                                                        boxShadow: isDowngradeToFree 
                                                            ? '0 2px 10px rgba(220, 38, 38, 0.25)' 
                                                            : isPopular 
                                                                ? '0 2px 10px rgba(16, 185, 129, 0.25)' 
                                                                : 'none',
                                                        opacity: pendingPayment ? 0.45 : 1,
                                                        cursor: pendingPayment ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                        fontWeight: 700,
                                                        borderRadius: 10,
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onClick={() => handleSelectPlan(plan.key)}
                                                    disabled={actionInProgress === plan.key || !!pendingPayment}
                                                    title={pendingPayment ? (isAr ? 'لديك طلب ترقية قيد المراجعة الفورية' : 'You have a pending upgrade under verification') : ''}
                                                >
                                                    {actionInProgress === plan.key ? (
                                                        <Loader2 size={15} className="spin" color="#ffffff" />
                                                    ) : isDowngradeToFree ? (
                                                        <ShieldAlert size={16} color="#ffffff" style={{ flexShrink: 0 }} />
                                                    ) : (
                                                        <ArrowRight size={15} color={isPopular ? '#ffffff' : undefined} />
                                                    )}
                                                    <span style={{ color: (isDowngradeToFree || isPopular) ? '#ffffff' : undefined }}>
                                                        {pendingPayment 
                                                            ? (isAr ? 'طلب معلق قيد المراجعة' : 'Upgrade Pending') 
                                                            : isDowngradeToFree
                                                                ? (isAr ? 'تخفيض للباقة المجانية' : 'Downgrade to Free')
                                                                : t('billing.switchPlan', 'Switch to this Plan')}
                                                    </span>
                                                </button>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Wide AI Token Add-On Packs Banner Button under Plans */}
                {addOns.length > 0 && (
                    <div style={{ marginTop: 32 }}>
                        <div
                            className="card card-hover"
                            style={{
                                padding: '20px 24px',
                                background: isAddonEligible
                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)'
                                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                border: isAddonEligible
                                    ? '1.5px dashed rgba(16, 185, 129, 0.45)'
                                    : '1.5px dashed rgba(168, 85, 247, 0.4)',
                                borderRadius: 14,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                flexWrap: 'wrap',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => setShowAddOnsModal(true)}
                        >
                            <div className="flex gap-md" style={{ alignItems: 'center', flex: 1, minWidth: 280 }}>
                                <div style={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: 12,
                                    background: isAddonEligible
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: isAddonEligible
                                        ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                                        : '0 4px 12px rgba(139, 92, 246, 0.35)'
                                }}>
                                    {isAddonEligible ? <Sparkles size={24} /> : <Crown size={24} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        {t('billing.addOnsBannerTitle', 'AI Token Add-On Packs')}
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            background: isAddonEligible ? '#10b981' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                            color: '#ffffff',
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                            letterSpacing: '0.04em'
                                        }}>
                                            {isAddonEligible
                                                ? t('billing.topUp', 'TOP-UP')
                                                : t('billing.exclusiveBadge', 'PREMIUM & ENTERPRISE EXCLUSIVE')}
                                        </span>
                                    </h3>
                                    <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
                                        {isAddonEligible
                                            ? t('billing.addOnsBannerDesc', 'Exclusively for Premium and Enterprise members: recharge instant AI actions on top of your plan monthly quota.')
                                            : t('billing.addOnsBannerDescLocked', 'AI Token Add-On packs are exclusively available to Premium and Enterprise members. Upgrade your plan to unlock instant quota top-ups.')}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                style={{
                                    background: isAddonEligible ? '#10b981' : 'var(--bg-secondary)',
                                    borderColor: isAddonEligible ? '#10b981' : 'var(--border-color)',
                                    color: isAddonEligible ? '#ffffff' : 'var(--text-primary)',
                                    padding: '10px 22px',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    border: '1px solid',
                                    boxShadow: isAddonEligible ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none',
                                    pointerEvents: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {isAddonEligible ? (
                                    <>
                                        <Zap size={15} color="#ffffff" style={{ stroke: '#ffffff', color: '#ffffff' }} />
                                        <span style={{ color: '#ffffff' }}>
                                            {t('billing.browseAddOns', 'Browse Add-On Packs')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={15} style={{ color: '#8b5cf6' }} />
                                        <span style={{ color: 'var(--text-primary)' }}>
                                            {t('billing.upgradeToAccessAddons', 'View Add-Ons (Requires Upgrade)')}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Cancel Subscription Footer for Paid Active Subscriptions */}
                {subscription.status === 'ACTIVE' && currentPlanConfig?.priceEgp > 0 && (
                    <div style={{ 
                        marginTop: 40, 
                        padding: '16px 20px', 
                        background: 'rgba(239, 68, 68, 0.04)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        borderRadius: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                    }}>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>
                                {t('billing.cancel', 'Cancel subscription')}
                            </div>
                            <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                                {t('billing.until', 'Renews on:')} {fmtDate(subscription.currentPeriodEnd)}
                            </div>
                        </div>
                        <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={handleCancel}
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        >
                            {t('billing.cancel', 'Cancel subscription')}
                        </button>
                    </div>
                )}
            </div>

            {/* AI Token Add-Ons Selection Modal (Vertical Stack) */}
            {showAddOnsModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowAddOnsModal(false)}
                >
                    <div
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 640, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="modal-header">
                            <div>
                                <h2 className="flex gap-sm" style={{ alignItems: 'center', margin: '0 0 4px 0', fontSize: '1.25rem' }}>
                                    <Sparkles size={20} className="text-primary" />
                                    {t('billing.addOnsTitle', 'AI Token Add-On Packs')}
                                </h2>
                                <p className="text-secondary" style={{ margin: 0, fontSize: '0.82rem' }}>
                                    {t('billing.addOnModalSubtitle', 'Select an add-on pack below. Quota is added immediately to your company monthly AI ceiling.')}
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setShowAddOnsModal(false)}>
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Exclusivity Notice for Free Plan Members */}
                        {!isAddonEligible && (
                            <div style={{
                                padding: '14px 18px',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                                border: '1.5px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                flexWrap: 'wrap',
                                marginBottom: 4
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Lock size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                            {isAr ? 'الباقات الإضافية متاحة حصرياً للباقة المميزة وباقة الشركات' : 'Add-Ons are Exclusive to Premium & Enterprise Plans'}
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                                            {t('billing.addonsLockedNotice', 'Add-on recharge packs are exclusively available for Premium and Enterprise members. Upgrade to Premium to recharge extra AI tokens.')}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-sm"
                                    onClick={() => {
                                        setShowAddOnsModal(false);
                                        handleSelectPlan('PREMIUM');
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 700,
                                        padding: '9px 18px',
                                        borderRadius: 9,
                                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.35)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Crown size={14} />
                                    <span>{isAr ? 'ترقية إلى Premium' : 'Upgrade to Premium'}</span>
                                </button>
                            </div>
                        )}
                            {addOns.map(addon => {
                                const addonName = isAr && addon.nameAr ? addon.nameAr : addon.name;
                                const isAction = actionInProgress === `addon_${addon.key}`;

                                return (
                                    <div
                                        key={addon.key}
                                        style={{
                                            padding: '16px 18px',
                                            background: addon.popular ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                                            border: addon.popular ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 16,
                                            flexWrap: 'wrap',
                                            position: 'relative'
                                        }}
                                    >
                                        {addon.popular && (
                                            <div style={{
                                                position: 'absolute',
                                                top: -9,
                                                insetInlineEnd: 16,
                                                background: '#10b981',
                                                color: '#ffffff',
                                                padding: '1px 8px',
                                                borderRadius: 8,
                                                fontSize: '0.65rem',
                                                fontWeight: 800
                                            }}>
                                                {t('billing.popular', 'POPULAR')}
                                            </div>
                                        )}

                                        <div className="flex gap-md" style={{ alignItems: 'center', flex: 1, minWidth: 200 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 10,
                                                background: addon.popular ? '#10b981' : 'var(--border-color)',
                                                color: addon.popular ? '#ffffff' : 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Zap size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                    {addonName}
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                                                    {addon.uses.toLocaleString()} {t('billing.aiQuota', 'AI Actions')} · {t('billing.instantRecharge', 'Instant recharge')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {currency(addon.priceEgp)}
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                    ≈ ${addon.priceUsd} USD
                                                </div>
                                            </div>

                                            {!isAddonEligible ? (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{
                                                        minWidth: 120,
                                                        padding: '8px 14px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                        background: 'rgba(139, 92, 246, 0.08)',
                                                        borderColor: 'rgba(139, 92, 246, 0.3)',
                                                        color: '#a855f7'
                                                    }}
                                                    onClick={() => {
                                                        setShowAddOnsModal(false);
                                                        handleSelectPlan('PREMIUM');
                                                    }}
                                                >
                                                    <Lock size={13} />
                                                    <span>{t('billing.upgradeToBuy', 'Upgrade to Buy')}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    className={`btn ${addon.popular ? '' : 'btn-secondary'} btn-sm`}
                                                    style={{
                                                        background: addon.popular ? '#10b981' : undefined,
                                                        borderColor: addon.popular ? '#10b981' : undefined,
                                                        color: addon.popular ? '#ffffff' : undefined,
                                                        minWidth: 100,
                                                        padding: '8px 14px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                    onClick={async () => {
                                                        await handleBuyAddOn(addon.key);
                                                    }}
                                                    disabled={isAction}
                                                >
                                                    {isAction ? (
                                                        <Loader2 size={14} className="spin" color={addon.popular ? '#ffffff' : undefined} />
                                                    ) : (
                                                        <Zap size={14} color={addon.popular ? '#ffffff' : undefined} />
                                                    )}
                                                    <span style={{ color: addon.popular ? '#ffffff' : undefined }}>
                                                        {t('billing.buyNow', 'Buy Now')}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Paymob Iframe Modal */}
            {iframeUrl && (
                <div
                    className="modal-overlay"
                    onClick={() => { setIframeUrl(null); load(); }}
                >
                    <div
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 540, width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="modal-header">
                            <h2 className="flex gap-sm" style={{ alignItems: 'center' }}>
                                <CreditCard size={18} />
                                {t('billing.completePayment', 'Complete Payment')}
                            </h2>
                            <button className="modal-close" onClick={() => { setIframeUrl(null); load(); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', borderRadius: 8 }}>
                            <iframe
                                src={iframeUrl}
                                title="Paymob checkout"
                                style={{ width: '100%', height: '100%', border: 0 }}
                            />
                        </div>
                        <div className="text-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            <ExternalLink size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                            {t('billing.paymobNote', 'Powered by Paymob. Cards, mobile wallets, and Fawry are accepted. Close when done — your subscription updates automatically when payment is confirmed.')}
                        </div>
                    </div>
                </div>
            )}

            {/* InstaPay Egypt Checkout Modal */}
            <InstaPayModal
                isOpen={instaPayModalOpen}
                onClose={() => setInstaPayModalOpen(false)}
                itemType={paymentTarget.type}
                itemKey={paymentTarget.key}
                onSuccess={() => {
                    load();
                    showAlert({
                        type: 'success',
                        title: isAr ? 'تم استلام الإيصال' : 'Receipt Received',
                        message: isAr ? 'تم إرسال إيصال التحويل بنجاح وجاري المراجعة والتفعيل.' : 'Receipt submitted successfully and is being verified.'
                    });
                }}
            />

            {/* Multi-Step Downgrade Safeguard Modal */}
            <DowngradeSafeguardModal
                isOpen={downgradeModalOpen}
                onClose={() => setDowngradeModalOpen(false)}
                currentPlan={currentPlanConfig}
                targetPlan={plans.find(p => p.key === 'FREE')}
                subscription={subscription}
                onConfirmDowngrade={handleConfirmDowngrade}
                isAr={isAr}
                currency={currency}
            />

            {/* Custom UI Confirmation Dialog */}
            {confirmDialog.isOpen && (
                <div 
                    className="modal-overlay" 
                    onClick={() => !confirmDialog.loading && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    style={{ zIndex: 1100, backdropFilter: 'blur(6px)', background: 'rgba(0, 0, 0, 0.65)' }}
                >
                    <div 
                        className="modal-container" 
                        style={{ 
                            maxWidth: '480px', 
                            padding: '32px 28px', 
                            borderRadius: '18px', 
                            position: 'relative',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                            textAlign: 'center'
                        }} 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!confirmDialog.loading && (
                            <button 
                                className="modal-close" 
                                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                                style={{ 
                                    position: 'absolute', 
                                    top: '18px', 
                                    right: isAr ? 'auto' : '18px',
                                    left: isAr ? '18px' : 'auto',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '68px',
                                height: '68px',
                                borderRadius: '20px',
                                background: confirmDialog.confirmVariant === 'danger' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                border: `1.5px solid ${confirmDialog.confirmVariant === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                color: confirmDialog.confirmVariant === 'danger' ? '#ef4444' : '#f59e0b'
                            }}>
                                <AlertTriangle size={34} />
                            </div>

                            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {confirmDialog.title}
                            </h3>

                            <p style={{ margin: '0 0 16px 0', fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {confirmDialog.message}
                            </p>

                            {confirmDialog.warning && (
                                <div style={{
                                    width: '100%',
                                    background: confirmDialog.confirmVariant === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                    border: `1px solid ${confirmDialog.confirmVariant === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                    fontSize: '13px',
                                    color: confirmDialog.confirmVariant === 'danger' ? '#f87171' : '#fbbf24',
                                    lineHeight: '1.5',
                                    marginBottom: '24px',
                                    textAlign: isAr ? 'right' : 'left'
                                }}>
                                    {confirmDialog.warning}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                                    disabled={confirmDialog.loading}
                                    style={{
                                        flex: 1,
                                        padding: '11px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        borderRadius: '10px'
                                    }}
                                >
                                    {confirmDialog.cancelText || (isAr ? 'إلغاء وتراجع' : 'Cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={async () => {
                                        if (confirmDialog.onConfirm) {
                                            setConfirmDialog(prev => ({ ...prev, loading: true }));
                                            try {
                                                await confirmDialog.onConfirm();
                                            } finally {
                                                setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
                                            }
                                        } else {
                                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                        }
                                    }}
                                    disabled={confirmDialog.loading}
                                    style={{
                                        flex: 1.2,
                                        padding: '11px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        justifyContent: 'center',
                                        borderRadius: '10px',
                                        background: confirmDialog.confirmVariant === 'danger' ? '#ef4444' : '#f59e0b',
                                        borderColor: confirmDialog.confirmVariant === 'danger' ? '#ef4444' : '#f59e0b',
                                        color: '#ffffff',
                                        boxShadow: confirmDialog.confirmVariant === 'danger' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : '0 4px 14px rgba(245, 158, 11, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {confirmDialog.loading ? <Loader2 size={16} className="spin" /> : null}
                                    <span>{confirmDialog.confirmText || (isAr ? 'تأكيد' : 'Confirm')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
