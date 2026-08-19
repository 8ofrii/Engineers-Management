import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Modal, SafeAreaView, Alert, ActivityIndicator, Image,
    KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { projectsApi, workmenApi, dsrApi } from '../services/api';

const WEATHER_OPTIONS = [
    { value: 'SUNNY',  icon: '☀️', label: 'Sunny', labelAr: 'مشمس' },
    { value: 'CLOUDY', icon: '⛅', label: 'Cloudy', labelAr: 'غائم' },
    { value: 'RAINY',  icon: '🌧️', label: 'Rainy', labelAr: 'ممطر' },
    { value: 'WINDY',  icon: '🌬️', label: 'Windy', labelAr: 'عاصف' },
    { value: 'DUSTY',  icon: '🌫️', label: 'Dusty', labelAr: 'مغبر' },
    { value: 'HOT',    icon: '🔥', label: 'Hot', labelAr: 'حار' },
    { value: 'COLD',   icon: '❄️', label: 'Cold', labelAr: 'بارد' },
    { value: 'OTHER',  icon: '🌤️', label: 'Other', labelAr: 'أخرى' }
];

const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function DSRCreateScreen({ navigation, route }) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { theme } = useTheme();
    const presetProjectId = route?.params?.projectId;
    const presetProjectName = route?.params?.projectName;

    const [projects, setProjects] = useState([]);
    const [workmen, setWorkmen] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [projectId, setProjectId] = useState(presetProjectId || null);
    const [projectName, setProjectName] = useState(presetProjectName || '');
    const [reportDate, setReportDate] = useState(todayISO());
    const [weather, setWeather] = useState(null);
    const [temperatureC, setTemperatureC] = useState('');
    const [hoursWorked, setHoursWorked] = useState('');
    const [progressNotes, setProgressNotes] = useState('');
    const [issues, setIssues] = useState('');
    const [visitorsNotes, setVisitorsNotes] = useState('');
    const [attendance, setAttendance] = useState([]);  // [{ workmanId, hoursPresent, role, name }]
    const [photos, setPhotos] = useState([]);          // [{ uri, name, uploadedId? }]

    // Modal state
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [showAttendancePicker, setShowAttendancePicker] = useState(false);

    useEffect(() => {
        projectsApi.list().then(r => setProjects(r.data?.data || [])).catch(() => setProjects([]));
        workmenApi.list().then(r => setWorkmen((r.data?.data || []).filter(w => w.isActive))).catch(() => setWorkmen([]));
    }, []);

    const toggleAttendance = (workman) => {
        const existing = attendance.find(a => a.workmanId === workman.id);
        if (existing) {
            setAttendance(attendance.filter(a => a.workmanId !== workman.id));
        } else {
            setAttendance([...attendance, {
                workmanId: workman.id,
                name: workman.nameAr || workman.name,
                role: workman.trade,
                hoursPresent: 8
            }]);
        }
    };

    const updateAttendanceHours = (workmanId, hours) => {
        setAttendance(attendance.map(a =>
            a.workmanId === workmanId ? { ...a, hoursPresent: Number(hours) || 0 } : a
        ));
    };

    const removeAttendance = (workmanId) => {
        setAttendance(attendance.filter(a => a.workmanId !== workmanId));
    };

    const pickPhotos = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    t('dsr.photoPermDenied') || 'Permission needed',
                    t('dsr.photoPermDeniedMsg') || 'Allow photo library access in your phone settings to add photos.'
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 10 - photos.length,
                quality: 0.8
            });
            if (result.canceled) return;
            const newPhotos = (result.assets || []).map(a => ({
                uri: a.uri,
                name: a.fileName || `photo-${Date.now()}.jpg`,
                type: a.mimeType || 'image/jpeg'
            }));
            setPhotos([...photos, ...newPhotos]);
        } catch (err) {
            Alert.alert(t('common.error') || 'Error', err.message);
        }
    };

    const takePhoto = async () => {
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    t('dsr.cameraPermDenied') || 'Camera permission needed',
                    t('dsr.cameraPermDeniedMsg') || 'Allow camera access in your phone settings to capture photos.'
                );
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                exif: true
            });
            if (result.canceled) return;
            const a = result.assets?.[0];
            if (!a) return;
            setPhotos([...photos, {
                uri: a.uri,
                name: a.fileName || `capture-${Date.now()}.jpg`,
                type: a.mimeType || 'image/jpeg',
                exif: a.exif
            }]);
        } catch (err) {
            Alert.alert(t('common.error') || 'Error', err.message);
        }
    };

    const removePhoto = (idx) => {
        setPhotos(photos.filter((_, i) => i !== idx));
    };

    const validate = () => {
        if (!projectId) return isArabic ? 'يرجى اختيار المشروع' : 'Pick a project';
        if (!reportDate) return isArabic ? 'يرجى اختيار التاريخ' : 'Pick a date';
        if (hoursWorked && (Number(hoursWorked) < 0 || Number(hoursWorked) > 24)) {
            return isArabic ? 'ساعات العمل يجب أن تكون بين 0 و 24' : 'Hours must be between 0 and 24';
        }
        return null;
    };

    // Upload one photo to /api/project-documents/:projectId, returns the document id.
    const uploadPhoto = async (photo) => {
        const fd = new FormData();
        fd.append('file', {
            uri: photo.uri,
            name: photo.name,
            type: photo.type
        });
        fd.append('name', photo.name);
        fd.append('category', 'PHOTO_PROGRESS');
        const r = await api.post(`/project-documents/${projectId}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return r.data?.data?.id;
    };

    const onSave = async (alsoSubmit = false) => {
        const err = validate();
        if (err) { Alert.alert(t('common.error') || 'Error', err); return; }

        setSubmitting(true);
        try {
            // 1) Upload photos first; collect document IDs.
            const photoIds = [];
            for (const p of photos) {
                if (p.uploadedId) {
                    photoIds.push(p.uploadedId);
                    continue;
                }
                try {
                    const id = await uploadPhoto(p);
                    if (id) photoIds.push(id);
                } catch (uploadErr) {
                    console.warn('Photo upload failed', uploadErr.message);
                }
            }

            // 2) Create the DSR
            const payload = {
                projectId,
                reportDate,
                weather,
                temperatureC: temperatureC ? Number(temperatureC) : null,
                hoursWorked: hoursWorked ? Number(hoursWorked) : null,
                progressNotes: progressNotes || null,
                issues: issues || null,
                visitorsNotes: visitorsNotes || null,
                workmenAttendance: attendance.length > 0
                    ? attendance.map(a => ({ workmanId: a.workmanId, hoursPresent: a.hoursPresent, role: a.role }))
                    : null,
                photoIds: photoIds.length ? photoIds : []
            };
            const created = await dsrApi.create(payload);
            const newId = created.data?.data?.id;

            // 3) Optionally submit
            if (alsoSubmit && newId) {
                await dsrApi.submit(newId);
            }

            Alert.alert(
                alsoSubmit ? (isArabic ? 'تم الإرسال' : 'Submitted') : (isArabic ? 'تم الحفظ' : 'Saved'),
                alsoSubmit
                    ? (isArabic ? 'تم إرسال التقرير لمدير المشروع للمراجعة والاعتماد.' : 'Sent for manager review.')
                    : (isArabic ? 'تم حفظ التقرير كمسودة.' : 'Saved as draft.'),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (errObj) {
            const msg = errObj.response?.data?.message
                || errObj.response?.data?.errors?.map(e => e.message).join(', ')
                || errObj.message;
            Alert.alert(t('common.error') || 'Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'تقرير يومي جديد' : 'New Daily Report'}</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                    {/* Project */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'المشروع' : 'Project'} *</Text>
                    <TouchableOpacity
                        style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.borderStrong, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                        onPress={() => setShowProjectPicker(true)}
                    >
                        <Text style={[styles.selectorText, { color: projectName ? theme.text : theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                            {projectName || (isArabic ? 'اختر المشروع...' : 'Pick a project')}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.subtext} />
                    </TouchableOpacity>

                    {/* Date */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'التاريخ' : 'Date'} *</Text>
                    <View style={[styles.dateRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={theme.subtext}
                            value={reportDate}
                            onChangeText={setReportDate}
                        />
                        <TouchableOpacity
                            style={[styles.todayBtn, { backgroundColor: theme.primary }]}
                            onPress={() => setReportDate(todayISO())}
                        >
                            <Text style={[styles.todayBtnText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>{isArabic ? 'اليوم' : 'Today'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weather */}
                    <Text style={[styles.label, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>{isArabic ? 'حالة الطقس' : 'Weather'}</Text>
                    <View style={[styles.weatherGrid, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                        {WEATHER_OPTIONS.map(w => {
                            const active = weather === w.value;
                            return (
                                <TouchableOpacity
                                    key={w.value}
                                    style={[
                                        styles.weatherChip,
                                        {
                                            backgroundColor: active ? theme.primary : theme.card,
                                            borderColor: active ? theme.primary : theme.borderStrong
                                        }
                                    ]}
                                    onPress={() => setWeather(weather === w.value ? null : w.value)}
                                >
                                    <Text style={styles.weatherIcon}>{w.icon}</Text>
                                    <Text style={[styles.weatherLabel, { color: active ? (theme.isDark ? '#000000' : '#ffffff') : theme.text, fontWeight: active ? '700' : '500' }]}>
                                        {isArabic ? w.labelAr : w.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Temp + Hours row */}
                    <View style={styles.row2}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.label, { color: theme.subtext }]}>{isArabic ? 'الحرارة (°C)' : 'Temp (°C)'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                                keyboardType="decimal-pad"
                                placeholder="32"
                                placeholderTextColor={theme.subtext}
                                value={temperatureC}
                                onChangeText={setTemperatureC}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: theme.subtext }]}>{isArabic ? 'ساعات العمل' : 'Hours worked'}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                                keyboardType="decimal-pad"
                                placeholder="8"
                                placeholderTextColor={theme.subtext}
                                value={hoursWorked}
                                onChangeText={setHoursWorked}
                            />
                        </View>
                    </View>

                    {/* Progress notes */}
                    <Text style={[styles.label, { color: theme.subtext }]}>{isArabic ? 'الأعمال المنجزة اليوم' : 'Progress notes'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                        multiline
                        placeholder={isArabic ? 'ما تم إنجازه في الموقع اليوم...' : 'What was done today…'}
                        placeholderTextColor={theme.subtext}
                        value={progressNotes}
                        onChangeText={setProgressNotes}
                    />

                    {/* Issues */}
                    <Text style={[styles.label, { color: theme.subtext }]}>{isArabic ? 'المعوقات والمشاكل' : 'Issues / Safety'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
                        multiline
                        placeholder={isArabic ? 'معوقات العمل أو ملاحظات السلامة...' : 'Anything blocking progress, defects, safety concerns…'}
                        placeholderTextColor={theme.subtext}
                        value={issues}
                        onChangeText={setIssues}
                    />

                    {/* Attendance */}
                    <Text style={[styles.label, { color: theme.subtext }]}>
                        {isArabic ? 'حضور العمال والصنايعية' : 'Workmen attendance'}{' '}
                        ({attendance.length})
                    </Text>
                    <TouchableOpacity
                        style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}
                        onPress={() => setShowAttendancePicker(true)}
                    >
                        <Text style={[styles.selectorText, { color: attendance.length > 0 ? theme.primary : theme.subtext }]}>
                            {attendance.length > 0
                                ? `${attendance.length} ${isArabic ? 'عمال محددين' : 'selected'} →`
                                : (isArabic ? 'اضغط لتحديد العمال الحاضرين' : 'Tap to add workmen')}
                        </Text>
                        <Ionicons name="people-outline" size={18} color={theme.subtext} />
                    </TouchableOpacity>
                    {attendance.length > 0 && (
                        <View style={styles.attendanceList}>
                            {attendance.map(a => (
                                <View key={a.workmanId} style={[styles.attendanceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <Text style={[styles.attendanceName, { color: theme.text }]} numberOfLines={1}>
                                        {a.name}
                                    </Text>
                                    <TextInput
                                        style={[styles.hoursInput, { backgroundColor: theme.cardAlt, color: theme.text }]}
                                        keyboardType="decimal-pad"
                                        value={String(a.hoursPresent || '')}
                                        onChangeText={(h) => updateAttendanceHours(a.workmanId, h)}
                                    />
                                    <Text style={[styles.hoursSuffix, { color: theme.subtext }]}>h</Text>
                                    <TouchableOpacity onPress={() => removeAttendance(a.workmanId)}>
                                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Photos */}
                    <Text style={[styles.label, { color: theme.subtext }]}>
                        {isArabic ? 'صور الموقع' : 'Photos'} ({photos.length})
                    </Text>
                    <View style={styles.photoActions}>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                            onPress={takePhoto}
                        >
                            <Ionicons name="camera" size={18} color={theme.primary} />
                            <Text style={[styles.photoActionText, { color: theme.primary }]}>{isArabic ? 'التقاط بالكاميرا' : 'Take photo'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}
                            onPress={pickPhotos}
                        >
                            <Ionicons name="image-outline" size={18} color={theme.text} />
                            <Text style={[styles.photoActionText, { color: theme.text }]}>{isArabic ? 'من المعرض' : 'From library'}</Text>
                        </TouchableOpacity>
                    </View>
                    {photos.length > 0 && (
                        <ScrollView horizontal style={styles.photoStrip} showsHorizontalScrollIndicator={false}>
                            {photos.map((p, i) => (
                                <View key={i} style={styles.photoThumb}>
                                    <Image source={{ uri: p.uri }} style={styles.photoImg} />
                                    <TouchableOpacity
                                        style={styles.photoDelete}
                                        onPress={() => removePhoto(i)}
                                    >
                                        <Ionicons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* Submit buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: theme.card, borderColor: theme.borderStrong }, submitting && { opacity: 0.5 }]}
                            onPress={() => onSave(false)}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color={theme.text} /> : (
                                <Text style={[styles.saveBtnText, { color: theme.text }]}>{isArabic ? 'حفظ كمسودة' : 'Save draft'}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.5 }]}
                            onPress={() => onSave(true)}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.submitBtnText}>{isArabic ? 'حفظ وإرسال للاعتماد' : 'Save & submit'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Project picker modal */}
            <Modal visible={showProjectPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{isArabic ? 'اختر المشروع' : 'Pick a project'}</Text>
                            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                                <Ionicons name="close" size={22} color={theme.subtext} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {projects.length === 0 ? (
                                <Text style={[styles.emptyModal, { color: theme.subtext }]}>{isArabic ? 'لا توجد مشاريع' : 'No projects'}</Text>
                            ) : projects.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                    onPress={() => {
                                        setProjectId(p.id);
                                        setProjectName(p.name);
                                        setShowProjectPicker(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>{p.name}</Text>
                                    <Text style={[styles.modalItemMeta, { color: theme.subtext }]}>
                                        {p.client?.name || ''} · {p.status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Attendance picker modal */}
            <Modal visible={showAttendancePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {isArabic ? 'تحديد العمال الحاضرين' : 'Pick workmen present today'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAttendancePicker(false)}>
                                <Text style={{ color: theme.primary, fontWeight: '700' }}>
                                    {isArabic ? 'تم' : 'Done'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {workmen.length === 0 ? (
                                <Text style={[styles.emptyModal, { color: theme.subtext }]}>{isArabic ? 'لا يوجد عمال مسجلين' : 'No active workmen'}</Text>
                            ) : workmen.map(w => {
                                const isSelected = attendance.some(a => a.workmanId === w.id);
                                return (
                                    <TouchableOpacity
                                        key={w.id}
                                        style={[styles.modalItem, { borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.primaryLight }]}
                                        onPress={() => toggleAttendance(w)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.modalItemText, { color: theme.text }]}>{w.nameAr || w.name}</Text>
                                            <Text style={[styles.modalItemMeta, { color: theme.subtext }]}>{w.trade}</Text>
                                        </View>
                                        {isSelected ? (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                                        ) : (
                                            <Ionicons name="ellipse-outline" size={22} color={theme.subtext} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 14,
        gap: 12
    },
    backBtn: { padding: 6 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    form: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 6 },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1
    },
    selectorText: { fontSize: 14, fontWeight: '600' },
    input: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    todayBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        justifyContent: 'center'
    },
    todayBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    weatherChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1
    },
    weatherIcon: { fontSize: 16 },
    weatherLabel: { fontSize: 12 },
    row2: { flexDirection: 'row' },
    attendanceList: { marginTop: 8 },
    attendanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 6,
        gap: 8
    },
    attendanceName: { flex: 1, fontSize: 13, fontWeight: '600' },
    hoursInput: {
        width: 50,
        fontSize: 13,
        padding: 6,
        borderRadius: 6,
        textAlign: 'center',
        fontWeight: '700'
    },
    hoursSuffix: { fontSize: 12, fontWeight: '600' },
    photoActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    photoActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1
    },
    photoActionText: { fontSize: 13, fontWeight: '700' },
    photoStrip: { marginTop: 4 },
    photoThumb: {
        width: 80,
        height: 80,
        marginRight: 8,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative'
    },
    photoImg: { width: '100%', height: '100%' },
    photoDelete: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
    saveBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1
    },
    saveBtnText: { fontWeight: '700' },
    submitBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitBtnText: { color: '#fff', fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: {
        maxHeight: '75%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1
    },
    modalTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1
    },
    modalItemText: { fontSize: 14, fontWeight: '600' },
    modalItemMeta: { fontSize: 12, marginTop: 2 },
    emptyModal: { textAlign: 'center', padding: 40 }
});
