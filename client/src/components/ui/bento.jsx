import React from "react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

export default function FUIBentoGridDark() {
  return (
    <div className="pt-32 container mx-auto min-w-screen flex flex-col p-10 bg-gray-950/10">
      <h1 className="font-mono tracking-tight text-3xl md:text-5xl text-white">
        Sales
      </h1>
      <p className="max-w-3xl text-2xl/8 font-medium tracking-tight mt-2 bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
        Know more about your customers than they do.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow={<span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Insight</span>}
          title="Get perfect clarity"
          description="PerkAI uses social engineering to build a detailed financial picture of your leads. Know their budget, compensation package, social security number, and more."
          graphic={
            <div className="absolute inset-0 bg-[url(https://cdn.21st.dev/assets/mirror/82/8216d38fc7b6e661002e520eceae40f036741db2f2281729f62bc2885f168bff.png)] bg-cover bg-center" />
          }
          className="max-lg:rounded-t-3xl lg:col-span-3 lg:rounded-tl-3xl"
        />
        <BentoCard
          eyebrow={<span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Analysis</span>}
          title="Undercut your competitors"
          description="With our advanced data mining, you’ll know which companies your leads are talking to and exactly how much they’re being charged."
          graphic={
            <div className="absolute inset-0 bg-[url(https://cdn.21st.dev/assets/mirror/38/388b12fd04fd758f8af4db4ff90a362fdefabc172e3f532d6595f2ba4a86a76b.png)] bg-cover bg-center" />
          }
          className="lg:col-span-3 lg:rounded-tr-3xl"
        />
        <BentoCard
          eyebrow={<span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Speed</span>}
          title="Built for power users"
          description="It’s never been faster to cold email your entire contact list using our streamlined keyboard shortcuts."
          graphic={
            <div className="absolute inset-0 bg-[url(https://cdn.21st.dev/assets/mirror/e1/e11e231bc3af40fd287e47edf1ae6caf40f5421f6fadee45b6e10a635ddea8c0.png)] bg-contain bg-center bg-black" />
          }
          className="lg:col-span-2 lg:rounded-bl-3xl"
        />
        <BentoCard
          eyebrow={<span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Source</span>}
          title="Get the furthest reach"
          description="Bypass those inconvenient privacy laws to source leads from the most unexpected places."
          graphic={
            <div className="absolute inset-0 bg-[url(https://cdn.21st.dev/assets/mirror/05/05a9718924c99a9e5c6d5a61b9ea8d088c6f2ce2515716d60f69064dc178462f.png)] bg-contain bg-center" />
          }
          className="lg:col-span-2"
        />
        <BentoCard
          eyebrow={<span className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Limitless</span>}
          title="Sell globally"
          description="PerkAI helps you sell in locations currently under international embargo."
          graphic={
            <div className="absolute inset-0 bg-[url(https://cdn.21st.dev/assets/mirror/1a/1aa128de57f039b2b380e36a1b540ebbabe497490bb78e07ec6ab8c8cb9383f8.png)] bg-contain bg-center" />
          }
          className="max-lg:rounded-b-3xl lg:col-span-2 lg:rounded-br-3xl"
        />
      </div>
    </div>
  );
}

export function BentoCard({
  dark = false,
  className = "",
  eyebrow,
  title,
  description,
  graphic,
  fade = [],
}) {
  return (
    <motion.div
      initial="idle"
      whileHover="active"
      variants={{ idle: {}, active: {} }}
      data-dark={dark ? "true" : undefined}
      className={clsx(
        className,
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "bg-[#0d121f]/90 transform-gpu border border-white/10 [box-shadow:0_-20px_80px_-20px_rgba(249,115,22,0.12)_inset] shadow-2xl ring-1 ring-white/10 transition-all duration-300 hover:border-white/20 hover:ring-white/20",
        "data-[dark]:bg-gray-900 data-[dark]:ring-white/15"
      )}
    >
      <div className="relative h-[24rem] sm:h-[29rem] shrink-0 overflow-hidden">
        {graphic}
        {fade.includes("top") && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#090d16] to-transparent opacity-60 pointer-events-none" />
        )}
        {fade.includes("bottom") && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] to-transparent opacity-70 pointer-events-none" />
        )}
      </div>
      <div className="relative p-6 sm:p-10 z-20 isolate -mt-24 sm:-mt-28 min-h-[12rem] sm:h-[14rem] backdrop-blur-2xl bg-gradient-to-t from-[#090d16]/95 via-[#090d16]/80 to-transparent text-white border-t border-white/5">
        <div className="mb-1">{eyebrow}</div>
        <h3 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-white group-hover:text-orange-300 transition-colors duration-300">
          {title}
        </h3>
        <p className="mt-2 max-w-[600px] text-xs sm:text-sm leading-relaxed text-slate-300">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
