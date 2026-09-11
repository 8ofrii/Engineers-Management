import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Hesaby Architectural Lamp Container
 * Features:
 * - A genuine physical architectural luminaire fixture (chassis housing, suspension cables, end-caps, illuminated neon diffuser filament)
 * - The Hesaby [H] medallion splitting the fixture symmetrically in the center
 * - Volumetric 21st.dev dual conic-gradient light engine radiating physically DOWNWARD from the underside of the luminaire
 * - Multi-layered atmospheric blur orbs (hotspot, filament flare, and ambient bath)
 * - Complete upward mask ensuring zero light leaks above the fixture
 * - Perfectly balanced vertical content centering
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
        "relative flex min-h-[580px] sm:min-h-[620px] w-full flex-col items-center justify-center overflow-hidden bg-[var(--lampbase,#07090e)] rounded-[26px] z-0",
        className
      )}
    >
      {/* 1. Solid Top Ceiling Mask: Ensures absolute darkness above the fixture — zero upward light leak */}
      <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-[var(--lampbase,#07090e)] via-[var(--lampbase,#07090e)] to-transparent z-10 pointer-events-none" />

      {/* 2. Top subtle card border highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none z-10" />

      {/* 3. Main Content Stage (Vertically centered with balanced padding) */}
      <div className="relative z-20 flex w-full flex-col items-center justify-center px-5 py-12 sm:py-16 my-auto">
        
        {/* ==================================================================== */}
        {/* PHYSICAL ARCHITECTURAL LAMP FIXTURE (with H splitting the wings)    */}
        {/* ==================================================================== */}
        <div className="relative flex items-center justify-center w-full mb-8 sm:mb-10 z-20">
          
          {/* Subtle Ceiling Suspension Cables */}
          <div className="absolute -top-12 left-[calc(50%-130px)] sm:left-[calc(50%-180px)] w-[1px] h-12 bg-gradient-to-b from-stone-800/0 via-stone-500/40 to-stone-400/80 pointer-events-none" />
          <div className="absolute -top-12 right-[calc(50%-130px)] sm:right-[calc(50%-180px)] w-[1px] h-12 bg-gradient-to-b from-stone-800/0 via-stone-500/40 to-stone-400/80 pointer-events-none" />

          {/* LEFT LUMINAIRE WING */}
          <div className="relative flex items-center justify-end">
            {/* Outer End-Cap / Beveled Metallic Terminal */}
            <div className="w-2 sm:w-2.5 h-3 sm:h-3.5 bg-gradient-to-r from-stone-600 via-stone-500 to-stone-700 rounded-l-[3px] border-y border-l border-white/20 shadow-sm flex-shrink-0" />

            {/* Main Luminaire Chassis Bar (physical depth, brushed titanium casing) */}
            <motion.div
              initial={{ width: "4rem", opacity: 0.4 }}
              whileInView={{ width: "12rem sm:16rem", opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
              className="relative h-3 sm:h-3.5 w-36 sm:w-56 md:w-64 bg-gradient-to-b from-[#313540] via-[#1d2028] to-[#0e1015] border-y border-stone-600/70 shadow-[0_2px_12px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* Top Specular Rim Reflection */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
              
              {/* Lower Optical Diffuser Channel */}
              <div className="absolute bottom-[1px] inset-x-1 h-[2px] rounded-full bg-gradient-to-r from-amber-400/40 via-amber-200 to-orange-400 shadow-[0_0_10px_#fb923c]" />
              
              {/* Glowing Core Filament */}
              <div className="absolute bottom-[2px] inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white to-amber-100 shadow-[0_0_6px_#fff]" />
            </motion.div>

            {/* Left Collar Mount (locks into center H medallion) */}
            <div className="w-1.5 h-3.5 sm:h-4 bg-gradient-to-b from-stone-600 via-stone-700 to-stone-900 border-y border-white/20 flex-shrink-0" />
          </div>

          {/* CENTER MEDALLION HUB (The 'H' splitting the lamp) */}
          <div className="mx-2 sm:mx-3 relative z-30 flex-shrink-0">
            <div className="relative group">
              {/* Dynamic Backlight Halo */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-70 blur-md pointer-events-none" />
              
              {/* Precision Machined Medallion Housing */}
              <div className="relative w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-[16px] bg-[#0c0d12] border border-amber-500/50 p-1 flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                {badge || (
                  <span
                    className="hx-logo-chip"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 18px rgba(255,120,40,0.5)',
                    }}
                  >
                    <img
                      src="/hesaby_logo_icon.svg"
                      alt={badgeAlt}
                      style={{ width: 32, height: 32, display: 'block' }}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT LUMINAIRE WING */}
          <div className="relative flex items-center justify-start">
            {/* Right Collar Mount (locks into center H medallion) */}
            <div className="w-1.5 h-3.5 sm:h-4 bg-gradient-to-b from-stone-600 via-stone-700 to-stone-900 border-y border-white/20 flex-shrink-0" />

            {/* Main Luminaire Chassis Bar (physical depth, brushed titanium casing) */}
            <motion.div
              initial={{ width: "4rem", opacity: 0.4 }}
              whileInView={{ width: "12rem sm:16rem", opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
              className="relative h-3 sm:h-3.5 w-36 sm:w-56 md:w-64 bg-gradient-to-b from-[#313540] via-[#1d2028] to-[#0e1015] border-y border-stone-600/70 shadow-[0_2px_12px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* Top Specular Rim Reflection */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10" />
              
              {/* Lower Optical Diffuser Channel */}
              <div className="absolute bottom-[1px] inset-x-1 h-[2px] rounded-full bg-gradient-to-l from-amber-400/40 via-amber-200 to-orange-400 shadow-[0_0_10px_#fb923c]" />
              
              {/* Glowing Core Filament */}
              <div className="absolute bottom-[2px] inset-x-2 h-[1px] bg-gradient-to-l from-transparent via-white to-amber-100 shadow-[0_0_6px_#fff]" />
            </motion.div>

            {/* Outer End-Cap / Beveled Metallic Terminal */}
            <div className="w-2 sm:w-2.5 h-3 sm:h-3.5 bg-gradient-to-l from-stone-600 via-stone-500 to-stone-700 rounded-r-[3px] border-y border-r border-white/20 shadow-sm flex-shrink-0" />
          </div>

          {/* High-Intensity Radiant Flare immediately underneath the emitter */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[22rem] sm:w-[34rem] h-[3px] bg-gradient-to-r from-transparent via-amber-200 to-transparent shadow-[0_3px_20px_5px_rgba(255,140,50,0.95)] pointer-events-none z-10" />

          {/* ================================================================== */}
          {/* VOLUMETRIC 21ST.DEV DUAL CONIC LIGHT ENGINE (Directly below lamp)  */}
          {/* ================================================================== */}
          <div className="absolute top-[26px] left-1/2 -translate-x-1/2 w-full max-w-[50rem] h-[380px] pointer-events-none select-none z-0">
            
            {/* Left Conic Beam: Starts at lamp emitter, radiates down-left */}
            <motion.div
              initial={{ opacity: 0.4, width: "16rem" }}
              whileInView={{ opacity: 1, width: "24rem sm:28rem" }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
              style={{
                backgroundImage: `conic-gradient(from 180deg at 100% 0%, rgba(255,115,30,0.65) 0deg, rgba(255,150,45,0.30) 35deg, rgba(255,120,30,0.06) 60deg, transparent 75deg)`,
              }}
              className="absolute right-1/2 top-0 h-[340px] w-64 sm:w-80 md:w-96 pointer-events-none"
            >
              {/* Smooth Bottom & Side Falloff Masks */}
              <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,white_15%,transparent_90%)]" />
              <div className="absolute inset-0 [mask-image:linear-gradient(to_left,white_20%,transparent_95%)]" />
            </motion.div>

            {/* Right Conic Beam: Starts at lamp emitter, radiates down-right */}
            <motion.div
              initial={{ opacity: 0.4, width: "16rem" }}
              whileInView={{ opacity: 1, width: "24rem sm:28rem" }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
              style={{
                backgroundImage: `conic-gradient(from 105deg at 0% 0%, transparent 0deg, rgba(255,120,30,0.06) 15deg, rgba(255,150,45,0.30) 40deg, rgba(255,115,30,0.65) 75deg, transparent 76deg)`,
              }}
              className="absolute left-1/2 top-0 h-[340px] w-64 sm:w-80 md:w-96 pointer-events-none"
            >
              {/* Smooth Bottom & Side Falloff Masks */}
              <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,white_15%,transparent_90%)]" />
              <div className="absolute inset-0 [mask-image:linear-gradient(to_right,white_20%,transparent_95%)]" />
            </motion.div>

            {/* Atmospheric Multi-Layer Glow Orbs */}
            {/* 1. Primary Hotspot immediately underneath fixture */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[22rem] sm:w-[32rem] h-20 rounded-full bg-orange-500/40 blur-xl pointer-events-none" />

            {/* 2. Core Golden Filament Flare */}
            <motion.div
              initial={{ width: "10rem" }}
              whileInView={{ width: "18rem sm:24rem" }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
              className="absolute top-2 left-1/2 -translate-x-1/2 w-56 sm:w-72 h-24 rounded-full bg-amber-300/45 blur-lg pointer-events-none"
            />

            {/* 3. Broad Ambient Glow washing over headline text */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[28rem] sm:w-[40rem] h-64 rounded-full bg-orange-600/18 blur-3xl pointer-events-none" />
          </div>
        </div>

        {/* 4. Illuminated Content Area (Headline, Lead, CTA) */}
        <div className="relative z-20 flex flex-col items-center text-center w-full">
          {children}
        </div>
      </div>

      {/* 5. Smooth Base Gradient: blends softly into the bottom of the card */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[var(--lampbase,#07090e)] to-transparent pointer-events-none z-10" />
    </div>
  );
};
