import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LampDemo({ titleA = "Run your next project", titleB = "on Hesaby." }) {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
        className="mt-8 bg-gradient-to-br from-slate-100 to-slate-400 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        {titleA} <br /> {titleB}
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({ children, className }) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[540px] sm:min-h-[580px] w-full flex-col items-center justify-center overflow-hidden bg-[var(--lampbase,#07090e)] rounded-[26px] z-0",
        className
      )}
    >
      {/* Background ambient lighting — purely downward, zero upward spill */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Top subtle rim highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/35 to-transparent" />
        
        {/* Soft atmospheric ceiling glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28rem] h-[60px] rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />

        {/* Ambient warmth behind the headline text */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[240px] rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        {/* Bottom smooth fade to card base */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--lampbase,#07090e)] to-transparent pointer-events-none" />
      </div>

      {/* Content wrapper: Strictly vertically centered with balanced padding */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-5 py-12 sm:py-16 my-auto">
        {children}
      </div>
    </div>
  );
};

