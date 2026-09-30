import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
    X, Sparkles, Mic, Volume2, Play, Pause, Download, ExternalLink,
    FileText, CheckCircle2, Clock, AlertCircle, Copy, Check,
    Image as ImageIcon, TrendingUp, TrendingDown, Building, User,
    Wallet, Calendar, Tag, Maximize2, Printer, Edit3, ArrowUpRight,
    ArrowDownLeft, CornerDownRight, RotateCcw, Briefcase, Loader2,
    FileSpreadsheet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { transactionsAPI } from '../services/api';
import { resolveMediaUrl, parseReceiptUrls, parseReceiptAttachments, getFileCategory, formatBytes } from '../utils/media';
import { cleanTransactionDescription, getLocalizedName } from '../utils/format';
import './TransactionDetailModal.css';

export { resolveMediaUrl, parseReceiptUrls, parseReceiptAttachments };

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
    const { user } = useAuth();

    // Audio Player State
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [copiedTranscript, setCopiedTranscript] = useState(false);

    // Image Zoom Modal State (index of active image in imageAttachments)
    const [zoomedImageIndex, setZoomedImageIndex] = useState(null);
    // Voucher Printing & Export State
    const [isPrintingSlip, setIsPrintingSlip] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        // Reset state on transaction change
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setZoomedImageIndex(null);
        setIsPrintingSlip(false);
        setIsDownloadingPdf(false);
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
    const receiptAttachments = parseReceiptAttachments(tx.receiptPhotoUrl);
    const receiptUrls = receiptAttachments.map(a => a.url);
    const receiptUrl = receiptUrls[0] || null;
    const imageAttachments = receiptAttachments.filter(a => a.isImg).map(a => a.url);

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

    const getPaymentMethodLabel = (method) => {
        if (!method) return '-';
        switch (method) {
            case 'BANK_TRANSFER':
                return t('finance.methods.bankTransfer') || (isArabic ? 'تحويل بنكي' : 'Bank Transfer');
            case 'CASH':
                return t('finance.methods.cash') || (isArabic ? 'نقداً (كاش)' : 'Cash');
            case 'CHECK':
                return t('finance.methods.check') || (isArabic ? 'شيك' : 'Check');
            case 'CREDIT_CARD':
                return t('finance.methods.creditCard') || (isArabic ? 'بطاقة ائتمان' : 'Credit Card');
            case 'CUSTODY_WALLET':
                return t('finance.methods.custodyWallet') || (isArabic ? 'عهدة مهندس' : 'Custody Wallet');
            case 'OTHER':
                return t('finance.methods.other') || (isArabic ? 'أخرى' : 'Other');
            default: {
                const key = `finance.methods.${method.toLowerCase()}`;
                const val = t(key);
                if (val && val !== key) return val;
                return method;
            }
        }
    };

    const getCategoryLabel = (category, description) => {
        if (!category) return '-';
        if (category === 'OTHER' && description && (description.startsWith('Other - ') || description.startsWith('أخرى - '))) {
            return description.split(' - ')[1] || (isArabic ? 'أخرى' : 'Other');
        }
        const key = `finance.categories.${category.toLowerCase()}`;
        const val = t(key);
        if (val && val !== key) return val;
        return category;
    };

    // Clean browser print fallback
    const handleBrowserPrint = () => {
        document.body.classList.add('tx-slip-printing');
        const cleanup = () => {
            document.body.classList.remove('tx-slip-printing');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 2500);
    };

    // Official 1-Page Voucher PDF Print
    const handlePrintSlip = async () => {
        if (!tx?.id || isPrintingSlip || isDownloadingPdf) return;
        setIsPrintingSlip(true);
        try {
            const blob = await transactionsAPI.downloadVoucherPdf(tx.id);
            const url = window.URL.createObjectURL(blob);

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                    } catch {
                        window.open(url, '_blank');
                    }
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                            window.URL.revokeObjectURL(url);
                        } catch {}
                    }, 60000);
                }, 350);
            };
        } catch (err) {
            console.warn('Voucher PDF generation endpoint unavailable, falling back to browser print:', err);
            handleBrowserPrint();
        } finally {
            setIsPrintingSlip(false);
        }
    };

    // Direct Voucher PDF Download
    const handleDownloadVoucherPdf = async () => {
        if (!tx?.id || isPrintingSlip || isDownloadingPdf) return;
        setIsDownloadingPdf(true);
        try {
            const blob = await transactionsAPI.downloadVoucherPdf(tx.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ref = (tx.id || 'TX').slice(0, 8).toUpperCase();
            a.download = `hesaby-voucher-${ref}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        } catch (err) {
            console.error('Failed to download voucher PDF:', err);
            handleBrowserPrint();
        } finally {
            setIsDownloadingPdf(false);
        }
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

    return createPortal(
        <div className="modal-overlay tx-detail-overlay" onClick={onClose}>
            <div
                className="modal-container tx-detail-modal"
                onClick={(e) => e.stopPropagation()}
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* PRINTABLE OFFICIAL VOUCHER HEADER (Visible only during window.print) */}
                <div className="voucher-print-header">
                    <div className="voucher-print-brand">
                        {user?.companyLogo ? (
                            <img
                                src={resolveMediaUrl(user.companyLogo)}
                                alt={user?.company || 'Company Logo'}
                                className="voucher-print-logo"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="voucher-print-fallback">
                                {(user?.company || 'H').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2 className="voucher-print-company">{user?.company || 'Hesaby Construction ERP'}</h2>
                            <div className="voucher-print-meta">
                                {user?.email ? `${user.email} ` : ''}
                                {user?.phone ? `• ${user.phone}` : ''}
                            </div>
                        </div>
                    </div>
                    <div className="voucher-print-title-box">
                        <div className="voucher-print-title">
                            {isIncome
                                ? (isArabic ? 'سند قبض مالي معتمد (إيراد)' : 'OFFICIAL RECEIPT VOUCHER (INCOME)')
                                : isProfit
                                    ? (isArabic ? 'إذن تحويل أرباح إدارة' : 'PROFIT TRANSFER VOUCHER')
                                    : (isArabic ? 'سند صرف معتمد (مصروفات)' : 'OFFICIAL PAYMENT VOUCHER (EXPENSE)')}
                        </div>
                        <div className="voucher-print-badge" style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            marginTop: '4px',
                            backgroundColor: isIncome ? '#ecfdf5' : isProfit ? '#ecfeff' : '#fef2f2',
                            color: isIncome ? '#047857' : isProfit ? '#0e7490' : '#b91c1c',
                            border: `1px solid ${isIncome ? '#10b981' : isProfit ? '#06b6d4' : '#ef4444'}`
                        }}>
                            {isIncome
                                ? (isArabic ? 'سند قبض • إيراد معتمد' : 'RECEIPT • INCOME')
                                : isProfit
                                    ? (isArabic ? 'تحويل أرباح' : 'PROFIT TRANSFER')
                                    : (isArabic ? 'سند صرف • مصروفات' : 'PAYMENT • EXPENSE')}
                        </div>
                        <div className="voucher-print-ref">
                            REF #{tx.id ? tx.id.slice(0, 8).toUpperCase() : 'TX-001'}
                        </div>
                        <div className="voucher-print-date">
                            {formatDate(tx.transactionDate || tx.createdAt)}
                        </div>
                    </div>
                </div>

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
                                {(tx.project ? getLocalizedName(tx.project, isArabic) : null) || (isIncome ? (isArabic ? '🏢 إيرادات المقر والشركة' : '🏢 Company & HQ Revenue') : (tx.isOfficeExpense || !tx.projectId ? (isArabic ? '🏢 مصروفات المقر والشركة' : '🏢 Office & HQ Expenses') : (isArabic ? 'غير مسند لمشروع' : 'Unassigned Project')))} · {formatDate(tx.transactionDate || tx.createdAt)}
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
                                    ? (isArabic ? 'المبلغ المستلم / المقبوض' : 'Received / Paid Amount')
                                    : (isArabic ? 'المبلغ المدفوع الفعلي' : 'Paid Amount')}
                        </div>
                        <div className={`tx-hero-amount ${isCancelled ? 'cancelled' : ''}`}>
                            {fmtCurrency(tx.amount)}
                        </div>

                        {/* Settlement Difference Details if totalDueAmount exists */}
                        {Boolean(tx.totalDueAmount && !isNaN(Number(tx.totalDueAmount))) && (
                            <div style={{
                                marginTop: '10px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                ...(Number(tx.totalDueAmount) > Number(tx.amount)
                                    ? { background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#b45309' }
                                    : Number(tx.totalDueAmount) < Number(tx.amount)
                                        ? { background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#1d4ed8' }
                                        : { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#047857' })
                            }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                    {isArabic ? 'إجمالي المستحق:' : 'Total Due:'} <strong>{fmtCurrency(tx.totalDueAmount)}</strong>
                                </span>
                                <span style={{ opacity: 0.5 }}>|</span>
                                {Number(tx.totalDueAmount) > Number(tx.amount) ? (
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span>⚠️</span>
                                        <span>{isArabic ? 'متبقي غير مسوى:' : 'Remaining Unsettled:'}</span>
                                        <strong style={{ fontSize: '0.92rem' }}>+{fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))}</strong>
                                    </span>
                                ) : Number(tx.totalDueAmount) < Number(tx.amount) ? (
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span>ℹ️</span>
                                        <span>{isArabic ? 'دفعة زائدة:' : 'Overpaid / Credit:'}</span>
                                        <strong style={{ fontSize: '0.92rem' }}>-{fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))}</strong>
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span>✓</span>
                                        <span>{isArabic ? 'مسوى بالكامل ومطابق' : 'Fully Settled & Matched'}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {tx.description && (
                            <div className="tx-hero-desc">
                                {cleanTransactionDescription(tx.description)}
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

                                {/* RECEIPT & ATTACHMENT MEDIA SECTION */}
                                {receiptUrls.length > 0 && (
                                    <div className="media-card receipt-card">
                                        <div className="media-card-header">
                                            <div className="flex items-center gap-xs">
                                                <div className="receipt-icon-badge">
                                                    <ImageIcon size={15} />
                                                </div>
                                                <span className="media-card-title">
                                                    {receiptUrls.length > 1
                                                        ? (isArabic ? `المرفقات والمستندات (${receiptUrls.length})` : `Attachments & Documents (${receiptUrls.length})`)
                                                        : (isArabic ? 'صورة الإيصال / الفاتورة' : 'Receipt / Invoice Attachment')}
                                                </span>
                                            </div>
                                            {receiptUrls.length > 1 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {receiptUrls.length} {isArabic ? 'ملفات مرفقة' : 'files attached'}
                                                </span>
                                            )}
                                        </div>

                                        {receiptAttachments.length === 1 ? (
                                            (() => {
                                                const att = receiptAttachments[0];
                                                const u = att.url;
                                                const meta = getFileCategory(u);
                                                return (
                                                    <div>
                                                        {att.label && (
                                                            <div style={{ marginBottom: '8px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                                    🏷️ {att.label}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {meta.isImg ? (
                                                            <div
                                                                className="receipt-image-wrapper"
                                                                onClick={() => setZoomedImageIndex(0)}
                                                            >
                                                                <img
                                                                    src={u}
                                                                    alt={att.label || "Receipt Evidence"}
                                                                    className="receipt-thumbnail"
                                                                />
                                                                <div className="receipt-zoom-hint">
                                                                    <Maximize2 size={16} />
                                                                    <span>{isArabic ? 'انقر للتكبير' : 'Click to zoom'}</span>
                                                                </div>
                                                            </div>
                                                        ) : meta.isPdf ? (
                                                            <div className="pdf-preview-box">
                                                                <FileText size={44} className="text-danger" />
                                                                <div className="pdf-file-title" title={att.name || meta.name}>
                                                                    {att.name || meta.name || (isArabic ? 'مستند PDF مرفق' : 'Attached PDF Document')}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <a
                                                                        href={u}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-secondary btn-sm"
                                                                    >
                                                                        <ExternalLink size={14} />
                                                                        {isArabic ? 'عرض المستند' : 'View Document'}
                                                                    </a>
                                                                    <a
                                                                        href={u}
                                                                        download
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-secondary btn-sm"
                                                                    >
                                                                        <Download size={14} />
                                                                        {isArabic ? 'تحميل' : 'Download'}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="pdf-preview-box" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                                                                {meta.isSpreadsheet ? <FileSpreadsheet size={44} style={{ color: '#10b981' }} /> : <FileText size={44} style={{ color: '#3b82f6' }} />}
                                                                <div className="pdf-file-title" title={att.name || meta.name}>
                                                                    {att.name || meta.name || (isArabic ? 'مستند مرفق' : 'Attached Document')}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <a
                                                                        href={u}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-secondary btn-sm"
                                                                    >
                                                                        <ExternalLink size={14} />
                                                                        {isArabic ? 'فتح الملف' : 'Open File'}
                                                                    </a>
                                                                    <a
                                                                        href={u}
                                                                        download
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-secondary btn-sm"
                                                                    >
                                                                        <Download size={14} />
                                                                        {isArabic ? 'تحميل' : 'Download'}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="receipt-gallery-grid">
                                                {receiptAttachments.map((att, idx) => {
                                                    const u = att.url;
                                                    const meta = getFileCategory(u);
                                                    const imgIndex = imageAttachments.indexOf(u);
                                                    return (
                                                        <div key={idx} className="receipt-gallery-item">
                                                            {meta.isImg ? (
                                                                <div
                                                                    className="gallery-thumb-container"
                                                                    onClick={() => setZoomedImageIndex(imgIndex)}
                                                                >
                                                                    <img src={u} alt={att.label || att.name || meta.name} className="gallery-thumb-img" />
                                                                    <div className="gallery-thumb-overlay">
                                                                        <Maximize2 size={16} />
                                                                    </div>
                                                                    <span className="gallery-type-badge img">IMG</span>
                                                                </div>
                                                            ) : meta.isPdf ? (
                                                                <div className="gallery-doc-container pdf">
                                                                    <FileText size={32} className="text-danger" />
                                                                    <span className="gallery-type-badge pdf">PDF</span>
                                                                </div>
                                                            ) : meta.isSpreadsheet ? (
                                                                <div className="gallery-doc-container sheet">
                                                                    <FileSpreadsheet size={32} style={{ color: '#10b981' }} />
                                                                    <span className="gallery-type-badge sheet">{att.ext || meta.ext}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="gallery-doc-container doc">
                                                                    <FileText size={32} style={{ color: '#3b82f6' }} />
                                                                    <span className="gallery-type-badge doc">{att.ext || meta.ext}</span>
                                                                </div>
                                                            )}

                                                            <div className="gallery-item-info">
                                                                {att.label && (
                                                                    <span style={{ fontWeight: 700, fontSize: '0.76rem', color: 'var(--color-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.label}>
                                                                        🏷️ {att.label}
                                                                    </span>
                                                                )}
                                                                <span className="gallery-item-name" title={att.name || meta.name}>
                                                                    {att.name || meta.name}
                                                                </span>
                                                                <div className="gallery-item-actions">
                                                                    <a
                                                                        href={u}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn-icon-xs"
                                                                        title={isArabic ? 'معاينة' : 'View'}
                                                                    >
                                                                        <ExternalLink size={13} />
                                                                    </a>
                                                                    <a
                                                                        href={u}
                                                                        download
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn-icon-xs"
                                                                        title={isArabic ? 'تحميل' : 'Download'}
                                                                    >
                                                                        <Download size={13} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                                    {(tx.project ? getLocalizedName(tx.project, isArabic) : null) || (isArabic ? 'غير محدد' : 'Unspecified')}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Tag size={14} />
                                    {isArabic ? 'التصنيف' : 'Category'}
                                </div>
                                <div className="tx-item-value">
                                    {getCategoryLabel(tx.category, tx.description)}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <Wallet size={14} />
                                    {isArabic ? 'طريقة الدفع' : 'Payment Method'}
                                </div>
                                <div className="tx-item-value">
                                    {getPaymentMethodLabel(tx.paymentMethod)}
                                </div>
                            </div>

                            {/* Total Due Amount & Settlement Status (If present) */}
                            {Boolean(tx.totalDueAmount && !isNaN(Number(tx.totalDueAmount))) && (
                                <>
                                    <div className="tx-detail-item">
                                        <div className="tx-item-label">
                                            <TrendingUp size={14} />
                                            {isArabic ? 'المبلغ الإجمالي المستحق' : 'Total Due Amount'}
                                        </div>
                                        <div className="tx-item-value" style={{ fontWeight: 700 }}>
                                            {fmtCurrency(tx.totalDueAmount)}
                                        </div>
                                    </div>
                                    <div className="tx-detail-item">
                                        <div className="tx-item-label">
                                            <AlertCircle size={14} />
                                            {isArabic ? 'حالة التسوية والمطابقة' : 'Settlement Status'}
                                        </div>
                                        <div className="tx-item-value">
                                            {Number(tx.totalDueAmount) > Number(tx.amount) ? (
                                                <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>⚠️</span>
                                                    <span>{isArabic ? `باقي مستحق غير مسوى (+${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))})` : `Unsettled Balance (+${fmtCurrency(Number(tx.totalDueAmount) - Number(tx.amount))})`}</span>
                                                </span>
                                            ) : Number(tx.totalDueAmount) < Number(tx.amount) ? (
                                                <span style={{ color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>ℹ️</span>
                                                    <span>{isArabic ? `دفعة زائدة (-${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))})` : `Overpaid (-${fmtCurrency(Number(tx.amount) - Number(tx.totalDueAmount))})`}</span>
                                                </span>
                                            ) : (
                                                <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>✓</span>
                                                    <span>{isArabic ? 'مسوى بالكامل ومطابق' : 'Fully Settled & Matched'}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Payer or Client */}
                            <div className="tx-detail-item">
                                <div className="tx-item-label">
                                    <User size={14} />
                                    {isIncome ? (isArabic ? 'العميل / المفوض' : 'Client / Contact') : (isArabic ? 'الدافع المسؤول' : 'Payer')}
                                </div>
                                <div className="tx-item-value">
                                    {isIncome
                                        ? ((tx.client ? getLocalizedName(tx.client, isArabic) : null) || tx.paidByClientContact || tx.transactionFrom || '-')
                                        : ((tx.payer ? getLocalizedName(tx.payer, isArabic) : null) || (tx.user ? getLocalizedName(tx.user, isArabic) : null) || '-')}
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
                                        {tx.beneficiary || (tx.supplier ? getLocalizedName(tx.supplier, isArabic) : null) || (tx.workman ? getLocalizedName(tx.workman, isArabic) : null) || tx.transactionTo || '-'}
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
                                    {(tx.user ? getLocalizedName(tx.user, isArabic) : null) || (tx.creator ? getLocalizedName(tx.creator, isArabic) : null) || '-'} ({formatDate(tx.createdAt)})
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
                                        {(tx.approver ? getLocalizedName(tx.approver, isArabic) : null) || (isArabic ? 'الإدارة' : 'Manager')} ({formatDate(tx.approvedAt)})
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRINTABLE OFFICIAL SIGNATURES (Visible only during print) */}
                    <div className="voucher-print-signatures">
                        {isIncome ? (
                            <>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'المسلِّم / القائم بالسداد' : 'Depositor / Payer'}</div>
                                    <div className="voucher-sign-line">{(tx.client ? getLocalizedName(tx.client, isArabic) : null) || tx.transactionFrom || tx.beneficiary || '____________________'}</div>
                                </div>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'المستلم / أمين الخزينة' : 'Received By / Cashier'}</div>
                                    <div className="voucher-sign-line">{(tx.user ? getLocalizedName(tx.user, isArabic) : null) || (user ? getLocalizedName(user, isArabic) : null) || 'Authorized'}</div>
                                </div>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'اعتماد الإدارة المالية' : 'Financial Approval'}</div>
                                    <div className="voucher-sign-line">{(tx.approver ? getLocalizedName(tx.approver, isArabic) : null) || (isApproved ? (isArabic ? 'الإدارة المالية' : 'Financial Dept') : '____________________')}</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'المحاسب المسؤول / الصراف' : 'Accountant / Cashier'}</div>
                                    <div className="voucher-sign-line">{(tx.payer ? getLocalizedName(tx.payer, isArabic) : null) || (tx.user ? getLocalizedName(tx.user, isArabic) : null) || (user ? getLocalizedName(user, isArabic) : null) || 'Authorized'}</div>
                                </div>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'المستلم / المستفيد' : 'Beneficiary / Recipient'}</div>
                                    <div className="voucher-sign-line">{tx.beneficiary || (tx.supplier ? getLocalizedName(tx.supplier, isArabic) : null) || (tx.workman ? getLocalizedName(tx.workman, isArabic) : null) || '____________________'}</div>
                                </div>
                                <div className="voucher-sign-col">
                                    <div className="voucher-sign-title">{isArabic ? 'اعتماد الإدارة المالية' : 'Financial Approval'}</div>
                                    <div className="voucher-sign-line">{(tx.approver ? getLocalizedName(tx.approver, isArabic) : null) || (isApproved ? (isArabic ? 'الإدارة المالية' : 'Financial Dept') : '____________________')}</div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="voucher-print-footer">
                        <span>{user?.company || 'Hesaby ERP'} &mdash; {isIncome ? (isArabic ? 'إشعار تحصيل مالي معتمد صالح للقيد والمراجعة' : 'Official Verified Income Receipt Slip') : (isArabic ? 'إشعار مالي معتمد صالح للقيد والمراجعة' : 'Official Verified Financial Slip')}</span>
                        <span>{isArabic ? 'نسخة أصلية' : 'Original Copy'}</span>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="tx-detail-footer">
                    <div className="flex gap-sm">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-xs"
                            onClick={handlePrintSlip}
                            disabled={isPrintingSlip || isDownloadingPdf}
                            title={isArabic ? 'طباعة سند مالي معتمد' : 'Print Official Financial Voucher'}
                        >
                            {isPrintingSlip ? <Loader2 size={15} className="spin animate-spin" /> : <Printer size={15} />}
                            {isArabic ? 'طباعة السند' : 'Print Voucher'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-xs"
                            onClick={handleDownloadVoucherPdf}
                            disabled={isPrintingSlip || isDownloadingPdf}
                            title={isArabic ? 'تحميل ملف PDF للسند' : 'Download Voucher PDF'}
                        >
                            {isDownloadingPdf ? <Loader2 size={15} className="spin animate-spin" /> : <Download size={15} />}
                            {isArabic ? 'تحميل PDF' : 'Download PDF'}
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
            {zoomedImageIndex !== null && imageAttachments[zoomedImageIndex] && (
                <div className="image-zoom-overlay" onClick={() => setZoomedImageIndex(null)}>
                    <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
                        <button className="image-zoom-close" onClick={() => setZoomedImageIndex(null)}>
                            <X size={24} />
                        </button>

                        {imageAttachments.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    className="zoom-nav-btn zoom-nav-prev"
                                    onClick={() => setZoomedImageIndex((prev) => (prev > 0 ? prev - 1 : imageAttachments.length - 1))}
                                    title={isArabic ? 'السابق' : 'Previous'}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button
                                    type="button"
                                    className="zoom-nav-btn zoom-nav-next"
                                    onClick={() => setZoomedImageIndex((prev) => (prev < imageAttachments.length - 1 ? prev + 1 : 0))}
                                    title={isArabic ? 'التالي' : 'Next'}
                                >
                                    <ChevronRight size={22} />
                                </button>
                                <div className="zoom-counter-badge">
                                    {isArabic
                                        ? `صورة ${zoomedImageIndex + 1} من ${imageAttachments.length}`
                                        : `Photo ${zoomedImageIndex + 1} of ${imageAttachments.length}`}
                                </div>
                            </>
                        )}

                        <img src={imageAttachments[zoomedImageIndex]} alt="Zoomed Receipt" className="image-zoom-full" />
                        <div className="image-zoom-toolbar">
                            <a
                                href={imageAttachments[zoomedImageIndex]}
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
        </div>,
        document.body
    );
}
