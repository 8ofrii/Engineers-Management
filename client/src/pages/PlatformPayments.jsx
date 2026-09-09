import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CreditCard,
    CheckCircle2,
    XCircle,
    Loader2,
    Eye,
    ExternalLink,
    Clock,
    RefreshCw,
    AlertCircle,
    Check,
    Search,
    Shield,
    X
} from 'lucide-react';
import Layout from '../components/Layout';
import { billingAPI } from '../services/api';
import { useAlert } from '../context/AlertContext';

export default function PlatformPayments() {
    const { t, i18n } = useTranslation();
    const { showAlert } = useAlert();
    const isAr = i18n.language === 'ar';

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const res = await billingAPI.listPendingPayments('all');
            setPayments(res.data?.data || []);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Failed to load payments.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleApprove = async (id) => {
        try {
            setActionId(id);
            setActionType('approve');
            const res = await billingAPI.approveInstaPay(id, 'Approved by Platform Owner');
            showAlert({
                type: 'success',
                title: isAr ? 'تم الاعتماد بنجاح' : 'Payment Approved',
                message: res.data?.message || 'Subscription activated successfully!'
            });
            await load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Approval failed.'
            });
        } finally {
            setActionId(null);
            setActionType(null);
        }
    };

    const handleReject = async (id) => {
        if (!rejectReason) {
            alert(isAr ? 'يرجى كتابة سبب الرفض' : 'Please provide a reason.');
            return;
        }
        try {
            setActionId(id);
            setActionType('reject');
            await billingAPI.rejectInstaPay(id, rejectReason);
            showAlert({
                type: 'info',
                title: isAr ? 'تم الرفض' : 'Rejected',
                message: isAr ? 'تم رفض طلب الدفع.' : 'Payment request rejected.'
            });
            setRejectingId(null);
            setRejectReason('');
            await load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Rejection failed.'
            });
        } finally {
            setActionId(null);
            setActionType(null);
        }
    };

    const filtered = payments.filter(p => {
        const meta = p.rawWebhook || {};
        const q = searchQuery.toLowerCase();
        return (
            (p.paymobOrderId || '').toLowerCase().includes(q) ||
            (p.tenant?.name || '').toLowerCase().includes(q) ||
            (meta.senderName || '').toLowerCase().includes(q) ||
            (meta.senderPhone || '').toLowerCase().includes(q) ||
            (p.plan || '').toLowerCase().includes(q)
        );
    });

    const pendingSubmitted = filtered.filter(p => p.rawWebhook?.step === 'PROOF_SUBMITTED');
    const initiatedOnly = filtered.filter(p => p.rawWebhook?.step !== 'PROOF_SUBMITTED');

    return (
        <Layout>
            <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>
                {/* Header */}
                <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}>
                                <Shield size={20} />
                            </div>
                            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
                                {isAr ? 'لوحة اعتمادات الاشتراكات والتحويلات' : 'Platform Subscription Approvals'}
                            </h1>
                        </div>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.92rem' }}>
                            {isAr
                                ? 'خاص بمالك المنصة: مراجعة إيصالات تحويلات إنستاباي والبنك الأهلي/CIB وتفعيل الباقات للشركات المشتركة.'
                                : 'Platform Owner Hub: Review customer InstaPay/Bank transfer receipts and activate subscriptions.'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            className="btn btn-secondary btn-sm flex gap-sm"
                            onClick={load}
                            style={{ alignItems: 'center' }}
                        >
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            {t('common.refresh', 'Refresh')}
                        </button>
                    </div>
                </div>

                {/* Search / Filter bar */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20
                }}>
                    <Search size={18} className="text-secondary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث برقم الطلب (IPN-...)، اسم الشركة، اسم المحول، أو الهاتف...' : 'Search by Ref (IPN-...), Company, Sender Name, or Phone...'}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '13.5px'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Section: Submitted Receipts (High Priority) */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                            {isAr ? 'إيصالات تم رفعها بانتظار التأكيد' : 'Submitted Receipts Awaiting Verification'}
                        </h3>
                        <span style={{
                            background: pendingSubmitted.length > 0 ? '#10b981' : 'var(--bg-tertiary)',
                            color: pendingSubmitted.length > 0 ? 'white' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 12
                        }}>
                            {pendingSubmitted.length}
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                            <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }} />
                            <p className="text-secondary" style={{ fontSize: '13.5px' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
                        </div>
                    ) : pendingSubmitted.length === 0 ? (
                        <div className="card" style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
                            <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px', opacity: 0.8 }} />
                            <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                                {isAr ? 'لا توجد إيصالات معلقة حالياً' : 'No submitted receipts pending'}
                            </h4>
                            <p className="text-secondary" style={{ margin: 0, fontSize: '13px' }}>
                                {isAr ? 'جميع إيصالات التحويل تم تأكيدها وتفعيلها.' : 'All incoming customer receipts have been processed.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {pendingSubmitted.map((p) => {
                                const meta = p.rawWebhook || {};
                                const isAction = actionId === p.id;
                                const isRejecting = rejectingId === p.id;

                                return (
                                    <div
                                        key={p.id}
                                        className="card"
                                        style={{
                                            padding: '20px 22px',
                                            background: 'var(--bg-secondary)',
                                            border: '1.5px solid rgba(16, 185, 129, 0.35)',
                                            borderRadius: 14,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                                            <div style={{ flex: 1, minWidth: 280 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: 'rgba(59, 130, 246, 0.12)',
                                                        color: 'var(--color-primary)',
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        letterSpacing: '0.8px'
                                                    }}>
                                                        {p.paymobOrderId || meta.referenceCode}
                                                    </span>
                                                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                        {meta.itemName || p.plan}
                                                    </span>
                                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                                                        ({Number(p.amountEgp).toLocaleString()} {isAr ? 'ج.م' : 'EGP'})
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: 10 }}>
                                                    <div>🏢 <strong>{isAr ? 'الشركة:' : 'Company:'}</strong> {p.tenant?.name || 'Company N/A'}</div>
                                                    <div>👤 <strong>{isAr ? 'اسم المحول:' : 'Sender:'}</strong> {meta.senderName || 'N/A'}</div>
                                                    <div>📞 <strong>{isAr ? 'الهاتف:' : 'Phone:'}</strong> {meta.senderPhone || 'N/A'}</div>
                                                    <div>✉️ <strong>{isAr ? 'البريد:' : 'Email:'}</strong> {meta.initiatedByEmail || p.tenant?.email || 'N/A'}</div>
                                                    <div>🕒 <strong>{isAr ? 'تاريخ التحويل:' : 'Submitted:'}</strong> {new Date(meta.submittedAt || p.createdAt).toLocaleString()}</div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                {meta.receiptUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedImage(meta.receiptUrl)}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                                                    >
                                                        <Eye size={15} />
                                                        <span>{isAr ? 'معاينة الإيصال' : 'View Receipt'}</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={isAction}
                                                    onClick={() => setRejectingId(isRejecting ? null : p.id)}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                                >
                                                    <XCircle size={15} />
                                                    <span>{isAr ? 'رفض' : 'Reject'}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={isAction}
                                                    onClick={() => handleApprove(p.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '8px 18px',
                                                        borderRadius: 8,
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        cursor: isAction ? 'not-allowed' : 'pointer',
                                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                                                    }}
                                                >
                                                    {isAction && actionType === 'approve' ? (
                                                        <Loader2 size={15} className="spin" />
                                                    ) : (
                                                        <Check size={16} />
                                                    )}
                                                    <span>{isAr ? 'تأكيد وتفعيل الاشتراك فوراً' : 'Approve & Activate'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Reject Reason Form */}
                                        {isRejecting && (
                                            <div style={{
                                                marginTop: 14,
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                borderRadius: 8,
                                                padding: '12px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10
                                            }}>
                                                <input
                                                    type="text"
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder={isAr ? 'سبب الرفض (مثال: التحويل لم يصل لحساب CIB / الإيصال غير مطابق)...' : 'Rejection reason...'}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: 6,
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleReject(p.id)}
                                                    disabled={isAction}
                                                    style={{
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '8px 16px',
                                                        borderRadius: 6,
                                                        fontSize: '12.5px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {isAction && actionType === 'reject' ? '...' : (isAr ? 'تأكيد الرفض' : 'Confirm Reject')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Section: Initiated Orders (Checkout created but no receipt attached yet) */}
                {initiatedOnly.length > 0 && (
                    <div>
                        <h4 className="text-secondary" style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
                            {isAr ? 'طلبات تم إنشاؤها (بانتظار التحويل والإيصال)' : 'Orders Initiated (Pending Transfer/Receipt)'} ({initiatedOnly.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {initiatedOnly.map((p) => {
                                const meta = p.rawWebhook || {};
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 10,
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '12.5px',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <code style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.paymobOrderId || meta.referenceCode}</code>
                                            <span>· {p.tenant?.name || 'Company'}</span>
                                            <span>· {meta.itemName || p.plan}</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>({Number(p.amountEgp).toLocaleString()} EGP)</span>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => handleApprove(p.id)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                            >
                                                {isAr ? 'تفعيل يدوي' : 'Manual Activate'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Receipt Modal Popup */}
            {selectedImage && (
                <div
                    onClick={() => setSelectedImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1200,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            style={{
                                position: 'absolute',
                                top: -40,
                                right: 0,
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Receipt screenshot"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                                borderRadius: 12,
                                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)'
                            }}
                        />
                        <a
                            href={selectedImage}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                marginTop: 12,
                                color: 'white',
                                fontSize: 13,
                                textDecoration: 'underline',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <ExternalLink size={14} />
                            <span>{isAr ? 'فتح الصورة بالحجم الكامل' : 'Open full image in new tab'}</span>
                        </a>
                    </div>
                </div>
            )}
        </Layout>
    );
}
