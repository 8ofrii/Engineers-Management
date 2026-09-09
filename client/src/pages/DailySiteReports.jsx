import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Filter, CheckCircle, Send, FileText, X, Sun, Cloud, CloudRain, Wind, Thermometer, ArrowRight, Plus, Mic, Square, Sparkles, Loader2, Play, RotateCcw } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { dsrAPI, projectsAPI } from '../services/api';

const STATUS_COLORS = {
    DRAFT:        { bg: '#f3f4f6', fg: '#374151', label: 'Draft' },
    SUBMITTED:    { bg: '#fef3c7', fg: '#92400e', label: 'Submitted' },
    ACKNOWLEDGED: { bg: '#d1fae5', fg: '#065f46', label: 'Acknowledged' }
};

const WEATHER_ICONS = {
    SUNNY:  <Sun size={14} />,
    CLOUDY: <Cloud size={14} />,
    RAINY:  <CloudRain size={14} />,
    WINDY:  <Wind size={14} />,
    DUSTY:  <Wind size={14} />,
    HOT:    <Thermometer size={14} />,
    COLD:   <Thermometer size={14} />,
    OTHER:  null
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';
const fmtDateTime = (s) => s ? new Date(s).toLocaleString('en-GB') : '-';
const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function DailySiteReports() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const STATUS_LABELS = {
        DRAFT:        t('dsr.statusDraft', 'Draft'),
        SUBMITTED:    t('dsr.statusSubmitted', 'Submitted (pending review)'),
        ACKNOWLEDGED: t('dsr.statusAcknowledged', 'Acknowledged')
    };

    const [projects, setProjects] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ projectId: '', status: '' });
    const [detail, setDetail] = useState(null);   // Selected DSR for review modal
    const [ackNotes, setAckNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Create DSR Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        projectId: '',
        reportDate: new Date().toISOString().slice(0, 10),
        weather: 'SUNNY',
        temperatureC: '',
        hoursWorked: '8',
        progressNotes: '',
        issues: '',
        visitorsNotes: ''
    });

    // Voice DSR Modal State
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [voicePhase, setVoicePhase] = useState('idle'); // idle | recording | preview | extracting
    const [voiceSeconds, setVoiceSeconds] = useState(0);
    const [voiceBlob, setVoiceBlob] = useState(null);
    const [voiceAudioUrl, setVoiceAudioUrl] = useState(null);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [voiceError, setVoiceError] = useState(null);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);

    const canAcknowledge = ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);

    // Clean up audio URL on unmount or reset
    useEffect(() => () => { if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl); }, [voiceAudioUrl]);

    const stopVoiceRecording = () => {
        if (recorderRef.current && voicePhase === 'recording') {
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

    const startVoiceRecording = async () => {
        setVoiceError(null);
        setVoiceTranscript('');
        setVoiceSeconds(0);
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
                setVoiceBlob(b);
                setVoiceAudioUrl(URL.createObjectURL(b));
                setVoicePhase('preview');
            };

            recorder.start();
            setVoicePhase('recording');

            // Timer
            timerRef.current = setInterval(() => {
                setVoiceSeconds(s => {
                    if (s >= 120) { // Max 2 minutes
                        stopVoiceRecording();
                        return 120;
                    }
                    return s + 1;
                });
            }, 1000);

            // Live Web Speech Recognition (Egyptian Arabic / English)
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    const rec = new SpeechRec();
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.lang = isArabic ? 'ar-EG' : 'en-US';
                    rec.onresult = (e) => {
                        let text = '';
                        for (let i = 0; i < e.results.length; i++) {
                            text += e.results[i][0].transcript + ' ';
                        }
                        if (text.trim()) {
                            setVoiceTranscript(text.trim());
                        }
                    };
                    rec.start();
                    recognitionRef.current = rec;
                } catch (recErr) {
                    console.warn('SpeechRecognition failed to start:', recErr);
                }
            }
        } catch (err) {
            setVoiceError(isArabic ? 'تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن.' : 'Microphone access denied. Please grant microphone permission.');
            setVoicePhase('idle');
        }
    };

    const handleExtractVoiceDsr = async () => {
        setVoicePhase('extracting');
        setVoiceError(null);
        try {
            const uploadData = new FormData();
            if (voiceBlob) {
                uploadData.append('audio', voiceBlob, 'voice-dsr.webm');
            }
            if (voiceTranscript) {
                uploadData.append('transcript', voiceTranscript);
            }

            const res = await dsrAPI.extractVoice(uploadData);
            const extracted = res.data?.data || {};

            setFormData(prev => ({
                ...prev,
                projectId: extracted.projectId || prev.projectId || (projects[0]?.id || ''),
                reportDate: extracted.reportDate || prev.reportDate,
                weather: extracted.weather || prev.weather || 'SUNNY',
                temperatureC: extracted.temperatureC != null ? String(extracted.temperatureC) : prev.temperatureC,
                hoursWorked: extracted.hoursWorked != null ? String(extracted.hoursWorked) : (prev.hoursWorked || '8'),
                progressNotes: extracted.progressNotes || voiceTranscript || prev.progressNotes,
                issues: extracted.issues || prev.issues || '',
                visitorsNotes: extracted.visitorsNotes || prev.visitorsNotes || ''
            }));

            setIsVoiceOpen(false);
            setIsCreateOpen(true);
            showAlert({
                type: 'success',
                title: isArabic ? 'تم استخراج التقرير بنجاح' : 'Extracted Successfully',
                message: isArabic ? 'تمت تعبئة بيانات الموقع من التسجيل الصوتي بالذكاء الاصطناعي. يمكنك مراجعتها وحفظها الآن.' : 'Daily report fields have been parsed from voice with AI. Review and save below.'
            });
        } catch (err) {
            setVoiceError(err.response?.data?.message || err.message || (isArabic ? 'فشل استخراج التقرير' : 'Extraction failed'));
            setVoicePhase('preview');
        }
    };

    const closeVoiceModal = () => {
        stopVoiceRecording();
        setIsVoiceOpen(false);
        setVoicePhase('idle');
        setVoiceBlob(null);
        setVoiceTranscript('');
        setVoiceSeconds(0);
        setVoiceError(null);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.projectId) params.projectId = filters.projectId;
            if (filters.status) params.status = filters.status;
            const r = await dsrAPI.list(params);
            setReports(r.data?.data || []);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to load DSRs' });
        } finally {
            setLoading(false);
        }
    }, [filters, showAlert, t]);

    useEffect(() => {
        projectsAPI.getAll?.().then(r => setProjects(r.data?.data || [])).catch(() => {});
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreateReport = async (e) => {
        e.preventDefault();
        if (!formData.projectId) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: isArabic ? 'برجاء اختيار المشروع' : 'Please pick a project' });
            return;
        }
        if (!formData.progressNotes?.trim()) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: isArabic ? 'برجاء كتابة ملخص الأعمال المنجزة' : 'Please write work progress notes' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                temperatureC: formData.temperatureC ? parseFloat(formData.temperatureC) : null,
                hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : 8
            };
            await dsrAPI.create(payload);
            showAlert({ type: 'success', title: isArabic ? 'تم الإنشاء' : 'Created', message: isArabic ? 'تم حفظ التقرير اليومي بنجاح.' : 'Daily Site Report created successfully.' });
            setIsCreateOpen(false);
            setFormData({
                projectId: '',
                reportDate: new Date().toISOString().slice(0, 10),
                weather: 'SUNNY',
                temperatureC: '',
                hoursWorked: '8',
                progressNotes: '',
                issues: '',
                visitorsNotes: ''
            });
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        } finally {
            setSubmitting(false);
        }
    };

    const openDetail = async (id) => {
        try {
            const r = await dsrAPI.get(id);
            setDetail(r.data?.data || null);
            setAckNotes('');
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to load DSR' });
        }
    };

    const acknowledge = async () => {
        if (!detail) return;
        setSubmitting(true);
        try {
            await dsrAPI.acknowledge(detail.id, ackNotes);
            showAlert({ type: 'success', title: isArabic ? 'تم الاعتماد' : 'Acknowledged', message: isArabic ? 'تم إشعار المهندس بالاعتماد.' : 'Engineer has been notified.' });
            setDetail(null);
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        } finally {
            setSubmitting(false);
        }
    };

    const submit = async (id) => {
        setSubmitting(true);
        try {
            await dsrAPI.submit(id);
            showAlert({ type: 'success', title: isArabic ? 'تم الإرسال' : 'Submitted', message: isArabic ? 'تم إرسال التقرير للاعتماد.' : 'Report sent for review.' });
            if (detail?.id === id) {
                const refreshed = await dsrAPI.get(id);
                setDetail(refreshed.data?.data);
            }
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="flex gap-md"><ClipboardList size={32} /> {t('dsr.title', 'Daily Site Reports')}</h1>
                    <p className="text-secondary">{t('dsr.subtitle', "Engineer's daily log of progress, attendance, weather, and issues — submitted to managers for review.")}</p>
                </div>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        onClick={() => { closeVoiceModal(); setIsVoiceOpen(true); }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <Mic size={16} /> {isArabic ? 'تقرير صوتي بالذكاء الاصطناعي' : 'Voice AI Report'}
                    </button>
                    <button className="btn btn-primary flex gap-xs" onClick={() => setIsCreateOpen(true)}>
                        <Plus size={16} /> {t('dsr.newReport', 'New Daily Report')}
                    </button>
                </div>
            </div>

            <div className="card mb-lg">
                <div className="card-body grid grid-2" style={{ gap: 12 }}>
                    <div className="input-group">
                        <label className="input-label">{t('dsr.project', 'Project')}</label>
                        <select className="input" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}>
                            <option value="">{t('dsr.allProjects', 'All projects')}</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">{t('invoices.table.status', 'Status')}</label>
                        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">{t('dsr.statusAll', 'All')}</option>
                            <option value="DRAFT">{t('dsr.statusDraft', 'Draft')}</option>
                            <option value="SUBMITTED">{t('dsr.statusSubmitted', 'Submitted (pending review)')}</option>
                            <option value="ACKNOWLEDGED">{t('dsr.statusAcknowledged', 'Acknowledged')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* #5 — 7-day weather timeline strip */}
            {reports.length > 0 && (() => {
                // Get the last 7 unique days of reports
                const dayMap = {};
                reports.forEach(r => {
                    const d = (r.reportDate || r.createdAt || '').slice(0, 10);
                    if (d && !dayMap[d]) dayMap[d] = r;
                });
                const last7 = Object.entries(dayMap)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 7)
                    .reverse();
                if (last7.length < 2) return null;
                return (
                    <div className="card mb-lg" style={{ padding: '12px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {isArabic ? 'الطقس آخر ٧ أيام' : '7-Day Weather'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                            {last7.map(([day, r]) => (
                                <div key={day} style={{
                                    flex: 1, textAlign: 'center', padding: '8px 4px',
                                    background: 'var(--bg-tertiary)', borderRadius: 8
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {new Date(day + 'T00:00:00').toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB', { weekday: 'short' })}
                                    </div>
                                    <div style={{ margin: '6px 0', fontSize: 18 }}>
                                        {WEATHER_ICONS[r.weather] || '☀️'}
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                                        {r.temperatureC != null ? `${r.temperatureC}°` : '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* #13 — Hours worked bar chart per project */}
            {reports.length > 0 && (() => {
                const projectHours = {};
                reports.forEach(r => {
                    const pName = r.project?.name || (isArabic ? 'غير محدد' : 'Unassigned');
                    projectHours[pName] = (projectHours[pName] || 0) + (Number(r.hoursWorked) || 0);
                });
                const entries = Object.entries(projectHours).sort(([, a], [, b]) => b - a);
                const maxH = Math.max(...entries.map(([, h]) => h), 1);
                if (entries.length === 0) return null;
                const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
                return (
                    <div className="card mb-lg" style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {isArabic ? 'ساعات العمل لكل مشروع' : 'Hours Worked per Project'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {entries.map(([name, hours], i) => (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 130, fontSize: 13, fontWeight: 600, textAlign: isArabic ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
                                    <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: 4, height: 22, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(hours / maxH) * 100}%`,
                                            height: '100%',
                                            background: barColors[i % barColors.length],
                                            borderRadius: 4,
                                            transition: 'width 0.6s ease',
                                            minWidth: 2
                                        }} />
                                    </div>
                                    <div style={{ width: 50, fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{hours}h</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh' }}><div className="spinner"></div></div>
            ) : reports.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <ClipboardList size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>{t('dsr.empty', 'No daily site reports yet')}</h3>
                    <p className="text-secondary">
                        {t('dsr.emptyHint', "Engineers create DSRs from the mobile app or web at the end of each work day.")}
                    </p>
                </div>
            ) : (
                <div>
                    {reports.map(r => {
                        const sc = STATUS_COLORS[r.status] || STATUS_COLORS.DRAFT;
                        const statusText = STATUS_LABELS[r.status] || sc.label;
                        return (
                            <div key={r.id} className="card mb-sm" style={{ cursor: 'pointer' }} onClick={() => openDetail(r.id)}>
                                <div className="card-body">
                                    <div className="flex-between" style={{ alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <strong>{r.project?.name}</strong>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    background: sc.bg,
                                                    color: sc.fg,
                                                    fontSize: 11,
                                                    fontWeight: 700
                                                }}>{statusText}</span>
                                                {r.weather && (
                                                    <span className="flex gap-sm" style={{ alignItems: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                                                        {WEATHER_ICONS[r.weather]} {t(`dsr.${r.weather.toLowerCase()}`, r.weather)}
                                                        {r.temperatureC != null && ` ${r.temperatureC}°C`}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                <strong>{fmtDate(r.reportDate)}</strong>
                                                {' · '}
                                                {r.reporter?.name}
                                                {r.hoursWorked != null && ` · ${r.hoursWorked}h ${isArabic ? 'ساعة مسجلة' : 'logged'}`}
                                            </div>
                                            {r.progressNotes && (
                                                <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-primary)' }}>
                                                    {r.progressNotes.slice(0, 200)}{r.progressNotes.length > 200 ? '…' : ''}
                                                </div>
                                            )}
                                            {r.issues && (
                                                <div style={{ fontSize: 12, marginTop: 4, color: '#ef4444' }}>
                                                    ⚠️ {r.issues.slice(0, 150)}{r.issues.length > 150 ? '…' : ''}
                                                </div>
                                            )}
                                        </div>
                                        <ArrowRight size={18} style={{ color: 'var(--text-tertiary)' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail modal */}
            {detail && (
                <div
                    onClick={() => setDetail(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: 12,
                            padding: 24,
                            maxWidth: 800,
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex-between mb-md">
                            <div>
                                <h2 style={{ margin: 0 }}>{detail.project?.name}</h2>
                                <p className="text-secondary" style={{ margin: '4px 0 0' }}>
                                    Daily Site Report · <strong>{fmtDate(detail.reportDate)}</strong>
                                </p>
                            </div>
                            <button className="btn" onClick={() => setDetail(null)}><X size={16} /></button>
                        </div>

                        {/* Status + meta */}
                        <div className="grid grid-3 mb-md" style={{ gap: 12 }}>
                            <Stat label="Status" value={STATUS_COLORS[detail.status]?.label || detail.status} />
                            <Stat label="Reporter" value={detail.reporter?.name || '—'} />
                            <Stat
                                label="Hours logged"
                                value={detail.hoursWorked != null ? `${detail.hoursWorked} h` : '—'}
                            />
                            {detail.weather && <Stat label="Weather" value={`${detail.weather}${detail.temperatureC != null ? ` · ${detail.temperatureC}°C` : ''}`} />}
                            {detail.submittedAt && <Stat label="Submitted" value={fmtDateTime(detail.submittedAt)} />}
                            {detail.acknowledgedAt && <Stat label="Acknowledged" value={fmtDateTime(detail.acknowledgedAt)} />}
                        </div>

                        {/* Notes */}
                        <Section title="Progress" body={detail.progressNotes} emptyText="No progress notes." />
                        <Section title="Issues" body={detail.issues} emptyText="No issues reported." color={detail.issues ? '#ef4444' : null} />
                        <Section title="Visitors" body={detail.visitorsNotes} emptyText="" hideEmpty />

                        {/* Workmen attendance */}
                        {Array.isArray(detail.workmenAttendance) && detail.workmenAttendance.length > 0 && (
                            <div className="card mb-md">
                                <div className="card-header"><h3 className="card-title">Workmen Attendance ({detail.workmenAttendance.length})</h3></div>
                                <div className="card-body" style={{ padding: 8 }}>
                                    <table style={{ width: '100%', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: 6 }}>Workman ID</th>
                                                <th style={{ padding: 6 }}>Hours</th>
                                                <th style={{ padding: 6 }}>Role</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.workmenAttendance.map((a, i) => (
                                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 11 }}>{a.workmanId?.slice(0, 8)}…</td>
                                                    <td style={{ padding: 6 }}>{a.hoursPresent || '—'}</td>
                                                    <td style={{ padding: 6 }}>{a.role || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Materials received */}
                        {Array.isArray(detail.materialsReceived) && detail.materialsReceived.length > 0 && (
                            <div className="card mb-md">
                                <div className="card-header"><h3 className="card-title">Materials Received</h3></div>
                                <div className="card-body" style={{ padding: 8 }}>
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {detail.materialsReceived.map((m, i) => (
                                            <li key={i} style={{ marginBottom: 4 }}>
                                                <strong>{m.name}</strong>
                                                {m.quantity != null && ` — ${m.quantity}${m.unit ? ' ' + m.unit : ''}`}
                                                {m.notes && <span style={{ color: 'var(--text-secondary)' }}> ({m.notes})</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Photos */}
                        {Array.isArray(detail.photos) && detail.photos.length > 0 && (
                            <div className="card mb-md">
                                <div className="card-header"><h3 className="card-title">Photos ({detail.photos.length})</h3></div>
                                <div className="card-body grid grid-3" style={{ gap: 8, padding: 12 }}>
                                    {detail.photos.map(p => (
                                        <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                                            <img
                                                src={p.url}
                                                alt={p.name}
                                                style={{
                                                    width: '100%', aspectRatio: '1', objectFit: 'cover',
                                                    borderRadius: 6, border: '1px solid var(--border-color)'
                                                }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acknowledge form */}
                        {canAcknowledge && detail.status === 'SUBMITTED' && (
                            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                                <div className="card-body">
                                    <h3 className="card-title">{t('dsr.acknowledge', 'Acknowledge report')}</h3>
                                    <p className="text-secondary" style={{ fontSize: 13 }}>
                                        {isArabic ? 'إضافة ملاحظات للمهندس (اختياري).' : 'Add optional notes for the engineer (e.g. follow-up on the issues mentioned).'}
                                    </p>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        placeholder={t('dsr.acknowledgeNotes', 'Notes for the engineer (optional)…')}
                                        value={ackNotes}
                                        onChange={(e) => setAckNotes(e.target.value)}
                                    />
                                    <div className="flex gap-sm" style={{ marginTop: 12 }}>
                                        <button className="btn btn-primary" onClick={acknowledge} disabled={submitting}>
                                            <CheckCircle size={16} /> {t('dsr.acknowledge', 'Acknowledge')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Author can submit if DRAFT */}
                        {detail.status === 'DRAFT' && detail.reportedBy === user?.id && (
                            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <div className="card-body">
                                    <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>
                                        {isArabic ? 'هذا التقرير لا يزال مسودة. أرسله للمدير للاعتماد.' : 'This report is still a DRAFT. Submit it for manager review.'}
                                    </p>
                                    <button className="btn btn-primary" onClick={() => submit(detail.id)} disabled={submitting} style={{ marginTop: 12 }}>
                                        <Send size={16} /> {t('dsr.submitForReview', 'Submit for review')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {detail.status === 'ACKNOWLEDGED' && detail.acknowledgeNotes && (
                            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                                <div className="card-body">
                                    <h4 style={{ marginTop: 0 }}>{t('dsr.managerNote', 'Manager note')}</h4>
                                    <p style={{ fontStyle: 'italic', margin: 0 }}>"{detail.acknowledgeNotes}"</p>
                                    <p className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
                                        — {detail.acknowledger?.name} {isArabic ? 'في' : 'on'} {fmtDateTime(detail.acknowledgedAt)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create DSR Modal */}
            {isCreateOpen && (
                <div onClick={() => setIsCreateOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{
                        width: '100%', maxWidth: 550, maxHeight: '90vh', overflowY: 'auto', padding: 24,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12
                    }}>
                        <div className="flex-between mb-md">
                            <h2 style={{ margin: 0 }}>{t('dsr.newReport', 'New Daily Site Report')}</h2>
                            <button className="btn" onClick={() => setIsCreateOpen(false)}><X size={16} /></button>
                        </div>

                        {/* Fast Voice AI Prompt Banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                            border: '1px dashed rgba(16, 185, 129, 0.4)',
                            borderRadius: 10,
                            padding: '12px 14px',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12
                        }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={14} style={{ color: '#10b981' }} />
                                    {isArabic ? 'إنشاء التقرير بالتسجيل الصوتي' : 'Fast Voice Note Fill'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    {isArabic ? 'تحدث بحرية وسيقوم الذكاء الاصطناعي بتعبئة كافة الحقول' : 'Speak freely and AI will automatically fill out this report'}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => { setIsCreateOpen(false); setIsVoiceOpen(true); }}
                                style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <Mic size={14} /> {isArabic ? 'سجّل الآن' : 'Record'}
                            </button>
                        </div>

                        <form onSubmit={handleCreateReport}>
                            <div className="input-group mb-md">
                                <label className="input-label">{t('dsr.project', 'Project')} *</label>
                                <select
                                    className="input"
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    required
                                >
                                    <option value="">{isArabic ? 'اختر المشروع...' : 'Select Project...'}</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-2 gap-md mb-md">
                                <div className="input-group">
                                    <label className="input-label">{t('dsr.reportDate', 'Report Date')} *</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.reportDate}
                                        onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('dsr.weather', 'Weather')}</label>
                                    <select
                                        className="input"
                                        value={formData.weather}
                                        onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                                    >
                                        <option value="SUNNY">☀️ {t('dsr.sunny', 'Sunny')}</option>
                                        <option value="CLOUDY">☁️ {t('dsr.cloudy', 'Cloudy')}</option>
                                        <option value="RAINY">🌧️ {t('dsr.rainy', 'Rainy')}</option>
                                        <option value="WINDY">💨 {t('dsr.windy', 'Windy')}</option>
                                        <option value="DUSTY">🌪️ {t('dsr.dusty', 'Dusty')}</option>
                                        <option value="HOT">🔥 {t('dsr.hot', 'Hot')}</option>
                                        <option value="COLD">❄️ {t('dsr.cold', 'Cold')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-2 gap-md mb-md">
                                <div className="input-group">
                                    <label className="input-label">{t('dsr.loggedHours', 'Hours Worked')}</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="input"
                                        value={formData.hoursWorked}
                                        onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                                        placeholder="8"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('dsr.temperature', 'Temperature (°C)')}</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.temperatureC}
                                        onChange={(e) => setFormData({ ...formData, temperatureC: e.target.value })}
                                        placeholder="e.g. 28"
                                    />
                                </div>
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label">{t('dsr.workCompleted', 'Work Completed / Progress Notes')} *</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={formData.progressNotes}
                                    onChange={(e) => setFormData({ ...formData, progressNotes: e.target.value })}
                                    placeholder={isArabic ? 'وصف الأعمال المنجزة في الموقع اليوم...' : 'Describe tasks finished on site today...'}
                                    required
                                />
                            </div>

                            <div className="input-group mb-md">
                                <label className="input-label">{t('dsr.issues', 'Issues / Delays (Optional)')}</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    value={formData.issues}
                                    onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                                    placeholder={isArabic ? 'أي معوقات أو نقص في الخامات...' : 'Any site hurdles or pending materials...'}
                                />
                            </div>

                            <div className="input-group mb-lg">
                                <label className="input-label">{t('dsr.visitors', 'Visitors / Consultant Notes (Optional)')}</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.visitorsNotes}
                                    onChange={(e) => setFormData({ ...formData, visitorsNotes: e.target.value })}
                                    placeholder={isArabic ? 'مثال: تم اعتماد الاستلام من الاستشاري' : 'e.g. Consultant inspection passed'}
                                />
                            </div>

                            <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
                                    {t('dsr.cancel', 'Cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (isArabic ? 'جاري الحفظ...' : 'Creating...') : t('dsr.saveReport', 'Save Daily Report')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Voice DSR Modal */}
            {isVoiceOpen && (
                <div onClick={closeVoiceModal} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{
                        width: '100%', maxWidth: 520, padding: 28,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center'
                    }}>
                        <div className="flex-between mb-md">
                            <div className="flex gap-xs" style={{ alignItems: 'center' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <Mic size={16} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16 }}>{isArabic ? 'تسجيل تقرير الموقع الصوتي' : 'Record Site Voice Report'}</h3>
                            </div>
                            <button className="btn" onClick={closeVoiceModal} style={{ padding: 4, background: 'transparent' }}><X size={18} /></button>
                        </div>

                        <p className="text-secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                            {isArabic
                                ? 'تحدث عن تفاصيل اليوم (المشروع، الطقس، ساعات العمل، الأعمال المنفذة، المعوقات، والزيارات).'
                                : 'Describe today\'s site events (Project name, weather, hours, work progress, hurdles, and visitors).'}
                        </p>

                        {/* Waveform / Visualizer Animation */}
                        <div style={{
                            background: 'var(--bg-elevated)', borderRadius: 14, padding: '24px 16px', marginBottom: 20,
                            border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140
                        }}>
                            {voicePhase === 'idle' && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#10b981' }}>
                                        <Mic size={32} />
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{isArabic ? 'جاهز للتسجيل' : 'Ready to record'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        {isArabic ? 'اضغط على زر البدء وتحدث بطبيعتك' : 'Click the button below and speak naturally'}
                                    </div>
                                </div>
                            )}

                            {voicePhase === 'recording' && (
                                <div style={{ textAlign: 'center', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                                            {isArabic ? 'جاري التسجيل...' : 'Recording...'}
                                        </span>
                                        <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 8, color: 'var(--text-primary)' }}>
                                            {fmtTimer(voiceSeconds)}
                                        </span>
                                    </div>

                                    {/* Animated Wave bars */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, marginBottom: 12 }}>
                                        {[40, 70, 30, 90, 60, 100, 50, 80, 40, 95, 65, 30].map((h, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: 4,
                                                    height: `${h}%`,
                                                    background: 'linear-gradient(to top, #10b981, #06b6d4)',
                                                    borderRadius: 2
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {voicePhase === 'preview' && (
                                <div style={{ width: '100%', textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <CheckCircle size={16} /> {isArabic ? `تم التسجيل بنجاح (${fmtTimer(voiceSeconds)})` : `Recorded (${fmtTimer(voiceSeconds)})`}
                                    </div>
                                    {voiceAudioUrl && (
                                        <audio controls src={voiceAudioUrl} style={{ width: '100%', maxWidth: 360, height: 36, margin: '0 auto' }} />
                                    )}
                                </div>
                            )}

                            {voicePhase === 'extracting' && (
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <Loader2 size={36} className="spin" style={{ color: '#10b981', margin: '0 auto 12px' }} />
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {isArabic ? 'جاري تحليل التقرير الصوتي بالذكاء الاصطناعي...' : 'Parsing Voice Report with AI...'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        {isArabic ? 'استخراج نسب الإنجاز، الطقس، الساعات، والمعوقات' : 'Extracting progress, weather, hours, and issues'}
                                    </div>
                                </div>
                            )}

                            {/* Real-time Subtitles / Transcript */}
                            {voiceTranscript && voicePhase !== 'extracting' && (
                                <div style={{
                                    marginTop: 12, width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)',
                                    borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', textAlign: isArabic ? 'right' : 'left',
                                    border: '1px solid var(--border-color)', maxHeight: 80, overflowY: 'auto'
                                }}>
                                    <strong>{isArabic ? 'النص المنطوق:' : 'Spoken text:'}</strong> {voiceTranscript}
                                </div>
                            )}
                        </div>

                        {voiceError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                                {voiceError}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
                            {voicePhase === 'idle' && (
                                <button className="btn btn-primary" onClick={startVoiceRecording} style={{ background: '#10b981', border: 'none', padding: '10px 24px', fontWeight: 700 }}>
                                    <Mic size={16} /> {isArabic ? 'بدء التسجيل الآن' : 'Start Recording'}
                                </button>
                            )}

                            {voicePhase === 'recording' && (
                                <button className="btn btn-danger" onClick={stopVoiceRecording} style={{ background: '#ef4444', border: 'none', padding: '10px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Square size={16} /> {isArabic ? 'إيقاف التسجيل' : 'Stop Recording'}
                                </button>
                            )}

                            {voicePhase === 'preview' && (
                                <>
                                    <button className="btn btn-secondary" onClick={startVoiceRecording} style={{ padding: '10px 16px' }}>
                                        <RotateCcw size={15} /> {isArabic ? 'إعادة التسجيل' : 'Re-record'}
                                    </button>
                                    <button className="btn btn-primary" onClick={handleExtractVoiceDsr} style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', border: 'none', padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={16} /> {isArabic ? 'تحليل وتعبئة التقرير بالذكاء الاصطناعي' : 'Parse & Auto-Fill with AI'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

const Stat = ({ label, value }) => (
    <div className="card" style={{ padding: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
);

const Section = ({ title, body, emptyText, hideEmpty, color }) => {
    if (!body && hideEmpty) return null;
    return (
        <div className="card mb-md">
            <div className="card-header"><h3 className="card-title">{title}</h3></div>
            <div className="card-body">
                {body
                    ? <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: color || undefined }}>{body}</p>
                    : <p className="text-secondary" style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>{emptyText}</p>
                }
            </div>
        </div>
    );
};
