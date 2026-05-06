import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Smartphone, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useAlert } from '../context/AlertContext';
import { authAPI } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';

export default function TwoFactorSettings() {
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

    useEffect(() => { refresh(); }, []);

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

    if (loading) {
        return <Layout><div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner"></div></div></Layout>;
    }

    return (
        <Layout>
            <div style={{ maxWidth: '600px' }}>
                <div className="flex gap-md mb-xl">
                    <ShieldCheck size={32} color={status?.enabled ? '#10b981' : '#9ca3af'} />
                    <div>
                        <h1>Two-Factor Authentication</h1>
                        <p className="text-secondary">
                            Add an extra layer of security with a code from your phone's authenticator app.
                        </p>
                    </div>
                </div>

                {/* Status banner */}
                <div className="card mb-lg" style={{
                    borderLeft: status?.enabled ? '4px solid #10b981' : '4px solid #9ca3af'
                }}>
                    <div className="card-body">
                        <strong>
                            {status?.enabled ? '✓ Two-factor is ON' : 'Two-factor is OFF'}
                        </strong>
                        <p className="text-secondary" style={{ marginTop: 4 }}>
                            {status?.enabled
                                ? 'You will be asked for a 6-digit code at every login.'
                                : status?.pendingEnrollment
                                    ? 'Enrollment in progress. Confirm with a code below to activate.'
                                    : 'Click "Enable Two-Factor" to start.'}
                        </p>
                    </div>
                </div>

                {/* Not enabled and not in flight → start button */}
                {!status?.enabled && !enrollment && !status?.pendingEnrollment && (
                    <button className="btn btn-primary btn-lg" onClick={startEnroll} disabled={submitting}>
                        <Smartphone size={20} />
                        Enable Two-Factor
                    </button>
                )}

                {/* In-progress enrollment from THIS session — show QR + confirm */}
                {enrollment && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Step 1 — Scan the QR code</h3></div>
                        <div className="card-body">
                            <p className="text-secondary mb-md">
                                Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this code:
                            </p>
                            <div style={{ textAlign: 'center', padding: '16px' }}>
                                <img
                                    src={enrollment.qrDataUrl}
                                    alt="2FA QR code"
                                    style={{ width: 220, height: 220, border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                />
                            </div>
                            <p className="text-secondary mb-sm" style={{ fontSize: 13 }}>
                                Or enter this secret manually:
                            </p>
                            <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: '24px' }}>
                                <code style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    letterSpacing: '1px',
                                    wordBreak: 'break-all'
                                }}>
                                    {enrollment.secret}
                                </code>
                                <button className="btn" onClick={copySecret}>
                                    {secretCopied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>

                            <h3 className="card-title">Step 2 — Enter the 6-digit code</h3>
                            <form onSubmit={confirmEnroll} style={{ marginTop: 8 }}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    className="input"
                                    placeholder="123456"
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                                />
                                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} style={{ width: '100%', marginTop: 12 }}>
                                    Verify and enable
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Already enabled → disable form */}
                {status?.enabled && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title flex gap-sm" style={{ alignItems: 'center', color: '#ef4444' }}>
                                <ShieldOff size={20} /> Disable Two-Factor
                            </h3>
                        </div>
                        <div className="card-body">
                            <p className="text-secondary mb-md">
                                To disable 2FA, enter your current password AND a 6-digit code from your authenticator.
                            </p>
                            <form onSubmit={disable2FA}>
                                <div className="input-group">
                                    <label className="input-label">Current password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">6-digit code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{6}"
                                        maxLength={6}
                                        className="input"
                                        placeholder="123456"
                                        value={disableCode}
                                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn" disabled={submitting} style={{ background: '#ef4444', color: 'white' }}>
                                    Disable two-factor
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
