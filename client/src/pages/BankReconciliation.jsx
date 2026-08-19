import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Banknote, Upload, FileText, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { bankStatementsAPI } from '../services/api';
import { useFormat } from '../utils/format';

// List page for bank statements + CSV upload entry. Click a statement row
// to drill into the per-row review screen.

const STATUS_STYLES = {
    PENDING:   { bg: '#fef3c7', fg: '#92400e', label: 'Pending' },
    REVIEWING: { bg: '#dbeafe', fg: '#1e40af', label: 'Reviewing' },
    COMPLETED: { bg: '#d1fae5', fg: '#065f46', label: 'Completed' },
    CANCELLED: { bg: '#e5e7eb', fg: '#6b7280', label: 'Cancelled' }
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function BankReconciliation() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { showAlert } = useAlert();
    const { currency } = useFormat();

    const STATUS_MAP = {
        PENDING:   t('reconcile.statusPending', 'Pending'),
        REVIEWING: t('reconcile.statusReviewing', 'Reviewing'),
        COMPLETED: t('reconcile.statusCompleted', 'Completed'),
        CANCELLED: t('reconcile.statusCancelled', 'Cancelled')
    };

    const [statements, setStatements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const load = async () => {
        try {
            setLoading(true);
            const r = await bankStatementsAPI.list();
            setStatements(r.data.data || []);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Failed to load statements'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const r = await bankStatementsAPI.upload(file);
            showAlert({
                type: 'success',
                title: isArabic ? 'تم الرفع' : t('common.success', 'Uploaded'),
                message: isArabic ? `تم استيراد ${r.data.data.totalRows} حركة بنكية بنجاح.` : t('reconcile.uploadedHint', `${r.data.data.totalRows} rows imported. Review the matches below.`)
            });
            load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || (isArabic ? 'فشل رفع الملف' : 'Upload failed')
            });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <Layout>
            <div>
                <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Banknote size={28} />
                            {t('reconcile.title', 'Bank Reconciliation')}
                        </h1>
                        <p className="text-secondary">
                            {t('reconcile.subtitle', 'Upload a bank statement CSV. The system matches each row against your approved transactions; you confirm or override.')}
                        </p>
                    </div>
                    <label
                        className="btn btn-primary"
                        style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                    >
                        {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        {uploading ? t('reconcile.uploading', 'Uploading...') : t('reconcile.upload', 'Upload CSV')}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleUpload}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    <FileText size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                    {t('reconcile.csvHint', 'Expected columns (case-insensitive): Date + (Amount, OR Debit/Credit pair) + optional Description and Reference. Egyptian banks: works with NBE, CIB, QNB exports.')}
                </div>

                {loading ? (
                    <div className="flex-center" style={{ minHeight: 200 }}>
                        <div className="spinner"></div>
                    </div>
                ) : statements.length === 0 ? (
                    <div className="card text-center" style={{ padding: 48 }}>
                        <Banknote size={48} style={{ margin: '0 auto 12px', color: 'var(--text-tertiary)' }} />
                        <h3>{t('reconcile.empty', 'No statements yet')}</h3>
                        <p className="text-secondary">{t('reconcile.emptyHint', 'Upload your first bank statement to start reconciling.')}</p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'start', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                                    <th style={{ padding: 12 }}>{t('reconcile.file', 'File')}</th>
                                    <th style={{ padding: 12 }}>{t('reconcile.period', 'Period')}</th>
                                    <th style={{ padding: 12 }}>{t('reconcile.progress', 'Progress')}</th>
                                    <th style={{ padding: 12 }}>{t('reconcile.uploadedBy', 'Uploaded by')}</th>
                                    <th style={{ padding: 12 }}>{t('reconcile.status', 'Status')}</th>
                                    <th style={{ padding: 12 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {statements.map(s => {
                                    const sty = STATUS_STYLES[s.status] || STATUS_STYLES.PENDING;
                                    const statusLabel = STATUS_MAP[s.status] || sty.label;
                                    const remaining = s.totalRows - s.matchedRows - s.ignoredRows;
                                    return (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color, #f3f4f6)' }}>
                                            <td style={{ padding: 12 }}>
                                                <strong>{s.originalName}</strong>
                                                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                    {fmtDate(s.createdAt)}
                                                </div>
                                            </td>
                                            <td style={{ padding: 12 }}>
                                                {s.periodStart ? `${fmtDate(s.periodStart)} → ${fmtDate(s.periodEnd)}` : '—'}
                                            </td>
                                            <td style={{ padding: 12 }}>
                                                {/* Reconciled % badge (#10) */}
                                                {(() => {
                                                    const reconciledPct = Math.round(((s.matchedRows + s.ignoredRows) / Math.max(1, s.totalRows)) * 100);
                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                    {isArabic ? (
                                                                        `${s.matchedRows} مطابق · ${s.ignoredRows} تجاهل · ${remaining} متبقي`
                                                                    ) : (
                                                                        `${s.matchedRows} matched · ${s.ignoredRows} ignored · ${remaining} remaining`
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    width: 120, height: 6, background: '#e5e7eb',
                                                                    borderRadius: 3, overflow: 'hidden', marginTop: 4
                                                                }}>
                                                                    <div style={{
                                                                        width: `${reconciledPct}%`,
                                                                        height: '100%',
                                                                        background: reconciledPct === 100 ? '#10b981' : '#2563eb',
                                                                        transition: 'width 0.5s ease'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                background: reconciledPct === 100 ? '#d1fae5' : '#dbeafe',
                                                                color: reconciledPct === 100 ? '#065f46' : '#1e40af',
                                                                border: `1px solid ${reconciledPct === 100 ? '#6ee7b7' : '#bfdbfe'}`,
                                                                borderRadius: 8,
                                                                padding: '4px 10px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 800,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {reconciledPct}%
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: 12 }}>{s.uploadedBy?.name || '—'}</td>
                                            <td style={{ padding: 12 }}>
                                                <span style={{
                                                    background: sty.bg, color: sty.fg,
                                                    padding: '4px 10px', borderRadius: 12,
                                                    fontSize: '0.75rem', fontWeight: 600
                                                }}>{statusLabel}</span>
                                            </td>
                                            <td style={{ padding: 12, textAlign: 'end' }}>
                                                <Link to={`/reconcile/${s.id}`} className="btn btn-secondary btn-sm">
                                                    {t('reconcile.review', 'Review')}
                                                    <ArrowRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
