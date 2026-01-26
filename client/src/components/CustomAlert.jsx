import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const CustomAlert = ({ isOpen, type = 'info', title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', showCancel = false }) => {
    if (!isOpen) return null;

    // Define colors mapping (assuming standard CSS variables are available, or hardcode fallbacks)
    const typeConfigs = {
        info: {
            color: 'var(--color-primary, #3b82f6)',
            bg: 'var(--color-primary-bg, #eff6ff)',
            icon: Info
        },
        success: {
            color: 'var(--color-success, #22c55e)',
            bg: 'var(--color-success-bg, #f0fdf4)',
            icon: CheckCircle
        },
        warning: {
            color: 'var(--color-warning, #f59e0b)',
            bg: 'var(--color-warning-bg, #fffbeb)',
            icon: AlertTriangle
        },
        danger: {
            color: 'var(--color-danger, #ef4444)',
            bg: 'var(--color-danger-bg, #fef2f2)',
            icon: AlertTriangle // or XCircle
        },
        error: { // Alias for danger
            color: 'var(--color-danger, #ef4444)',
            bg: 'var(--color-danger-bg, #fef2f2)',
            icon: XCircle
        }
    };

    const config = typeConfigs[type] || typeConfigs.info;
    const Icon = config.icon;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={showCancel ? onCancel : onConfirm}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{
                maxWidth: '400px', width: '90%',
                background: 'var(--bg-secondary, #1f2937)',
                borderRadius: '16px',
                padding: '30px',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--border-color, #374151)'
            }}>
                <div style={{
                    marginBottom: '20px', display: 'flex', justifyContent: 'center'
                }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: `${config.color}20`, // 20% opacity using hex if possible, else might fail if var is not hex. 
                        // fallback to explicit rgba if var is tricky, but usually works if var is hex.
                        // Safe approach: just use the bg color defined above if available.
                        backgroundColor: config.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Icon size={32} color={config.color} />
                    </div>
                </div>

                <h3 style={{
                    marginBottom: '12px', fontSize: '20px', fontWeight: 'bold',
                    color: 'var(--text-primary, #f9fafb)'
                }}>{title}</h3>

                <p style={{
                    color: 'var(--text-secondary, #9ca3af)', marginBottom: '28px',
                    lineHeight: '1.5', fontSize: '15px'
                }}>{message}</p>

                <div style={{ display: 'grid', gridTemplateColumns: showCancel ? '1fr 1fr' : '1fr', gap: '12px' }}>
                    {showCancel && (
                        <button
                            className="btn"
                            onClick={onCancel}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color, #374151)',
                                color: 'var(--text-primary, #f9fafb)',
                                padding: '12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        className="btn"
                        onClick={onConfirm}
                        style={{
                            backgroundColor: config.color,
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            boxShadow: `0 4px 12px ${config.color}40`
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomAlert;
