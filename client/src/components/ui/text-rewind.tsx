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
}

export function TextRewind({
    text = "HESABY.AI",
    children,
    className = "",
    shadowColors = {
        first: "#07bccc",
        second: "#e601c0",
        third: "#e9019a",
        fourth: "#f40468",
        glow: "#f40468",
    },
}: AnimatedTextProps) {
    const textShadowStyle = {
        textShadow: `10px 10px 0px ${shadowColors.first}, 
                     15px 15px 0px ${shadowColors.second}, 
                     20px 20px 0px ${shadowColors.third}, 
                     25px 25px 0px ${shadowColors.fourth}, 
                     45px 45px 10px ${shadowColors.glow}`,
    };

    const noShadowStyle = {
        textShadow: "none",
        transform: "translate(6px, 6px)",
    };

    return (
        <div className="w-full flex items-center justify-center select-none">
            <motion.div
                className={cn(
                    "cursor-pointer text-3xl sm:text-4xl font-extrabold tracking-widest",
                    "text-black dark:text-white italic uppercase",
                    "transition-all duration-200 ease-in-out",
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
