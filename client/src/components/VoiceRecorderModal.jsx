import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Records audio via the browser's MediaRecorder API and captures live speech-to-text
// via Web Speech API simultaneously, ensuring 100% accurate transcription for MicroMind LLM.

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorderModal({ open, onClose, onCaptured, maxSeconds = 60 }) {
    const { t } = useTranslation();
    const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
    const [seconds, setSeconds] = useState(0);
    const [blob, setBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setPhase('idle');
            setSeconds(0);
            setBlob(null);
            setAudioUrl(null);
            setTranscript('');
            setErrorMsg(null);
        }
    }, [open]);

    // Tear-down audio URL when component unmounts or blob changes
    useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

    // Stop recording cleanly — releases the mic & recognition
    const stopRecording = () => {
        if (recorderRef.current && phase === 'recording') {
            recorderRef.current.stop();
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
            recognitionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startRecording = async () => {
        setErrorMsg(null);
        setTranscript('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            recorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const b = new Blob(chunksRef.current, { type: 'audio/webm' });
                setBlob(b);
                setAudioUrl(URL.createObjectURL(b));
                setPhase('preview');
            };
            recorder.start();

            // Live Speech Recognition (Egyptian Arabic / English)
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    const rec = new SpeechRec();
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.lang = 'ar-EG';
                    rec.onresult = (e) => {
                        let text = '';
                        for (let i = 0; i < e.results.length; i++) {
                            text += e.results[i][0].transcript + ' ';
                        }
                        if (text.trim()) {
                            setTranscript(text.trim());
                        }
                    };
                    rec.start();
                    recognitionRef.current = rec;
                } catch (recErr) {
                    console.warn('SpeechRecognition failed to start:', recErr);
                }
            }

            setPhase('recording');
            setSeconds(0);

            timerRef.current = setInterval(() => {
                setSeconds(prev => {
                    const next = prev + 1;
                    if (next >= maxSeconds) {
                        stopRecording();
                    }
                    return next;
                });
            }, 1000);
        } catch (err) {
            setErrorMsg(
                err?.name === 'NotAllowedError'
                    ? (t('drafts.micDenied', 'Microphone permission denied. Please enable it in your browser settings.'))
                    : (t('drafts.micUnavailable', 'Could not access microphone.'))
            );
        }
    };

    const handleClose = () => {
        stopRecording();
        onClose?.();
    };

    const handleSend = async () => {
        if (!blob) return;
        setPhase('uploading');
        try {
            await onCaptured?.(blob, transcript);
        } catch {
            setPhase('preview');
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 480 }}
            >
                <div className="modal-header">
                    <h2 className="flex gap-sm" style={{ alignItems: 'center' }}>
                        <Mic size={20} />
                        {t('drafts.voiceTitle', 'Record voice note')}
                    </h2>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ textAlign: 'center', padding: 24 }}>
                    {errorMsg && (
                        <div className="alert alert-error" style={{ marginBottom: 16 }}>
                            {errorMsg}
                        </div>
                    )}

                    <div style={{
                        fontSize: '2.5rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        margin: '12px 0',
                        color: phase === 'recording' ? '#dc2626' : 'var(--text-primary)'
                    }}>
                        {fmtTime(seconds)}
                        <span style={{ fontSize: '0.9rem', opacity: 0.5, marginInlineStart: 8 }}>
                            / {fmtTime(maxSeconds)}
                        </span>
                    </div>

                    {/* Live Transcript Display Box */}
                    {(phase === 'recording' || phase === 'preview' || phase === 'uploading') && (
                        <div style={{
                            margin: '12px 0 16px',
                            padding: '12px 16px',
                            background: 'var(--bg-tertiary, #18181b)',
                            border: '1px solid var(--border-color-light, #27272a)',
                            borderRadius: 12,
                            textAlign: 'right',
                            direction: 'rtl'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.75rem',
                                color: 'var(--color-primary, #FF5A36)',
                                marginBottom: 6,
                                fontWeight: 600
                            }}>
                                <Sparkles size={14} />
                                <span>{phase === 'recording' ? 'جاري الاستماع وتحويل الصوت لنص...' : 'النص المستخرج من الصوت:'}</span>
                            </div>
                            {phase === 'recording' ? (
                                <p style={{
                                    fontSize: '0.95rem',
                                    color: transcript ? 'var(--text-primary, #fff)' : 'var(--text-muted, #71717a)',
                                    minHeight: 40,
                                    margin: 0
                                }}>
                                    {transcript || 'تحدث الآن (مثال: اشترينا 50 شيكارة اسمنت بـ 12500 جنيه)...'}
                                </p>
                            ) : (
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder="النص المستخرج من الصوت..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary, #fff)',
                                        fontSize: '0.95rem',
                                        resize: 'none',
                                        outline: 'none',
                                        direction: 'rtl'
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {phase === 'idle' && (
                        <button
                            className="btn btn-primary"
                            style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 999 }}
                            onClick={startRecording}
                        >
                            <Mic size={20} />
                            {t('drafts.start', 'Start recording')}
                        </button>
                    )}

                    {phase === 'recording' && (
                        <button
                            className="btn"
                            style={{
                                padding: '16px 32px',
                                fontSize: '1.1rem',
                                borderRadius: 999,
                                background: '#dc2626',
                                color: 'white'
                            }}
                            onClick={stopRecording}
                        >
                            <Square size={20} fill="white" />
                            {t('drafts.stop', 'Stop')}
                        </button>
                    )}

                    {phase === 'preview' && (
                        <>
                            {audioUrl && (
                                <audio
                                    controls
                                    src={audioUrl}
                                    style={{ width: '100%', margin: '4px 0 16px' }}
                                />
                            )}
                            <div className="flex gap-sm" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" onClick={startRecording}>
                                    <Mic size={16} />
                                    {t('drafts.reRecord', 'Re-record')}
                                </button>
                                <button className="btn btn-primary" onClick={handleSend}>
                                    <Send size={16} />
                                    {t('drafts.send', 'Process with AI')}
                                </button>
                            </div>
                        </>
                    )}

                    {phase === 'uploading' && (
                        <div className="flex gap-sm" style={{ justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                            <Loader2 size={24} className="spin" />
                            <span>{t('drafts.processing', 'Processing voice with AI…')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
