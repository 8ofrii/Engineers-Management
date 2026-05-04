// Mobile FAB for AI draft capture. Same intent as the web FAB — drop it on
// the engineer-facing screens (Dashboard, Finance) so they can capture from
// anywhere without first navigating to the Drafts queue.
//
// Tap → expands to two buttons: Voice and Camera. Camera uses
// expo-image-picker (already installed). Voice uses the shared
// VoiceRecorderSheet (which needs expo-av — install once with
// `npx expo install expo-av`).

import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { aiExtractApi } from '../services/api';
import VoiceRecorderSheet from './VoiceRecorderSheet';

export default function DraftCaptureFAB() {
    const navigation = useNavigation();
    const [open, setOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleVoiceCaptured = async ({ uri }) => {
        setVoiceOpen(false);
        setOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractApi.voice({ uri });
            navigation.navigate('FinanceTab', {
                screen: 'DraftReview',
                params: { id: r.data.draft.id }
            });
        } catch (err) {
            Alert.alert('Voice extraction failed', err.response?.data?.message || String(err?.message || err));
        } finally {
            setBusy(false);
        }
    };

    const handlePickPhoto = async () => {
        setOpen(false);
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Permission needed', 'Please enable camera access in your device settings.');
                return;
            }
            const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8
            });
            if (res.canceled || !res.assets?.length) return;
            const asset = res.assets[0];
            setBusy(true);
            const apiRes = await aiExtractApi.receipt({
                uri: asset.uri,
                name: asset.fileName || 'receipt.jpg',
                type: asset.mimeType || 'image/jpeg'
            });
            navigation.navigate('FinanceTab', {
                screen: 'DraftReview',
                params: { id: apiRes.data.draft.id }
            });
        } catch (err) {
            Alert.alert('Receipt extraction failed', err.response?.data?.message || String(err?.message || err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {/* Backdrop when expanded — tap-to-close */}
            {open && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                    style={s.backdrop}
                />
            )}

            <View style={s.fabStack} pointerEvents="box-none">
                {open && (
                    <>
                        <TouchableOpacity style={s.pill} onPress={() => setVoiceOpen(true)} disabled={busy}>
                            <Ionicons name="mic" size={18} color="#2563eb" />
                            <Text style={s.pillText}>Voice</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.pill} onPress={handlePickPhoto} disabled={busy}>
                            <Ionicons name="camera" size={18} color="#2563eb" />
                            <Text style={s.pillText}>Receipt</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={[s.fab, open && { transform: [{ rotate: '45deg' }] }]}
                    onPress={() => setOpen(prev => !prev)}
                    disabled={busy}
                    accessibilityLabel="Capture AI draft"
                >
                    {busy
                        ? <ActivityIndicator color="white" size="small" />
                        : <Ionicons name={open ? 'close' : 'add'} size={28} color="white" />}
                </TouchableOpacity>
            </View>

            <VoiceRecorderSheet
                visible={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                onCaptured={handleVoiceCaptured}
                maxSeconds={60}
            />
        </>
    );
}

const s = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        zIndex: 998
    },
    fabStack: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        alignItems: 'flex-end',
        gap: 10,
        zIndex: 999
    },
    fab: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#2563eb',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
    },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'white',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1, borderColor: '#e5e7eb',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6, elevation: 3
    },
    pillText: { color: '#2563eb', fontWeight: '700' }
});
