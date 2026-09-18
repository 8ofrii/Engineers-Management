import { useTranslation } from 'react-i18next';
import { Phone, Plus, Trash2 } from 'lucide-react';

export default function MultiPhoneInput({
    phones = [],
    onChange,
    label,
    required = false,
    error,
    placeholder,
    maxPhones = 5
}) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');

    // Normalize: ensure at least one entry for user to type
    const phoneList = Array.isArray(phones) && phones.length > 0 ? phones : [''];

    const handleNumberChange = (index, value) => {
        const next = [...phoneList];
        next[index] = value;
        if (onChange) onChange(next);
    };

    const handleAddPhone = () => {
        if (phoneList.length >= maxPhones) return;
        const next = [...phoneList, ''];
        if (onChange) onChange(next);
    };

    const handleRemovePhone = (index) => {
        if (phoneList.length <= 1) {
            // Clear rather than remove the only field
            if (onChange) onChange(['']);
            return;
        }
        const next = phoneList.filter((_, i) => i !== index);
        if (onChange) onChange(next);
    };

    const defaultLabel = isRTL ? 'أرقام الهاتف' : 'Phone Numbers';
    const defaultPlaceholder = isRTL ? 'مثال: 01012345678' : 'e.g. +20 101 234 5678';

    return (
        <div className="form-group multi-phone-input-group" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {label || defaultLabel} {required && <span className="required" style={{ color: '#ef4444' }}>*</span>}
                </label>
                {phoneList.length < maxPhones && (
                    <button
                        type="button"
                        onClick={handleAddPhone}
                        className="btn-link"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}
                    >
                        <Plus size={14} />
                        <span>{isRTL ? 'إضافة رقم آخر +' : '+ Add another phone'}</span>
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {phoneList.map((num, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                            <Phone
                                size={15}
                                style={{
                                    position: 'absolute',
                                    [isRTL ? 'right' : 'left']: '12px',
                                    color: 'var(--text-tertiary)',
                                    pointerEvents: 'none'
                                }}
                            />
                            <input
                                type="tel"
                                value={num}
                                onChange={(e) => handleNumberChange(idx, e.target.value)}
                                placeholder={placeholder || defaultPlaceholder}
                                className={error && idx === 0 ? 'error' : ''}
                                style={{
                                    width: '100%',
                                    [isRTL ? 'paddingRight' : 'paddingLeft']: '36px',
                                    [isRTL ? 'paddingLeft' : 'paddingRight']: idx === 0 ? '75px' : '12px',
                                    direction: 'ltr',
                                    textAlign: isRTL ? 'right' : 'left',
                                    height: '40px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}
                            />
                            {idx === 0 ? (
                                <span
                                    style={{
                                        position: 'absolute',
                                        [isRTL ? 'left' : 'right']: '10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(59, 130, 246, 0.12)',
                                        color: '#3b82f6',
                                        pointerEvents: 'none',
                                        userSelect: 'none'
                                    }}
                                >
                                    {isRTL ? 'الأساسي' : 'Primary'}
                                </span>
                            ) : null}
                        </div>

                        {idx > 0 && (
                            <button
                                type="button"
                                onClick={() => handleRemovePhone(idx)}
                                title={isRTL ? 'حذف هذا الرقم' : 'Remove this phone'}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-tertiary)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {error && <span className="error-message" style={{ display: 'block', marginTop: '4px', color: '#ef4444', fontSize: '0.8rem' }}>{error}</span>}
        </div>
    );
}
