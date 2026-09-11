import React from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Calculator, Briefcase, ShieldCheck, Crown } from 'lucide-react';
import { Combobox } from './ui/combobox';
import { cn } from '../lib/utils';

export const ROLE_CONFIG = {
  ENGINEER: {
    key: 'ENGINEER',
    nameEn: 'Site Engineer',
    nameAr: 'مهندس الموقع',
    levelEn: 'Level 1 · Field',
    levelAr: 'مستوى 1 · ميداني',
    icon: HardHat,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    border: 'rgba(2, 132, 199, 0.28)',
    descEn: 'Petty cash & daily site expenses verification',
    descAr: 'المصروفات اليومية ومشتريات الموقع الطارئة',
  },
  ACCOUNTANT: {
    key: 'ACCOUNTANT',
    nameEn: 'Financial Accountant',
    nameAr: 'محاسب مالي',
    levelEn: 'Level 2 · Finance',
    levelAr: 'مستوى 2 · المالية',
    icon: Calculator,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    border: 'rgba(5, 150, 105, 0.28)',
    descEn: 'Voucher auditing, safe balancing & ledger posting',
    descAr: 'تدقيق أذونات الصرف ومطابقة حسابات الخزائن',
  },
  PROJECT_MANAGER: {
    key: 'PROJECT_MANAGER',
    nameEn: 'Project Manager',
    nameAr: 'مدير المشروع',
    levelEn: 'Level 3 · Operations',
    levelAr: 'مستوى 3 · قيادة المشروع',
    icon: Briefcase,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    descEn: 'Subcontractor payouts, phase milestones & materials',
    descAr: 'مستخلصات المقاولين وشراء المواد والمراحل',
  },
  ADMIN: {
    key: 'ADMIN',
    nameEn: 'Company Admin',
    nameAr: 'مدير النظام',
    levelEn: 'Level 4 · Executive',
    levelAr: 'مستوى 4 · الإدارة العليا',
    icon: ShieldCheck,
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.12)',
    border: 'rgba(234, 88, 12, 0.28)',
    descEn: 'Major company spending, custody transfers & payroll',
    descAr: 'المصروفات الكبرى، العهد الضخمة والرواتب',
  },
  SUPER_ADMIN: {
    key: 'SUPER_ADMIN',
    nameEn: 'General Manager',
    nameAr: 'المدير العام',
    levelEn: 'Level 5 · Unrestricted',
    levelAr: 'مستوى 5 · صلاحية مطلقة',
    icon: Crown,
    color: '#9333ea',
    bg: 'rgba(147, 51, 234, 0.12)',
    border: 'rgba(147, 51, 234, 0.28)',
    descEn: 'Uncapped financial authority across all company safes',
    descAr: 'صلاحية اعتماد مفتوحة على جميع الخزائن والمشاريع',
  },
};

export default function RoleCombobox({ value, onChange, disabled = false, className }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const roleOptions = Object.keys(ROLE_CONFIG).map((key) => {
    const cfg = ROLE_CONFIG[key];
    return {
      value: key,
      label: isAr ? cfg.nameAr : cfg.nameEn,
      keywords: `${cfg.nameEn} ${cfg.nameAr} ${cfg.levelEn} ${cfg.levelAr} ${key}`,
      config: cfg,
    };
  });

  return (
    <Combobox
      options={roleOptions}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={isAr ? 'اختر الدور المطلوب...' : 'Select role required...'}
      searchPlaceholder={isAr ? 'بحث في الأدوار والصلاحيات...' : 'Search roles & permissions...'}
      emptyText={isAr ? 'لم يتم العثور على دور مطابق.' : 'No matching role found.'}
      className={cn('min-w-[240px]', className)}
      buttonClassName={cn(
        'h-11 px-3.5 rounded-xl border transition-all',
        'bg-var-bg-primary text-var-text-primary',
        'hover:border-orange-500/60 focus-visible:ring-2 focus-visible:ring-orange-500/30'
      )}
      renderTrigger={(selectedOpt, placeholderText) => {
        if (!selectedOpt) {
          return <span className="text-slate-400 dark:text-zinc-500">{placeholderText}</span>;
        }
        const cfg = selectedOpt.config || ROLE_CONFIG[selectedOpt.value] || ROLE_CONFIG.ADMIN;
        const Icon = cfg.icon || ShieldCheck;
        const roleName = isAr ? cfg.nameAr : cfg.nameEn;
        const roleLevel = isAr ? cfg.levelAr : cfg.levelEn;

        return (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <Icon size={16} strokeWidth={2.3} />
            </div>
            <span className="font-semibold text-[13.5px] truncate text-slate-800 dark:text-zinc-100">
              {roleName}
            </span>
            <span
              className="ms-auto text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {roleLevel}
            </span>
          </div>
        );
      }}
      renderItem={(opt, isSelected) => {
        const cfg = opt.config || ROLE_CONFIG[opt.value] || ROLE_CONFIG.ADMIN;
        const Icon = cfg.icon || ShieldCheck;
        const roleName = isAr ? cfg.nameAr : cfg.nameEn;
        const roleDesc = isAr ? cfg.descAr : cfg.descEn;
        const roleLevel = isAr ? cfg.levelAr : cfg.levelEn;

        return (
          <div className="flex items-start gap-3 py-1 flex-1 min-w-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <Icon size={18} strokeWidth={2.3} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[13.5px] text-slate-900 dark:text-zinc-100 truncate">
                  {roleName}
                </span>
                <span
                  className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {roleLevel}
                </span>
              </div>
              <span className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {roleDesc}
              </span>
            </div>
          </div>
        );
      }}
    />
  );
}
