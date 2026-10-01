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
import AIProcessingModal, { useAIProcessing } from '../components/AIProcessingModal';

const sourceIcon = (source) => source === 'VOICE' ? <Volume2 size={20} /> : <ImageIcon size={20} />;

const typeBadge = (type, isOffice, isRTL) => {
    if (type === 'INCOME') {
        return (
            <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
            }}>
                {isRTL ? 'إيراد / دفعة' : 'Income'}
            </span>
        );
    }
    if (isOffice) {
        return (
            <span style={{
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
            }}>
                {isRTL ? 'مقر الشركة' : 'Office HQ'}
            </span>
        );
    }
    return (
        <span style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
        }}>
            {isRTL ? 'مشروع موقع' : 'Site Project'}
        </span>
    );
};

const statusBadge = (status) => {
    const map = {
        PENDING_REVIEW: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'Pending review' },
        COMMITTED:      { bg: 'rgba(16, 185, 129, 0.15)', fg: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: 'Committed' },
        DISCARDED:      { bg: 'rgba(148, 163, 184, 0.15)', fg: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)', label: 'Discarded' }
    };
    const m = map[status] || map.PENDING_REVIEW;
    return (
        <span style={{
            background: m.bg,
            color: m.fg,
            border: `1px solid ${m.border}`,
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center'
        }}>{m.label}</span>
    );
};

export default function Drafts() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { id: routeDraftId } = useParams();
    const { currency } = useFormat();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
    const [voiceOpen, setVoiceOpen] = useState(false);
    const { processing, startProcessing, finishProcessing, stopProcessing } = useAIProcessing();
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
        startProcessing('voice');
        try {
            const r = await aiExtractAPI.voice(blob);
            finishProcessing();
            setTimeout(() => {
                stopProcessing();
                setReviewId(r.data.draft.id);
                load();
            }, 500);
        } catch (err) {
            stopProcessing();
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || (isRTL ? 'فشل معالجة واستخراج الصوت' : 'Voice extraction failed')
            });
        }
    };

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        startProcessing('receipt');
        try {
            const r = await aiExtractAPI.receipt(file);
            finishProcessing();
            setTimeout(() => {
                stopProcessing();
                setReviewId(r.data.draft.id);
                load();
            }, 500);
        } catch (err) {
            stopProcessing();
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: err.response?.data?.message || (isRTL ? 'فشل معالجة وقراءة الفاتورة' : 'Receipt extraction failed')
            });
        } finally {
            if (e.target) e.target.value = ''; // allow re-pick of same file
        }
    };

    return (
        <Layout>
            <div>
                <div className="flex-between mb-xl" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="flex gap-md" style={{ alignItems: 'center' }}>
                            <Sparkles size={28} style={{ color: 'var(--color-accent, #38bdf8)' }} />
                            {t('drafts.title', 'AI Drafts')}
                        </h1>
                        <p className="text-secondary" style={{ marginTop: 4 }}>
                            {t('drafts.subtitle', 'Capture a voice note or receipt photo and let AI prepare a draft transaction for you.')}
                        </p>
                    </div>
                </div>

                {/* Capture buttons — primary CTAs */}
                <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
                    <button
                        type="button"
                        className="card"
                        style={{
                            padding: '24px',
                            background: 'var(--bg-secondary, #1c1c1c)',
                            border: '1px solid var(--border-color, #2b2b2b)',
                            color: 'var(--text-primary, #fafafa)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 120,
                            cursor: processing.active ? 'not-allowed' : 'pointer',
                            borderRadius: 12,
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            opacity: processing.active ? 0.6 : 1
                        }}
                        disabled={processing.active}
                        onClick={() => setVoiceOpen(true)}
                    >
                        <div style={{
                            width: 50, height: 50, borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#34d399'
                        }}>
                            <Mic size={24} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary, #fafafa)' }}>
                            {t('drafts.captureVoice', 'Voice Draft')}
                        </span>
                        <small style={{ color: 'var(--text-secondary, #a3a3a3)', fontWeight: 400 }}>
                            {t('drafts.captureVoiceHint', 'Speak the expense in Arabic or English')}
                        </small>
                    </button>

                    <label
                        className="card"
                        style={{
                            padding: '24px',
                            background: 'var(--bg-secondary, #1c1c1c)',
                            border: '1px solid var(--border-color, #2b2b2b)',
                            color: 'var(--text-primary, #fafafa)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 120,
                            cursor: processing.active ? 'not-allowed' : 'pointer',
                            borderRadius: 12,
                            textAlign: 'center',
                            opacity: processing.active ? 0.6 : 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: 50, height: 50, borderRadius: '50%',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#60a5fa'
                        }}>
                            <Camera size={24} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary, #fafafa)' }}>
                            {t('drafts.captureReceipt', 'Receipt Draft')}
                        </span>
                        <small style={{ color: 'var(--text-secondary, #a3a3a3)', fontWeight: 400 }}>
                            {t('drafts.captureReceiptHint', 'Photograph a receipt or invoice')}
                        </small>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handlePhotoSelected}
                            disabled={processing.active}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                {/* Status filter pills */}
                <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                    {[
                        { key: 'ALL', label: isRTL ? 'الكل' : 'All' },
                        { key: 'PENDING_REVIEW', label: isRTL ? 'قيد المراجعة' : 'Pending Review' },
                        { key: 'COMMITTED', label: isRTL ? 'تم الترحيل' : 'Committed' },
                        { key: 'DISCARDED', label: isRTL ? 'تم الإلغاء' : 'Discarded' }
                    ].map(({ key, label }) => {
                        const isActive = statusFilter === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: isActive ? 'var(--bg-elevated, #303030)' : 'var(--bg-secondary, #1c1c1c)',
                                    color: isActive ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #a3a3a3)',
                                    border: isActive ? '1px solid var(--border-color-light, #525252)' : '1px solid var(--border-color, #2b2b2b)',
                                }}
                                onClick={() => setStatusFilter(key)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="flex-center" style={{ minHeight: 200 }}>
                        <div className="spinner"></div>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="card text-center" style={{
                        padding: 48,
                        background: 'var(--bg-secondary, #1c1c1c)',
                        border: '1px solid var(--border-color, #2b2b2b)',
                        borderRadius: 12
                    }}>
                        <Sparkles size={48} style={{ margin: '0 auto 12px', color: 'var(--text-tertiary, #737373)' }} />
                        <h3 style={{ color: 'var(--text-primary, #fafafa)', marginBottom: 6 }}>{t('drafts.empty', 'No drafts yet')}</h3>
                        <p className="text-secondary" style={{ color: 'var(--text-secondary, #a3a3a3)' }}>
                            {t('drafts.emptyHint', 'Tap one of the buttons above to capture your first AI draft.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid" style={{ gap: 12 }}>
                        {drafts.map((d) => {
                            const md = d.matchedDraft || {};
                            const isVoice = d.source === 'VOICE';
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setReviewId(d.id)}
                                    className="card"
                                    style={{
                                        background: 'var(--bg-secondary, #1c1c1c)',
                                        border: '1px solid var(--border-color, #2b2b2b)',
                                        color: 'var(--text-primary, #fafafa)',
                                        textAlign: 'inherit',
                                        cursor: 'pointer',
                                        padding: '16px 20px',
                                        display: 'flex',
                                        gap: 16,
                                        alignItems: 'center',
                                        width: '100%',
                                        borderRadius: 12,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: isVoice ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                        border: isVoice ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(59, 130, 246, 0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isVoice ? '#34d399' : '#60a5fa',
                                        flexShrink: 0
                                    }}>
                                        {sourceIcon(d.source)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="flex gap-sm" style={{ alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                            <span style={{
                                                color: 'var(--text-primary, #fafafa)',
                                                fontWeight: 700,
                                                fontSize: '0.98rem',
                                                lineHeight: 1.4
                                            }}>
                                                {md.description || t('drafts.untitled', '(no summary)')}
                                            </span>
                                            {statusBadge(d.status)}
                                        </div>
                                        <div style={{
                                            color: 'var(--text-secondary, #a3a3a3)',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{ color: 'var(--text-primary, #fafafa)', fontWeight: 600 }}>
                                                {md.amount != null ? currency(md.amount) : '—'}
                                            </span>
                                            {md.category ? <span>· {md.category}</span> : null}
                                            {d.createdBy?.name ? <span>· {d.createdBy.name}</span> : null}
                                            {d.createdAt ? <span>· {new Date(d.createdAt).toLocaleDateString()}</span> : null}
                                        </div>
                                    </div>
                                    <ArrowRight size={18} style={{ flexShrink: 0, color: 'var(--text-tertiary, #737373)' }} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* AI Progressive Processing Modal */}
            <AIProcessingModal
                active={processing.active}
                type={processing.type}
                progress={processing.progress}
                stepIndex={processing.stepIndex}
            />

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
