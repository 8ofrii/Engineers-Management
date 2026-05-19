// Voice recording sheet for the AI draft pipeline. Wraps expo-av's
// Audio.Recording with a 60s safety cap so a forgetful tap can't burn
// minutes of Whisper budget.
//
// Required install (one-time):
//   cd mobile && npx expo install expo-av
//
// Returns { uri, type } via the onCaptured callback. Caller hands the URI
// straight to aiExtractApi.voice — React Native FormData accepts the file
// as { uri, name, type }, no need to read into memory.

import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorderSheet({ visible, onClose, onCaptured, maxSeconds = 60 }) {
    const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
    const [seconds, setSeconds] = useState(0);
    const [recordedUri, setRecordedUri] = useState(null);
    const [playing, setPlaying] = useState(false);

    const recordingRef = useRef(null);
    const timerRef = useRef(null);
    const soundRef = useRef(null);

    // Reset on open
    useEffect(() => {
        if (visible) {
            setPhase('idle');
            setSeconds(0);
            setRecordedUri(null);
        } else {
            // Stop everything on close
            stopRecording().catch(() => { });
            stopPlayback().catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const stopRecording = async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
            } catch { /* already stopped */ }
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            return uri;
        }
        return null;
    };

    const startRecording = async () => {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Microphone permission needed', 'Please enable mic access in your device settings.');
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recordingRef.current = recording;
            setSeconds(0);
            setPhase('recording');

            timerRef.current = setInterval(() => {
                setSeconds(prev => {
                    const next = prev + 1;
                    if (next >= maxSeconds) {
                        // Auto-stop at cap
                        handleStop();
                    }
                    return next;
                });
            }, 1000);
        } catch (err) {
            Alert.alert('Recording failed', err?.message || 'Could not start recording.');
            setPhase('idle');
        }
    };

    const handleStop = async () => {
        const uri = await stopRecording();
        if (uri) {
            setRecordedUri(uri);
            setPhase('preview');
        } else {
            setPhase('idle');
        }
    };

    const stopPlayback = async () => {
        if (soundRef.current) {
            try { await soundRef.current.unloadAsync(); } catch { /* ignore */ }
            soundRef.current = null;
        }
        setPlaying(false);
    };

    const togglePlayback = async () => {
        if (playing) {
            await stopPlayback();
            return;
        }
        if (!recordedUri) return;
        const { sound } = await Audio.Sound.createAsync({ uri: recordedUri });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
            if (s.didJustFinish) stopPlayback();
        });
        setPlaying(true);
        await sound.playAsync();
    };

    const handleSend = async () => {
        if (!recordedUri) return;
        setPhase('uploading');
        try {
            await onCaptured?.({ uri: recordedUri, type: 'audio/m4a' });
        } catch {
            setPhase('preview');
        }
    };

    const handleClose = async () => {
        await stopRecording();
        await stopPlayback();
        onClose?.();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={s.backdrop}>
                <View style={s.sheet}>
                    <View style={s.header}>
                        <Text style={s.title}>Record voice note</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={26} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <Text style={[s.timer, phase === 'recording' && { color: '#dc2626' }]}>
                        {fmt(seconds)} <Text style={s.timerCap}>/ {fmt(maxSeconds)}</Text>
                    </Text>

                    {phase === 'idle' && (
                        <TouchableOpacity style={s.bigBtn} onPress={startRecording}>
                            <Ionicons name="mic" size={26} color="white" />
                            <Text style={s.bigBtnText}>Start recording</Text>
                        </TouchableOpacity>
                    )}

                    {phase === 'recording' && (
                        <TouchableOpacity style={[s.bigBtn, { backgroundColor: '#dc2626' }]} onPress={handleStop}>
                            <Ionicons name="stop" size={26} color="white" />
                            <Text style={s.bigBtnText}>Stop</Text>
                        </TouchableOpacity>
                    )}

                    {phase === 'preview' && (
                        <View style={{ width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                                <TouchableOpacity style={s.smallBtn} onPress={togglePlayback}>
                                    <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#2563eb" />
                                    <Text style={s.smallBtnText}>{playing ? 'Stop' : 'Play'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.smallBtn} onPress={startRecording}>
                                    <Ionicons name="mic" size={18} color="#2563eb" />
                                    <Text style={s.smallBtnText}>Re-record</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={s.bigBtn} onPress={handleSend}>
                                <Ionicons name="send" size={20} color="white" />
                                <Text style={s.bigBtnText}>Process with AI</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {phase === 'uploading' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 }}>
                            <ActivityIndicator color="#2563eb" />
                            <Text style={{ color: '#374151' }}>Processing voice with AI…</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 24,
        alignItems: 'center'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },
    timer: { fontSize: 40, fontFamily: 'monospace', fontWeight: '700', marginVertical: 24, color: '#111827' },
    timerCap: { fontSize: 16, color: '#9ca3af' },
    bigBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 28,
        borderRadius: 999, justifyContent: 'center'
    },
    bigBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
    smallBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1,
        borderColor: '#2563eb', borderRadius: 20, backgroundColor: 'white'
    },
    smallBtnText: { color: '#2563eb', fontWeight: '600' }
});
