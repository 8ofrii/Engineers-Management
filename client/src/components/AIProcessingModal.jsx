import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import './AIProcessingModal.css';

/**
 * Custom Hook to manage AI progressive scanning/processing simulation
 */
export function useAIProcessing() {
    const [processing, setProcessing] = useState({
        active: false,
        type: 'voice', // 'voice' | 'receipt'
        progress: 0,
        stepIndex: 0
    });
    const timerRef = useRef(null);

    const startProcessing = (type = 'voice') => {
        if (timerRef.current) clearInterval(timerRef.current);

        setProcessing({
            active: true,
            type,
            progress: 8,
            stepIndex: 0
        });

        timerRef.current = setInterval(() => {
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

    const finishProcessing = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setProcessing(prev => ({ ...prev, progress: 100, stepIndex: 3 }));
    };

    const stopProcessing = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setProcessing({ active: false, type: 'voice', progress: 0, stepIndex: 0 });
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return {
        processing,
        startProcessing,
        finishProcessing,
        stopProcessing
    };
}

/**
 * AI Processing Loading Screen Modal
 * Shows radar scanner, pulsing laser, percentage bar, and 4-step progressive checklist
 */
export default function AIProcessingModal({
    active = false,
    type = 'voice',
    progress = 0,
    stepIndex = 0
}) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');

    if (!active) return null;

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

    const currentSteps = type === 'voice' ? voiceSteps : receiptSteps;

    return (
        <div className="ai-processing-modal-overlay">
            <div className="ai-processing-modal-card" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Central Scanner Radar Hub */}
                <div className={`ai-scanner-hub ${type === 'voice' ? 'hub-voice' : 'hub-receipt'}`}>
                    <div className="ai-scanner-pulse-ring" />
                    {type === 'voice' ? <Mic size={36} color="#ffffff" /> : <Camera size={36} color="#ffffff" />}
                    <div className="ai-scanner-laser" />
                </div>

                {/* Title & Subtitle */}
                <h3 className="ai-processing-title">
                    {type === 'voice'
                        ? (isRTL ? 'جاري تحليل التسجيل الصوتي بالذكاء الاصطناعي...' : 'Analyzing Voice Recording...')
                        : (isRTL ? 'جاري مسح واستخراج بيانات الفاتورة...' : 'Scanning & Extracting Receipt OCR...')
                    }
                </h3>
                <p className="ai-processing-subtitle">
                    {type === 'voice'
                        ? (isRTL 
                            ? 'يقوم المحرك الذكي بهيكلة البيانات وتصنيف المبالغ بدقة عالية' 
                            : 'AI Whisper & Luna engines are structuring items, dialect, and amounts')
                        : (isRTL
                            ? 'يقوم المحرك الذكي بهيكلة البيانات وتصنيف المبالغ بدقة عالية'
                            : 'AI OCR is structuring lines, tax totals, and vendor details')
                    }
                </p>

                {/* Animated Progress Bar */}
                <div className="ai-progressbar-container">
                    <div className="ai-progressbar-header">
                        <div className="ai-progressbar-status-text">
                            <Loader2 size={15} className="spin" />
                            <span>
                                {progress === 100 
                                    ? (isRTL ? 'اكتملت المعالجة بنجاح!' : 'Processing Complete!') 
                                    : currentSteps[stepIndex]
                                }
                            </span>
                        </div>
                        <span className="ai-progressbar-percent">
                            {progress}%
                        </span>
                    </div>
                    <div className="ai-progressbar-track">
                        <div 
                            className={`ai-progressbar-fill ${type === 'voice' ? 'fill-voice' : 'fill-receipt'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Progressive Checklist */}
                <div className="ai-processing-steps">
                    {currentSteps.map((stepText, idx) => {
                        const isDone = stepIndex > idx || progress === 100;
                        const isCurrent = stepIndex === idx && progress < 100;
                        const isPending = stepIndex < idx;

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
    );
}
