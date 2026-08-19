import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileText, Plus, Download, Send, X, Trash2, Ban, DollarSign, Eye, Edit3, Printer
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { invoicesAPI, clientsAPI, projectsAPI } from '../services/api';
import i18n from '../utils/i18n';

const STATUS_COLORS = {
    DRAFT:          { bg: '#f3f4f6', fg: '#374151' },
    SENT:           { bg: '#dbeafe', fg: '#1e40af' },
    PARTIALLY_PAID: { bg: '#fef3c7', fg: '#92400e' },
    PAID:           { bg: '#d1fae5', fg: '#065f46' },
    OVERDUE:        { bg: '#fee2e2', fg: '#991b1b' },
    CANCELLED:      { bg: '#e5e7eb', fg: '#6b7280' }
};

// Locale picked at call time so a language switch re-renders with new digits/symbol
// without having to thread `lang` through every callsite.
const fmtMoney = (amount, currency = 'EGP') => {
    const lang = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-EG';
    return new Intl.NumberFormat(lang, {
        style: 'currency', currency,
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(amount || 0));
};

const fmtDate = (s) => {
    if (!s) return '-';
    const lang = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB';
    return new Date(s).toLocaleDateString(lang);
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = () => ({ description: '', quantity: 1, unitPrice: 0, total: 0 });

export default function Invoices() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const STATUS_MAP = {
        '':               t('invoices.status.all', 'All'),
        'DRAFT':          t('invoices.status.draft', 'Draft'),
        'SENT':           t('invoices.status.sent', 'Sent'),
        'PARTIALLY_PAID': t('invoices.status.partiallyPaid', 'Partially Paid'),
        'PAID':           t('invoices.status.paid', 'Paid'),
        'OVERDUE':        t('invoices.status.overdue', 'Overdue'),
        'CANCELLED':      t('invoices.status.cancelled', 'Cancelled')
    };

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '' });
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);  // invoice being edited
    const [viewing, setViewing] = useState(null);  // invoice being viewed
    const [paying, setPaying] = useState(null);    // invoice being paid
    const [paymentAmount, setPaymentAmount] = useState('');
    const [sending, setSending] = useState(null);
    const [sendTo, setSendTo] = useState('');
    const [sendMessage, setSendMessage] = useState('');

    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);

    const canManage = ['ADMIN', 'PROJECT_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = filter.status ? { status: filter.status } : {};
            const r = await invoicesAPI.list(params);
            setInvoices(r.data?.data || []);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to load invoices' });
        } finally {
            setLoading(false);
        }
    }, [filter.status, showAlert, t]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        clientsAPI.getAll?.().then(r => setClients(r.data?.data || [])).catch(() => {});
        projectsAPI.getAll?.().then(r => setProjects(r.data?.data || [])).catch(() => {});
    }, []);

    const onCreate = async (form) => {
        try {
            await invoicesAPI.create(form);
            showAlert({ type: 'success', title: isArabic ? 'تم الإنشاء' : 'Created', message: isArabic ? 'تم حفظ مسودة الفاتورة بنجاح.' : 'Invoice draft created.' });
            setCreating(false);
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onUpdate = async (id, form) => {
        try {
            await invoicesAPI.update(id, form);
            showAlert({ type: 'success', title: isArabic ? 'تم التعديل' : 'Updated', message: isArabic ? 'تم تحديث الفاتورة.' : 'Invoice updated.' });
            setEditing(null);
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onDownloadPdf = async (inv) => {
        try {
            const blob = await invoicesAPI.downloadPdf(inv.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${inv.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onSend = async () => {
        if (!sending) return;
        try {
            await invoicesAPI.send(sending.id, { to: sendTo || undefined, message: sendMessage || undefined });
            showAlert({ type: 'success', title: isArabic ? 'تم الإرسال' : 'Sent', message: isArabic ? 'تم إرسال الفاتورة بالبريد الإلكتروني.' : `Invoice emailed.` });
            setSending(null);
            setSendTo('');
            setSendMessage('');
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onRecordPayment = async () => {
        if (!paying || !paymentAmount) return;
        try {
            await invoicesAPI.recordPayment(paying.id, Number(paymentAmount));
            showAlert({ type: 'success', title: isArabic ? 'تم التسجيل' : 'Recorded', message: isArabic ? 'تم تسجيل الدفعة بنجاح.' : 'Payment recorded.' });
            setPaying(null);
            setPaymentAmount('');
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onCancel = async (inv) => {
        if (!window.confirm(isArabic ? `هل أنت متأكد من إلغاء الفاتورة ${inv.invoiceNumber}؟` : `Cancel invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
        try {
            await invoicesAPI.cancel(inv.id);
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    const onDelete = async (inv) => {
        if (!window.confirm(isArabic ? `هل تريد حذف مسودة الفاتورة ${inv.invoiceNumber}؟` : `Delete draft ${inv.invoiceNumber}?`)) return;
        try {
            await invoicesAPI.remove(inv.id);
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        }
    };

    return (
        <Layout>
            <div className="flex-between mb-xl">
                <div>
                    <h1 className="flex gap-md"><FileText size={32} /> {t('invoices.title', 'Invoices')}</h1>
                    <p className="text-secondary">{t('invoices.subtitle', 'Generate professional PDF invoices, send to clients, track payments.')}</p>
                </div>
                {canManage && (
                    <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>
                        <Plus size={18} /> {t('invoices.newInvoice', 'New Invoice')}
                    </button>
                )}
            </div>

            {/* Status filter pills */}
            <div className="flex gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
                {['', 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'].map(s => (
                    <button
                        key={s || 'ALL'}
                        className={filter.status === s ? 'btn btn-primary' : 'btn'}
                        onClick={() => setFilter({ status: s })}
                        style={{ padding: '6px 14px' }}
                    >
                        {STATUS_MAP[s] || s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh' }}><div className="spinner"></div></div>
            ) : invoices.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <FileText size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>{t('invoices.empty', 'No invoices yet')}</h3>
                    <p className="text-secondary">{t('invoices.emptyHint', "Create your first invoice from a project's line items.")}</p>
                </div>
            ) : (
                <div className="card">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <Th>{t('invoices.table.number', '#')}</Th>
                                <Th>{t('invoices.table.client', 'Client')}</Th>
                                <Th>{t('invoices.table.project', 'Project')}</Th>
                                <Th>{t('invoices.table.issued', 'Issued')}</Th>
                                <Th>{t('invoices.table.due', 'Due')}</Th>
                                <Th align="right">{t('invoices.table.total', 'Total')}</Th>
                                <Th align="right">{t('invoices.table.paid', 'Paid')}</Th>
                                <Th>{t('invoices.table.status', 'Status')}</Th>
                                <Th>{t('invoices.table.actions', 'Actions')}</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => {
                                const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.DRAFT;
                                const statusLabel = STATUS_MAP[inv.status] || inv.status;
                                const balance = Number(inv.totalAmount) - Number(inv.paidAmount);
                                const isOverdue = inv.status === 'OVERDUE';
                                const isDueSoon = inv.dueDate && inv.status !== 'PAID' && inv.status !== 'CANCELLED' &&
                                    new Date(inv.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
                                    new Date(inv.dueDate) > new Date();
                                return (
                                    <tr key={inv.id} style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        background: isOverdue ? 'rgba(239,68,68,0.07)' : 'transparent',
                                        borderLeft: isOverdue ? '3px solid #ef4444' : isDueSoon ? '3px solid #f59e0b' : '3px solid transparent',
                                        transition: 'background 0.2s'
                                    }}>
                                        <Td><strong>{inv.invoiceNumber}</strong></Td>
                                        <Td>{inv.client?.name || '-'}</Td>
                                        <Td>{inv.project?.name || '—'}</Td>
                                        <Td>{fmtDate(inv.issueDate)}</Td>
                                        <Td style={{ color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : undefined, fontWeight: (isOverdue || isDueSoon) ? 700 : undefined }}>
                                            {fmtDate(inv.dueDate)}
                                            {isOverdue && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠️</span>}
                                        </Td>
                                        <Td align="right">{fmtMoney(inv.totalAmount, inv.currency)}</Td>
                                        <Td align="right">
                                            {fmtMoney(inv.paidAmount, inv.currency)}
                                            {balance > 0.01 && (
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                    {t('invoices.table.balance', 'bal')}: {fmtMoney(balance, inv.currency)}
                                                </div>
                                            )}
                                        </Td>
                                        <Td>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6,
                                                background: sc.bg, color: sc.fg,
                                                fontSize: 11, fontWeight: 700
                                            }}>{statusLabel}</span>
                                        </Td>
                                        <Td>
                                            <div className="flex gap-sm">
                                                <button className="btn" onClick={() => setViewing(inv)} title={isArabic ? 'معاينة' : 'View'}><Eye size={14} /></button>
                                                <button className="btn" onClick={() => onDownloadPdf(inv)} title="PDF"><Download size={14} /></button>
                                                <button className="btn" title={isArabic ? 'طباعة' : 'Print'} onClick={() => {
                                                    // Open a print-friendly tab with invoice details
                                                    const w = window.open('', '_blank');
                                                    w.document.write(`<html><head><title>${inv.invoiceNumber}</title><style>
                                                        body{font-family:sans-serif;padding:40px;color:#111}
                                                        h1{margin:0 0 4px}h2{margin:0 0 20px;color:#666;font-weight:400}
                                                        table{width:100%;border-collapse:collapse;margin:20px 0}
                                                        th{text-align:left;border-bottom:2px solid #ddd;padding:8px}
                                                        td{padding:8px;border-bottom:1px solid #eee}
                                                        .total{font-size:1.2rem;font-weight:bold;text-align:right;margin-top:20px}
                                                        @media print{button{display:none}}
                                                    </style></head><body>
                                                        <h1>${inv.invoiceNumber}</h1>
                                                        <h2>${inv.client?.name || ''} &mdash; ${inv.project?.name || ''}</h2>
                                                        <p>Issue Date: ${fmtDate(inv.issueDate)} | Due: ${fmtDate(inv.dueDate)} | Status: ${inv.status}</p>
                                                        <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                                                        <tbody>${(inv.lineItems || []).map(li => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${fmtMoney(li.unitPrice, inv.currency)}</td><td>${fmtMoney(li.total, inv.currency)}</td></tr>`).join('')}</tbody>
                                                        </table>
                                                        <div class="total">Total: ${fmtMoney(inv.totalAmount, inv.currency)}</div>
                                                        <div class="total" style="font-size:1rem;color:#10b981">Paid: ${fmtMoney(inv.paidAmount, inv.currency)}</div>
                                                        <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;font-size:1rem;cursor:pointer">🖨️ Print</button>
                                                    </body></html>`);
                                                    w.document.close();
                                                }}><Printer size={14} /></button>
                                                {inv.status === 'DRAFT' && canManage && (
                                                    <button className="btn" onClick={() => setEditing(inv)} title="Edit"><Edit3 size={14} /></button>
                                                )}
                                                {(inv.status === 'DRAFT' || inv.status === 'SENT') && canManage && (
                                                    <button
                                                        className="btn"
                                                        onClick={() => { setSending(inv); setSendTo(inv.client?.email || ''); }}
                                                        title="Send"
                                                    >
                                                        <Send size={14} color="#2563eb" />
                                                    </button>
                                                )}
                                                {!['PAID', 'CANCELLED'].includes(inv.status) && canManage && (
                                                    <button className="btn" onClick={() => setPaying(inv)} title="Record payment"><DollarSign size={14} color="#10b981" /></button>
                                                )}
                                                {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && canManage && (
                                                    <button className="btn" onClick={() => onCancel(inv)} title="Cancel"><Ban size={14} color="#ef4444" /></button>
                                                )}
                                                {inv.status === 'DRAFT' && canManage && (
                                                    <button className="btn" onClick={() => onDelete(inv)} title="Delete"><Trash2 size={14} color="#ef4444" /></button>
                                                )}
                                            </div>
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create / edit modal */}
            {(creating || editing) && (
                <InvoiceForm
                    invoice={editing}
                    clients={clients}
                    projects={projects}
                    onSubmit={editing ? (form) => onUpdate(editing.id, form) : onCreate}
                    onClose={() => { setCreating(false); setEditing(null); }}
                />
            )}

            {/* View modal */}
            {viewing && (
                <ViewModal
                    invoice={viewing}
                    onClose={() => setViewing(null)}
                    onDownload={() => onDownloadPdf(viewing)}
                />
            )}

            {/* Send modal */}
            {sending && (
                <Modal title={`Send ${sending.invoiceNumber}`} onClose={() => setSending(null)}>
                    <div className="input-group">
                        <label className="input-label">Recipient email</label>
                        <input
                            type="email"
                            className="input"
                            value={sendTo}
                            onChange={(e) => setSendTo(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Message (optional)</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={sendMessage}
                            onChange={(e) => setSendMessage(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onSend}>
                        <Send size={16} /> Send invoice
                    </button>
                </Modal>
            )}

            {/* Payment modal */}
            {paying && (
                <Modal title={`Record payment for ${paying.invoiceNumber}`} onClose={() => { setPaying(null); setPaymentAmount(''); }}>
                    <p className="text-secondary" style={{ fontSize: 13 }}>
                        Outstanding balance: <strong>{fmtMoney(Number(paying.totalAmount) - Number(paying.paidAmount), paying.currency)}</strong>
                    </p>
                    <div className="input-group">
                        <label className="input-label">Payment amount</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button className="btn btn-primary" onClick={onRecordPayment} disabled={!paymentAmount}>
                        Record payment
                    </button>
                </Modal>
            )}
        </Layout>
    );
}

const Th = ({ children, align = 'left' }) => (
    <th style={{
        padding: 12,
        textAlign: align,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase'
    }}>{children}</th>
);

const Td = ({ children, align = 'left' }) => (
    <td style={{ padding: 12, fontSize: 13, color: 'var(--text-primary)', textAlign: align, verticalAlign: 'top' }}>
        {children}
    </td>
);

const Modal = ({ title, onClose, children }) => (
    <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
        <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-elevated)', borderRadius: 12, padding: 24,
            maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto',
            border: '1px solid var(--border-color)'
        }}>
            <div className="flex-between mb-md">
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button className="btn" onClick={onClose}><X size={16} /></button>
            </div>
            {children}
        </div>
    </div>
);

const ViewModal = ({ invoice, onClose, onDownload }) => (
    <Modal title={invoice.invoiceNumber} onClose={onClose}>
        <div className="grid grid-2 mb-md" style={{ gap: 8 }}>
            <Stat label="Client" value={invoice.client?.name || '-'} />
            <Stat label="Project" value={invoice.project?.name || '—'} />
            <Stat label="Issue date" value={fmtDate(invoice.issueDate)} />
            <Stat label="Due date" value={fmtDate(invoice.dueDate)} />
            <Stat label="Status" value={invoice.status.replace('_', ' ')} />
            <Stat label="Total" value={fmtMoney(invoice.totalAmount, invoice.currency)} />
            <Stat label="Paid" value={fmtMoney(invoice.paidAmount, invoice.currency)} />
            <Stat label="Balance" value={fmtMoney(Number(invoice.totalAmount) - Number(invoice.paidAmount), invoice.currency)} />
        </div>
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Line items</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <Th>Description</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Unit price</Th>
                    <Th align="right">Total</Th>
                </tr>
            </thead>
            <tbody>
                {(invoice.lineItems || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <Td>{item.description}</Td>
                        <Td align="right">{item.quantity}</Td>
                        <Td align="right">{fmtMoney(item.unitPrice, invoice.currency)}</Td>
                        <Td align="right">{fmtMoney(item.total, invoice.currency)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
        {invoice.notes && (
            <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 13 }}>Notes</strong>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
            </div>
        )}
        {invoice.terms && (
            <div style={{ marginTop: 8 }}>
                <strong style={{ fontSize: 13 }}>Terms</strong>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{invoice.terms}</p>
            </div>
        )}
        <button className="btn btn-primary" onClick={onDownload} style={{ marginTop: 16 }}>
            <Download size={16} /> Download PDF
        </button>
    </Modal>
);

const Stat = ({ label, value }) => (
    <div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
);

const InvoiceForm = ({ invoice, clients, projects, onSubmit, onClose }) => {
    const [clientId, setClientId] = useState(invoice?.clientId || '');
    const [projectId, setProjectId] = useState(invoice?.projectId || '');
    const [dueDate, setDueDate] = useState(invoice?.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '');
    const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 14);  // Egyptian VAT default
    const [discountAmount, setDiscountAmount] = useState(invoice?.discountAmount ?? 0);
    const [notes, setNotes] = useState(invoice?.notes || '');
    const [terms, setTerms] = useState(invoice?.terms || 'Payment due within 30 days');
    const [items, setItems] = useState(invoice?.lineItems?.length ? invoice.lineItems : [emptyLine()]);

    const updateItem = (i, field, value) => {
        const next = [...items];
        next[i] = { ...next[i], [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
            next[i].total = Number(next[i].quantity || 0) * Number(next[i].unitPrice || 0);
        }
        setItems(next);
    };

    const addLine = () => setItems([...items, emptyLine()]);
    const removeLine = (i) => setItems(items.filter((_, idx) => idx !== i));

    const subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
    const afterDiscount = Math.max(0, subtotal - Number(discountAmount || 0));
    const taxAmount = afterDiscount * (Number(taxRate || 0) / 100);
    const total = afterDiscount + taxAmount;

    const submit = () => {
        if (!clientId) { alert('Pick a client'); return; }
        if (items.length === 0 || items.every(i => !i.description)) {
            alert('At least one line item required'); return;
        }
        onSubmit({
            clientId,
            projectId: projectId || null,
            dueDate: dueDate || null,
            lineItems: items.filter(i => i.description),
            taxRate: Number(taxRate),
            discountAmount: Number(discountAmount),
            notes: notes || null,
            terms: terms || null
        });
    };

    return (
        <Modal title={invoice ? `Edit ${invoice.invoiceNumber}` : 'New Invoice'} onClose={onClose}>
            <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="input-group">
                    <label className="input-label">Client *</label>
                    <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        <option value="">Pick…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label className="input-label">Project (optional)</label>
                    <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                        <option value="">—</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label className="input-label">Due date</label>
                    <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="input-group">
                    <label className="input-label">Tax rate (%)</label>
                    <input type="number" step="0.01" className="input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                </div>
            </div>

            <h4 style={{ marginTop: 16 }}>Line items</h4>
            {items.map((item, i) => (
                <div key={i} className="grid" style={{ gridTemplateColumns: '3fr 1.2fr 1.5fr 1.5fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                        className="input"
                        placeholder="Description (e.g. Concrete Pouring)"
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                    />
                    <input
                        type="number"
                        className="input"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        style={{ textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="Unit price (EGP)"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                        style={{ textAlign: 'right' }}
                    />
                    <input
                        className="input"
                        readOnly
                        value={fmtMoney(item.total)}
                        style={{ background: 'var(--bg-elevated)', textAlign: 'right', fontWeight: 600 }}
                    />
                    <button className="btn" onClick={() => removeLine(i)} style={{ color: '#ef4444', padding: '8px' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button className="btn" onClick={addLine}><Plus size={14} /> Add line</button>

            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div className="flex-between"><span>Subtotal:</span><strong>{fmtMoney(subtotal)}</strong></div>
                <div className="flex-between" style={{ marginTop: 4 }}>
                    <span>Discount:</span>
                    <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                    />
                </div>
                <div className="flex-between" style={{ marginTop: 4 }}>
                    <span>Tax ({taxRate}%):</span>
                    <strong>{fmtMoney(taxAmount)}</strong>
                </div>
                <div className="flex-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)', fontSize: 16 }}>
                    <span><strong>Total:</strong></span>
                    <strong style={{ color: 'var(--color-primary)' }}>{fmtMoney(total)}</strong>
                </div>
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
                <label className="input-label">Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="input-group">
                <label className="input-label">Terms</label>
                <textarea className="input" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>

            <button className="btn btn-primary" onClick={submit} style={{ marginTop: 8 }}>
                {invoice ? 'Save changes' : 'Create invoice'}
            </button>
        </Modal>
    );
};
