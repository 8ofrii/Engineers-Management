import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Sparkles, RotateCcw, ArrowRight, Play, Pause, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorderModal({ open, onClose, onCaptured, maxSeconds = 60 }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl';

    const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
    const [seconds, setSeconds] = useState(0);
    const [blob, setBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioStream, setAudioStream] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isVoiceDetected, setIsVoiceDetected] = useState(false);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef('');
    const audioElRef = useRef(null);

    // Reset state whenever modal opens or closes
    useEffect(() => {
        if (open) {
            setPhase('idle');
            setSeconds(0);
            setBlob(null);
            setAudioUrl(null);
            setAudioStream(null);
            setErrorMsg(null);
            setIsPlaying(false);
            setPlaybackTime(0);
            setAudioDuration(0);
            transcriptRef.current = '';
        } else {
            cleanupAll();
        }
    }, [open]);

    // Clean up object URLs on unmount or URL change
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const cleanupAll = () => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            try { recorderRef.current.stop(); } catch (_) {}
        }
        recorderRef.current = null;

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
            recognitionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setAudioStream(null);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (audioElRef.current) {
            audioElRef.current.pause();
        }
        setIsPlaying(false);
    };

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) {}
            recognitionRef.current = null;
        }

        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }

        // Keep the stream alive just briefly until onstop creates the blob, then cleanup
        setTimeout(() => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            setAudioStream(null);
        }, 150);
    };

    const startRecording = async () => {
        setErrorMsg(null);
        transcriptRef.current = '';
        cleanupAll();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                },
            });

            streamRef.current = stream;
            setAudioStream(stream);

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            recorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const b = new Blob(chunksRef.current, { type: 'audio/webm' });
                setBlob(b);
                const url = URL.createObjectURL(b);
                setAudioUrl(url);
                setPhase('preview');
            };

            recorder.start(100);

            // Background Speech Recognition (captures text silently for LLM without showing in UI)
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
                        transcriptRef.current = text.trim();
                    };
                    rec.start();
                    recognitionRef.current = rec;
                } catch (recErr) {
                    console.warn('Speech recognition fallback to audio-only:', recErr);
                }
            }

            setPhase('recording');
            setSeconds(0);

            timerRef.current = setInterval(() => {
                setSeconds((prev) => {
                    const next = prev + 1;
                    if (next >= maxSeconds) {
                        stopRecording();
                    }
                    return next;
                });
            }, 1000);
        } catch (err) {
            console.error('Microphone error:', err);
            setErrorMsg(
                err?.name === 'NotAllowedError'
                    ? t('drafts.micDenied', 'Microphone permission denied. Please enable it in browser settings.')
                    : t('drafts.micUnavailable', 'Could not access microphone.')
            );
            setPhase('idle');
        }
    };

    const handleClose = () => {
        cleanupAll();
        onClose?.();
    };

    const handleSend = async () => {
        if (!blob) return;
        setPhase('uploading');
        try {
            await onCaptured?.(blob, transcriptRef.current);
        } catch (err) {
            console.error('Upload failed:', err);
            setPhase('preview');
        }
    };

    const togglePlayback = () => {
        if (!audioElRef.current) return;
        if (isPlaying) {
            audioElRef.current.pause();
            setIsPlaying(false);
        } else {
            audioElRef.current.play();
            setIsPlaying(true);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
            style={{
                background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.85) 0%, rgba(3, 7, 18, 0.95) 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}
            onClick={handleClose}
        >
            {/* Liquid Glass Siri Card */}
            <div
                className="relative w-full max-w-md overflow-hidden rounded-[32px] p-6 sm:p-8 text-white transition-all duration-300"
                style={{
                    background: 'linear-gradient(180deg, rgba(30, 30, 42, 0.85) 0%, rgba(15, 15, 24, 0.95) 100%)',
                    boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(99, 102, 241, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Specular rim light */}
                <div
                    className="absolute inset-x-0 top-0 h-px pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                    }}
                />

                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-5 end-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                {/* Header title */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="flex h-6 items-center gap-1.5 px-3 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium tracking-wide">
                        <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                        <span>{t('drafts.voiceTitle', 'Siri Voice Copilot')}</span>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="my-3 rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-center text-xs text-red-200">
                        {errorMsg}
                    </div>
                )}

                {/* Siri Orb Stage with Luminescent Ambient Glow */}
                <div className="relative flex items-center justify-center my-3 mx-auto w-64 h-64 sm:w-72 sm:h-72">
                    {/* Atmospheric multi-layer bloom */}
                    <div
                        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
                            phase === 'recording'
                                ? 'opacity-80 scale-110'
                                : phase === 'uploading'
                                ? 'opacity-90 scale-125'
                                : 'opacity-40 scale-95'
                        }`}
                        style={{
                            background:
                                phase === 'recording'
                                    ? isVoiceDetected
                                        ? 'radial-gradient(circle, rgba(236, 72, 153, 0.45) 0%, rgba(99, 102, 241, 0.35) 45%, transparent 70%)'
                                        : 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.3) 45%, transparent 70%)'
                                    : phase === 'uploading'
                                    ? 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 75%)'
                                    : 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 70%)',
                        }}
                    />

                    {/* WebGL VoicePoweredOrb */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <VoicePoweredOrb
                            enableVoiceControl={phase === 'recording'}
                            stream={audioStream}
                            voiceSensitivity={1.8}
                            maxRotationSpeed={1.4}
                            maxHoverIntensity={0.85}
                            onVoiceDetected={setIsVoiceDetected}
                            className="w-full h-full"
                        />
                    </div>
                </div>

                {/* Subtitle / Status Display (Pure Siri style, NO live transcript) */}
                <div className="min-h-[44px] flex flex-col items-center justify-center text-center px-4">
                    {phase === 'idle' && (
                        <p className="text-sm font-medium text-white/70 animate-fade-in">
                            {isRTL
                                ? 'اضغط على الميكروفون للتحدث وتسجيل مصاريف أو يوميات الموقع'
                                : 'Tap the microphone to speak and record site expenses'}
                        </p>
                    )}

                    {phase === 'recording' && (
                        <div className="flex flex-col items-center gap-1.5 animate-fade-in">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span className="font-mono text-xl sm:text-2xl font-semibold tracking-wider text-white">
                                    {fmtTime(seconds)}
                                </span>
                                <span className="text-xs text-white/40 font-mono">
                                    / {fmtTime(maxSeconds)}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-300/80 font-medium">
                                {isVoiceDetected
                                    ? (isRTL ? 'نسمع صوتك الآن...' : 'Listening...')
                                    : (isRTL ? 'تحدث الآن بوضوح...' : 'Speak now...')}
                            </p>
                        </div>
                    )}

                    {phase === 'preview' && (
                        <div className="w-full flex flex-col items-center gap-2 animate-fade-in">
                            <p className="text-xs font-medium text-white/60">
                                {isRTL
                                    ? 'تم تسجيل الملاحظة الصوتية جاهزة للمراجعة والإرسال'
                                    : 'Voice note recorded and ready for AI analysis'}
                            </p>

                            {/* Sleek audio playback bar */}
                            {audioUrl && (
                                <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <button
                                        type="button"
                                        onClick={togglePlayback}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
                                    >
                                        {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
                                    </button>

                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100"
                                                style={{
                                                    width: `${audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-white/40 font-mono">
                                            <span>{fmtTime(Math.floor(playbackTime))}</span>
                                            <span>{fmtTime(Math.floor(audioDuration || seconds))}</span>
                                        </div>
                                    </div>

                                    <Volume2 size={16} className="text-white/40" />

                                    <audio
                                        ref={audioElRef}
                                        src={audioUrl}
                                        onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
                                        onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                                        onEnded={() => {
                                            setIsPlaying(false);
                                            setPlaybackTime(0);
                                        }}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {phase === 'uploading' && (
                        <div className="flex flex-col items-center gap-2 py-1 animate-fade-in">
                            <div className="flex items-center gap-2 text-sm font-medium text-indigo-300">
                                <Sparkles size={16} className="animate-spin text-purple-400" />
                                <span>{t('drafts.processing', 'AI is analyzing your voice note...')}</span>
                            </div>
                            <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse w-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Primary Action Controls */}
                <div className="mt-6 flex items-center justify-center gap-3">
                    {phase === 'idle' && (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                            <Mic size={28} className="transition-transform group-hover:scale-110" />
                        </button>
                    )}

                    {phase === 'recording' && (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg shadow-red-500/40 border border-red-400/40 transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <span className="absolute -inset-1 rounded-full border border-red-500/40 animate-ping" />
                            <Square size={22} fill="white" className="rounded-sm" />
                        </button>
                    )}

                    {phase === 'preview' && (
                        <div className="flex w-full items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={startRecording}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-white/80 hover:text-white text-sm font-medium transition-all"
                            >
                                <RotateCcw size={16} />
                                <span>{t('drafts.reRecord', 'Re-record')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleSend}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 active:scale-95 text-white font-medium text-sm shadow-lg shadow-purple-500/25 transition-all"
                            >
                                <Sparkles size={16} />
                                <span>{t('drafts.send', 'Process with AI')}</span>
                                <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
