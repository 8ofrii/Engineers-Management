import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { RotateCcw, X, AlertCircle } from 'lucide-react';
import './Modal.css';

export default function RefundConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    transaction,
    isLoading = false
}) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    if (!isOpen || !transaction) return null;

    const amount = Number(transaction.amount || 0).toLocaleString();
    const isExpense = transaction.type === 'EXPENSE';

    return createPortal(
        <div className="modal-overlay" onClick={isLoading ? undefined : onClose}>
            <div
                className="modal-container"
                style={{ maxWidth: '500px', padding: '32px', position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
            >
                {!isLoading && (
                    <button
                        className="modal-close"
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            [isArabic ? 'left' : 'right']: '24px',
                            top: '24px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={24} />
                    </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'hsla(38, 92%, 50%, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            border: '2px solid hsla(38, 92%, 50%, 0.3)'
                        }}
                    >
                        <RotateCcw size={36} color="#f59e0b" />
                    </div>

                    <h2
                        style={{
                            fontSize: '22px',
                            fontWeight: 'bold',
                            marginBottom: '12px',
                            color: 'var(--text-primary)'
                        }}
                    >
                        {t('finance.refundConfirmTitle') || (isArabic ? 'تأكيد استرداد وإلغاء المعاملة' : 'Refund & Cancel Transaction')}
                    </h2>

                    <div
                        style={{
                            fontSize: '15px',
                            color: 'var(--text-secondary)',
                            marginBottom: '20px',
                            lineHeight: '1.6',
                            width: '100%'
                        }}
                    >
                        {t('finance.refundConfirmMessage') ||
                            (isArabic ? 'هل أنت متأكد من رغبتك في استرداد وإلغاء هذه المعاملة؟' : 'Are you sure you want to refund and cancel this transaction?')}
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '12px 16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                textAlign: 'start'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                    {t('finance.amount') || (isArabic ? 'المبلغ' : 'Amount')}:
                                </span>
                                <strong style={{ color: isExpense ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                    {amount} {transaction.currency || (isArabic ? 'ج.م' : 'EGP')}
                                </strong>
                            </div>
                            {transaction.description && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                        {t('finance.description') || (isArabic ? 'البيان' : 'Description')}:
                                    </span>
                                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', maxWidth: '240px' }} className="truncate">
                                        {transaction.description}
                                    </span>
                                </div>
                            )}
                            {transaction.project?.name && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                        {t('finance.project') || (isArabic ? 'المشروع' : 'Project')}:
                                    </span>
                                    <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                                        {transaction.project.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 14px',
                            background: 'hsla(38, 92%, 50%, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '24px',
                            fontSize: '13px',
                            color: '#d97706',
                            textAlign: 'start',
                            lineHeight: '1.4',
                            width: '100%'
                        }}
                    >
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                            {t('finance.refundImpactNotice') ||
                                (isArabic
                                    ? 'سيؤدي هذا إلى إعادة الأموال إلى رصيد المشروع/الخزينة، وعكس أي أرباح أو أتعاب تم تسجيلها، وتغيير حالة المعاملة إلى "ملغي". سيتم الاحتفاظ بالسجل في الدفتر للتدقيق.'
                                    : 'This will return the funds to the project/safe balance, reverse any recorded profits or fees, and mark the transaction as CANCELLED. The record will be kept in the ledger.')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{ flex: 1, padding: '12px', fontSize: '15px', fontWeight: '600', justifyContent: 'center' }}
                        >
                            {t('common.cancel') || (isArabic ? 'إلغاء' : 'Cancel')}
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={onConfirm}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: '15px',
                                fontWeight: '600',
                                background: '#d97706',
                                color: '#ffffff',
                                border: 'none',
                                justifyContent: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <RotateCcw size={16} />
                            {isLoading
                                ? (t('finance.refunding') || (isArabic ? 'جاري الاسترداد...' : 'Refunding...'))
                                : (t('finance.confirmRefund') || (isArabic ? 'تأكيد الاسترداد والإلغاء' : 'Confirm Refund'))}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
