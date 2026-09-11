import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Hesaby Luminous Lamp Container
 * - Central Hesaby [H] medallion cleanly splitting the radiant lamp fixture
 * - Left and right glowing neon luminaire wings with hot white cores and amber halos
 * - Volumetric downward light beam radiating smoothly from the fixture onto the headline
 * - Zero seams, zero weird boxes, silky-smooth atmospheric lighting
 */
export function LampDemo({ titleA = "Build lamps", titleB = "the right way" }) {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-6 bg-gradient-to-br from-slate-100 via-stone-200 to-stone-400 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        {titleA} <br /> {titleB}
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
  badge,
  badgeAlt = "Hesaby",
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[540px] sm:min-h-[580px] w-full flex-col items-center justify-center overflow-hidden bg-[var(--lampbase,#0c0c0e)] rounded-[26px] z-0",
        className
      )}
    >
      {/* Top subtle card rim highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent pointer-events-none z-10" />

      {/* Main Content Stage: vertically centered with balanced padding */}
      <div className="relative z-20 flex w-full flex-col items-center justify-center px-5 py-12 sm:py-16 my-auto">
        
        {/* ================================================================ */}
        {/* THE LUMINOUS LAMP FIXTURE (H in center, splitting radiant wings)  */}
        {/* ================================================================ */}
        <div className="relative flex items-center justify-center w-full mb-7 sm:mb-8 z-20">
          
          {/* Left Glowing Lamp Wing */}
          <motion.div
            initial={{ width: "3rem", opacity: 0.4 }}
            whileInView={{ width: "12rem", opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
            className="h-[3px] sm:h-1 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-orange-400 shadow-[0_0_16px_3px_rgba(255,140,50,0.9),0_0_4px_#fff]"
          />

          {/* Center Hesaby [H] Medallion */}
          <div className="mx-3 sm:mx-4 relative z-30 flex-shrink-0">
            <div className="relative">
              {/* Backlight halo */}
              <div className="absolute -inset-2 rounded-2xl bg-orange-500/40 blur-lg pointer-events-none" />
              
              {badge || (
                <span
                  className="hx-logo-chip shadow-[0_0_28px_rgba(255,120,40,0.6)]"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <img
                    src="/hesaby_logo_icon.svg"
                    alt={badgeAlt}
                    style={{ width: 36, height: 36, display: 'block' }}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Right Glowing Lamp Wing */}
          <motion.div
            initial={{ width: "3rem", opacity: 0.4 }}
            whileInView={{ width: "12rem", opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
            className="h-[3px] sm:h-1 rounded-full bg-gradient-to-l from-transparent via-amber-300 to-orange-400 shadow-[0_0_16px_3px_rgba(255,140,50,0.9),0_0_4px_#fff]"
          />

          {/* ================================================================ */}
          {/* VOLUMETRIC DOWNWARD LIGHT CONE (Radiating directly from the lamp) */}
          {/* ================================================================ */}
          
          {/* 1. Hotspot immediately at the fixture emitter */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] sm:w-[30rem] h-20 rounded-full bg-orange-500/40 blur-xl pointer-events-none z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-12 rounded-full bg-amber-300/60 blur-md pointer-events-none z-0" />

          {/* 2. Seamless Downward Volumetric Light Cone */}
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[34rem] sm:w-[46rem] max-w-[95vw] h-[340px] pointer-events-none select-none z-0"
            style={{
              background: `radial-gradient(ellipse 60% 75% at 50% 0%, rgba(255,135,45,0.42) 0%, rgba(255,95,25,0.18) 40%, rgba(255,70,15,0.03) 70%, transparent 100%)`,
              filter: "blur(6px)",
            }}
          />

          {/* 3. Broad Ambient Glow Bathing the Headline */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[30rem] sm:w-[42rem] h-60 rounded-full bg-orange-600/15 blur-3xl pointer-events-none z-0" />
        </div>

        {/* Illuminated Content (Headline, Lead, CTA) */}
        <div className="relative z-20 flex flex-col items-center text-center w-full">
          {children}
        </div>
      </div>

      {/* Bottom smooth fade to card base */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--lampbase,#0c0c0e)] to-transparent pointer-events-none z-10" />
    </div>
  );
};
