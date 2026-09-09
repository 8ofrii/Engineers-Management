'use client';
import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: 'dark' | 'light' | 'hesaby' | 'emerald' | 'cyan';
  className?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}

export function FlowButton({
  text = "Modern Button",
  variant = "light",
  className,
  children,
  icon: IconComponent,
  ...props
}: FlowButtonProps) {
  const content = children || text;

  // Variant-specific styles: all dark-theme variants use dark glass backgrounds with sophisticated specular borders
  let baseStyles = "border-white/20 text-white hover:text-white bg-white/[0.04] backdrop-blur-sm";
  let strokeClass = "stroke-white group-hover:stroke-white";
  let circleBg = "bg-white text-slate-900 group-hover:!text-slate-950";

  if (variant === 'hesaby') {
    baseStyles = "border-orange-500/30 text-orange-200 hover:text-white bg-orange-950/20 hover:border-orange-500/50 shadow-[0_2px_12px_rgba(249,115,22,0.15)]";
    strokeClass = "stroke-orange-300 group-hover:stroke-white";
    circleBg = "bg-gradient-to-r from-orange-500 to-amber-500";
  } else if (variant === 'emerald') {
    baseStyles = "border-emerald-500/30 text-emerald-200 hover:text-white bg-emerald-950/25 hover:border-emerald-400/60 shadow-[0_2px_16px_rgba(16,185,129,0.15)]";
    strokeClass = "stroke-emerald-300 group-hover:stroke-white";
    circleBg = "bg-gradient-to-r from-emerald-500 to-teal-500";
  } else if (variant === 'cyan') {
    baseStyles = "border-cyan-500/30 text-cyan-200 hover:text-white bg-cyan-950/25 hover:border-cyan-400/60 shadow-[0_2px_16px_rgba(6,182,212,0.15)]";
    strokeClass = "stroke-cyan-300 group-hover:stroke-white";
    circleBg = "bg-gradient-to-r from-cyan-500 to-blue-500";
  } else if (variant === 'light') {
    baseStyles = "border-white/25 text-white hover:text-slate-950 bg-white/5 hover:border-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.3)]";
    strokeClass = "stroke-white group-hover:stroke-slate-900";
    circleBg = "bg-white";
  } else if (variant === 'dark') {
    baseStyles = "border-[#333333]/40 text-[#111111] hover:text-white bg-transparent";
    strokeClass = "stroke-[#111111] group-hover:stroke-white";
    circleBg = "bg-[#111111]";
  }

  const LeftIcon = IconComponent || ArrowRight;
  const RightIcon = IconComponent || ArrowRight;

  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[100px] border-[1.5px] px-8 py-3 text-sm font-semibold cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:rounded-[14px] active:scale-[0.97]",
        baseStyles,
        className
      )}
      {...props}
    >
      {/* Left Icon (arr-2) */}
      <LeftIcon
        size={16}
        className={cn(
          "absolute left-[-25%] fill-none z-[9] group-hover:left-4 transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] rtl:rotate-180",
          strokeClass,
          variant === 'light' && "group-hover:stroke-slate-900"
        )}
      />

      {/* Text / Content */}
      <span className={cn(
        "relative z-[1] -translate-x-2 group-hover:translate-x-2 transition-all duration-[800ms] ease-out flex items-center gap-2",
        variant === 'light' && "group-hover:text-slate-900"
      )}>
        {content}
      </span>

      {/* Circle ripple fill on hover */}
      <span
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-[50%] opacity-0 group-hover:w-[500px] group-hover:h-[500px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] z-0 pointer-events-none",
          circleBg
        )}
      />

      {/* Right Icon (arr-1) */}
      <RightIcon
        size={16}
        className={cn(
          "absolute right-4 fill-none z-[9] group-hover:right-[-25%] transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] rtl:rotate-180",
          strokeClass,
          variant === 'light' && "group-hover:stroke-slate-900"
        )}
      />
    </button>
  );
}

export default FlowButton;
