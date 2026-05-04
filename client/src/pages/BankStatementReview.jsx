import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, CheckCircle, XCircle, RefreshCw, Eye, Loader2, Banknote, Search
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { bankStatementsAPI, transactionsAPI } from '../services/api';
import { useFormat } from '../utils/format';

// Per-row review screen: each row shows the AI's top suggestions, lets the
// user confirm a match, ignore the row, or pick a different transaction
// manually via the search picker.

const ROW_STYLES = {
    UNMATCHED: { bg: '#f3f4f6', fg: '#374151', label: 'Unmatched' },
    SUGGESTED: { bg: '#fef3c7', fg: '#92400e', label: 'Suggested' },
    MATCHED:   { bg: '#d1fae5', fg: '#065f46', label: 'Matched' },
    IGNORED:   { bg: '#e5e7eb', fg: '#6b7280', label: 'Ignored' }
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB') : '-';

export default function BankStatementReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const { currency } = useFormat();

    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('SUGGESTED');
    const [busyRow, setBusyRow] = useState(null);
    const [pickerRow, setPickerRow] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const r = await bankStatementsAPI.get(id);
            setStatement(r.data.data);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Failed to load statement'
            });
            navigate('/reconcile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const handleMatch = async (rowId, transactionId) => {
        try {
            setBusyRow(rowId);
            await bankStatementsAPI.matchRow(id, rowId, transactionId);
            await load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: err.response?.data?.message || 'Match failed' });
        } finally {
            setBusyRow(null);
        }
    };

    const handleUnmatch = async (rowId) => {
        try {
            setBusyRow(rowId);
            await bankStatementsAPI.unmatchRow(id, rowId);
            await load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: err.response?.data?.message || 'Unmatch failed' });
        } finally {
            setBusyRow(null);
        }
    };

    const handleIgnore = async (rowId) => {
        try {
            setBusyRow(rowId);
            await bankStatementsAPI.ignoreRow(id, rowId);
            await load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: err.response?.data?.message || 'Ignore failed' });
        } finally {
            setBusyRow(null);
        }
    };

    const handleRematch = async () => {
        try {
            await bankStatementsAPI.rematch(id);
            await load();
            showAlert({ type: 'success', title: t('common.success', 'Done'), message: t('reconcile.rematched', 'Re-ran matching against your latest transactions.') });
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: err.response?.data?.message || 'Re-match failed' });
        }
    };

    if (loading || !statement) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const rows = (statement.rows || []).filter(r => filter === 'ALL' || r.status === filter);

    return (
        <Layout>
            <div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/reconcile')}
                    style={{ marginBottom: 16 }}
                >
                    <ArrowLeft size={14} /> {t('common.back', 'Back')}
                </button>

                <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Banknote size={26} />
                            {statement.originalName}
                        </h1>
                        <p className="text-secondary">
                            {statement.totalRows} rows · {statement.matchedRows} matched · {statement.ignoredRows} ignored
                            {statement.periodStart ? ` · ${fmtDate(statement.periodStart)} → ${fmtDate(statement.periodEnd)}` : ''}
                        </p>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={handleRematch}>
                        <RefreshCw size={14} /> {t('reconcile.rematchAll', 'Re-match all')}
                    </button>
                </div>

                <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                    {['SUGGESTED', 'UNMATCHED', 'MATCHED', 'IGNORED', 'ALL'].map(s => (
                        <button
                            key={s}
                            type="button"
                            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {rows.length === 0 ? (
                    <div className="card text-center" style={{ padding: 48 }}>
                        <p>{t('reconcile.noRowsInFilter', 'No rows in this filter.')}</p>
                    </div>
                ) : (
                    <div className="grid" style={{ gap: 8 }}>
                        {rows.map(row => (
                            <RowCard
                                key={row.id}
                                row={row}
                                busy={busyRow === row.id}
                                currency={currency}
                                onMatch={(txId) => handleMatch(row.id, txId)}
                                onUnmatch={() => handleUnmatch(row.id)}
                                onIgnore={() => handleIgnore(row.id)}
                                onPickManual={() => setPickerRow(row)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ManualPickerModal
                isOpen={!!pickerRow}
                row={pickerRow}
                onClose={() => setPickerRow(null)}
                onPick={async (txId) => {
                    await handleMatch(pickerRow.id, txId);
                    setPickerRow(null);
                }}
                currency={currency}
            />
        </Layout>
    );
}

function RowCard({ row, busy, currency, onMatch, onUnmatch, onIgnore, onPickManual }) {
    const sty = ROW_STYLES[row.status] || ROW_STYLES.UNMATCHED;
    const sign = Number(row.amount) > 0 ? '+' : '';
    return (
        <div className="card" style={{ padding: 14 }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{fmtDate(row.parsedDate)}</strong>
                        <span style={{
                            color: Number(row.amount) > 0 ? '#065f46' : '#991b1b',
                            fontWeight: 700
                        }}>
                            {sign}{currency(Number(row.amount))}
                        </span>
                        <span style={{
                            background: sty.bg, color: sty.fg,
                            padding: '2px 10px', borderRadius: 12,
                            fontSize: '0.75rem', fontWeight: 600
                        }}>{sty.label}</span>
                    </div>
                    {row.description && (
                        <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: 4 }}>
                            {row.description}
                        </div>
                    )}
                </div>

                <div className="flex gap-sm" style={{ flexShrink: 0 }}>
                    {row.status === 'MATCHED' ? (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onUnmatch} disabled={busy}>
                            <XCircle size={14} /> Unmatch
                        </button>
                    ) : row.status === 'IGNORED' ? (
                        <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Ignored</span>
                    ) : (
                        <>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={onPickManual} disabled={busy}>
                                <Search size={14} /> Pick manually
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={onIgnore} disabled={busy}
                                style={{ color: '#6b7280' }}>
                                Ignore
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Matched: show the linked transaction */}
            {row.status === 'MATCHED' && row.matchedTransaction && (
                <div style={{ marginTop: 10, padding: 10, background: '#ecfdf5', borderRadius: 8 }}>
                    <CheckCircle size={14} style={{ verticalAlign: 'middle', color: '#065f46', marginInlineEnd: 6 }} />
                    Matched to: <strong>{currency(Number(row.matchedTransaction.amount))}</strong>
                    {row.matchedTransaction.description ? ` — ${row.matchedTransaction.description}` : ''}
                    {row.matchedTransaction.project?.name ? ` (${row.matchedTransaction.project.name})` : ''}
                </div>
            )}

            {/* Suggestions */}
            {row.status !== 'MATCHED' && Array.isArray(row.suggestions) && row.suggestions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <small className="text-secondary">Suggestions:</small>
                    <div className="grid" style={{ gap: 6, marginTop: 4 }}>
                        {row.suggestions.map(s => (
                            <div key={s.transactionId} className="flex-between" style={{
                                padding: 8, background: 'var(--bg-secondary, #f9fafb)',
                                borderRadius: 6, gap: 8, flexWrap: 'wrap'
                            }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <strong>{currency(Number(s.amount))}</strong>
                                    <span className="text-secondary"> · {fmtDate(s.transactionDate)}</span>
                                    {s.description ? ` · ${s.description}` : ''}
                                    {s.supplier ? ` (${s.supplier})` : ''}
                                </div>
                                <span style={{
                                    fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af',
                                    padding: '2px 8px', borderRadius: 10
                                }}>
                                    {Math.round(s.score * 100)}% · {s.reason}
                                </span>
                                <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                                    onClick={() => onMatch(s.transactionId)}>
                                    {busy ? <Loader2 size={12} className="spin" /> : <CheckCircle size={12} />}
                                    Confirm
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Search-by-amount picker for the "Pick manually" path. Lazy-fetches
// transactions matching the row's amount + a wider date range.
function ManualPickerModal({ isOpen, row, onClose, onPick, currency }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !row) return;
        const search = async () => {
            try {
                setLoading(true);
                setError(null);
                // The transactions API doesn't have an "unreconciled" filter yet,
                // so we fetch all and filter client-side. For tenants with
                // thousands of transactions this should be paginated server-side.
                const r = await transactionsAPI.getAll();
                const all = r.data.data || [];
                const target = Math.abs(Number(row.amount));
                const wantType = Number(row.amount) > 0 ? 'INCOME' : 'EXPENSE';
                const matches = all.filter(tx =>
                    !tx.reconciledAt &&
                    tx.status === 'APPROVED' &&
                    tx.type === wantType &&
                    Math.abs(Number(tx.amount) - target) < 1
                );
                setResults(matches.slice(0, 50));
            } catch (err) {
                setError(err.response?.data?.message || 'Search failed');
            } finally {
                setLoading(false);
            }
        };
        search();
    }, [isOpen, row]);

    if (!isOpen || !row) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <div className="modal-header">
                    <h2>Pick a transaction to match</h2>
                    <button className="modal-close" onClick={onClose}>
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <p className="text-secondary">
                        Showing approved, unreconciled transactions matching {currency(Math.abs(Number(row.amount)))}.
                    </p>
                    {loading && <div className="flex-center" style={{ padding: 24 }}><div className="spinner" /></div>}
                    {error && <div className="alert alert-error">{error}</div>}
                    {!loading && results.length === 0 && (
                        <p className="text-secondary">No matching transactions. Approve the matching transaction first, then come back and re-match.</p>
                    )}
                    {!loading && results.map(tx => (
                        <div key={tx.id} className="flex-between card" style={{ padding: 10, marginBottom: 6 }}>
                            <div>
                                <strong>{currency(Number(tx.amount))}</strong>
                                <span className="text-secondary"> · {fmtDate(tx.transactionDate)}</span>
                                {tx.description ? ` · ${tx.description}` : ''}
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => onPick(tx.id)}>
                                <CheckCircle size={12} /> Match
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
