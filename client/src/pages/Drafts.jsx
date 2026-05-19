import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Mic, Camera, Trash2, ArrowRight, Volume2, ImageIcon, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { draftsAPI, aiExtractAPI } from '../services/api';
import { useFormat } from '../utils/format';
import VoiceRecorderModal from '../components/VoiceRecorderModal';
import DraftReviewModal from '../components/DraftReviewModal';

const sourceIcon = (source) => source === 'VOICE' ? <Volume2 size={16} /> : <ImageIcon size={16} />;

const statusBadge = (status) => {
    const map = {
        PENDING_REVIEW: { bg: '#fef3c7', fg: '#92400e', label: 'Pending review' },
        COMMITTED:      { bg: '#d1fae5', fg: '#065f46', label: 'Committed' },
        DISCARDED:      { bg: '#e5e7eb', fg: '#6b7280', label: 'Discarded' }
    };
    const m = map[status] || map.PENDING_REVIEW;
    return (
        <span style={{
            background: m.bg, color: m.fg, padding: '2px 10px',
            borderRadius: 12, fontSize: '0.75rem', fontWeight: 600
        }}>{m.label}</span>
    );
};

export default function Drafts() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { id: routeDraftId } = useParams();
    const { currency } = useFormat();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    // The review modal opens locally on row click. /drafts/:id deep-links
    // also work — we sync the URL param into the same state.
    const [reviewId, setReviewId] = useState(null);

    // Open the review modal automatically when the URL is /drafts/:id
    useEffect(() => {
        if (routeDraftId) setReviewId(routeDraftId);
    }, [routeDraftId]);

    const closeReview = () => {
        setReviewId(null);
        // If we got here via /drafts/:id, return to /drafts so the URL is honest
        if (routeDraftId) navigate('/drafts', { replace: true });
    };

    const load = async () => {
        try {
            setLoading(true);
            const r = await draftsAPI.list({ status: statusFilter });
            setDrafts(r.data.data || []);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Failed to load drafts'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [statusFilter]);

    const handleVoiceCaptured = async (blob) => {
        setVoiceOpen(false);
        try {
            setUploading(true);
            const r = await aiExtractAPI.voice(blob);
            // Open review locally (no full-page navigation)
            setReviewId(r.data.draft.id);
            load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Voice extraction failed'
            });
        } finally {
            setUploading(false);
        }
    };

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const r = await aiExtractAPI.receipt(file);
            setReviewId(r.data.draft.id);
            load();
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || 'Receipt extraction failed'
            });
        } finally {
            setUploading(false);
            e.target.value = ''; // allow re-pick of same file
        }
    };

    return (
        <Layout>
            <div>
                <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Sparkles size={28} />
                            {t('drafts.title', 'AI Drafts')}
                        </h1>
                        <p className="text-secondary">
                            {t('drafts.subtitle', 'Capture a voice note or receipt photo and let AI prepare a draft transaction for you.')}
                        </p>
                    </div>
                </div>

                {/* Capture buttons — primary CTAs */}
                <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                            padding: '24px',
                            fontSize: '1.05rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            alignItems: 'center',
                            minHeight: 110
                        }}
                        disabled={uploading}
                        onClick={() => setVoiceOpen(true)}
                    >
                        {uploading ? <Loader2 size={28} className="spin" /> : <Mic size={28} />}
                        <span>{t('drafts.captureVoice', 'Voice Draft')}</span>
                        <small style={{ opacity: 0.8, fontWeight: 400 }}>
                            {t('drafts.captureVoiceHint', 'Speak the expense in Arabic or English')}
                        </small>
                    </button>

                    <label
                        className="btn btn-primary"
                        style={{
                            padding: '24px',
                            fontSize: '1.05rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            alignItems: 'center',
                            minHeight: 110,
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            opacity: uploading ? 0.6 : 1
                        }}
                    >
                        {uploading ? <Loader2 size={28} className="spin" /> : <Camera size={28} />}
                        <span>{t('drafts.captureReceipt', 'Receipt Draft')}</span>
                        <small style={{ opacity: 0.8, fontWeight: 400 }}>
                            {t('drafts.captureReceiptHint', 'Photograph a receipt or invoice')}
                        </small>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoSelected}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                {/* Status filter pills */}
                <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                    {['PENDING_REVIEW', 'COMMITTED', 'DISCARDED', 'ALL'].map(s => (
                        <button
                            key={s}
                            type="button"
                            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex-center" style={{ minHeight: 200 }}>
                        <div className="spinner"></div>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="card text-center" style={{ padding: 48 }}>
                        <Sparkles size={48} style={{ margin: '0 auto 12px', color: 'var(--text-tertiary)' }} />
                        <h3>{t('drafts.empty', 'No drafts yet')}</h3>
                        <p className="text-secondary">
                            {t('drafts.emptyHint', 'Tap one of the buttons above to capture your first AI draft.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid" style={{ gap: 12 }}>
                        {drafts.map((d) => {
                            const md = d.matchedDraft || {};
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setReviewId(d.id)}
                                    className="card"
                                    style={{
                                        background: 'var(--bg-primary, white)',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        textAlign: 'inherit',
                                        cursor: 'pointer',
                                        padding: 16,
                                        display: 'flex',
                                        gap: 16,
                                        alignItems: 'center',
                                        width: '100%'
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 8,
                                        background: 'var(--color-primary-light, #dbeafe)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-primary, #2563eb)',
                                        flexShrink: 0
                                    }}>
                                        {sourceIcon(d.source)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong>
                                                {md.description || t('drafts.untitled', '(no summary)')}
                                            </strong>
                                            {statusBadge(d.status)}
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                                            {md.amount != null ? currency(md.amount) : '—'}
                                            {md.category ? ` · ${md.category}` : ''}
                                            {d.createdBy?.name ? ` · ${d.createdBy.name}` : ''}
                                        </div>
                                    </div>
                                    <ArrowRight size={18} style={{ flexShrink: 0, opacity: 0.5 }} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <VoiceRecorderModal
                open={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                onCaptured={handleVoiceCaptured}
                maxSeconds={60}
            />

            {/* In-place review modal — clicking a draft opens it without a
                full-page navigation. /drafts/:id deep-links also route here. */}
            <DraftReviewModal
                draftId={reviewId}
                isOpen={!!reviewId}
                onClose={closeReview}
                onCommitted={load}
            />
        </Layout>
    );
}
