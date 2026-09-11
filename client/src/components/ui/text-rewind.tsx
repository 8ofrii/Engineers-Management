"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface AnimatedTextProps {
    text?: string;
    children?: React.ReactNode;
    className?: string;
    shadowColors?: {
        first?: string;
        second?: string;
        third?: string;
        fourth?: string;
        glow?: string;
    };
    variant?: "retro" | "hesaby" | "monochrome";
    rtl?: boolean;
}

const PRESET_SHADOWS = {
    retro: {
        first: "#07bccc",
        second: "#e601c0",
        third: "#e9019a",
        fourth: "#f40468",
        glow: "rgba(244, 4, 104, 0.4)",
    },
    hesaby: {
        first: "#ff8a50",
        second: "#ff5a1f",
        third: "#ea580c",
        fourth: "#c2410c",
        glow: "rgba(255, 90, 31, 0.4)",
    },
    monochrome: {
        first: "#a1a1aa",
        second: "#71717a",
        third: "#52525b",
        fourth: "#3f3f46",
        glow: "rgba(0, 0, 0, 0.25)",
    },
};

export function TextRewind({
    text = "HESABY.AI",
    children,
    className = "",
    variant = "hesaby",
    rtl = false,
    shadowColors,
}: AnimatedTextProps) {
    const colors = shadowColors || PRESET_SHADOWS[variant] || PRESET_SHADOWS.hesaby;
    const sign = rtl ? -1 : 1;

    const textShadowStyle = {
        textShadow: `${sign * 8}px 8px 0px ${colors.first}, 
                     ${sign * 14}px 14px 0px ${colors.second}, 
                     ${sign * 20}px 20px 0px ${colors.third}, 
                     ${sign * 26}px 26px 0px ${colors.fourth}, 
                     ${sign * 38}px 38px 10px ${colors.glow}`,
    };

    const noShadowStyle = {
        textShadow: "none",
        transform: `translate(${sign * 4}px, 4px)`,
    };

    return (
        <div className="w-full flex items-center justify-center select-none">
            <motion.div
                className={cn(
                    "inline-block cursor-pointer text-2xl sm:text-3xl font-extrabold",
                    "transition-all duration-200 ease-out tracking-widest",
                    "text-[var(--text)] italic uppercase",
                    className
                )}
                style={textShadowStyle}
                whileHover={noShadowStyle}
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                {children || text}
            </motion.div>
        </div>
    );
}

export default TextRewind;
