import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FlowButton({
  text = "Modern Button",
  variant = "dark",
  className,
  children,
  ...props
}) {
  const content = children || text;

  // Determine styles based on variant
  // 'dark' = for light backgrounds (dark text & dark expanding circle)
  // 'light' = for dark backgrounds (white text/border, white expanding circle with dark text on hover)
  // 'hesaby' = for dark backgrounds with hesaby orange accent (white text, orange hover circle)
  const isLightOrHesaby = variant === 'light' || variant === 'hesaby';

  const baseStyles = isLightOrHesaby
    ? "border-white/30 text-white hover:text-white"
    : "border-[#333333]/40 text-[#111111] hover:text-white";

  const strokeClass = isLightOrHesaby
    ? "stroke-white group-hover:stroke-white"
    : "stroke-[#111111] group-hover:stroke-white";

  const circleBg = variant === 'hesaby'
    ? "bg-gradient-to-r from-orange-500 to-amber-500"
    : variant === 'light'
      ? "bg-white text-slate-900 group-hover:!text-slate-950"
      : "bg-[#111111]";

  return (
    <button
      className={cn(
        "group relative inline-flex items-center gap-1 overflow-hidden rounded-[100px] border-[1.5px] bg-transparent px-8 py-3 text-sm font-semibold cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:rounded-[14px] active:scale-[0.96]",
        baseStyles,
        className
      )}
      {...props}
    >
      {/* Left arrow (arr-2) */}
      <ArrowRight
        className={cn(
          "absolute w-4 h-4 left-[-25%] fill-none z-[9] group-hover:left-4 transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] rtl:rotate-180",
          strokeClass,
          variant === 'light' && "group-hover:stroke-slate-900"
        )}
      />

      {/* Text */}
      <span className={cn(
        "relative z-[1] -translate-x-3 group-hover:translate-x-3 transition-all duration-[800ms] ease-out",
        variant === 'light' && "group-hover:text-slate-900"
      )}>
        {content}
      </span>

      {/* Circle ripple fill on hover */}
      <span
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-[50%] opacity-0 group-hover:w-[320px] group-hover:h-[320px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] z-0",
          circleBg
        )}
      />

      {/* Right arrow (arr-1) */}
      <ArrowRight
        className={cn(
          "absolute w-4 h-4 right-4 fill-none z-[9] group-hover:right-[-25%] transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] rtl:rotate-180",
          strokeClass,
          variant === 'light' && "group-hover:stroke-slate-900"
        )}
      />
    </button>
  );
}

export default FlowButton;
