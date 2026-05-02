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
import api, { projectsApi, workmenApi, dsrApi } from '../services/api';

const WEATHER_OPTIONS = [
    { value: 'SUNNY',  icon: '☀️', label: 'Sunny' },
    { value: 'CLOUDY', icon: '⛅', label: 'Cloudy' },
    { value: 'RAINY',  icon: '🌧️', label: 'Rainy' },
    { value: 'WINDY',  icon: '🌬️', label: 'Windy' },
    { value: 'DUSTY',  icon: '🌫️', label: 'Dusty' },
    { value: 'HOT',    icon: '🔥', label: 'Hot' },
    { value: 'COLD',   icon: '❄️', label: 'Cold' },
    { value: 'OTHER',  icon: '🌤️', label: 'Other' }
];

const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function DSRCreateScreen({ navigation, route }) {
    const { t } = useTranslation();
    const { user } = useAuth();
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
        if (!projectId) return 'Pick a project';
        if (!reportDate) return 'Pick a date';
        if (hoursWorked && (Number(hoursWorked) < 0 || Number(hoursWorked) > 24)) {
            return 'Hours must be between 0 and 24';
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
                alsoSubmit ? (t('dsr.submitted') || 'Submitted') : (t('dsr.savedDraft') || 'Saved'),
                alsoSubmit
                    ? (t('dsr.submittedMsg') || 'Sent for manager review.')
                    : (t('dsr.savedDraftMsg') || 'Saved as draft.'),
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< '}{t('common.back') || 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('dsr.newReport') || 'New Daily Report'}</Text>
                <View style={{ width: 60 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.form}>
                    {/* Project */}
                    <Text style={styles.label}>{t('dsr.project') || 'Project'} *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowProjectPicker(true)}>
                        <Text style={projectName ? styles.selectorText : styles.selectorPlaceholder}>
                            {projectName || (t('dsr.selectProject') || 'Pick a project')}
                        </Text>
                    </TouchableOpacity>

                    {/* Date */}
                    <Text style={styles.label}>{t('dsr.date') || 'Date'} *</Text>
                    <View style={styles.dateRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="YYYY-MM-DD"
                            value={reportDate}
                            onChangeText={setReportDate}
                        />
                        <TouchableOpacity
                            style={styles.todayBtn}
                            onPress={() => setReportDate(todayISO())}
                        >
                            <Text style={styles.todayBtnText}>{t('dsr.today') || 'Today'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weather */}
                    <Text style={styles.label}>{t('dsr.weather') || 'Weather'}</Text>
                    <View style={styles.weatherGrid}>
                        {WEATHER_OPTIONS.map(w => (
                            <TouchableOpacity
                                key={w.value}
                                style={[styles.weatherChip, weather === w.value && styles.weatherChipActive]}
                                onPress={() => setWeather(weather === w.value ? null : w.value)}
                            >
                                <Text style={styles.weatherIcon}>{w.icon}</Text>
                                <Text style={[styles.weatherLabel, weather === w.value && { color: '#fff' }]}>
                                    {w.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Temp + Hours row */}
                    <View style={styles.row2}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>{t('dsr.temperature') || 'Temp (°C)'}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="decimal-pad"
                                placeholder="32"
                                value={temperatureC}
                                onChangeText={setTemperatureC}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('dsr.hours') || 'Hours worked'}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="decimal-pad"
                                placeholder="8"
                                value={hoursWorked}
                                onChangeText={setHoursWorked}
                            />
                        </View>
                    </View>

                    {/* Progress notes */}
                    <Text style={styles.label}>{t('dsr.progress') || 'Progress notes'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        placeholder={t('dsr.progressPlaceholder') || 'What was done today…'}
                        value={progressNotes}
                        onChangeText={setProgressNotes}
                    />

                    {/* Issues */}
                    <Text style={styles.label}>{t('dsr.issues') || 'Issues'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        placeholder={t('dsr.issuesPlaceholder') || 'Anything blocking progress, defects, safety concerns…'}
                        value={issues}
                        onChangeText={setIssues}
                    />

                    {/* Visitors */}
                    <Text style={styles.label}>{t('dsr.visitors') || 'Visitors'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('dsr.visitorsPlaceholder') || 'Inspectors, client visits, etc.'}
                        value={visitorsNotes}
                        onChangeText={setVisitorsNotes}
                    />

                    {/* Attendance */}
                    <Text style={styles.label}>
                        {t('dsr.attendance') || 'Workmen attendance'}{' '}
                        ({attendance.length})
                    </Text>
                    <TouchableOpacity
                        style={styles.selector}
                        onPress={() => setShowAttendancePicker(true)}
                    >
                        <Text style={styles.selectorText}>
                            {attendance.length > 0
                                ? `${attendance.length} ${t('dsr.selected') || 'selected'} →`
                                : (t('dsr.tapToAdd') || 'Tap to add workmen')}
                        </Text>
                    </TouchableOpacity>
                    {attendance.length > 0 && (
                        <View style={styles.attendanceList}>
                            {attendance.map(a => (
                                <View key={a.workmanId} style={styles.attendanceRow}>
                                    <Text style={styles.attendanceName} numberOfLines={1}>
                                        {a.name}
                                    </Text>
                                    <TextInput
                                        style={styles.hoursInput}
                                        keyboardType="decimal-pad"
                                        value={String(a.hoursPresent || '')}
                                        onChangeText={(h) => updateAttendanceHours(a.workmanId, h)}
                                    />
                                    <Text style={styles.hoursSuffix}>h</Text>
                                    <TouchableOpacity onPress={() => removeAttendance(a.workmanId)}>
                                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Photos */}
                    <Text style={styles.label}>
                        {t('dsr.photos') || 'Photos'} ({photos.length})
                    </Text>
                    <View style={styles.photoActions}>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={18} color="#2563eb" />
                            <Text style={styles.photoActionText}>{t('dsr.takePhoto') || 'Take photo'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={pickPhotos}>
                            <Ionicons name="image-outline" size={18} color="#2563eb" />
                            <Text style={styles.photoActionText}>{t('dsr.pickPhoto') || 'From library'}</Text>
                        </TouchableOpacity>
                    </View>
                    {photos.length > 0 && (
                        <ScrollView horizontal style={styles.photoStrip}>
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
                            style={[styles.saveBtn, submitting && { opacity: 0.5 }]}
                            onPress={() => onSave(false)}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#374151" /> : (
                                <Text style={styles.saveBtnText}>{t('dsr.saveDraft') || 'Save draft'}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={() => onSave(true)}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.submitBtnText}>{t('dsr.saveAndSubmit') || 'Save & submit'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Project picker */}
            <Modal visible={showProjectPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('dsr.selectProject') || 'Pick a project'}</Text>
                            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                                <Ionicons name="close" size={22} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {projects.length === 0 ? (
                                <Text style={styles.emptyModal}>{t('common.empty') || 'No projects'}</Text>
                            ) : projects.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setProjectId(p.id);
                                        setProjectName(p.name);
                                        setShowProjectPicker(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{p.name}</Text>
                                    <Text style={styles.modalItemMeta}>
                                        {p.client?.name || ''} · {p.status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Attendance picker */}
            <Modal visible={showAttendancePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {t('dsr.selectWorkmen') || 'Pick workmen present today'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAttendancePicker(false)}>
                                <Text style={{ color: '#2563eb', fontWeight: '600' }}>
                                    {t('common.done') || 'Done'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {workmen.length === 0 ? (
                                <Text style={styles.emptyModal}>{t('common.empty') || 'No active workmen'}</Text>
                            ) : workmen.map(w => {
                                const isSelected = attendance.some(a => a.workmanId === w.id);
                                return (
                                    <TouchableOpacity
                                        key={w.id}
                                        style={[styles.modalItem, isSelected && { backgroundColor: '#eff6ff' }]}
                                        onPress={() => toggleAttendance(w)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalItemText}>{w.nameAr || w.name}</Text>
                                            <Text style={styles.modalItemMeta}>{w.trade}</Text>
                                        </View>
                                        {isSelected ? (
                                            <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                                        ) : (
                                            <Ionicons name="ellipse-outline" size={22} color="#9ca3af" />
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
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, paddingTop: 50, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    back: { color: '#2563eb', fontSize: 14, fontWeight: '600', width: 60 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },

    form: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },

    selector: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb'
    },
    selectorText: { fontSize: 14, color: '#111827' },
    selectorPlaceholder: { fontSize: 14, color: '#9ca3af' },

    input: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    todayBtn: {
        backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 12,
        borderRadius: 10, justifyContent: 'center'
    },
    todayBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    weatherChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb'
    },
    weatherChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    weatherIcon: { fontSize: 16 },
    weatherLabel: { fontSize: 12, color: '#374151' },

    row2: { flexDirection: 'row' },

    attendanceList: { marginTop: 8 },
    attendanceRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', padding: 10, borderRadius: 8,
        borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6, gap: 8
    },
    attendanceName: { flex: 1, fontSize: 13, color: '#111827' },
    hoursInput: {
        width: 50, fontSize: 13, padding: 6,
        backgroundColor: '#f9fafb', borderRadius: 6, textAlign: 'center'
    },
    hoursSuffix: { fontSize: 12, color: '#6b7280' },

    photoActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    photoActionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 8,
        backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe'
    },
    photoActionText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
    photoStrip: { marginTop: 4 },
    photoThumb: {
        width: 80, height: 80, marginRight: 8, borderRadius: 8, overflow: 'hidden',
        position: 'relative'
    },
    photoImg: { width: '100%', height: '100%' },
    photoDelete: {
        position: 'absolute', top: 4, right: 4,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center'
    },

    buttonRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
    saveBtn: {
        flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db'
    },
    saveBtnText: { color: '#374151', fontWeight: '600' },
    submitBtn: {
        flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
        backgroundColor: '#2563eb'
    },
    submitBtnText: { color: '#fff', fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff', maxHeight: '75%',
        borderTopLeftRadius: 16, borderTopRightRadius: 16
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
    modalItem: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
    },
    modalItemText: { fontSize: 14, color: '#111827', fontWeight: '500' },
    modalItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    emptyModal: { textAlign: 'center', color: '#9ca3af', padding: 40 }
});
