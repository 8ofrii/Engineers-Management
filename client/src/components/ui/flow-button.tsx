'use client';
import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: 'dark' | 'light' | 'hesaby' | 'emerald' | 'cyan';
  className?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  iconOnly?: boolean;
}

export function FlowButton({
  text = "Modern Button",
  variant = "light",
  className,
  children,
  icon: IconComponent,
  iconOnly = false,
  ...props
}: FlowButtonProps) {
  const content = children || text;

  // Variant-specific styles: 100% opaque solid fills with zero transparency/glass
  let baseStyles = "border-slate-300 bg-white text-slate-900 font-bold shadow-md opacity-100";
  let strokeClass = "stroke-slate-900 group-hover:stroke-slate-950";
  let circleBg = "bg-slate-100 text-slate-900";

  if (variant === 'hesaby') {
    baseStyles = "border-orange-500 text-white font-bold bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-[0_4px_20px_rgba(249,115,22,0.45)] hover:shadow-[0_6px_25px_rgba(249,115,22,0.6)] opacity-100";
    strokeClass = "stroke-white group-hover:stroke-white";
    circleBg = "bg-orange-600";
  } else if (variant === 'emerald') {
    baseStyles = "border-emerald-500 text-white font-bold bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.6)] opacity-100";
    strokeClass = "stroke-white group-hover:stroke-white";
    circleBg = "bg-emerald-700";
  } else if (variant === 'cyan') {
    baseStyles = "border-sky-500 text-white font-bold bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-[0_4px_16px_rgba(2,132,199,0.4)] hover:shadow-[0_6px_22px_rgba(2,132,199,0.6)] opacity-100";
    strokeClass = "stroke-white group-hover:stroke-white";
    circleBg = "bg-sky-700";
  } else if (variant === 'light') {
    baseStyles = "border-slate-300 bg-white text-slate-900 font-bold hover:bg-slate-50 hover:border-slate-400 shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] opacity-100";
    strokeClass = "stroke-slate-900 group-hover:stroke-slate-950";
    circleBg = "bg-slate-100";
  } else if (variant === 'dark') {
    baseStyles = "border-slate-900 text-white font-bold bg-slate-900 hover:bg-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.3)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.45)] opacity-100";
    strokeClass = "stroke-white group-hover:stroke-white";
    circleBg = "bg-slate-800";
  }

  const isDefaultArrow = !IconComponent;

  if (iconOnly) {
    const CenterIcon = IconComponent || ArrowRight;
    return (
      <button
        data-variant={variant}
        className={cn(
          "group relative inline-flex items-center justify-center overflow-hidden rounded-full border-[1.5px] w-9 h-9 shrink-0 cursor-pointer transition-all duration-[500ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:rounded-[10px] active:scale-[0.95]",
          baseStyles,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-[50%] opacity-0 group-hover:w-[120px] group-hover:h-[120px] group-hover:opacity-100 transition-all duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)] z-0 pointer-events-none",
            circleBg
          )}
        />
        <CenterIcon
          size={16}
          className={cn(
            "relative z-[1] transition-transform duration-300 group-hover:scale-110",
            strokeClass,
            variant === 'light' && "group-hover:stroke-slate-900"
          )}
        />
      </button>
    );
  }

  return (
    <button
      data-variant={variant}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[100px] border-[1.5px] px-6 py-2.5 text-sm font-semibold cursor-pointer select-none transition-all duration-[500ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:rounded-[14px] active:scale-[0.97]",
        baseStyles,
        className
      )}
      {...props}
    >
      {/* Circle ripple fill on hover */}
      <span
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-[50%] opacity-0 group-hover:w-[500px] group-hover:h-[500px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] z-0 pointer-events-none",
          circleBg
        )}
      />

      {/* Text / Content */}
      <span className={cn(
        "relative z-[1] whitespace-nowrap transition-colors duration-300",
        variant === 'light' && "group-hover:text-slate-900"
      )}>
        {content}
      </span>

      {/* Trailing Icon container */}
      {isDefaultArrow ? (
        <span className="relative z-[1] inline-flex items-center justify-center w-4 h-4 overflow-hidden shrink-0 pointer-events-none">
          {/* Primary Arrow: slides out to right (or left in RTL) on hover */}
          <ArrowRight
            size={14}
            className={cn(
              "fill-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0",
              "group-hover:translate-x-5 rtl:group-hover:-translate-x-5",
              "rtl:rotate-180",
              strokeClass,
              variant === 'light' && "group-hover:stroke-slate-900"
            )}
          />
          {/* Secondary Arrow: slides in from left (or right in RTL) on hover */}
          <ArrowRight
            size={14}
            className={cn(
              "absolute fill-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0",
              "-translate-x-5 group-hover:translate-x-0 rtl:translate-x-5 rtl:group-hover:translate-x-0",
              "rtl:rotate-180",
              strokeClass,
              variant === 'light' && "group-hover:stroke-slate-900"
            )}
          />
        </span>
      ) : (
        <span className="relative z-[1] inline-flex items-center justify-center shrink-0 pointer-events-none transition-transform duration-300 group-hover:scale-110">
          <IconComponent
            size={14}
            className={cn(
              "shrink-0",
              strokeClass,
              variant === 'light' && "group-hover:stroke-slate-900"
            )}
          />
        </span>
      )}
    </button>
  );
}

export default FlowButton;
