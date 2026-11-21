"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform, useSpring } from "motion/react";
import AstrologyWheel from "@/components/AstrologyWheel";
import { InView } from "@/components/ui/in-view";
import { COMPACT_MOTION_QUERY, useMediaQuery } from "@/components/ui/use-media-query";
import styles from "./HeroSection.module.css";

function CelestialButton({ body }: { body: "moon" | "saturn" }) {
  const [bursting, setBursting] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <button type="button" className={styles.celestialButton} data-body={body}
      aria-label={body === "moon" ? "Make the crescent moon sparkle" : "Make Saturn sparkle"}
      onClick={() => setBursting(true)}>
      <svg viewBox="-32 -32 64 64" aria-hidden="true" focusable="false">
        <motion.g animate={{ opacity: bursting ? 0 : 1 }} transition={{ duration: .16 }}>
          {body === "moon" ? (
            <path d="M1-13a13 13 0 1 0 13 18A14 14 0 0 1 1-13Z" />
          ) : (
            <g transform="rotate(-23)">
              <ellipse rx="22" ry="6" fill="none" stroke="#ad8042" strokeWidth="2" />
              <circle r="11" fill="#e0bd7c" />
              <path d="M-8-6q7 3 16 0M-9 4q9 3 18 0" fill="none" stroke="#bd9457" strokeWidth="1.3" />
              <path d="M-22 0a22 6 0 0 0 44 0" fill="none" stroke="#ad8042" strokeWidth="2.4" />
            </g>
          )}
        </motion.g>
        {bursting && (
          <motion.g initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: .85, times: [0, .55, 1] }}
            onAnimationComplete={() => setBursting(false)}>
            {Array.from({ length: 12 }, (_, i) => {
              const angle = i * Math.PI / 6;
              const radius = i % 2 ? 19 : 30;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return <motion.path key={i} d="M0-3 1-1 3 0 1 1 0 3-1 1-3 0-1-1Z"
                fill={i % 2 ? "#bd9346" : "#e5b842"}
                initial={{ x: reduceMotion ? x : 0, y: reduceMotion ? y : 0 }}
                animate={{ x, y }} transition={{ duration: .75, ease: "easeOut" }} />;
            })}
          </motion.g>
        )}
      </svg>
    </button>
  );
}

export default function HeroSection() {
  const compactMotion = useMediaQuery(COMPACT_MOTION_QUERY);
  const containerRef = useRef<HTMLElement>(null);
  const starfieldRef = useRef<SVGSVGElement>(null);
  const starsInView = useInView(starfieldRef, { amount: 0.6 });
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Silky scroll-driven parallax springs
  const textY = useSpring(useTransform(scrollYProgress, [0, 1], [0, compactMotion ? -16 : -70]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const subtitleY = useSpring(useTransform(scrollYProgress, [0, 1], [0, compactMotion ? -10 : -45]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const wheelY = useSpring(useTransform(scrollYProgress, [0, 1], [0, compactMotion ? 12 : 60]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const wheelScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, compactMotion ? 0.97 : 0.92]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const heroOpacity = useSpring(useTransform(scrollYProgress, [0, 0.9], [1, compactMotion ? 0.85 : 0.55]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });

  const itemTransition = {
    duration: 0.65,
    ease: [0.25, 0.1, 0.25, 1.0] as const,
  };

  const variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      ref={containerRef}
      className={`${styles.section} hero-section relative overflow-hidden flex flex-col px-4 sm:px-6 lg:px-16`}
    >
      <motion.div
        style={{ opacity: heroOpacity }}
        className={`${styles.content} hero-content max-w-7xl mx-auto w-full min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-12 lg:gap-8 items-center relative z-10`}
      >
        {/* Left Column: Heading, Subtitle & CTAs */}
        <div className={`${styles.copy} lg:col-span-7 space-y-6 text-center lg:text-left z-10`}>
          {/* Badge: LIFE IS FULL OF QUESTIONS */}
          <div className="hidden items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 sm:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] animate-pulse" />
            LIFE IS FULL OF QUESTIONS
          </div>

          {/* 1. Heading: Look to the Stars. A Deeper Look at You. */}
          <motion.div className="hero-parallax" style={{ y: textY }}>
            <InView
              once={false}
              variants={variants}
              transition={{ ...itemTransition, delay: 0.05 }}
            >
              <h1 className={`${styles.heading} font-serif text-[clamp(1.875rem,8.5vw,2.5rem)] sm:text-5xl lg:text-6xl text-[#0F172A] dark:text-[#FAF8F5] font-normal leading-[1.15] tracking-tight`}>
                Look to the Stars. <br />
                <span className="italic font-light text-[#E5B842]">
                  A Deeper Look at You.
                </span>
              </h1>
            </InView>
          </motion.div>

          {/* 2. Subtitle Content */}
          <motion.div className="hero-parallax" style={{ y: subtitleY }}>
            <InView
              once={false}
              variants={variants}
              transition={{ ...itemTransition, delay: 0.2 }}
            >
              <p className={`${styles.description} text-base sm:text-lg text-[#0F172A]/75 dark:text-[#FAF8F5]/80 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed`}>
                Your birth chart offers a unique perspective on who you are, the connections you make, and the path you&apos;re navigating.
              </p>
            </InView>
          </motion.div>

          {/* 3. CTA Buttons */}
          <InView
            className={styles.actionReveal}
            once={false}
            variants={variants}
            transition={{ ...itemTransition, delay: 0.35 }}
          >
            <div className={`${styles.actions} hero-actions pt-2 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start max-w-xs sm:max-w-none mx-auto lg:mx-0`}>
              <a
                href="#readings"
                className="px-7 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-sm tracking-wide shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore My Readings
              </a>
              <a
                href="#about"
                className="px-7 py-3.5 rounded-full border border-[#0F172A]/30 dark:border-[#E5B842]/40 hover:border-[#E5B842] text-[#0F172A] dark:text-[#FAF8F5] font-medium text-sm tracking-wide hover:bg-[#E5B842]/5 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Meet TheAstroKaur
              </a>
            </div>
          </InView>
        </div>

        {/* Right Column: Rotating Horoscope Wheel with spatial depth parallax */}
        <motion.div
          style={{ y: wheelY, scale: wheelScale }}
          className={`${styles.wheelContainer} hero-parallax lg:col-span-5 min-w-0 flex items-center justify-center relative sm:min-h-[460px]`}
        >
          <span className={styles.comet} aria-hidden="true" />
          <CelestialButton body="moon" />
          <CelestialButton body="saturn" />
          <svg ref={starfieldRef} data-in-view={starsInView} className={styles.starfield} viewBox="0 0 320 240" aria-hidden="true" focusable="false">
            <defs>
              <path id="hero-sparkle" d="M0-5 Q.8-.8 4 0 Q.8.8 0 5 Q-.8.8-4 0 Q-.8-.8 0-5Z" />
            </defs>
            <use href="#hero-sparkle" x="25" y="84" />
            <use href="#hero-sparkle" x="43" y="176" />
            <use href="#hero-sparkle" x="250" y="201" />
            <use href="#hero-sparkle" x="299" y="115" />
          </svg>
          <AstrologyWheel
            duration={30}
            opacity={0.96}
            className={`${styles.wheel} aspect-square w-full max-w-[280px] sm:max-w-none sm:w-[420px] sm:h-[420px] lg:w-full lg:h-auto lg:max-w-[480px]`}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
