import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    AlertTriangle, ShieldAlert, X, CheckCircle2, 
    Loader2, Clock, 
    Layers, Users, Sparkles, HardDrive, Ban
} from 'lucide-react';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function DowngradeSafeguardModal({
    isOpen,
    onClose,
    currentPlan,
    targetPlan,
    subscription,
    onConfirmDowngrade,
    isAr = false,
    currency
}) {
    const [reason, setReason] = useState('cost');
    const [feedback, setFeedback] = useState('');
    const [ackLimits, setAckLimits] = useState(false);
    const [ackForfeit, setAckForfeit] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReason('cost');
            setFeedback('');
            setAckLimits(false);
            setAckForfeit(false);
            setSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const usage = subscription?.usage || {};
    const projectUsage = usage.projects?.current || 0;
    const userUsage = usage.users?.current || 0;
    const storageUsageMb = usage.storage?.currentMb || 0;

    // Free plan thresholds
    const freeMaxProjects = targetPlan?.limits?.maxProjects ?? 3;
    const freeMaxUsers = targetPlan?.limits?.maxUsers ?? 5;
    const freeMaxStorageMb = targetPlan?.limits?.storageLimitMb ?? 50;

    const projectsOver = projectUsage > freeMaxProjects;
    const usersOver = userUsage > freeMaxUsers;
    const storageOver = storageUsageMb > freeMaxStorageMb;
    const hasAnyOverage = projectsOver || usersOver || storageOver;

    const canSubmit = reason && ackLimits && ackForfeit && !submitting;

    const handleConfirm = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await onConfirmDowngrade({
                reason,
                feedback
            });
        } finally {
            setSubmitting(false);
        }
    };

    const reasons = [
        { id: 'cost', en: 'Cost / Budget optimization', ar: 'ترشيد التكاليف والميزانية' },
        { id: 'pause', en: 'Finished projects / Temporary pause', ar: 'انتهاء المشروعات / توقف العمل مؤقتاً' },
        { id: 'features', en: 'Missing features we required', ar: 'نقص في بعض الميزات المطلوبة' },
        { id: 'alternative', en: 'Exploring an alternative system', ar: 'الانتقال إلى نظام بديل' },
        { id: 'other', en: 'Other reason', ar: 'سبب آخر' }
    ];

    const currentPlanName = isAr && currentPlan?.nameAr ? currentPlan.nameAr : (currentPlan?.name || 'Premium Plan');
    const targetPlanName = isAr && targetPlan?.nameAr ? targetPlan.nameAr : (targetPlan?.name || 'Free Plan');

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '680px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '18px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                position: 'relative',
                overflow: 'hidden',
                margin: 'auto',
                direction: isAr ? 'rtl' : 'ltr'
            }}>
                {/* Red/Amber Warning Accent Bar */}
                <div style={{
                    height: '4px',
                    width: '100%',
                    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
                    backgroundSize: '200% 100%'
                }} />

                {/* Header */}
                <div style={{
                    padding: '22px 26px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1.5px solid rgba(239, 68, 68, 0.35)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.18)'
                        }}>
                            <ShieldAlert size={26} />
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.28rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.3px'
                            }}>
                                {isAr ? 'تأكيد تخفيض الباقة وإلغاء الاشتراك المدفوع' : 'Plan Downgrade & Impact Review'}
                            </h2>
                            <p style={{
                                margin: '4px 0 0',
                                fontSize: '0.86rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.4
                            }}>
                                {isAr
                                    ? `أنت على وشك مغادرة ${currentPlanName} والتحويل إلى ${targetPlanName}. يرجى مراجعة تأثير التخفيض بدقة.`
                                    : `You are about to downgrade from ${currentPlanName} to the ${targetPlanName}. Please review the impact on your operational capacity.`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{
                    padding: '22px 26px',
                    maxHeight: 'calc(85vh - 150px)',
                    overflowY: 'auto'
                }}>
                    {/* Forfeit Period Warning Banner */}
                    {subscription?.currentPeriodEnd && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1.5px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            marginBottom: '20px'
                        }}>
                            <Clock size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                <strong style={{ color: '#d97706' }}>
                                    {isAr ? 'تنبيه انتهاء الفترة المدفوعة: ' : 'Paid Cycle Forfeiture Notice: '}
                                </strong>
                                {isAr
                                    ? `اشتراكك المدفوع نشط حالياً حتى ${fmtDate(subscription.currentPeriodEnd)}. التحويل إلى الباقة المجانية سيلغي الميزات المدفوعة فوراً ويسقط الأيام المتبقية دون استرداد مالي.`
                                    : `Your paid subscription is active until ${fmtDate(subscription.currentPeriodEnd)}. Downgrading to Free will immediately terminate premium privileges and forfeit all remaining days on this cycle.`}
                            </div>
                        </div>
                    )}

                    {/* Capacity & Usage Comparison Matrix */}
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px'
                        }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {isAr ? 'مقارنة السعة التشغيلية الحالية مقابل الباقة المجانية' : 'Capacity & Overages Comparison'}
                            </span>
                            {hasAnyOverage && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                }}>
                                    {isAr ? '⚠️ استهلاكك يتجاوز الحدود المجانية' : '⚠️ Current Usage Exceeds Free Cap'}
                                </span>
                            )}
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '12px'
                        }}>
                            {/* Projects */}
                            <div style={{
                                background: projectsOver ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                                border: `1px solid ${projectsOver ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                padding: '12px 14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                    <Layers size={14} />
                                    <span>{isAr ? 'المشاريع' : 'Projects'}</span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: projectsOver ? '#ef4444' : 'var(--text-primary)', margin: '4px 0' }}>
                                    {projectUsage} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {freeMaxProjects} max</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: projectsOver ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                    {projectsOver ? (isAr ? 'سيتم منع إضافة مشاريع جديدة' : 'New creations blocked') : (isAr ? 'ضمن الحد المسموح' : 'Within limit')}
                                </div>
                            </div>

                            {/* Users */}
                            <div style={{
                                background: usersOver ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                                border: `1px solid ${usersOver ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                padding: '12px 14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                    <Users size={14} />
                                    <span>{isAr ? 'فريق العمل' : 'Seats'}</span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: usersOver ? '#ef4444' : 'var(--text-primary)', margin: '4px 0' }}>
                                    {userUsage} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {freeMaxUsers} max</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: usersOver ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                    {usersOver ? (isAr ? 'سيتم منع دعوة أعضاء جدد' : 'New invites blocked') : (isAr ? 'ضمن الحد المسموح' : 'Within limit')}
                                </div>
                            </div>

                            {/* AI Actions */}
                            <div style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '12px 14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                    <Sparkles size={14} />
                                    <span>{isAr ? 'الذكاء الاصطناعي' : 'AI Actions'}</span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
                                    20 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {isAr ? 'شهر' : 'mo'}</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                                    {isAr ? 'انخفاض من 2,500 عملية' : 'Drops from 2,500/mo'}
                                </div>
                            </div>

                            {/* Storage */}
                            <div style={{
                                background: storageOver ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                                border: `1px solid ${storageOver ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                padding: '12px 14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                    <HardDrive size={14} />
                                    <span>{isAr ? 'مساحة التخزين' : 'Storage'}</span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: storageOver ? '#ef4444' : 'var(--text-primary)', margin: '4px 0' }}>
                                    {storageUsageMb} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {freeMaxStorageMb} MB</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: storageOver ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                    {storageOver ? (isAr ? 'سيتم منع رفع إيصالات وملفات' : 'New uploads blocked') : (isAr ? 'الحد الأقصى 3 م.ب/ملف' : 'Max 3 MB/upload')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Lost Box */}
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1.5px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.86rem', fontWeight: 700, marginBottom: 8 }}>
                            <Ban size={16} />
                            <span>{isAr ? 'الميزات والوحدات المتقدمة التي سيتم حجبها:' : 'Features & modules you will lose access to:'}</span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '8px',
                            fontSize: '0.82rem',
                            color: 'var(--text-primary)'
                        }}>
                            <div>✕ {isAr ? 'يوميات الموقع الميدانية (DSR)' : 'Daily Site Reports (DSR) & Field Logs'}</div>
                            <div>✕ {isAr ? 'يوميات أجور العمالة ومستخلصات المقاولين' : 'Workforce Wages & Subcontractor Draws'}</div>
                            <div>✕ {isAr ? 'دفعات الموردين وتوريدات المخازن' : 'Supplier Batches & Inventory Stock'}</div>
                            <div>✕ {isAr ? 'اعتمادات الصرف متعددة المستويات' : 'Multi-Level Approval Matrix & Chains'}</div>
                        </div>
                    </div>

                    {/* Reason Selector */}
                    <div style={{ marginBottom: '22px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '10px'
                        }}>
                            {isAr ? 'السبب الرئيسي لطلب التخفيض:' : 'Primary reason for downgrading:'}
                        </label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '8px',
                            marginBottom: '10px'
                        }}>
                            {reasons.map(r => {
                                const selected = reason === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setReason(r.id)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            textAlign: isAr ? 'right' : 'left',
                                            background: selected ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                                            border: `1.5px solid ${selected ? '#ef4444' : 'var(--border-color)'}`,
                                            color: selected ? '#ef4444' : 'var(--text-primary)',
                                            fontSize: '0.84rem',
                                            fontWeight: selected ? 700 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {isAr ? r.ar : r.en}
                                    </button>
                                );
                            })}
                        </div>

                        <input
                            type="text"
                            placeholder={isAr ? 'ملاحظات إضافية أو مقترحات لفريق حسابي (اختياري)...' : 'Optional notes or feedback for our engineering team...'}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {/* Double Confirmation Checkboxes */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '14px 16px'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.45,
                            marginBottom: '12px'
                        }}>
                            <input
                                type="checkbox"
                                checked={ackLimits}
                                onChange={(e) => setAckLimits(e.target.checked)}
                                style={{ marginTop: '2px', accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>
                                {isAr
                                    ? 'أدرك أن حدود المنشأة ستنخفض فوراً إلى 3 مشاريع نشطة، و5 مستخدمين، و50 ميجابايت مساحة تخزين، وأن أي سعة مستهلكة تزيد عن ذلك ستمنع إنشاء إدخالات جديدة.'
                                    : 'I understand that my organization limits will immediately reduce to 3 projects, 5 users, and 50 MB storage, and any current overage will prevent creating new entries.'}
                            </span>
                        </label>

                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.45
                        }}>
                            <input
                                type="checkbox"
                                checked={ackForfeit}
                                onChange={(e) => setAckForfeit(e.target.checked)}
                                style={{ marginTop: '2px', accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span>
                                {isAr
                                    ? 'أؤكد موافقتي على التنازل عن الميزات المدفوعة وأي أيام متبقية في دورة الاشتراك الحالية دون استرداد مالي.'
                                    : 'I confirm that I want to forfeit premium features and any remaining days on my paid cycle without a refund.'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '16px 26px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)'
                }}>
                    {/* Primary Safe Option: KEEP PLAN */}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            flex: 1.2,
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: '#10b981',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <CheckCircle2 size={18} />
                        <span>{isAr ? `الاحتفاظ باشتراك ${currentPlanName}` : `Keep My ${currentPlanName}`}</span>
                    </button>

                    {/* Dangerous Option: CONFIRM DOWNGRADE */}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                        style={{
                            flex: 1,
                            padding: '12px 18px',
                            borderRadius: '10px',
                            background: canSubmit ? '#ef4444' : 'var(--bg-tertiary)',
                            border: `1px solid ${canSubmit ? '#ef4444' : 'var(--border-color)'}`,
                            color: canSubmit ? '#ffffff' : 'var(--text-disabled)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            boxShadow: canSubmit ? '0 4px 16px rgba(239, 68, 68, 0.35)' : 'none',
                            opacity: canSubmit ? 1 : 0.65,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {submitting ? (
                            <Loader2 size={16} className="spin" />
                        ) : (
                            <AlertTriangle size={16} />
                        )}
                        <span>{isAr ? 'تأكيد تخفيض الباقة' : 'Confirm Downgrade'}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
