import React from 'react';
import { useTranslation } from 'react-i18next';
import { Infinity, Hash, Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFormat } from '../utils/format';

export default function CurrencyThresholdInput({
  value,
  onChange,
  isFallback = false,
  onToggleFallback,
  disabled = false,
  className
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { currency } = useFormat();

  if (isFallback && (value === null || value === '')) {
    return (
      <div className={cn('unlimited-capsule flex-1', className)}>
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/15 text-indigo-500 shrink-0">
          <Infinity size={16} strokeWidth={2.4} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate">
            {isAr ? 'سقف غير محدود (شريحة المبالغ الأعلى)' : 'Unlimited Ceiling (Fallback Tier)'}
          </span>
          <span className="text-[11px] opacity-75 font-normal">
            {isAr ? 'يغطي أي معاملة تتجاوز الشرائح السابقة' : 'Applies to any amount above prior tiers'}
          </span>
        </div>
      </div>
    );
  }

  const numericVal = value === null || value === '' ? '' : Number(value);
  const formattedDisplay = numericVal && numericVal > 0 ? currency(numericVal) : null;

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const clean = raw.replace(/[^\d.]/g, '');
    onChange(clean === '' ? null : clean);
  };

  return (
    <div className={cn('currency-input-group flex-1 min-w-[200px]', className)}>
      <div className="currency-prefix">
        <Coins size={14} className="me-1.5 opacity-70" />
        <span>{isAr ? 'ج.م' : 'EGP'}</span>
      </div>

      <input
        type="number"
        inputMode="decimal"
        step="100"
        min="0"
        disabled={disabled}
        value={value === null || value === undefined ? '' : value}
        onChange={handleChange}
        placeholder={isAr ? 'أدخل سقف الشريحة...' : 'Enter tier ceiling...'}
        className="currency-field"
      />

      {formattedDisplay && (
        <span className="currency-live-chip">
          {formattedDisplay}
        </span>
      )}
    </div>
  );
}
