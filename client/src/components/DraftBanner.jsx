import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Sparkles } from 'lucide-react';

export default function DraftBanner({ onDiscard, style = {} }) {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar' || i18n.language?.startsWith('ar');

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                ...style
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                <span>
                    {isAr
                        ? 'تمت استعادة البيانات التي أدخلتها سابقاً تلقائياً'
                        : 'Auto-restored your previously unsaved draft'}
                </span>
            </div>
            {onDiscard && (
                <button
                    type="button"
                    onClick={onDiscard}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger, #ef4444)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                    }}
                    title={isAr ? 'مسح المسودة والبدء من جديد' : 'Discard draft and start fresh'}
                >
                    <RotateCcw size={12} />
                    {isAr ? 'تفريغ المسودة' : 'Discard'}
                </button>
            )}
        </div>
    );
}
