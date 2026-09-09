import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Copy,
    Check,
    Upload,
    Smartphone,
    Building2,
    MessageCircle,
    ShieldCheck,
    AlertCircle,
    FileText,
    ArrowRight,
    Loader2,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { billingAPI } from '../../services/api';

const InstaPayModal = ({
    isOpen,
    onClose,
    itemType = 'PLAN', // 'PLAN' | 'ADDON'
    itemKey = 'PREMIUM',
    onSuccess
}) => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Order state from backend
    const [orderData, setOrderData] = useState(null);

    // Form inputs
    const [senderName, setSenderName] = useState('');
    const [senderPhone, setSenderPhone] = useState('');
    const [transferRef, setTransferRef] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    // Step state: 1 = Details & Upload, 2 = Success Confirmation
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!isOpen || !itemKey) return;

        let isMounted = true;
        setLoading(true);
        setError(null);
        setIsSubmitted(false);
        setReceiptFile(null);
        setReceiptPreview(null);
        setSenderName('');
        setSenderPhone('');
        setTransferRef('');

        billingAPI.initiateInstaPay(itemType, itemKey)
            .then(res => {
                if (isMounted && res.data?.success) {
                    setOrderData(res.data.data);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err.response?.data?.message || t('billing.initiateError', 'Failed to initialize payment.'));
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [isOpen, itemType, itemKey, t]);

    if (!isOpen) return null;

    const copyToClipboard = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setError(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)' : 'File size exceeds 10MB limit');
            return;
        }

        setReceiptFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => setReceiptPreview(event.target.result);
            reader.readAsDataURL(file);
        } else {
            setReceiptPreview(null);
        }
        setError(null);
    };

    const handleSubmitProof = async (e) => {
        e.preventDefault();
        if (!orderData?.paymentAttemptId) return;

        if (!receiptFile && !transferRef) {
            setError(isAr ? 'يرجى إرفاق صورة إيصال التحويل أو كتابة رقم العملية' : 'Please upload a receipt screenshot or enter transfer reference');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const formData = new FormData();
            formData.append('paymentAttemptId', orderData.paymentAttemptId);
            formData.append('senderName', senderName);
            formData.append('senderPhone', senderPhone);
            formData.append('transferRef', transferRef);
            if (receiptFile) {
                formData.append('receipt', receiptFile);
            }

            await billingAPI.submitInstaPayProof(formData);
            if (onSuccess) onSuccess(orderData);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || (isAr ? 'فشل إرسال إيصال التحويل. يرجى المحاولة مجدداً.' : 'Failed to submit receipt. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const target = orderData?.targetDetails || {};
    const refCode = orderData?.referenceCode || '';
    const amount = orderData?.amountEgp || 0;
    const itemName = orderData?.itemName || itemKey;

    const whatsappMessage = encodeURIComponent(
        isAr
            ? `مرحباً، قمت بطلب اشتراك ${itemName} في تطبيق حسابي ERP بمبلغ ${amount} ج.م. كود الطلب: ${refCode}`
            : `Hello, I requested subscription for ${itemName} in Hesaby ERP (${amount} EGP). Order Ref: ${refCode}`
    );
    const whatsappUrl = `https://wa.me/${(target.whatsapp || '+201092041908').replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                        }}>
                            <Smartphone size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {isAr ? 'الدفع والتحويل عبر إنستاباي' : 'InstaPay Egypt Instant Checkout'}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {isAr ? 'تحويل بنكي فوري بالجنيه المصري (IPN)' : 'Instant EGP Bank Transfer via IPN'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                            <Loader2 size={36} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                {isAr ? 'جاري تجهيز بيانات الطلب وحساب إنستاباي...' : 'Preparing payment details...'}
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <AlertCircle size={20} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '13.5px' }}>{error}</span>
                        </div>
                    ) : isSubmitted ? (
                        /* Success View */
                        <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
                            }}>
                                <CheckCircle2 size={36} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                {isAr ? 'تم استلام إيصال التحويل بنجاح!' : 'Payment Receipt Submitted!'}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                                {isAr
                                    ? `شكراً لك. طلبك برقم ${refCode} قيد المراجعة الفورية من فريق الحسابات، وسيتم تفعيل الباقة (${itemName}) خلال دقائق معدودة.`
                                    : `Thank you. Order ${refCode} is under instant verification by our accounts team, and ${itemName} will be activated shortly.`}
                            </p>

                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                marginBottom: '24px'
                            }}>
                                <span>{isAr ? 'كود المرجع:' : 'Order Ref:'}</span>
                                <strong style={{ color: 'var(--color-primary)', letterSpacing: '1px' }}>{refCode}</strong>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: '#25D366',
                                        color: '#ffffff',
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '13.5px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <MessageCircle size={18} />
                                    <span>{isAr ? 'متابعة عبر واتساب' : 'Track on WhatsApp'}</span>
                                </a>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '13.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isAr ? 'إغلاق' : 'Close'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 1: Order Details & Payment Target Cards */
                        <form onSubmit={handleSubmitProof}>
                            {/* Order Banner */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px'
                            }}>
                                <div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        color: 'var(--color-primary)',
                                        display: 'block',
                                        marginBottom: '4px'
                                    }}>
                                        {isAr ? 'تفاصيل الطلب' : 'ORDER DETAILS'}
                                    </span>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {itemName}
                                    </h4>
                                </div>
                                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                                        {isAr ? 'المبلغ المطلوب' : 'Amount to Transfer'}
                                    </span>
                                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
                                        {Number(amount).toLocaleString()} <span style={{ fontSize: '13px' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Reference Code Warning / Highlight */}
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                marginBottom: '18px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Sparkles size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, display: 'block' }}>
                                            {isAr ? 'كود المرجع (اكتبه في ملاحظات التحويل)' : 'Transfer Note / Reference Code'}
                                        </span>
                                        <code style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                                            {refCode}
                                        </code>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(refCode, 'refCode')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: copiedField === 'refCode' ? '#10b981' : 'var(--bg-elevated)',
                                        color: copiedField === 'refCode' ? 'white' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {copiedField === 'refCode' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedField === 'refCode' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الكود' : 'Copy')}</span>
                                </button>
                            </div>

                            {/* Single Featured Bank Account Number Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                                border: '1.5px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '12px',
                                padding: '16px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                marginBottom: '20px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                    }}>
                                        <Building2 size={22} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                                            {target.bankName || 'البنك التجاري الدولي (CIB)'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                {isAr ? 'رقم الحساب للتحويل:' : 'Account Number:'}
                                            </span>
                                            <code style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
                                                {target.accountNumber || '100039231632'}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(target.accountNumber || '100039231632', 'accountNumber')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: copiedField === 'accountNumber' ? '#10b981' : 'var(--bg-elevated)',
                                        color: copiedField === 'accountNumber' ? 'white' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        flexShrink: 0
                                    }}
                                >
                                    {copiedField === 'accountNumber' ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedField === 'accountNumber' ? (isAr ? 'تم نسخ الحساب' : 'Copied') : (isAr ? 'نسخ رقم الحساب' : 'Copy Account #')}</span>
                                </button>
                            </div>

                            {/* Section 2: Proof of Payment Inputs */}
                            <div style={{
                                borderTop: '1px solid var(--border-color)',
                                paddingTop: '18px',
                                marginBottom: '20px'
                            }}>
                                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {isAr ? 'تأكيد التحويل وإرفاق الإيصال' : 'Submit Transfer Confirmation'}
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {isAr ? 'اسم المحول (كما في إنستاباي)' : 'Sender Name'}
                                        </label>
                                        <input
                                            type="text"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            placeholder={isAr ? 'مثال: محمد أحمد' : 'e.g. Mohamed Ahmed'}
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {isAr ? 'رقم هاتف المحول أو رقم العملية' : 'Sender Phone / Reference #'}
                                        </label>
                                        <input
                                            type="text"
                                            value={senderPhone}
                                            onChange={(e) => setSenderPhone(e.target.value)}
                                            placeholder={isAr ? 'مثال: 010xxxxxxx' : 'e.g. 010xxxxxxx'}
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Receipt Upload Dropzone */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        {isAr ? 'صورة إيصال التحويل (لقطة شاشة من إنستاباي)' : 'Receipt Screenshot (From InstaPay App)'}
                                    </label>
                                    <label style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '20px 16px',
                                        borderRadius: '10px',
                                        border: '2px dashed var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />
                                        {receiptPreview ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <img
                                                    src={receiptPreview}
                                                    alt="Receipt preview"
                                                    style={{ maxHeight: '120px', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--border-color)' }}
                                                />
                                                <span style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'block', fontWeight: 600 }}>
                                                    {isAr ? 'اضغط لتغيير الصورة' : 'Click to change image'} ({receiptFile?.name})
                                                </span>
                                            </div>
                                        ) : receiptFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                                                <FileText size={24} />
                                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{receiptFile.name}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} style={{ color: 'var(--color-primary)', marginBottom: '6px' }} />
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {isAr ? 'اضغط لاختيار صورة الإيصال' : 'Click to upload screenshot / PDF'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                    PNG, JPG, WebP, PDF (Max 10MB)
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(37, 211, 102, 0.1)',
                                        color: '#25D366',
                                        border: '1px solid rgba(37, 211, 102, 0.3)',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        textDecoration: 'none'
                                    }}
                                >
                                    <MessageCircle size={16} />
                                    <span>{isAr ? 'مساعدة عبر واتساب' : 'WhatsApp'}</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        fontSize: '13.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        fontSize: '13.5px',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="spin" />
                                            <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={18} />
                                            <span>{isAr ? 'تأكيد التحويل وإرسال الإيصال' : 'Confirm & Submit Receipt'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstaPayModal;
