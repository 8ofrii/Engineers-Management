import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alertState, setAlertState] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: () => { },
        onCancel: () => { }
    });

    const closeAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const showAlert = useCallback((opts, maybeMessage) => {
        let type = 'info';
        let title = '';
        let message = '';
        let confirmText = 'OK';
        let cancelText = 'Cancel';
        let showCancel = false;
        let onConfirm;
        let onCancel;

        if (typeof opts === 'string') {
            type = opts;
            message = maybeMessage || '';
            title = type === 'error' ? 'خطأ' : type === 'success' ? 'نجاح' : type === 'warning' ? 'تنبيه' : 'معلومة';
        } else if (opts && typeof opts === 'object') {
            type = opts.type || 'info';
            title = opts.title || '';
            message = opts.message || '';
            confirmText = opts.confirmText || 'OK';
            cancelText = opts.cancelText || 'Cancel';
            showCancel = !!opts.showCancel;
            onConfirm = opts.onConfirm;
            onCancel = opts.onCancel;
        }

        setAlertState({
            isOpen: true,
            type,
            title,
            message,
            confirmText,
            cancelText,
            showCancel,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                closeAlert();
            },
            onCancel: () => {
                if (onCancel) onCancel();
                closeAlert();
            }
        });
    }, [closeAlert]);

    return (
        <AlertContext.Provider value={{ showAlert, closeAlert }}>
            {children}
            <CustomAlert
                isOpen={alertState.isOpen}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
                showCancel={alertState.showCancel}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
            />
        </AlertContext.Provider>
    );
};
