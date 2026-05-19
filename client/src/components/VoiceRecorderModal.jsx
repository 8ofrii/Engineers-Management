import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Records audio via the browser's MediaRecorder API and hands the resulting
// Blob to the parent for upload. No external library — Whisper happily
// accepts audio/webm.
//
// Auto-stops at maxSeconds so the user can't accidentally upload a 10-minute
// silence (Whisper bills per second). 60s is a sensible default for
// site-engineer voice notes.

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorderModal({ open, onClose, onCaptured, maxSeconds = 60 }) {
    const { t } = useTranslation();
    const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
    const [seconds, setSeconds] = useState(0);
    const [blob, setBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setPhase('idle');
            setSeconds(0);
            setBlob(null);
            setAudioUrl(null);
            setErrorMsg(null);
        }
    }, [open]);

    // Tear-down audio URL when component unmounts or blob changes
    useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

    // Stop recording cleanly — releases the mic
    const stopRecording = () => {
        if (recorderRef.current && phase === 'recording') {
            recorderRef.current.stop();
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
            setPhase('recording');
            setSeconds(0);

            timerRef.current = setInterval(() => {
                setSeconds(prev => {
                    const next = prev + 1;
                    if (next >= maxSeconds) {
                        // Auto-stop at max length — protects the OpenAI bill
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
            await onCaptured?.(blob);
        } catch {
            // parent handles error display; reset phase so user can retry
            setPhase('preview');
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 460 }}
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

                <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
                    {errorMsg && (
                        <div className="alert alert-error" style={{ marginBottom: 16 }}>
                            {errorMsg}
                        </div>
                    )}

                    <div style={{
                        fontSize: '2.5rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        margin: '16px 0',
                        color: phase === 'recording' ? '#dc2626' : 'var(--text-primary)'
                    }}>
                        {fmtTime(seconds)}
                        <span style={{ fontSize: '0.9rem', opacity: 0.5, marginInlineStart: 8 }}>
                            / {fmtTime(maxSeconds)}
                        </span>
                    </div>

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
                                    style={{ width: '100%', margin: '8px 0 16px' }}
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
