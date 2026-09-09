import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, Trash2, ArrowLeft, MapPin, X, Filter } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { documentsAPI } from '../services/api';

const CATEGORIES = [
    { value: 'PHOTO_PROGRESS', label: 'Site Progress', icon: '🏗️' },
    { value: 'PHOTO_RECEIPT',  label: 'Receipt',       icon: '🧾' },
    { value: 'PHOTO_DELIVERY', label: 'Delivery',      icon: '🚚' },
    { value: 'PHOTO_ISSUE',    label: 'Issue / Defect',icon: '⚠️' },
    { value: 'CONTRACT',       label: 'Contract',      icon: '📄' },
    { value: 'PERMIT',         label: 'Permit',        icon: '📋' },
    { value: 'DRAWING',        label: 'Drawing',       icon: '📐' },
    { value: 'REPORT',         label: 'Report',        icon: '📊' },
    { value: 'OTHER',          label: 'Other',         icon: '📎' }
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const fmtDate = (s) => s ? new Date(s).toLocaleString('en-GB') : '-';
const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// Resolve relative URLs (the local-disk fallback returns /uploads/images/...)
// to absolute, prepending the API origin.
const fullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiUrl}${url}`;
};

export default function ProjectDocuments() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [uploading, setUploading] = useState(false);

    // Upload form state
    const fileInputRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [uploadCategory, setUploadCategory] = useState('PHOTO_PROGRESS');
    const [uploadName, setUploadName] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [includeGps, setIncludeGps] = useState(false);

    // Lightbox
    const [lightbox, setLightbox] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await documentsAPI.listByProject(projectId, filter ? { category: filter } : {});
            setDocs(r.data?.data || []);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to load documents' });
        } finally {
            setLoading(false);
        }
    }, [projectId, filter, showAlert, t]);

    useEffect(() => { load(); }, [load]);

    const onFilePicked = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showAlert({ type: 'error', title: 'Invalid file', message: 'Only images are supported (JPEG, PNG, GIF, WebP)' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showAlert({ type: 'error', title: 'Too large', message: 'Maximum 5 MB per image' });
            return;
        }
        setPendingFile(file);
        setUploadName(file.name.replace(/\.[^.]+$/, ''));
    };

    const cancelUpload = () => {
        setPendingFile(null);
        setUploadName('');
        setUploadDescription('');
        setUploadCategory('PHOTO_PROGRESS');
        setIncludeGps(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submitUpload = async () => {
        if (!pendingFile) return;
        setUploading(true);

        // Optionally grab GPS coords from browser geolocation
        let coords = null;
        if (includeGps && 'geolocation' in navigator) {
            try {
                coords = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
            } catch {
                showAlert({ type: 'warning', title: 'GPS unavailable', message: 'Continuing upload without location' });
            }
        }

        const fd = new FormData();
        fd.append('file', pendingFile);
        fd.append('name', uploadName || pendingFile.name);
        fd.append('category', uploadCategory);
        if (uploadDescription) fd.append('description', uploadDescription);
        if (coords) {
            fd.append('latitude', String(coords.coords.latitude));
            fd.append('longitude', String(coords.coords.longitude));
        }

        try {
            await documentsAPI.upload(projectId, fd);
            showAlert({ type: 'success', title: 'Uploaded', message: 'Document added to the project' });
            cancelUpload();
            load();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
        } finally {
            setUploading(false);
        }
    };

    const onDelete = (doc) => {
        showAlert({
            type: 'warning',
            title: isArabic ? 'حذف المستند' : 'Delete Document',
            message: isArabic ? `هل أنت متأكد من حذف المستند "${doc.name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Delete "${doc.name}"? This cannot be undone.`,
            showCancel: true,
            confirmText: isArabic ? 'نعم، حذف' : 'Yes, Delete',
            cancelText: isArabic ? 'تراجع' : 'Cancel',
            onConfirm: async () => {
                try {
                    await documentsAPI.remove(doc.id);
                    setDocs(prev => prev.filter(d => d.id !== doc.id));
                    showAlert({ type: 'success', title: isArabic ? 'تم الحذف' : 'Deleted', message: isArabic ? 'تم حذف المستند بنجاح.' : 'Document deleted successfully.' });
                } catch (err) {
                    showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || err.message });
                }
            }
        });
    };

    return (
        <Layout>
            <div className="flex-between mb-xl">
                <div className="flex gap-md" style={{ alignItems: 'center' }}>
                    <button className="btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
                    <div>
                        <h1 className="flex gap-md"><Camera size={32} /> Project Documents</h1>
                        <p className="text-secondary">Photos, contracts, permits, drawings, and reports.</p>
                    </div>
                </div>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <Filter size={16} />
                    <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
                        <option value="">All categories</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Upload card */}
            <div className="card mb-lg">
                <div className="card-header">
                    <h3 className="card-title flex gap-sm" style={{ alignItems: 'center' }}>
                        <Upload size={18} /> Upload
                    </h3>
                </div>
                <div className="card-body">
                    {!pendingFile ? (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={onFilePicked}
                                style={{ display: 'none' }}
                            />
                            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                                <Camera size={16} /> Choose photo or document
                            </button>
                            <p className="text-secondary" style={{ fontSize: 12, marginTop: 8 }}>
                                JPEG, PNG, GIF, or WebP — max 5 MB
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
                                <div>
                                    <img
                                        src={URL.createObjectURL(pendingFile)}
                                        alt="preview"
                                        style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid var(--border-color)' }}
                                    />
                                    <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                                        {pendingFile.name} · {fmtSize(pendingFile.size)}
                                    </p>
                                </div>
                                <div>
                                    <div className="input-group">
                                        <label className="input-label">Display name</label>
                                        <input
                                            className="input"
                                            value={uploadName}
                                            onChange={(e) => setUploadName(e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Category</label>
                                        <select
                                            className="input"
                                            value={uploadCategory}
                                            onChange={(e) => setUploadCategory(e.target.value)}
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Description (optional)</label>
                                        <textarea
                                            className="input"
                                            rows={2}
                                            value={uploadDescription}
                                            onChange={(e) => setUploadDescription(e.target.value)}
                                        />
                                    </div>
                                    <label className="flex gap-sm" style={{ alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
                                        <input
                                            type="checkbox"
                                            checked={includeGps}
                                            onChange={(e) => setIncludeGps(e.target.checked)}
                                        />
                                        <MapPin size={14} /> Tag with my current GPS location
                                    </label>
                                    <div className="flex gap-sm">
                                        <button
                                            className="btn btn-primary"
                                            onClick={submitUpload}
                                            disabled={uploading}
                                        >
                                            {uploading ? 'Uploading…' : 'Upload'}
                                        </button>
                                        <button className="btn" onClick={cancelUpload} disabled={uploading}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Gallery */}
            {loading ? (
                <div className="flex-center" style={{ minHeight: '40vh' }}><div className="spinner"></div></div>
            ) : docs.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <Camera size={48} style={{ margin: '0 auto var(--spacing-md)', color: 'var(--text-tertiary)' }} />
                    <h3>No documents yet</h3>
                    <p className="text-secondary">Upload site photos, receipts, contracts, or any other project file.</p>
                </div>
            ) : (
                <div className="grid grid-3" style={{ gap: 16 }}>
                    {docs.map(doc => {
                        const cat = CATEGORY_LABEL[doc.category] || CATEGORY_LABEL.OTHER;
                        const isImage = (doc.fileType || '').startsWith('image/');
                        const canDelete = doc.uploadedBy === user?.id || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
                        return (
                            <div key={doc.id} className="card" style={{ overflow: 'hidden' }}>
                                {isImage ? (
                                    <div
                                        style={{
                                            cursor: 'pointer',
                                            aspectRatio: '1',
                                            background: '#f3f4f6',
                                            backgroundImage: `url(${fullUrl(doc.url)})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                        onClick={() => setLightbox(doc)}
                                    />
                                ) : (
                                    <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                        <span style={{ fontSize: 48 }}>{cat.icon}</span>
                                    </div>
                                )}
                                <div style={{ padding: 12 }}>
                                    <div className="flex-between" style={{ alignItems: 'flex-start', gap: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {cat.icon} {cat.label}
                                            </div>
                                        </div>
                                        {canDelete && (
                                            <button
                                                className="btn"
                                                onClick={() => onDelete(doc)}
                                                title="Delete"
                                                style={{ padding: '4px 6px', color: '#ef4444' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                                        {doc.uploader?.name || 'Unknown'} · {fmtDate(doc.uploadedAt)}
                                    </div>
                                    {(doc.latitude != null && doc.longitude != null) && (
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            <MapPin size={10} /> {Number(doc.latitude).toFixed(5)}, {Number(doc.longitude).toFixed(5)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                >
                    <button
                        onClick={() => setLightbox(null)}
                        style={{
                            position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)',
                            border: 'none', color: 'white', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={fullUrl(lightbox.url)}
                        alt={lightbox.name}
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{
                        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 24px', borderRadius: 8, maxWidth: '80vw'
                    }}>
                        <div style={{ fontWeight: 600 }}>{lightbox.name}</div>
                        {lightbox.description && <div style={{ fontSize: 12, marginTop: 4 }}>{lightbox.description}</div>}
                        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                            {lightbox.uploader?.name || 'Unknown'} · {fmtDate(lightbox.uploadedAt)}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
