import { useEffect, useState, useCallback } from 'react';
import { Activity, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { auditLogAPI } from '../services/api';

const ACTION_COLORS = {
    CREATE:        { bg: '#d1fae5', fg: '#065f46' },
    UPDATE:        { bg: '#dbeafe', fg: '#1e40af' },
    DELETE:        { bg: '#fee2e2', fg: '#991b1b' },
    RESTORE:       { bg: '#fef3c7', fg: '#92400e' },
    APPROVE:       { bg: '#d1fae5', fg: '#065f46' },
    REJECT:        { bg: '#fee2e2', fg: '#991b1b' },
    INVITE:        { bg: '#e0e7ff', fg: '#3730a3' },
    ROLE_CHANGE:   { bg: '#fef3c7', fg: '#92400e' },
    FUND:          { bg: '#d1fae5', fg: '#065f46' },
    RETURN:        { bg: '#dbeafe', fg: '#1e40af' },
    '2FA_ENABLE':  { bg: '#e0e7ff', fg: '#3730a3' },
    '2FA_DISABLE': { bg: '#fee2e2', fg: '#991b1b' }
};

const fmtDateTime = (s) => s ? new Date(s).toLocaleString('en-GB') : '-';

export default function AuditLog() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters
    const [filters, setFilters] = useState({ entity: '', action: '', userId: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [expanded, setExpanded] = useState({});

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const load = useCallback(async (append = false) => {
        if (!isAdmin) return;
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const params = { limit: 50 };
            if (filters.entity) params.entity = filters.entity;
            if (filters.action) params.action = filters.action;
            if (filters.userId) params.userId = filters.userId;
            if (append && nextCursor) params.cursor = nextCursor;

            const r = await auditLogAPI.list(params);
            const newLogs = r.data?.data || [];
            setLogs(append ? [...logs, ...newLogs] : newLogs);
            setNextCursor(r.data?.nextCursor || null);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to load audit logs' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [isAdmin, filters, nextCursor, logs, showAlert, t]);

    useEffect(() => {
        if (isAdmin) load(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, filters.entity, filters.action, filters.userId]);

    if (!isAdmin) {
        return (
            <Layout>
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <Activity size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>Admins only</h3>
                    <p className="text-secondary">The activity feed is available to admins only.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex-between mb-xl">
                <div>
                    <h1 className="flex gap-md"><Activity size={32} /> Activity Feed</h1>
                    <p className="text-secondary">Every meaningful change in the system, ordered newest first.</p>
                </div>
                <button className="btn" onClick={() => setShowFilters((s) => !s)}>
                    <Filter size={16} />
                    {showFilters ? 'Hide filters' : 'Show filters'}
                </button>
            </div>

            {showFilters && (
                <div className="card mb-lg">
                    <div className="card-body grid grid-3" style={{ gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">Entity</label>
                            <select
                                className="input"
                                value={filters.entity}
                                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                            >
                                <option value="">All</option>
                                <option value="Project">Project</option>
                                <option value="Client">Client</option>
                                <option value="Supplier">Supplier</option>
                                <option value="Material">Material</option>
                                <option value="Workman">Workman</option>
                                <option value="Transaction">Transaction</option>
                                <option value="User">User</option>
                                <option value="Role">Role</option>
                                <option value="Custody">Custody</option>
                                <option value="TenantApprovalThresholds">Approval Thresholds</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Action</label>
                            <select
                                className="input"
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            >
                                <option value="">All</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="RESTORE">Restore</option>
                                <option value="APPROVE">Approve</option>
                                <option value="REJECT">Reject</option>
                                <option value="INVITE">Invite</option>
                                <option value="ROLE_CHANGE">Role change</option>
                                <option value="FUND">Custody fund</option>
                                <option value="RETURN">Custody return</option>
                                <option value="2FA_ENABLE">2FA enable</option>
                                <option value="2FA_DISABLE">2FA disable</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">User ID</label>
                            <input
                                className="input"
                                placeholder="UUID..."
                                value={filters.userId}
                                onChange={(e) => setFilters({ ...filters, userId: e.target.value.trim() })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh' }}><div className="spinner"></div></div>
            ) : logs.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <Activity size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>No activity yet</h3>
                    <p className="text-secondary">Audit entries will appear here as users make changes.</p>
                </div>
            ) : (
                <div>
                    {logs.map((log) => {
                        const c = ACTION_COLORS[log.action] || ACTION_COLORS.UPDATE;
                        const isExpanded = !!expanded[log.id];
                        const hasDetails = log.before || log.after || log.metadata;

                        return (
                            <div key={log.id} className="card mb-sm">
                                <div className="card-body">
                                    <div className="flex-between" style={{ alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    background: c.bg,
                                                    color: c.fg,
                                                    fontSize: '11px',
                                                    fontWeight: 700
                                                }}>
                                                    {log.action}
                                                </span>
                                                <strong>{log.entity}</strong>
                                                <code style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {log.entityId.slice(0, 8)}…
                                                </code>
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <strong>{log.user?.name || '?'}</strong>
                                                {' '}({log.user?.role || '?'})
                                                {' · '}
                                                {fmtDateTime(log.createdAt)}
                                            </div>
                                            {log.metadata?.reason && (
                                                <div style={{ fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>
                                                    Reason: {log.metadata.reason}
                                                </div>
                                            )}
                                        </div>
                                        {hasDetails && (
                                            <button
                                                className="btn"
                                                onClick={() => setExpanded({ ...expanded, [log.id]: !isExpanded })}
                                                style={{ padding: '4px 8px' }}
                                            >
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    {isExpanded && hasDetails && (
                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <DetailBlock title="Metadata" data={log.metadata} />
                                            )}
                                            {log.before && <DetailBlock title="Before" data={log.before} />}
                                            {log.after && <DetailBlock title="After" data={log.after} />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {nextCursor && (
                        <div className="text-center" style={{ marginTop: 16 }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => load(true)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
}

const DetailBlock = ({ title, data }) => (
    <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
            {title}
        </div>
        <pre style={{
            margin: 0,
            padding: 10,
            background: 'var(--bg-elevated)',
            borderRadius: 6,
            fontSize: 11,
            maxHeight: 240,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        }}>
            {JSON.stringify(data, null, 2)}
        </pre>
    </div>
);
