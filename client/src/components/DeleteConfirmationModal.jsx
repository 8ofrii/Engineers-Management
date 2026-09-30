import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import './Modal.css';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, title, message }) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ maxWidth: '480px', padding: '32px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} style={{ position: 'absolute', right: '24px', top: '24px' }}>
                    <X size={24} />
                </button>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ 
                        width: '72px', 
                        height: '72px', 
                        borderRadius: '50%', 
                        background: 'rgba(234, 179, 8, 0.15)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginBottom: '24px'
                    }}>
                        <AlertTriangle size={36} color="#eab308" />
                    </div>

                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        {title || t('common.deleteConfirmTitle', 'Confirm Deletion')}
                    </h2>

                    <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                        {message || t('common.deleteConfirmMessage', 'Are you sure you want to delete')}
                        {itemName && (
                            <strong style={{ color: 'var(--text-primary)' }}> "{itemName}"</strong>
                        )}?
                        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
                            {t('common.deleteWarning', 'This action cannot be undone.')}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                            style={{ flex: 1, padding: '12px', fontSize: '16px', fontWeight: '600', justifyContent: 'center' }}
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            style={{ 
                                flex: 1, 
                                padding: '12px', 
                                fontSize: '16px',
                                fontWeight: '600',
                                background: 'var(--color-danger)', 
                                color: 'white', 
                                border: 'none',
                                justifyContent: 'center'
                            }}
                        >
                            {t('common.delete', 'Delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
