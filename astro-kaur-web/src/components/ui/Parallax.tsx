'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';

interface ParallaxProps {
  children: React.ReactNode;
  offset?: [number, number]; // [startOffsetInPx, endOffsetInPx]
  speed?: number; // Shorthand multiplier, e.g. 0.3 or -0.3
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wraps any element to give it smooth, physics-tuned vertical parallax on scroll.
 */
export function Parallax({
  children,
  offset = [-35, 35],
  speed,
  className = '',
  style = {},
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const effectiveOffset: [number, number] =
    speed !== undefined ? [-100 * speed, 100 * speed] : offset;

  const y = useTransform(scrollYProgress, [0, 1], effectiveOffset);
  const smoothY = useSpring(y, { stiffness: 120, damping: 26, mass: 0.1 });

  return (
    <motion.div ref={ref} style={{ ...style, y: smoothY }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Large celestial background typography that glides horizontally based on scroll depth.
 */
export function ParallaxScrollText({
  text,
  direction = 1,
  speed = 120,
  className = '',
}: {
  text: string;
  direction?: 1 | -1;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === 1 ? [-speed, speed] : [speed, -speed]
  );
  const smoothX = useSpring(x, { stiffness: 90, damping: 28, mass: 0.15 });

  return (
    <div
      ref={ref}
      className={`overflow-hidden pointer-events-none select-none w-full ${className}`}
      aria-hidden="true"
    >
      <motion.div
        style={{ x: smoothX }}
        className="whitespace-nowrap flex items-center gap-8 sm:gap-14 font-serif uppercase tracking-[0.22em] text-xs sm:text-sm lg:text-base font-medium opacity-20 dark:opacity-15 text-[#6B3448] dark:text-[#E5B842]"
      >
        <span>{text}</span>
        <span className="text-[#E5B842] opacity-60">✦</span>
        <span>{text}</span>
        <span className="text-[#E5B842] opacity-60">✦</span>
        <span>{text}</span>
        <span className="text-[#E5B842] opacity-60">✦</span>
        <span>{text}</span>
      </motion.div>
    </div>
  );
}

/**
 * Ambient parallax backdrop layer for the whole page.
 * Gently pans the celestial illustration as the user traverses the page.
 */
export function ParallaxBackgroundLayer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { scrollYProgress } = useScroll();
  // Subtle vertical drift of celestial artwork
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const smoothY = useSpring(y, { stiffness: 90, damping: 28, mass: 0.15 });

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <motion.div
        style={{ y: smoothY }}
        className="absolute -top-10 -bottom-28 inset-x-0 h-[calc(100%+150px)]"
      >
        {children}
      </motion.div>
    </div>
  );
}
