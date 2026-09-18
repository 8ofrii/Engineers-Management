import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X, Sparkles, Mic, Volume2, Play, Pause, Download, ExternalLink,
    FileText, CheckCircle2, Clock, AlertCircle, Copy, Check,
    Image as ImageIcon, TrendingUp, TrendingDown, Building, User,
    Wallet, Calendar, Tag, Maximize2, Printer, Edit3, ArrowUpRight,
    ArrowDownLeft, CornerDownRight, RotateCcw, Briefcase
} from 'lucide-react';
import './TransactionDetailModal.css';

/**
 * Resolves media URLs (whether absolute S3, relative /uploads/, or data/blob URLs).
 */
export const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    const clean = url.replace(/^(\/?uploads\/|\/+)/, '');
    return `/uploads/${clean}`;
};

export default function TransactionDetailModal({
    isOpen,
    onClose,
    transaction,
    onEdit,
    onRefund,
    canEdit = true
}) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    // Audio Player State
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [copiedTranscript, setCopiedTranscript] = useState(false);

    // Image Zoom Modal State
    const [isImageZoomed, setIsImageZoomed] = useState(false);

    useEffect(() => {
        // Reset state on transaction change
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setIsImageZoomed(false);
    }, [transaction?.id]);

    if (!isOpen || !transaction) return null;

    const tx = transaction;
    const isProfit = tx.category === 'MANAGEMENT_FEE_TRANSFER';
    const isIncome = tx.type === 'INCOME';
    const isExpense = tx.type === 'EXPENSE' && !isProfit;
    const isCancelled = tx.status === 'CANCELLED';
    const isApproved = tx.status === 'APPROVED';
    const isPending = tx.status === 'PENDING_APPROVAL';

    const voiceUrl = resolveMediaUrl(tx.voiceNoteUrl);
    const receiptUrl = resolveMediaUrl(tx.receiptPhotoUrl);
    const isPdf = receiptUrl && (receiptUrl.toLowerCase().endsWith('.pdf') || receiptUrl.includes('application/pdf'));

    // Audio Player Controls
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2];
        const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(next);
        if (audioRef.current) {
            audioRef.current.playbackRate = next;
        }
    };

    const formatTime = (secs) => {
        if (isNaN(secs) || secs === Infinity) return '0:00';
        const mins = Math.floor(secs / 60);
        const rem = Math.floor(secs % 60);
        return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
    };

    const handleCopyTranscript = () => {
        const text = tx.aiRawText || tx.notes || '';
        if (text) {
            navigator.clipboard.writeText(text);
            setCopiedTranscript(true);
            setTimeout(() => setCopiedTranscript(false), 2000);
        }
    };

    const handlePrintSlip = () => {
        window.print();
    };

    const fmtCurrency = (amount) => {
        const num = Number(amount) || 0;
        return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isArabic ? 'ج.م' : 'EGP'}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper for AI extracted breakdown
    const aiData = tx.aiExtractedData && typeof tx.aiExtractedData === 'object' ? tx.aiExtractedData : null;
    const extractedItems = Array.isArray(aiData?.items) ? aiData.items : (Array.isArray(aiData?.line_items) ? aiData.line_items : []);

    return (
        <div className="modal-overlay tx-detail-overlay" onClick={onClose}>
            <div
                className="modal-container tx-detail-modal"
                onClick={(e) => e.stopPropagation()}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* MODAL HEADER */}
                <div className="tx-detail-header">
                    <div className="flex items-center gap-md">
                        <div className={`tx-type-avatar ${isProfit ? 'profit' : isIncome ? 'income' : 'expense'}`}>
                            {isProfit ? <Briefcase size={22} /> : isIncome ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-sm">
                                <span className="tx-detail-title">
                                    {isProfit
                                        ? (isArabic ? 'تحويل أرباح إدارة / مكتب' : 'Office Profit Transfer')
                                        : isIncome
                                            ? (isArabic ? 'سند قبض / إيراد' : 'Income Transaction')
                                            : (isArabic ? 'سند صرف / مصروف' : 'Expense Transaction')}
                                </span>
                                <span className={`badge ${isApproved ? 'badge-success' : isPending ? 'badge-warning' : isCancelled ? 'badge-secondary' : 'badge-primary'}`}>
                                    {isApproved && <CheckCircle2 size={12} className="inline-icon" />}
                                    {isPending && <Clock size={12} className="inline-icon" />}
                                    {isCancelled && <AlertCircle size={12} className="inline-icon" />}
                                    {t(`finance.status.${tx.status}`) || tx.status}
                                </span>
                                {(voiceUrl || receiptUrl || tx.aiRawText) && (
                                    <span className="tx-ai-pill">
                                        <Sparkles size={12} />
                                        {isArabic ? 'معزز بالذكاء الاصطناعي' : 'AI Verified'}
                                    </span>
                                )}
                            </div>
                            <div className="tx-detail-subtitle">
                                {tx.project?.name || (isArabic ? 'غير مسند لمشروع' : 'Unassigned Project')} · {formatDate(tx.transactionDate || tx.createdAt)}
                            </div>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} title={t('common.close')}>
                        <X size={22} />
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="tx-detail-body">
                    {/* HERO AMOUNT BANNER */}
                    <div className={`tx-hero-banner ${isProfit ? 'profit' : isIncome ? 'income' : 'expense'}`}>
                        <div className="tx-hero-amount-label">
                            {isProfit
                                ? (isArabic ? 'أرباح المكتب' : 'Office Profit')
                                : isIncome
                                    ? (isArabic ? 'إجمالي المقبوضات' : 'Received Amount')
                                    : (isArabic ? 'إجمالي المصروفات' : 'Spent Amount')}
                        </div>
                        <div className={`tx-hero-amount ${isCancelled ? 'cancelled' : ''}`}>
                            {fmtCurrency(tx.amount)}
                        </div>
                        {tx.description && (
                            <div className="tx-hero-desc">
                                {tx.description}
                            </div>
                        )}
                    </div>

                    {/* SECTION: MEDIA EVIDENCE (VOICE NOTE OR RECEIPT PHOTO) */}
                    {(voiceUrl || receiptUrl || tx.aiRawText) && (
                        <div className="tx-section media-evidence-section">
                            <div className="tx-section-header">
                                <div className="flex items-center gap-xs">
                                    <Sparkles size={16} className="text-primary" />
                                    <h3 className="tx-section-title">
                                        {isArabic ? 'المرفقات وأدلة الإثبات الذكية' : 'Media Evidence & AI Artifacts'}
                                    </h3>
                                </div>
                                <span className="text-secondary text-xs">
                                    {voiceUrl && receiptUrl
                                        ? (isArabic ? 'تسجيل صوتي وإيصال مصوّر' : 'Voice note & Photo receipt')
                                        : voiceUrl
                                            ? (isArabic ? 'تسجيل صوتي أصلي' : 'Original voice note')
                                            : (isArabic ? 'إيصال مصوّر أصلي' : 'Original photo receipt')}
                                </span>
                            </div>

                            <div className="media-evidence-grid">
                                {/* VOICE NOTE PLAYER CARD */}
                                {voiceUrl && (
                                    <div className="media-card voice-card">
                                        <div className="media-card-header">
                                            <div className="flex items-center gap-xs">
                                                <div className="voice-mic-badge">
                                                    <Mic size={15} />
                                                </div>
                                                <span className="media-card-title">
                                                    {isArabic ? 'التسجيل الصوتي الأصلي' : 'Original Voice Note'}
                                                </span>
                                            </div>
                                            <a
                                                href={voiceUrl}
                                                download
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn-icon-sm"
                                                title={isArabic ? 'تحميل الصوت' : 'Download Audio'}
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>

                                        {/* Hidden HTML5 Audio Element */}
                                        <audio
                                            ref={audioRef}
                                            src={voiceUrl}
                                            onTimeUpdate={handleTimeUpdate}
                                            onLoadedMetadata={handleLoadedMetadata}
                                            onEnded={() => setIsPlaying(false)}
                                        />

                                        {/* Sleek Custom Audio Controller */}
                                        <div className="audio-player-custom">
                                            <button
                                                type="button"
                                                className={`audio-play-btn ${isPlaying ? 'playing' : ''}`}
                                                onClick={togglePlay}
                                            >
                                                {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginInlineStart: isArabic ? 0 : 2 }} />}
                                            </button>

                                            <div className="audio-slider-container">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={duration || 100}
                                                    value={currentTime}
                                                    onChange={handleSeek}
                                                    className="audio-seek-slider"
                                                />
                                                <div className="audio-time-row">
                                                    <span>{formatTime(currentTime)}</span>
                                                    <span>{formatTime(duration)}</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="audio-speed-btn"
                                                onClick={cyclePlaybackRate}
                                                title={isArabic ? 'سرعة التشغيل' : 'Playback Speed'}
                                            >
                                                {playbackRate}x
                                            </button>
                                        </div>

                                        {/* AI Transcript Box */}
                                        {tx.aiRawText && (
                                            <div className="ai-transcript-box">
                                                <div className="ai-transcript-header">
                                                    <span className="flex items-center gap-xs text-xs text-primary font-medium">
                                                        <Volume2 size={13} />
                                                        {isArabic ? 'نص التفريغ الصوتي (Whisper AI):' : 'AI Speech Transcript:'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn-icon-sm transcript-copy-btn"
                                                        onClick={handleCopyTranscript}
                                                        title={isArabic ? 'نسخ النص' : 'Copy Text'}
                                                    >
                                                        {copiedTranscript ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                                <div className="ai-transcript-text">
                                                    "{tx.aiRawText}"
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* RECEIPT / DOCUMENT PREVIEW CARD */}
                                {receiptUrl && (
                                    <div className="media-card receipt-card">
                                        <div className="media-card-header">
                                            <div className="flex items-center gap-xs">
                                                <div className="receipt-icon-badge">
                                                    <ImageIcon size={15} />
                                                </div>
                                                <span className="media-card-title">
                                                    {isPdf
                                                        ? (isArabic ? 'مستند الإيصال / الفاتورة (PDF)' : 'Receipt Document (PDF)')
                                                        : (isArabic ? 'صورة الإيصال / الفاتورة' : 'Receipt / Invoice Photo')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-xs">
                                                <a
                                                    href={receiptUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-icon-sm"
                                                    title={isArabic ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                {!isPdf && (
                                                    <button
                                                        type="button"
                                                        className="btn-icon-sm"
                                                        onClick={() => setIsImageZoomed(true)}
                                                        title={isArabic ? 'تكبير الصورة' : 'Zoom Image'}
                                                    >
                                                        <Maximize2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {isPdf ? (
                                            <div className="pdf-preview-box">
                                                <FileText size={48} className="text-danger" />
                                                <div className="pdf-file-title">
                                                    {isArabic ? 'مستند PDF مرفق' : 'Attached PDF Document'}
                                                </div>
                                                <a
                                                    href={receiptUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    <ExternalLink size={14} />
                                                    {isArabic ? 'عرض المستند بالكامل' : 'View Full Document'}
                                                </a>
                                            </div>
                                        ) : (
                                            <div
                                                className="receipt-image-wrapper"
                                                onClick={() => setIsImageZoomed(true)}
                                            >
                                                <img
                                                    src={receiptUrl}
                                                    alt="Receipt Evidence"
                                                    className="receipt-thumbnail"
                                                />
                                                <div className="receipt-zoom-hint">
                                                    <Maximize2 size={16} />
                                                    <span>{isArabic ? 'انقر للتكبير' : 'Click to zoom'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* AI EXTRACTION DETAILS BREAKDOWN */}
                            {aiData && extractedItems.length > 0 && (
                                <div className="ai-extracted-items-box">
                                    <div className="ai-extracted-items-header">
                                        <Sparkles size={14} className="text-primary" />
                                        <span>{isArabic ? 'البنود المستخرجة آلياً من الإيصال:' : 'Extracted Line Items from Receipt:'}</span>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="ai-items-table">
                                            <thead>
                                                <tr>
                                                    <th>{isArabic ? 'البند / المادة' : 'Item / Description'}</th>
                                                    <th>{isArabic ? 'الكمية' : 'Quantity'}</th>
                                                    <th>{isArabic ? 'الوحدة' : 'Unit'}</th>
                                                    <th>{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                    <th>{isArabic ? 'الإجمالي' : 'Total'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {extractedItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: '500' }}>{item.name || item.description || item.item || '-'}</td>
                                                        <td>{item.quantity || item.qty || '-'}</td>
                                                        <td>{item.unit || '-'}</td>
                                                        <td>{item.unitPrice || item.price ? fmtCurrency(item.unitPrice || item.price) : '-'}</td>
                                                        <td style={{ fontWeight: '600' }}>{item.total ? fmtCurrency(item.total) : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION: FINANCIAL LEDGER DETAILS */}
                    <div className="tx-section">
                        <div className="tx-section-header">
                            <h3 className="tx-section-title">
                                {isArabic ? 'تفاصيل القيد المحاسبي' : 'Ledger Accounting Details'}
                            </h3>
                        </div>

                        <div className="tx-details-grid">
                            {/* Project */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Building size={14} />
                                    {isArabic ? 'المشروع' : 'Project'}
                                </div>
                                <div className="tx-item-value font-semibold">
                                    {tx.project?.name || (isArabic ? 'غير محدد' : 'Unspecified')}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Tag size={14} />
                                    {isArabic ? 'التصنيف' : 'Category'}
                                </div>
                                <div className="tx-item-value">
                                    {t(`finance.categories.${tx.category?.toLowerCase()}`) || tx.category || '-'}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Wallet size={14} />
                                    {isArabic ? 'طريقة الدفع' : 'Payment Method'}
                                </div>
                                <div className="tx-item-value">
                                    {t(`finance.methods.${tx.paymentMethod}`) || tx.paymentMethod || '-'}
                                </div>
                            </div>

                            {/* Payer or Client */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <User size={14} />
                                    {isIncome ? (isArabic ? 'العميل / المفوض' : 'Client / Contact') : (isArabic ? 'الدافع المسؤول' : 'Payer')}
                                </div>
                                <div className="tx-item-value">
                                    {isIncome
                                        ? (tx.client?.name || tx.paidByClientContact || tx.transactionFrom || '-')
                                        : (tx.payer?.name || tx.user?.name || '-')}
                                </div>
                            </div>

                            {/* Beneficiary or Supplier */}
                            {!isIncome && (
                                <div className="tx-detail-item">
                                    <div className="tx-item-label">
                                        <User size={14} />
                                        {isArabic ? 'المستفيد / المورد / المعلم' : 'Beneficiary / Supplier'}
                                    </div>
                                    <div className="tx-item-value">
                                        {tx.beneficiary || tx.supplier?.name || tx.workman?.name || tx.transactionTo || '-'}
                                    </div>
                                </div>
                            )}

                            {/* Safe / Physical Account */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Wallet size={14} />
                                    {isArabic ? 'الخزينة / الحساب الفعلي' : 'Safe / Physical Safe'}
                                </div>
                                <div className="tx-item-value">
                                    {tx.physicalAccount || (isArabic ? 'خزينة المشروع الافتراضية' : 'Project Safe')}
                                </div>
                            </div>

                            {/* Cost Center */}
                            {tx.costCenter && (
                                <div className="tx-detail-item">
                                    <div className="tx-item-label">
                                        <Building size={14} />
                                        {isArabic ? 'مركز التكلفة' : 'Cost Center'}
                                    </div>
                                    <div className="tx-item-value">
                                        {tx.costCenter}
                                    </div>
                                </div>
                            )}

                            {/* Invoice Number */}
                            {tx.invoiceNumber && (
                                <div className="tx-detail-item">
                                    <div className="tx-item-label">
                                        <FileText size={14} />
                                        {isArabic ? 'رقم الفاتورة / الإيصال' : 'Invoice Number'}
                                    </div>
                                    <div className="tx-item-value font-mono">
                                        #{tx.invoiceNumber}
                                    </div>
                                </div>
                            )}

                            {/* Created By & Date */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Calendar size={14} />
                                    {isArabic ? 'تم الإنشاء بواسطة' : 'Created By'}
                                </div>
                                <div className="tx-item-value">
                                    {tx.user?.name || tx.creator?.name || '-'} ({formatDate(tx.createdAt)})
                                </div>
                            </div>

                            {/* Approver & Date */}
                            {tx.approvedBy && (
                                <div className="tx-detail-item">
                                    <div className="tx-item-label">
                                        <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                                        {isArabic ? 'تم الاعتماد بواسطة' : 'Approved By'}
                                    </div>
                                    <div className="tx-item-value">
                                        {tx.approver?.name || (isArabic ? 'الإدارة' : 'Manager')} ({formatDate(tx.approvedAt)})
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="tx-detail-footer">
                    <div className="flex gap-sm">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-xs"
                            onClick={handlePrintSlip}
                        >
                            <Printer size={15} />
                            {isArabic ? 'طباعة السند' : 'Print Voucher'}
                        </button>
                    </div>

                    <div className="flex gap-sm">
                        {!isCancelled && canEdit && onRefund && (
                            <button
                                type="button"
                                className="btn btn-sm flex items-center gap-xs"
                                style={{ color: '#d97706', borderColor: '#d97706' }}
                                onClick={() => {
                                    onClose();
                                    onRefund(tx);
                                }}
                            >
                                <RotateCcw size={15} />
                                {isArabic ? 'استرداد وإلغاء' : 'Refund'}
                            </button>
                        )}
                        {!isCancelled && canEdit && onEdit && (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm flex items-center gap-xs"
                                onClick={() => {
                                    onClose();
                                    onEdit(tx);
                                }}
                            >
                                <Edit3 size={15} />
                                {isArabic ? 'تعديل المعاملة' : 'Edit'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={onClose}
                        >
                            {isArabic ? 'إغلاق' : 'Close'}
                        </button>
                    </div>
                </div>
            </div>

            {/* FULLSCREEN IMAGE ZOOM MODAL */}
            {isImageZoomed && receiptUrl && (
                <div className="image-zoom-overlay" onClick={() => setIsImageZoomed(false)}>
                    <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
                        <button className="image-zoom-close" onClick={() => setIsImageZoomed(false)}>
                            <X size={24} />
                        </button>
                        <img src={receiptUrl} alt="Zoomed Receipt" className="image-zoom-full" />
                        <div className="image-zoom-toolbar">
                            <a
                                href={receiptUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-sm flex items-center gap-xs"
                            >
                                <Download size={15} />
                                {isArabic ? 'تحميل الأصل' : 'Download Original'}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
