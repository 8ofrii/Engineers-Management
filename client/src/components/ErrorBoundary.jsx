import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            const isArabic = document.documentElement.dir === 'rtl' || (localStorage.getItem('i18nextLng') || 'ar').startsWith('ar');

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary, #0f172a)',
                    color: 'var(--text-primary, #f8fafc)',
                    padding: '20px',
                    fontFamily: 'inherit'
                }}>
                    <div style={{
                        maxWidth: '540px',
                        width: '100%',
                        background: 'var(--bg-secondary, #1e293b)',
                        border: '1px solid var(--border-color, #334155)',
                        borderRadius: '16px',
                        padding: '32px',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <AlertTriangle size={36} />
                        </div>

                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px' }}>
                            {isArabic ? 'حدث خطأ غير متوقع أثناء عرض الصفحة' : 'Something went wrong rendering this page'}
                        </h2>

                        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 24px', lineHeight: 1.6 }}>
                            {isArabic
                                ? 'تم تسجيل تفاصيل الخطأ للتحقيق. يمكنك إعادة تحميل الصفحة أو العودة إلى لوحة التحكم الرئيسية.'
                                : 'An unexpected rendering error occurred. You can reload the page or return to the dashboard.'}
                        </p>

                        {this.state.error?.message && (
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '0.8rem',
                                color: '#fca5a5',
                                textAlign: 'left',
                                direction: 'ltr',
                                marginBottom: '24px',
                                overflowX: 'auto',
                                fontFamily: 'monospace'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--color-primary, #2563eb)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <RotateCcw size={16} />
                                <span>{isArabic ? 'إعادة تحميل الصفحة' : 'Reload Page'}</span>
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #334155)',
                                    background: 'transparent',
                                    color: 'var(--text-primary, #f8fafc)',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Home size={16} />
                                <span>{isArabic ? 'الرئيسية' : 'Dashboard'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
