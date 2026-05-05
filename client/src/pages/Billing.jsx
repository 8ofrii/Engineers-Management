import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Check, Loader2, ExternalLink, Calendar, AlertCircle, X } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';

// Phase 6.4 — admin billing page. Shows current plan, lists self-serve
// plans, drives checkout via the Paymob iframe in a popup window.
//
// Two flows:
//   FREE → paid: click "Upgrade" → server creates a PaymentAttempt + returns
//                a Paymob iframe URL → we open it in a centred popup → on
//                close we refresh the subscription
//   paid → cancel: confirm → POST /cancel → status flips immediately

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function Billing() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const { currency } = useFormat();
    const [plans, setPlans] = useState([]);
    const [billingEnabled, setBillingEnabled] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(null); // plan key while in flight
    const [iframeUrl, setIframeUrl] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const [plansRes, subRes] = await Promise.all([
                billingAPI.listPlans(),
                billingAPI.getSubscription()
            ]);
            setPlans(plansRes.data.data || []);
            setBillingEnabled(plansRes.data.billingEnabled);
            setSubscription(subRes.data.data);
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

    const handleSubscribe = async (planKey) => {
        if (!billingEnabled) {
            return showAlert({
                type: 'info',
                title: t('billing.notConfigured', 'Billing not configured'),
                message: t('billing.notConfiguredHint', 'Online payments are not enabled on this server. Please contact your administrator.')
            });
        }
        try {
            setCheckingOut(planKey);
            const r = await billingAPI.startCheckout(planKey);
            // Open Paymob iframe in a popup centred on screen. Modal-style
            // works fine but the Paymob iframe needs ~480x680 minimum and a
            // popup keeps the user's app context visible behind it.
            setIframeUrl(r.data.data.iframeUrl);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: apiErrorMessage(err, 'Could not start checkout.')
            });
        } finally {
            setCheckingOut(null);
        }
    };

    const handleCancel = async () => {
        if (!confirm(t('billing.confirmCancel', 'Cancel your subscription? You keep access until the end of the current period.'))) return;
        try {
            await billingAPI.cancel();
            showAlert({
                type: 'success',
                title: t('common.success', 'Done'),
                message: t('billing.cancelled', 'Subscription cancelled.')
            });
            load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: apiErrorMessage(err, 'Cancel failed.')
            });
        }
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

    return (
        <Layout>
            <div>
                <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                    <CreditCard size={28} />
                    {t('billing.title', 'Billing & Subscription')}
                </h1>
                <p className="text-secondary">
                    {t('billing.subtitle', 'Manage your plan and view past payments.')}
                </p>

                {!billingEnabled && (
                    <div className="alert alert-warning" style={{ margin: '16px 0' }}>
                        <AlertCircle size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                        {t('billing.disabledNotice', 'Online billing is not configured on this server (Paymob keys missing). Existing free-pilot subscriptions still work; paid plans require setup.')}
                    </div>
                )}

                {/* Current plan card */}
                <div className="card" style={{ padding: 20, margin: '16px 0', background: 'var(--bg-secondary, #f9fafb)' }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                {t('billing.currentPlan', 'Current plan')}
                            </div>
                            <h2 style={{ margin: '4px 0' }}>{currentPlanConfig?.name || currentPlanKey}</h2>
                            <div style={{ fontSize: '0.95rem' }}>
                                {currentPlanConfig?.priceEgp > 0
                                    ? `${currency(currentPlanConfig.priceEgp)} / month`
                                    : t('billing.free', 'Free')}
                            </div>
                        </div>
                        <div style={{ textAlign: 'end' }}>
                            <span style={{
                                background: subscription.status === 'ACTIVE' ? '#d1fae5' : '#fef3c7',
                                color: subscription.status === 'ACTIVE' ? '#065f46' : '#92400e',
                                padding: '4px 12px', borderRadius: 12,
                                fontSize: '0.8rem', fontWeight: 600
                            }}>
                                {subscription.status}
                            </span>
                            {subscription.currentPeriodEnd && (
                                <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: 6 }}>
                                    <Calendar size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                                    {t('billing.until', 'Renews')} {fmtDate(subscription.currentPeriodEnd)}
                                </div>
                            )}
                        </div>
                    </div>
                    {subscription.status === 'ACTIVE' && currentPlanConfig?.priceEgp > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleCancel}
                                style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                                {t('billing.cancel', 'Cancel subscription')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Plan grid */}
                <h3 style={{ marginTop: 32 }}>{t('billing.choosePlan', 'Choose a plan')}</h3>
                <div className="grid grid-3" style={{ gap: 16, marginTop: 12 }}>
                    {plans.map(plan => {
                        const isCurrent = plan.key === currentPlanKey && subscription.status === 'ACTIVE';
                        return (
                            <div
                                key={plan.key}
                                className="card"
                                style={{
                                    padding: 20,
                                    border: isCurrent ? '2px solid var(--color-primary, #2563eb)' : '1px solid var(--border-color, #e5e7eb)',
                                    position: 'relative'
                                }}
                            >
                                {isCurrent && (
                                    <div style={{
                                        position: 'absolute', top: -10, insetInlineEnd: 16,
                                        background: 'var(--color-primary, #2563eb)', color: 'white',
                                        padding: '2px 10px', borderRadius: 12,
                                        fontSize: '0.7rem', fontWeight: 700
                                    }}>
                                        CURRENT
                                    </div>
                                )}
                                <h3 style={{ marginTop: 0 }}>{plan.name}</h3>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>
                                    {plan.priceEgp > 0 ? currency(plan.priceEgp) : t('billing.free', 'Free')}
                                </div>
                                {plan.priceEgp > 0 && (
                                    <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                        / {t('billing.month', 'month')}
                                    </div>
                                )}
                                <ul style={{ paddingInlineStart: 0, listStyle: 'none', marginTop: 16 }}>
                                    {plan.features.map((f, i) => (
                                        <li key={i} style={{ fontSize: '0.9rem', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                            <Check size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 3 }} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div style={{ marginTop: 16 }}>
                                    {isCurrent ? (
                                        <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%' }}>
                                            {t('billing.currentPlanLabel', 'Your current plan')}
                                        </button>
                                    ) : plan.priceEgp === 0 ? (
                                        <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%' }}>
                                            {t('billing.alwaysFree', 'Always free')}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%' }}
                                            onClick={() => handleSubscribe(plan.key)}
                                            disabled={!!checkingOut || !billingEnabled}
                                        >
                                            {checkingOut === plan.key
                                                ? <Loader2 size={14} className="spin" />
                                                : <CreditCard size={14} />}
                                            {t('billing.subscribe', 'Subscribe')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Paymob iframe modal */}
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
                                {t('billing.completePayment', 'Complete payment')}
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
        </Layout>
    );
}
