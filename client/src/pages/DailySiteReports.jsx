import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Filter, CheckCircle, Send, FileText, X, Sun, Cloud, CloudRain, Wind, Thermometer, ArrowRight } from 'lucide-react';
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

export default function DailySiteReports() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [projects, setProjects] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ projectId: '', status: '' });
    const [detail, setDetail] = useState(null);   // Selected DSR for review modal
    const [ackNotes, setAckNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canAcknowledge = ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);

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
            showAlert({ type: 'success', title: 'Acknowledged', message: 'Engineer has been notified.' });
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
            showAlert({ type: 'success', title: 'Submitted', message: 'Report sent for review.' });
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
            <div className="flex-between mb-xl">
                <div>
                    <h1 className="flex gap-md"><ClipboardList size={32} /> Daily Site Reports</h1>
                    <p className="text-secondary">Engineer's daily log of progress, attendance, weather, and issues — submitted to managers for review.</p>
                </div>
            </div>

            <div className="card mb-lg">
                <div className="card-body grid grid-2" style={{ gap: 12 }}>
                    <div className="input-group">
                        <label className="input-label">Project</label>
                        <select className="input" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}>
                            <option value="">All projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Status</label>
                        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">All</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted (pending review)</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh' }}><div className="spinner"></div></div>
            ) : reports.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <ClipboardList size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>No daily site reports yet</h3>
                    <p className="text-secondary">
                        Engineers create DSRs from the mobile app at the end of each work day.
                        Manager review happens here.
                    </p>
                </div>
            ) : (
                <div>
                    {reports.map(r => {
                        const sc = STATUS_COLORS[r.status] || STATUS_COLORS.DRAFT;
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
                                                }}>{sc.label}</span>
                                                {r.weather && (
                                                    <span className="flex gap-sm" style={{ alignItems: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                                                        {WEATHER_ICONS[r.weather]} {r.weather}
                                                        {r.temperatureC != null && ` ${r.temperatureC}°C`}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                <strong>{fmtDate(r.reportDate)}</strong>
                                                {' · '}
                                                {r.reporter?.name}
                                                {r.hoursWorked != null && ` · ${r.hoursWorked}h logged`}
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
                                    <h3 className="card-title">Acknowledge this report</h3>
                                    <p className="text-secondary" style={{ fontSize: 13 }}>
                                        Add optional notes for the engineer (e.g. follow-up on the issues mentioned).
                                    </p>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        placeholder="Notes for the engineer (optional)…"
                                        value={ackNotes}
                                        onChange={(e) => setAckNotes(e.target.value)}
                                    />
                                    <div className="flex gap-sm" style={{ marginTop: 12 }}>
                                        <button className="btn btn-primary" onClick={acknowledge} disabled={submitting}>
                                            <CheckCircle size={16} /> Acknowledge
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
                                        This report is still a DRAFT. Submit it for manager review.
                                    </p>
                                    <button className="btn btn-primary" onClick={() => submit(detail.id)} disabled={submitting} style={{ marginTop: 12 }}>
                                        <Send size={16} /> Submit for review
                                    </button>
                                </div>
                            </div>
                        )}

                        {detail.status === 'ACKNOWLEDGED' && detail.acknowledgeNotes && (
                            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                                <div className="card-body">
                                    <h4 style={{ marginTop: 0 }}>Manager note</h4>
                                    <p style={{ fontStyle: 'italic', margin: 0 }}>"{detail.acknowledgeNotes}"</p>
                                    <p className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
                                        — {detail.acknowledger?.name} on {fmtDateTime(detail.acknowledgedAt)}
                                    </p>
                                </div>
                            </div>
                        )}
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
