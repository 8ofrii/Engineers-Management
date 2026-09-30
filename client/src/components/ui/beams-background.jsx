"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Hesaby Personalized Color Palettes
 * - ember: Signature warm ember (#ff5a1f) & amber (#f59e0b) for brand energy
 * - hesaby: 75% Ember flame + 25% Royal Sky blue for high-tech financial precision
 * - blue: Executive royal blue (#3b82f6) & cyan (#38bdf8)
 * - cyber: Original 21st.dev cyan-purple spectrum
 */
function getBeamColor(colorScheme, index = 0, totalBeams = 30) {
    if (colorScheme === "ember") {
        // Hesaby Signature Ember & Warm Amber (16deg - 44deg)
        const hue = 16 + Math.random() * 26;
        const sat = 94 + Math.random() * 6;
        const light = 56 + Math.random() * 10;
        return { hue, sat, light };
    } else if (colorScheme === "blue") {
        // Royal Blue & Electric Sky (196deg - 228deg)
        const hue = 196 + Math.random() * 32;
        const sat = 90 + Math.random() * 10;
        const light = 58 + Math.random() * 10;
        return { hue, sat, light };
    } else if (colorScheme === "cyber") {
        // Original 21st.dev Cyan to Purple (190deg - 260deg)
        const hue = 190 + Math.random() * 70;
        return { hue, sat: 85, light: 65 };
    } else {
        // "hesaby" (default) - Duo of 75% Flame Ember + 25% Royal Sky
        const isAccent = (index % 4 === 0) || Math.random() < 0.22;
        const hue = isAccent ? (198 + Math.random() * 24) : (16 + Math.random() * 26);
        const sat = isAccent ? 92 : 96;
        const light = isAccent ? 62 : 58;
        return { hue, sat, light };
    }
}

function createBeam(width, height, colorScheme, index = 0, totalBeams = 30) {
    const angle = -35 + Math.random() * 10;
    const { hue, sat, light } = getBeamColor(colorScheme, index, totalBeams);
    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 35 + Math.random() * 65,
        length: height * 2.5,
        angle: angle,
        speed: 0.5 + Math.random() * 1.0,
        opacity: 0.12 + Math.random() * 0.16,
        hue,
        sat,
        light,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.025,
    };
}

export function BeamsBackground({
    className,
    children,
    intensity = "medium",
    colorScheme = "ember",
    showDefaultContent = false,
}) {
    const canvasRef = useRef(null);
    const beamsRef = useRef([]);
    const animationFrameRef = useRef(0);
    const MINIMUM_BEAMS = 22;

    const opacityMap = {
        subtle: 0.55,
        medium: 0.8,
        strong: 1,
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const updateCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);

            const totalBeams = Math.floor(MINIMUM_BEAMS * 1.5);
            beamsRef.current = Array.from({ length: totalBeams }, (_, i) =>
                createBeam(window.innerWidth, window.innerHeight, colorScheme, i, totalBeams)
            );

            if (prefersReducedMotion) {
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                ctx.filter = "blur(35px)";
                beamsRef.current.forEach((beam) => drawBeam(ctx, beam));
            }
        };

        function resetBeam(beam, index, totalBeams) {
            if (!canvas) return beam;

            const column = index % 3;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const spacing = w / 3;

            beam.y = h + 100;
            beam.x =
                column * spacing +
                spacing / 2 +
                (Math.random() - 0.5) * spacing * 0.5;
            beam.width = 90 + Math.random() * 90;
            beam.speed = 0.45 + Math.random() * 0.45;

            const color = getBeamColor(colorScheme, index, totalBeams);
            beam.hue = color.hue;
            beam.sat = color.sat;
            beam.light = color.light;
            beam.opacity = 0.18 + Math.random() * 0.12;
            return beam;
        }

        function drawBeam(ctx, beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            // Pulsing opacity
            const pulsingOpacity =
                beam.opacity *
                (0.8 + Math.sin(beam.pulse) * 0.2) *
                opacityMap[intensity];

            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

            const h = beam.hue;
            const s = beam.sat || 94;
            const l = beam.light || 58;

            gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0)`);
            gradient.addColorStop(
                0.1,
                `hsla(${h}, ${s}%, ${l}%, ${pulsingOpacity * 0.45})`
            );
            gradient.addColorStop(
                0.4,
                `hsla(${h}, ${s}%, ${l}%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.6,
                `hsla(${h}, ${s}%, ${l}%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.9,
                `hsla(${h}, ${s}%, ${l}%, ${pulsingOpacity * 0.45})`
            );
            gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
            ctx.restore();
        }

        function animate() {
            if (!canvas || !ctx || prefersReducedMotion) return;

            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);
            ctx.filter = "blur(35px)";

            const totalBeams = beamsRef.current.length;
            beamsRef.current.forEach((beam, index) => {
                beam.y -= beam.speed;
                beam.pulse += beam.pulseSpeed;

                if (beam.y + beam.length < -100) {
                    resetBeam(beam, index, totalBeams);
                }

                drawBeam(ctx, beam);
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        }

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        if (!prefersReducedMotion) {
            animate();
        }

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity, colorScheme]);

    const isFixed = className && className.includes('fixed');

    return (
        <div
            className={cn(
                isFixed ? "w-full overflow-hidden bg-neutral-950" : "relative min-h-screen w-full overflow-hidden bg-neutral-950",
                className
            )}
            style={{ zIndex: isFixed ? -1 : undefined }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ filter: "blur(16px)" }}
            />

            <motion.div
                className="absolute inset-0 bg-neutral-950/5 pointer-events-none"
                animate={{
                    opacity: [0.05, 0.15, 0.05],
                }}
                transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                }}
                style={{
                    backdropFilter: "blur(40px)",
                }}
            />

            {children && (
                <div className="relative z-10 w-full h-full">
                    {children}
                </div>
            )}

            {!children && showDefaultContent && (
                <div className="relative z-10 flex h-screen w-full items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-6 px-4 text-center">
                        <motion.h1
                            className="text-6xl md:text-7xl lg:text-8xl font-semibold text-white tracking-tighter"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            Hesaby
                            <br />
                            Intelligence
                        </motion.h1>
                        <motion.p
                            className="text-lg md:text-2xl lg:text-3xl text-white/70 tracking-tighter"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            Autonomous Financial Clarity
                        </motion.p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BeamsBackground;
