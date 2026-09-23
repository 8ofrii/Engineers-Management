import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Sparkles, Bot, Mic, Camera, X, Loader2, 
    ChevronRight, ChevronLeft, Check, FileText, CheckCircle2
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useCopilot } from '../context/CopilotContext';
import { aiExtractAPI } from '../services/api';
import VoiceRecorderModal from './VoiceRecorderModal';
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
    const progressTimerRef = useRef(null);

    // Dynamic Progressive AI Scanning Modal State
    const [processing, setProcessing] = useState({
        active: false,
        type: 'receipt', // 'receipt' or 'voice'
        progress: 0,
        stepIndex: 0
    });

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

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        };
    }, []);

    // Hide on the review screen — its own action buttons would clash with the FAB.
    if (HIDE_ON_PATHS.some(p => location.pathname.startsWith(p) && location.pathname !== '/drafts')) {
        return null;
    }

    const startProgressSimulation = (type) => {
        setProcessing({
            active: true,
            type,
            progress: 8,
            stepIndex: 0
        });

        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        progressTimerRef.current = setInterval(() => {
            setProcessing(prev => {
                if (!prev.active) return prev;
                let nextProg = prev.progress;
                if (nextProg < 32) {
                    nextProg += Math.floor(Math.random() * 5) + 4;
                } else if (nextProg < 68) {
                    nextProg += Math.floor(Math.random() * 4) + 2;
                } else if (nextProg < 92) {
                    nextProg += Math.floor(Math.random() * 2) + 1;
                }

                if (nextProg > 94) nextProg = 94;

                let nextStep = 0;
                if (nextProg >= 85) nextStep = 3;
                else if (nextProg >= 55) nextStep = 2;
                else if (nextProg >= 25) nextStep = 1;

                return {
                    ...prev,
                    progress: nextProg,
                    stepIndex: nextStep
                };
            });
        }, 180);
    };

    const stopProgressSimulation = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    };

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

    const handleVoiceCaptured = async (blob, transcript = '') => {
        setVoiceOpen(false);
        setBusy(true);
        startProgressSimulation('voice');

        try {
            const r = await aiExtractAPI.voice(blob);
            stopProgressSimulation();

            // Finish to 100%
            setProcessing(prev => ({ ...prev, progress: 100, stepIndex: 3 }));
            
            setTimeout(() => {
                setProcessing({ active: false, type: 'voice', progress: 0, stepIndex: 0 });
                setBusy(false);
                navigate(`/drafts/${r.data.draft.id}`);
            }, 500);
        } catch (err) {
            stopProgressSimulation();
            setProcessing({ active: false, type: 'voice', progress: 0, stepIndex: 0 });
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
        startProgressSimulation('receipt');

        try {
            const r = await aiExtractAPI.receipt(file);
            stopProgressSimulation();

            // Finish to 100%
            setProcessing(prev => ({ ...prev, progress: 100, stepIndex: 3 }));

            setTimeout(() => {
                setProcessing({ active: false, type: 'receipt', progress: 0, stepIndex: 0 });
                setBusy(false);
                navigate(`/drafts/${r.data.draft.id}`);
            }, 500);
        } catch (err) {
            stopProgressSimulation();
            setProcessing({ active: false, type: 'receipt', progress: 0, stepIndex: 0 });
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

    // Checklist step definitions for Receipt and Voice
    const receiptSteps = [
        isRTL ? 'رفع المستند وتجهيز الصورة للفحص' : 'Uploading document & preprocessing image',
        isRTL ? 'قراءة ومسح النصوص والأرقام ضوئياً (OCR)' : 'Running Optical Character Recognition (OCR)',
        isRTL ? 'تحليل المبالغ الضريبية والمورد والبنود' : 'Structuring totals, VAT & vendor items',
        isRTL ? 'توليد مسودة المصروف الجاهزة للمراجعة' : 'Generating reviewable expense draft'
    ];

    const voiceSteps = [
        isRTL ? 'رفع المقطع الصوتي ومعالجة النبرة' : 'Uploading voice clip & analyzing audio',
        isRTL ? 'تحويل الصوت إلى نص وفهم اللهجة والمصطلحات' : 'Transcribing speech & Egyptian/Arabic dialect',
        isRTL ? 'استخراج مبالغ المعاملات وتصنيف المشروع' : 'Extracting transaction categories & amounts',
        isRTL ? 'تجهيز مسودة المعاملة للتحقق والاعتماد' : 'Preparing draft for verification'
    ];

    const currentSteps = processing.type === 'voice' ? voiceSteps : receiptSteps;

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
            {processing.active && (
                <div className="ai-processing-modal-overlay">
                    <div className="ai-processing-modal-card" dir={isRTL ? 'rtl' : 'ltr'}>
                        {/* Central Scanner Radar Hub */}
                        <div className={`ai-scanner-hub ${processing.type === 'voice' ? 'hub-voice' : 'hub-receipt'}`}>
                            <div className="ai-scanner-pulse-ring" />
                            {processing.type === 'voice' ? <Mic size={36} color="#ffffff" /> : <Camera size={36} color="#ffffff" />}
                            <div className="ai-scanner-laser" />
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="ai-processing-title">
                            {processing.type === 'voice'
                                ? (isRTL ? 'جاري تحليل التسجيل الصوتي بالذكاء الاصطناعي...' : 'Analyzing Voice Recording...')
                                : (isRTL ? 'جاري مسح واستخراج بيانات الفاتورة...' : 'Scanning & Extracting Receipt OCR...')
                            }
                        </h3>
                        <p className="ai-processing-subtitle">
                            {isRTL
                                ? 'يقوم المحرك الذكي بهيكلة البيانات وتصنيف المبالغ بدقة عالية'
                                : 'AI engine is structuring lines, tax totals, and vendor details'
                            }
                        </p>

                        {/* Animated Progress Bar */}
                        <div className="ai-progressbar-container">
                            <div className="ai-progressbar-header">
                                <div className="ai-progressbar-status-text">
                                    <Loader2 size={15} className="spin" />
                                    <span>
                                        {processing.progress === 100 
                                            ? (isRTL ? 'اكتملت المعالجة بنجاح!' : 'Processing Complete!') 
                                            : currentSteps[processing.stepIndex]
                                        }
                                    </span>
                                </div>
                                <span className="ai-progressbar-percent">
                                    {processing.progress}%
                                </span>
                            </div>
                            <div className="ai-progressbar-track">
                                <div 
                                    className={`ai-progressbar-fill ${processing.type === 'voice' ? 'fill-voice' : 'fill-receipt'}`}
                                    style={{ width: `${processing.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Progressive Checklist */}
                        <div className="ai-processing-steps">
                            {currentSteps.map((stepText, idx) => {
                                const isDone = processing.stepIndex > idx || processing.progress === 100;
                                const isCurrent = processing.stepIndex === idx && processing.progress < 100;
                                const isPending = processing.stepIndex < idx;

                                return (
                                    <div 
                                        key={idx} 
                                        className={`ai-step-row ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${isPending ? 'is-pending' : ''}`}
                                    >
                                        <div className="ai-step-icon">
                                            {isDone ? (
                                                <CheckCircle2 size={15} />
                                            ) : isCurrent ? (
                                                <Loader2 size={14} className="spin" />
                                            ) : (
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                            )}
                                        </div>
                                        <span>{stepText}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
