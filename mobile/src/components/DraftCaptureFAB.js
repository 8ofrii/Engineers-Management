import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { aiExtractApi } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';
import { useTheme } from '../context/ThemeContext';
import VoiceRecorderSheet from './VoiceRecorderSheet';

export default function DraftCaptureFAB({ projectId, projectName }) {
    const navigation = useNavigation();
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();

    const [open, setOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const isGlass = theme.id === 'glass-dark';
    const isLiquid = theme.id === 'liquid-glass';
    const isObsidian = theme.id === 'obsidian-emerald';

    const fabBg = isObsidian ? '#10b981' : (isGlass ? '#38bdf8' : (isLiquid ? '#0284c7' : (theme.isDark ? '#2563eb' : '#2563eb')));
    const fabTextColor = '#ffffff';

    const handleVoiceCaptured = async ({ uri }) => {
        setVoiceOpen(false);
        setOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractApi.voice({ uri, projectId, projectName });
            navigation.navigate('FinanceTab', {
                screen: 'DraftReview',
                params: { id: r.data.draft.id, projectId, projectName }
            });
        } catch (err) {
            Alert.alert(
                isArabic ? 'فشل التسجيل الصوتي' : 'Voice extraction failed',
                apiErrorMessage(err, isArabic ? 'يرجى المحاولة مرة أخرى أو فحص الاتصال.' : 'Try again or check your connection.')
            );
        } finally {
            setBusy(false);
        }
    };

    const handlePickPhoto = async () => {
        setOpen(false);
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert(
                    isArabic ? 'مطلوب إذن الكاميرا' : 'Permission needed',
                    isArabic ? 'يرجى تفعيل صلاحية الكاميرا من إعدادات الجهاز.' : 'Please enable camera access in your device settings.'
                );
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
                type: asset.mimeType || 'image/jpeg',
                projectId,
                projectName
            });
            navigation.navigate('FinanceTab', {
                screen: 'DraftReview',
                params: { id: apiRes.data.draft.id, projectId, projectName }
            });
        } catch (err) {
            Alert.alert(
                isArabic ? 'فشل تحليل الإيصال' : 'Receipt extraction failed',
                apiErrorMessage(err, isArabic ? 'يرجى المحاولة مرة أخرى أو فحص الاتصال.' : 'Try again or check your connection.')
            );
        } finally {
            setBusy(false);
        }
    };

    const handleOpenCopilot = () => {
        setOpen(false);
        navigation.navigate('AIChat', { projectId, projectName });
    };

    return (
        <>
            {/* Backdrop when expanded — tap-to-close */}
            {open && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                    style={styles.backdrop}
                />
            )}

            <View
                style={[
                    styles.fabStack,
                    isArabic ? { left: 20, alignItems: 'flex-start' } : { right: 20, alignItems: 'flex-end' }
                ]}
                pointerEvents="box-none"
            >
                {open && (
                    <View style={[styles.menuList, isArabic && { alignItems: 'flex-start' }]}>
                        {/* 1. Open AI Copilot Chat */}
                        <TouchableOpacity
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.borderStrong || theme.border,
                                    flexDirection: isArabic ? 'row-reverse' : 'row'
                                }
                            ]}
                            onPress={handleOpenCopilot}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.pillIconBox, { backgroundColor: theme.primaryLight }]}>
                                <Ionicons name="sparkles" size={16} color={fabBg} />
                            </View>
                            <View>
                                <Text style={[styles.pillTitle, { color: theme.text }]}>
                                    {isArabic ? 'محادثة المساعد الذكي' : 'AI Copilot Chat'}
                                </Text>
                                {projectName ? (
                                    <Text style={[styles.pillSub, { color: theme.subtext }]} numberOfLines={1}>
                                        {isArabic ? `سياق: ${projectName}` : `Context: ${projectName}`}
                                    </Text>
                                ) : null}
                            </View>
                        </TouchableOpacity>

                        {/* 2. Voice Note Expense Draft */}
                        <TouchableOpacity
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.borderStrong || theme.border,
                                    flexDirection: isArabic ? 'row-reverse' : 'row'
                                }
                            ]}
                            onPress={() => setVoiceOpen(true)}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.pillIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                <Ionicons name="mic" size={16} color="#ef4444" />
                            </View>
                            <Text style={[styles.pillTitle, { color: theme.text }]}>
                                {isArabic ? 'تسجيل صوتي ذكي' : 'Voice Expense'}
                            </Text>
                        </TouchableOpacity>

                        {/* 3. Receipt Photo Scan */}
                        <TouchableOpacity
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: theme.card,
                                    borderColor: theme.borderStrong || theme.border,
                                    flexDirection: isArabic ? 'row-reverse' : 'row'
                                }
                            ]}
                            onPress={handlePickPhoto}
                            disabled={busy}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.pillIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                <Ionicons name="camera" size={16} color="#10b981" />
                            </View>
                            <Text style={[styles.pillTitle, { color: theme.text }]}>
                                {isArabic ? 'مسح إيصال بالكاميرا' : 'Scan Receipt'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main AI Copilot FAB Button */}
                <TouchableOpacity
                    style={[
                        styles.fab,
                        {
                            backgroundColor: fabBg,
                            shadowColor: fabBg
                        }
                    ]}
                    onPress={() => setOpen(prev => !prev)}
                    disabled={busy}
                    activeOpacity={0.85}
                    accessibilityLabel="Hesaby AI Copilot"
                >
                    {busy ? (
                        <ActivityIndicator color={fabTextColor} size="small" />
                    ) : open ? (
                        <Ionicons name="close" size={26} color={fabTextColor} />
                    ) : (
                        <View style={styles.fabInner}>
                            <Ionicons name="sparkles" size={24} color={fabTextColor} />
                            <View style={styles.copilotBadge}>
                                <Text style={styles.copilotBadgeText}>AI</Text>
                            </View>
                        </View>
                    )}
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

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 998
    },
    fabStack: {
        position: 'absolute',
        bottom: 22,
        zIndex: 999
    },
    menuList: {
        marginBottom: 12,
        gap: 10
    },
    fab: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8
    },
    fabInner: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    copilotBadge: {
        position: 'absolute',
        top: -6,
        right: -8,
        backgroundColor: '#ffffff',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6
    },
    copilotBadgeText: {
        color: '#0f172a',
        fontSize: 8,
        fontWeight: '900'
    },
    pill: {
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5
    },
    pillIconBox: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    pillTitle: {
        fontSize: 13,
        fontWeight: '700'
    },
    pillSub: {
        fontSize: 10,
        marginTop: 1
    }
});
