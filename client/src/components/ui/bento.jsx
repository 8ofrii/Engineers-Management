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
  isLight = false,
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
      data-light={isLight ? "true" : undefined}
      className={clsx(
        "bento-card-root group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 transform-gpu hover:-translate-y-1",
        isLight
          ? "bg-white border border-slate-200/90 ring-1 ring-slate-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:border-orange-400/80 hover:ring-orange-300/40 hover:shadow-[0_20px_45px_-10px_rgba(249,115,22,0.14)]"
          : "bg-[#0e0e12] border border-white/15 ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-orange-500/50 hover:ring-orange-500/30 hover:shadow-[0_20px_50px_rgba(249,115,22,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]",
        className
      )}
    >
      <div className={clsx(
        "bento-graphic-pane relative h-[19rem] sm:h-[22rem] shrink-0 overflow-hidden border-b",
        isLight ? "bg-slate-50 border-slate-200/80" : "bg-neutral-950/90 border-white/10"
      )}>
        {graphic}
        {fade.includes("top") && (
          <div className={clsx(
            "absolute inset-0 bg-gradient-to-b opacity-60 pointer-events-none",
            isLight ? "from-white/80 to-transparent" : "from-[#0e0e12]/70 to-transparent"
          )} />
        )}
        {fade.includes("bottom") && (
          <div className={clsx(
            "absolute inset-0 bg-gradient-to-t opacity-80 pointer-events-none",
            isLight ? "from-white to-transparent" : "from-[#0e0e12]/95 to-transparent"
          )} />
        )}
      </div>
      <div className={clsx(
        "bento-text-pane relative p-6 sm:p-8 z-20 isolate",
        isLight ? "bg-white text-slate-900" : "bg-gradient-to-b from-[#0e0e12] to-[#08080a] text-white"
      )}>
        <div className="mb-2">{eyebrow}</div>
        <h3 className={clsx(
          "text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-300",
          isLight ? "text-slate-900 group-hover:text-orange-600" : "text-white group-hover:text-orange-300"
        )}>
          {title}
        </h3>
        <p className={clsx(
          "mt-2 text-xs sm:text-sm leading-relaxed",
          isLight ? "text-slate-600" : "text-slate-300"
        )}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
