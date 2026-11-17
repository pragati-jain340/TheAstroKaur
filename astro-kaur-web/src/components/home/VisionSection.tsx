"use client";

import { motion, type Variants } from "motion/react";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { DEFAULT_VISION, type VisionContent } from "@/lib/homeContent";

function GoldFrame({ side, reduceMotion }: { side: "left" | "right"; reduceMotion: boolean }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scaleY: reduceMotion ? 1 : 0.25 },
        visible: { opacity: 1, scaleY: 1, transition: { duration: reduceMotion ? 0.9 : 1.25, delay: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={`pointer-events-none absolute top-3 bottom-3 hidden w-4 origin-center flex-col items-center text-[#C89B3C] sm:flex dark:text-[#E5B842] ${side === "left" ? "left-0 sm:left-2 md:left-4 lg:left-6" : "right-0 sm:right-2 md:right-4 lg:right-6"}`}
      aria-hidden="true"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
      <span className="w-px flex-1 bg-linear-to-b from-transparent to-current opacity-60" />
      <div className="my-2.5 flex shrink-0 flex-col items-center gap-1.5">
        <span className="size-1 rounded-full bg-current opacity-75" />
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" />
        </svg>
        <span className="size-1 rounded-full bg-current opacity-75" />
      </div>
      <span className="w-px flex-1 bg-linear-to-b from-current to-transparent opacity-60" />
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
    </motion.div>
  );
}

export default function VisionSection({ initialContent }: { initialContent?: Partial<VisionContent> }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const content: VisionContent = { ...DEFAULT_VISION, ...initialContent };
  const ease = [0.22, 1, 0.36, 1] as const;
  const reveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.95, delay, ease } }),
  };
  const headingReveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : "105%" },
    visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 1.15, delay, ease } }),
  };

  return (
    <section
      id="vision"
      aria-labelledby="vision-heading"
      className="vision-section relative scroll-mt-24 bg-transparent px-5 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.4, margin: "0px 0px -60px 0px" }}
        className="relative mx-auto w-full max-w-5xl text-center sm:px-14 md:px-20 lg:max-w-[1180px] lg:px-28"
      >
        <GoldFrame side="left" reduceMotion={reduceMotion} />
        <GoldFrame side="right" reduceMotion={reduceMotion} />
        <div className="relative z-10 flex flex-col items-center">
          <motion.div variants={reveal} custom={0} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E5B842]/25 bg-[#E5B842]/10 px-3.5 py-1 text-[11px] font-semibold tracking-widest text-[#6B3448] uppercase sm:mb-6 sm:text-xs dark:text-[#E5B842]">
            {content.tag || DEFAULT_VISION.tag}
          </motion.div>
          <h2 id="vision-heading" className="mb-6 max-w-3xl font-serif text-2xl leading-[1.2] font-normal tracking-tight text-[#0F172A] sm:mb-8 sm:text-3xl sm:leading-[1.18] md:text-4xl lg:max-w-4xl lg:text-[2.65rem] dark:text-[#FAF8F5]">
            <span className="block overflow-hidden pb-1">
              <motion.span variants={headingReveal} custom={0.18} className="block">{content.heading_line_1 || DEFAULT_VISION.heading_line_1}</motion.span>
            </span>
            {content.heading_line_2 && (
              <span className="block overflow-hidden pb-1">
                <motion.span variants={headingReveal} custom={0.42} className="block">{content.heading_line_2}</motion.span>
              </span>
            )}
          </h2>
          {content.paragraph_1 && (
            <motion.p variants={reveal} custom={0.75} className="mx-auto mb-4 max-w-2xl text-sm leading-relaxed font-light text-[#0F172A]/75 sm:mb-5 sm:max-w-3xl sm:text-base lg:max-w-4xl lg:text-[1.05rem] dark:text-[#FAF8F5]/80">
              {content.paragraph_1}
            </motion.p>
          )}
          {content.paragraph_2 && (
            <motion.p variants={reveal} custom={0.95} className="mx-auto max-w-2xl text-sm leading-relaxed font-light text-[#0F172A]/65 sm:max-w-3xl lg:max-w-4xl lg:text-[0.95rem] dark:text-[#FAF8F5]/70">
              {content.paragraph_2}
            </motion.p>
          )}
        </div>
      </motion.div>
    </section>
  );
}
