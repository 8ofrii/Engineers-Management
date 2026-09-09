import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    CreditCard, Check, Loader2, ExternalLink, Calendar, 
    AlertCircle, AlertTriangle, X, Zap, Layers, Users, Sparkles, ShieldCheck, 
    ArrowRight, CheckCircle2, RefreshCw, MessageCircle, Mail,
    Smartphone, Clock
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';
import InstaPayModal from '../components/billing/InstaPayModal';

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

    const handleSelectPlan = async (planKey) => {
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
        setConfirmDialog({
            isOpen: true,
            title: isAr ? 'إلغاء اشتراك الباقة' : 'Cancel Subscription',
            message: isAr
                ? 'هل أنت متأكد من رغبتك في إلغاء اشتراكك الحالي؟'
                : 'Are you sure you want to cancel your current subscription?',
            warning: isAr
                ? 'سيتم تحويل حسابك إلى الباقة المجانية فوراً وستفقد مميزات الباقة المدفوعة وصلاحيات الفريق الموسعة.'
                : 'Your account will be downgraded to the Free plan immediately and premium limits will be revoked.',
            confirmText: isAr ? 'نعم، إلغاء الاشتراك' : 'Yes, Cancel Subscription',
            cancelText: isAr ? 'تراجع والاحتفاظ بالباقة' : 'Keep My Subscription',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await billingAPI.cancel();
                    showAlert({
                        type: 'success',
                        title: t('common.success', 'Done'),
                        message: isAr ? 'تم إلغاء الاشتراك بنجاح وتحويل الحساب إلى الباقة المجانية.' : 'Subscription cancelled successfully.'
                    });
                    await load();
                } catch (err) {
                    showAlert({
                        type: 'error',
                        title: t('common.error', 'Error'),
                        message: apiErrorMessage(err, 'Cancel failed.')
                    });
                }
            }
        });
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

    const currentPlanKey = subscription.plan;
    const currentPlanConfig = subscription.planConfig;
    const usage = subscription.usage || {};

    // Progress calculations
    const projectUsagePct = usage.projects?.isUnlimited 
        ? 0 
        : Math.min(100, Math.round(((usage.projects?.current || 0) / (usage.projects?.max || 1)) * 100));
    
    const userUsagePct = usage.users?.isUnlimited 
        ? 0 
        : Math.min(100, Math.round(((usage.users?.current || 0) / (usage.users?.max || 1)) * 100));

    const aiUsagePct = Math.min(100, Math.round(((usage.aiActions?.current || 0) / (usage.aiActions?.max || 1)) * 100));

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
                    <div className="grid grid-3" style={{ gap: 16 }}>
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
                    </div>
                </div>

                {/* Plan Selection Header & Billing Interval Switcher */}
                <div className="flex-between" style={{ marginTop: 40, flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>{t('billing.choosePlan', 'Subscription Plans')}</h2>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem', maxWidth: 650 }}>
                            {t('billing.plansSubtitle', '100% of all ERP features are unlocked across all paid tiers. Plans scale purely by projects, user seats, and AI agent quota.')}
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

                {/* 4-Tier Plans Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 16,
                    marginTop: 20
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
                                    boxShadow: isPendingUpgrade ? '0 0 20px rgba(245, 158, 11, 0.2)' : undefined
                                }}
                            >
                                {/* Top Badges */}
                                <div style={{ position: 'absolute', top: -11, insetInlineEnd: 16, display: 'flex', gap: 6 }}>
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
                                    {isPopular && !isPendingUpgrade && (
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
                                </div>

                                <div>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 700 }}>
                                        {planName}
                                    </h3>
                                    <p className="text-secondary" style={{ fontSize: '0.82rem', margin: '0 0 16px 0', minHeight: 36, lineHeight: 1.4 }}>
                                        {planDesc}
                                    </p>

                                    {/* Pricing Block */}
                                    {isEnterprise ? (
                                        <div style={{ marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {t('billing.customPrice', 'Custom Pricing')}
                                                </span>
                                            </div>
                                            <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                                {t('billing.enterpriseTailored', 'Tailored for large firms & custom SLA')}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {displayPriceEgp > 0 ? currency(displayPriceEgp) : t('billing.free', 'Free')}
                                                </span>
                                                {displayPriceEgp > 0 && (
                                                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                        {billingCycle === 'annual' ? t('billing.perYear', '/ year') : t('billing.perMonth', '/ month')}
                                                    </span>
                                                )}
                                            </div>
                                            {displayPriceEgp > 0 && (
                                                <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                                    ≈ ${displayPriceUsd} USD · {billingCycle === 'annual' ? t('billing.billedAnnually', 'Billed annually (2 mos free)') : t('billing.billedMonthly', 'Billed monthly')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Capacity Quota Specs (Clean & Punchy) */}
                                    <div style={{
                                        background: 'var(--bg-primary, rgba(0,0,0,0.02))',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 10,
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                        marginBottom: 14
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
                                    </div>

                                    {/* All Features Unlocked Callout */}
                                    {plan.limits.allFeaturesUnlocked && (
                                        <div style={{
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            color: '#10b981',
                                            padding: '7px 10px',
                                            borderRadius: 8,
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}>
                                            <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                                            {t('billing.allFeaturesUnlocked', '100% Full ERP Features Unlocked')}
                                        </div>
                                    )}
                                </div>

                                {/* Plan Action Button */}
                                <div style={{ marginTop: 24 }}>
                                    {isEnterprise ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <a
                                                href={`https://wa.me/201092041908?text=${encodeURIComponent(isAr ? 'مرحباً، أود الاستفسار عن باقة الشركات (Enterprise) لنظام حسابي ERP' : "Hello, I'm interested in Hesaby ERP Enterprise Plan")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: '#25D366',
                                                    borderColor: '#25D366',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    textDecoration: 'none',
                                                    padding: '9px 12px',
                                                    borderRadius: 8,
                                                    fontSize: '0.88rem',
                                                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
                                                }}
                                            >
                                                <MessageCircle size={16} />
                                                {t('billing.contactWhatsapp', 'WhatsApp (+20 109 204 1908)')}
                                            </a>
                                            <a
                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=nooraldeenahmed04@gmail.com&su=${encodeURIComponent(isAr ? 'استفسار عن باقة الشركات Enterprise - نظام حسابي ERP' : 'Hesaby ERP Enterprise Plan Inquiry')}&body=${encodeURIComponent(isAr ? 'مرحباً فريق مبيعات حسابي، نود الاستفسار عن باقة الشركات وتفاصيل الاشتراك المخصص لشركتنا.' : 'Hello Hesaby Sales Team, We would like to inquire about the Enterprise Plan and custom quotation.')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: '#0284c7',
                                                    borderColor: '#0284c7',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    textDecoration: 'none',
                                                    padding: '9px 12px',
                                                    borderRadius: 8,
                                                    fontSize: '0.88rem',
                                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                                }}
                                            >
                                                <Mail size={16} />
                                                {t('billing.contactEmail', 'Email Sales')}
                                            </a>
                                        </div>
                                    ) : isPendingUpgrade ? (
                                        <button
                                            className="btn btn-warning btn-sm"
                                            disabled
                                            style={{
                                                width: '100%',
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                border: '1.5px solid #f59e0b',
                                                color: '#f59e0b',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                cursor: 'default',
                                                padding: '9px 12px',
                                                borderRadius: 8
                                            }}
                                        >
                                            <Clock size={15} className="spin" style={{ animationDuration: '3s' }} />
                                            {isAr ? 'جاري التحقق من الإيصال والتفعيل ⏳' : 'Verifying Receipt ⏳'}
                                        </button>
                                    ) : isCurrent ? (
                                        <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%', opacity: 0.8, cursor: 'default' }}>
                                            <Check size={14} />
                                            {t('billing.currentPlanLabel', 'Your current plan')}
                                        </button>
                                    ) : (
                                        <button
                                            className={`btn ${isPopular ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ 
                                                width: '100%',
                                                background: isPopular ? '#10b981' : undefined,
                                                borderColor: isPopular ? '#10b981' : undefined,
                                                color: isPopular ? '#ffffff' : undefined,
                                                opacity: pendingPayment ? 0.45 : 1,
                                                cursor: pendingPayment ? 'not-allowed' : 'pointer'
                                            }}
                                            onClick={() => handleSelectPlan(plan.key)}
                                            disabled={actionInProgress === plan.key || !!pendingPayment}
                                            title={pendingPayment ? (isAr ? 'لديك طلب ترقية قيد المراجعة بالفعل' : 'You have a pending upgrade under verification') : ''}
                                        >
                                            {actionInProgress === plan.key ? (
                                                <Loader2 size={14} className="spin" />
                                            ) : (
                                                <ArrowRight size={14} />
                                            )}
                                            {pendingPayment ? (isAr ? 'طلب معلق قيد المراجعة' : 'Upgrade Pending') : t('billing.switchPlan', 'Switch to this Plan')}
                                        </button>
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
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)',
                                border: '1.5px dashed rgba(16, 185, 129, 0.45)',
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
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                                }}>
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {t('billing.addOnsBannerTitle', 'AI Token Add-On Packs')}
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '2px 8px',
                                            borderRadius: 10
                                        }}>
                                            {t('billing.topUp', 'TOP-UP')}
                                        </span>
                                    </h3>
                                    <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
                                        {t('billing.addOnsBannerDesc', 'Need more voice note transcripts or receipt scans? Recharge instant AI actions without upgrading your plan.')}
                                    </p>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{
                                    background: '#10b981',
                                    borderColor: '#10b981',
                                    padding: '10px 20px',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                                    pointerEvents: 'none'
                                }}
                            >
                                <Zap size={15} />
                                {t('billing.browseAddOns', 'Select Add-On Packs')}
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

                                            <button
                                                className={`btn ${addon.popular ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                                style={{
                                                    background: addon.popular ? '#10b981' : undefined,
                                                    borderColor: addon.popular ? '#10b981' : undefined,
                                                    color: addon.popular ? '#ffffff' : undefined,
                                                    minWidth: 100,
                                                    padding: '8px 14px',
                                                    fontWeight: 700
                                                }}
                                                onClick={async () => {
                                                    await handleBuyAddOn(addon.key);
                                                }}
                                                disabled={isAction}
                                            >
                                                {isAction ? (
                                                    <Loader2 size={14} className="spin" />
                                                ) : (
                                                    <Zap size={14} />
                                                )}
                                                {t('billing.buyNow', 'Buy Now')}
                                            </button>
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
