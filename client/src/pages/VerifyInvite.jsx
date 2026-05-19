import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { CheckCircle, XCircle, Loader, Building2 } from 'lucide-react';
import './Auth.css';

export default function VerifyInvite() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your account...');

    const attemptRef = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        if (attemptRef.current) return;
        attemptRef.current = true;

        const verify = async () => {
            try {
                await authAPI.verifyInvite(token);
                setStatus('success');
                setMessage('Account verified successfully!');
                // Optional: Redirect after a few seconds
                // setTimeout(() => navigate('/login'), 3000); 
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Link may be expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="auth-container">
            <div className="auth-background"></div>
            <div className="auth-content">
                <div className="auth-card glass" style={{ textAlign: 'center', maxWidth: '450px' }}>
                    <div className="auth-header">
                        <div className="auth-logo">
                            <Building2 size={40} />
                        </div>
                        <h1>Account Verification</h1>
                    </div>

                    <div style={{ padding: '30px 0' }}>
                        {status === 'verifying' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <div className="spinner" style={{ width: '48px', height: '48px', border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
                                <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <CheckCircle size={56} color="#22c55e" />
                                <div>
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Verified!</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
                                </div>
                                <Link to="/login" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                                    Proceed to Login
                                </Link>
                            </div>
                        )}

                        {status === 'error' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <XCircle size={56} color="#ef4444" />
                                <div>
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#ef4444' }}>Verification Failed</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
                                </div>
                                <Link to="/login" className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
                                    Back to Login
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
