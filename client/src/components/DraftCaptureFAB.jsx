import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Mic, Camera, X, Loader2 } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { aiExtractAPI } from '../services/api';
import VoiceRecorderModal from './VoiceRecorderModal';

// Floating Action Button for AI draft capture. Shows on every authenticated
// page so engineers can record / photograph from wherever they're working
// without first navigating to /drafts.
//
// Hidden on the draft review screen itself (it has its own actions there)
// and on any login/setup pages (mounting handled by Layout, so those are
// already excluded).

const HIDE_ON_PATHS = ['/drafts/']; // hide on /drafts/:id review screen specifically

export default function DraftCaptureFAB() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();
    const [open, setOpen] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    // Hide on the review screen — its own action buttons would clash with the FAB.
    if (HIDE_ON_PATHS.some(p => location.pathname.startsWith(p) && location.pathname !== '/drafts')) {
        return null;
    }

    const handleVoiceCaptured = async (blob) => {
        setVoiceOpen(false);
        setOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractAPI.voice(blob);
            navigate(`/drafts/${r.data.draft.id}`);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Voice extraction failed'
            });
        } finally {
            setBusy(false);
        }
    };

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setOpen(false);
        try {
            setBusy(true);
            const r = await aiExtractAPI.receipt(file);
            navigate(`/drafts/${r.data.draft.id}`);
        } catch (err) {
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: err.response?.data?.message || 'Receipt extraction failed'
            });
        } finally {
            setBusy(false);
            e.target.value = '';
        }
    };

    return (
        <>
            {/* Backdrop when menu is open — tap-to-close on mobile */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 998,
                        background: 'rgba(0,0,0,0.15)'
                    }}
                />
            )}

            <div style={{
                position: 'fixed',
                insetInlineEnd: 24,
                bottom: 24,
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12
            }}>
                {/* Voice action — slides up when menu opens */}
                {open && (
                    <button
                        type="button"
                        onClick={() => setVoiceOpen(true)}
                        disabled={busy}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 18px',
                            borderRadius: 999,
                            background: 'white',
                            color: 'var(--color-primary, #2563eb)',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            fontWeight: 600
                        }}
                        title={t('drafts.captureVoice', 'Voice Draft')}
                    >
                        <Mic size={18} />
                        <span>{t('drafts.captureVoice', 'Voice')}</span>
                    </button>
                )}

                {/* Photo action */}
                {open && (
                    <label
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 18px',
                            borderRadius: 999,
                            background: 'white',
                            color: 'var(--color-primary, #2563eb)',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            fontWeight: 600
                        }}
                        title={t('drafts.captureReceipt', 'Receipt Draft')}
                    >
                        <Camera size={18} />
                        <span>{t('drafts.captureReceipt', 'Receipt')}</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoSelected}
                            disabled={busy}
                            style={{ display: 'none' }}
                        />
                    </label>
                )}

                {/* Main FAB toggle */}
                <button
                    type="button"
                    onClick={() => setOpen(prev => !prev)}
                    disabled={busy}
                    aria-label={t('drafts.fabLabel', 'Capture AI draft')}
                    style={{
                        width: 60, height: 60,
                        borderRadius: '50%',
                        background: 'var(--color-primary, #2563eb)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.15s ease',
                        transform: open ? 'rotate(45deg)' : 'rotate(0)'
                    }}
                >
                    {busy ? <Loader2 size={26} className="spin" /> : (open ? <X size={26} /> : <Plus size={26} />)}
                </button>
            </div>

            <VoiceRecorderModal
                open={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                onCaptured={handleVoiceCaptured}
                maxSeconds={60}
            />
        </>
    );
}
