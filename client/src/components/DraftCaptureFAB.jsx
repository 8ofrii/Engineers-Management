import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Sparkles, Bot, Mic, Camera, X, Loader2, 
    ChevronRight, ChevronLeft, Check, FileText
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useCopilot } from '../context/CopilotContext';
import { aiExtractAPI } from '../services/api';
import VoiceRecorderModal from './VoiceRecorderModal';
import AIProcessingModal, { useAIProcessing } from './AIProcessingModal';
import './DraftCaptureFAB.css';

// Master Unified AI Action Button
// 1. AI Copilot Chat Assistant (المساعد الذكي)
// 2. AI Voice Draft Recording (مسودة صوتية)
// 3. Receipt & PDF Document OCR Scan (مسح فاتورة / مستند)

const HIDE_ON_PATHS = ['/drafts/']; // hide on /drafts/:id review screen specifically

export default function DraftCaptureFAB() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();
    const { openChat } = useCopilot();
    const isRTL = i18n.language === 'ar';

    const [open, setOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef(null);

    // Dynamic Progressive AI Scanning Modal State via unified hook
    const { processing, startProcessing, finishProcessing, stopProcessing } = useAIProcessing();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    // Hide on the review screen — its own action buttons would clash with the FAB.
    if (HIDE_ON_PATHS.some(p => location.pathname.startsWith(p) && location.pathname !== '/drafts')) {
        return null;
    }

    const handleOpenAIChat = () => {
        setOpen(false);
        openChat();
    };

    const handleOpenVoice = () => {
        setOpen(false);
        setVoiceOpen(true);
    };

    const handleTriggerScan = () => {
        setOpen(false);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleVoiceCaptured = async (blob) => {
        setVoiceOpen(false);
        setBusy(true);
        startProcessing('voice');

        try {
            const r = await aiExtractAPI.voice(blob);
            finishProcessing();

            setTimeout(() => {
                stopProcessing();
                setBusy(false);
                navigate(`/drafts/${r.data.draft.id}`);
            }, 500);
        } catch (err) {
            stopProcessing();
            setBusy(false);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isRTL ? 'فشل استخراج البيانات من الصوت' : 'Voice extraction failed')
            });
        }
    };

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        startProcessing('receipt');

        try {
            const r = await aiExtractAPI.receipt(file);
            finishProcessing();

            setTimeout(() => {
                stopProcessing();
                setBusy(false);
                navigate(`/drafts/${r.data.draft.id}`);
            }, 500);
        } catch (err) {
            stopProcessing();
            setBusy(false);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isRTL ? 'فشل معالجة وقراءة الفاتورة' : 'Receipt extraction failed')
            });
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    return (
        <>
            {/* Backdrop when palette is open */}
            {open && (
                <div 
                    className="unified-ai-backdrop"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Master Floating Action Container */}
            <div className="unified-ai-fab-container">
                {/* 3-Option Popover Action Palette */}
                {open && (
                    <div className="unified-ai-menu-card" dir={isRTL ? 'rtl' : 'ltr'}>
                        {/* Header Tag */}
                        <div className="unified-ai-menu-header">
                            <div className="unified-ai-header-tag">
                                <Sparkles size={16} />
                                <span>{isRTL ? 'المساعد والمسودات الذكية' : 'Hesaby AI Copilot'}</span>
                            </div>
                            <span className="unified-ai-header-badge">
                                {isRTL ? 'مساعد ذكي' : 'AI Copilot'}
                            </span>
                        </div>

                        {/* Option 1: AI Copilot Chat */}
                        <button
                            type="button"
                            className="unified-ai-item"
                            onClick={handleOpenAIChat}
                            disabled={busy}
                        >
                            <div className="unified-ai-icon-box icon-box-chat">
                                <Bot size={22} />
                            </div>
                            <div className="unified-ai-item-info">
                                <div className="unified-ai-item-title">
                                    <span>{isRTL ? 'المساعد الذكي (Copilot)' : 'AI Copilot Assistant'}</span>
                                    <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>
                                        {isRTL ? 'محادثة' : 'Chat'}
                                    </span>
                                </div>
                                <div className="unified-ai-item-desc">
                                    {isRTL 
                                        ? 'محادثة فورية، استفسارات مالية، وتعبئة نماذج'
                                        : 'Instant chat, financial insights & smart actions'
                                    }
                                </div>
                            </div>
                            <div className="unified-ai-item-arrow">
                                {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                            </div>
                        </button>

                        {/* Option 2: AI Voice Draft */}
                        <button
                            type="button"
                            className="unified-ai-item"
                            onClick={handleOpenVoice}
                            disabled={busy}
                        >
                            <div className="unified-ai-icon-box icon-box-voice">
                                <Mic size={22} />
                            </div>
                            <div className="unified-ai-item-info">
                                <div className="unified-ai-item-title">
                                    <span>{isRTL ? 'تسجيل مسودة صوتية' : 'AI Voice Draft Note'}</span>
                                    <span style={{ fontSize: '11px', color: '#f472b6', fontWeight: 600 }}>
                                        {isRTL ? 'صوت' : 'Voice'}
                                    </span>
                                </div>
                                <div className="unified-ai-item-desc">
                                    {isRTL
                                        ? 'تحدث بالعامية لتسجيل المصروفات واليوميات'
                                        : 'Speak naturally to log expenses & site logs'
                                    }
                                </div>
                            </div>
                            <div className="unified-ai-item-arrow">
                                {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                            </div>
                        </button>

                        {/* Option 3: Receipt & PDF Scan */}
                        <button
                            type="button"
                            className="unified-ai-item"
                            onClick={handleTriggerScan}
                            disabled={busy}
                        >
                            <div className="unified-ai-icon-box icon-box-receipt">
                                <Camera size={22} />
                            </div>
                            <div className="unified-ai-item-info">
                                <div className="unified-ai-item-title">
                                    <span>{isRTL ? 'مسح فاتورة / مستند (OCR)' : 'Scan Receipt / PDF (OCR)'}</span>
                                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                                        {isRTL ? 'مسح' : 'Scan'}
                                    </span>
                                </div>
                                <div className="unified-ai-item-desc">
                                    {isRTL
                                        ? 'التقط صورة أو ارفع PDF لاستخراج البنود والمبالغ'
                                        : 'Extract items & totals automatically from receipts'
                                    }
                                </div>
                            </div>
                            <div className="unified-ai-item-arrow">
                                {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                            </div>
                        </button>
                    </div>
                )}

                {/* Hidden File Input for Receipt/PDF OCR */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handlePhotoSelected}
                    disabled={busy}
                    style={{ display: 'none' }}
                />

                {/* Master Unified Trigger Button */}
                <button
                    type="button"
                    className={`unified-ai-main-btn ${open ? 'is-open' : ''}`}
                    onClick={() => setOpen(prev => !prev)}
                    disabled={busy}
                    aria-label={isRTL ? 'المساعد الذكي والتسجيل السريع' : 'Hesaby AI Copilot & Quick Drafts'}
                    title={isRTL ? 'المساعد الذكي وتسجيل المسودات' : 'Hesaby AI & Quick Drafts'}
                >
                    {!open && <div className="unified-ai-pulse-ring" />}

                    {busy ? (
                        <Loader2 size={28} className="spin" />
                    ) : open ? (
                        <X size={28} />
                    ) : (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bot size={26} />
                            <Sparkles 
                                size={14} 
                                color="#facc15" 
                                className="unified-ai-sparkle-spin" 
                                style={{ position: 'absolute', top: -7, right: -7 }} 
                            />
                        </div>
                    )}
                </button>
            </div>

            {/* Voice Recorder Modal */}
            <VoiceRecorderModal
                open={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                onCaptured={handleVoiceCaptured}
                maxSeconds={60}
            />

            {/* AI Scanning & Extraction Progress Modal */}
            <AIProcessingModal
                active={processing.active}
                type={processing.type}
                progress={processing.progress}
                stepIndex={processing.stepIndex}
            />
        </>
    );
}
