import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import './Modal.css';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, title, message }) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={24} />
                        {title || t('common.deleteConfirmTitle')}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                        {message || t('common.deleteConfirmMessage')}
                    </p>
                    {itemName && (
                        <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', textAlign: 'center', margin: '16px 0' }}>
                            "{itemName}"
                        </p>
                    )}
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {t('common.deleteWarning')}
                    </p>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        style={{ background: 'var(--color-danger)', color: 'white', border: 'none' }}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {t('common.delete')}
                    </button>
                </div>
            </div>
        </div>
    );
}
