import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Smartphone, Copy, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../context/AlertContext';
import { authAPI } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';

export default function TwoFactorModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);  // { enabled, pendingEnrollment }
    const [enrollment, setEnrollment] = useState(null); // { secret, qrDataUrl, otpauth }
    const [confirmCode, setConfirmCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [secretCopied, setSecretCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const r = await authAPI.twoFactor.status();
            setStatus(r.data.data);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: apiErrorMessage(err, 'Failed to load 2FA status') });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            refresh();
            setEnrollment(null);
            setConfirmCode('');
            setDisablePassword('');
            setDisableCode('');
        }
    }, [isOpen]);

    const startEnroll = async () => {
        setSubmitting(true);
        try {
            const r = await authAPI.twoFactor.enroll();
            setEnrollment(r.data.data);
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to start enrollment' });
        } finally {
            setSubmitting(false);
        }
    };

    const confirmEnroll = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(confirmCode)) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Enter the 6-digit code from your authenticator app' });
            return;
        }
        setSubmitting(true);
        try {
            await authAPI.twoFactor.confirm(confirmCode);
            setEnrollment(null);
            setConfirmCode('');
            showAlert({ type: 'success', title: 'Enabled', message: 'Two-factor authentication is now active' });
            refresh();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Invalid code' });
        } finally {
            setSubmitting(false);
        }
    };

    const disable2FA = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await authAPI.twoFactor.disable(disablePassword, disableCode);
            setDisablePassword('');
            setDisableCode('');
            showAlert({ type: 'success', title: 'Disabled', message: 'Two-factor authentication is now disabled' });
            refresh();
        } catch (err) {
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: err.response?.data?.message || 'Failed to disable' });
        } finally {
            setSubmitting(false);
        }
    };

    const copySecret = async () => {
        if (!enrollment?.secret) return;
        try {
            await navigator.clipboard.writeText(enrollment.secret);
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2000);
        } catch {}
    };

    if (!isOpen) return null;

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    padding: '24px'
                }}
            >
                {/* Modal Header */}
                <div className="flex-between mb-lg" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div className="flex items-center gap-sm">
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: status?.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShieldCheck size={22} color={status?.enabled ? '#10b981' : '#9ca3af'} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>2-Factor Authentication</h2>
                            <p className="text-secondary" style={{ fontSize: '12px', margin: 0 }}>
                                {status?.enabled ? 'Protected with Authenticator' : 'Enhance your account security'}
                            </p>
                        </div>
                    </div>
                    <button 
                        className="btn" 
                        onClick={onClose}
                        style={{ padding: '6px', borderRadius: '8px', background: 'var(--bg-tertiary)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-center" style={{ padding: '40px 0' }}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div>
                        {/* Status banner */}
                        <div className="card mb-lg" style={{
                            borderLeft: status?.enabled ? '4px solid #10b981' : '4px solid #9ca3af',
                            background: 'var(--bg-tertiary)',
                            padding: '14px 16px'
                        }}>
                            <strong style={{ fontSize: '14px', color: status?.enabled ? '#10b981' : 'var(--text-primary)' }}>
                                {status?.enabled ? '✓ Two-factor is Active' : 'Two-factor is Disabled'}
                            </strong>
                            <p className="text-secondary" style={{ marginTop: 4, fontSize: '12px', marginBottom: 0 }}>
                                {status?.enabled
                                    ? 'You will enter a 6-digit code from your phone when logging in.'
                                    : 'Scan a QR code in Google Authenticator or Authy to activate.'}
                            </p>
                        </div>

                        {/* Enable Flow */}
                        {!status?.enabled && !enrollment && (
                            <button 
                                className="btn btn-primary" 
                                onClick={startEnroll} 
                                disabled={submitting}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                            >
                                <Smartphone size={18} />
                                {submitting ? 'Setting up...' : 'Setup Authenticator App'}
                            </button>
                        )}

                        {/* QR Code Enrollment View */}
                        {enrollment && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ textAlign: 'center', padding: '12px', background: '#ffffff', borderRadius: '12px', display: 'inline-block', width: '100%', marginBottom: '16px' }}>
                                    <img
                                        src={enrollment.qrDataUrl}
                                        alt="2FA QR code"
                                        style={{ width: 180, height: 180, display: 'block', margin: '0 auto' }}
                                    />
                                </div>

                                <p className="text-secondary mb-xs" style={{ fontSize: '12px' }}>
                                    Or enter key manually:
                                </p>
                                <div className="flex gap-xs mb-md" style={{ alignItems: 'center' }}>
                                    <code style={{
                                        flex: 1,
                                        padding: '8px 10px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        wordBreak: 'break-all'
                                    }}>
                                        {enrollment.secret}
                                    </code>
                                    <button className="btn" onClick={copySecret} title="Copy code" style={{ padding: '8px' }}>
                                        {secretCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                    </button>
                                </div>

                                <form onSubmit={confirmEnroll}>
                                    <label className="input-label" style={{ fontSize: '12px' }}>Enter 6-digit verification code:</label>
                                    <div className="flex gap-sm">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\d{6}"
                                            maxLength={6}
                                            className="input"
                                            placeholder="123456"
                                            value={confirmCode}
                                            onChange={(e) => setConfirmCode(e.target.value.trim())}
                                            required
                                            style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 700 }}
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={submitting || confirmCode.length !== 6}>
                                            {submitting ? 'Verifying...' : 'Verify'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Disable 2FA Form */}
                        {status?.enabled && (
                            <form onSubmit={disable2FA} style={{ marginTop: '16px' }}>
                                <div className="input-group mb-sm">
                                    <label className="input-label" style={{ fontSize: '12px' }}>Current Password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="••••••••"
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group mb-md">
                                    <label className="input-label" style={{ fontSize: '12px' }}>6-digit Authenticator Code (Optional)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="123456"
                                        value={disableCode}
                                        onChange={(e) => setDisableCode(e.target.value.trim())}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-danger"
                                    disabled={submitting || !disablePassword}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    <ShieldOff size={16} />
                                    {submitting ? 'Disabling...' : 'Turn Off 2-Factor Authentication'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
