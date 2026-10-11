"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import AstrologyWheel from "@/components/AstrologyWheel";
import { InView } from "@/components/ui/in-view";

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Silky scroll-driven parallax springs
  const textY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -70]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const subtitleY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -45]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const wheelY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 60]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const wheelScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 0.92]), {
    stiffness: 110,
    damping: 26,
    mass: 0.1,
  });
  const heroOpacity = useSpring(useTransform(scrollYProgress, [0, 0.9], [1, 0.55]), {
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
      className="relative overflow-hidden min-h-[calc(100vh-100px)] flex flex-col justify-center px-6 lg:px-16 py-12 lg:py-20 flex-1"
    >
      <motion.div
        style={{ opacity: heroOpacity }}
        className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10 my-auto"
      >
        {/* Left Column: Heading, Subtitle & CTAs */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
          {/* Badge: LIFE IS FULL OF QUESTIONS */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] animate-pulse" />
            LIFE IS FULL OF QUESTIONS
          </div>

          {/* 1. Heading: Look to the Stars. A Deeper Look at You. */}
          <motion.div style={{ y: textY }}>
            <InView
              once={false}
              variants={variants}
              transition={{ ...itemTransition, delay: 0.05 }}
              viewOptions={{ margin: "0px 0px -20px 0px" }}
            >
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#0F172A] dark:text-[#FAF8F5] font-normal leading-[1.15] tracking-tight">
                Look to the Stars. <br />
                <span className="italic font-light text-[#E5B842]">
                  A Deeper Look at You.
                </span>
              </h1>
            </InView>
          </motion.div>

          {/* 2. Subtitle Content */}
          <motion.div style={{ y: subtitleY }}>
            <InView
              once={false}
              variants={variants}
              transition={{ ...itemTransition, delay: 0.2 }}
              viewOptions={{ margin: "0px 0px -20px 0px" }}
            >
              <p className="text-base sm:text-lg text-[#0F172A]/75 dark:text-[#FAF8F5]/80 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                Your birth chart offers a unique perspective on who you are, the connections you make, and the path you&apos;re navigating.
              </p>
            </InView>
          </motion.div>

          {/* 3. CTA Buttons */}
          <InView
            once={false}
            variants={variants}
            transition={{ ...itemTransition, delay: 0.35 }}
            viewOptions={{ margin: "0px 0px -20px 0px" }}
          >
            <div className="pt-2 flex flex-wrap gap-4 justify-center lg:justify-start">
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
          className="lg:col-span-5 flex items-center justify-center relative min-h-[380px] sm:min-h-[460px]"
        >
          <AstrologyWheel
            duration={30}
            opacity={0.96}
            className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px]"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
