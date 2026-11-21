"use client";

import { motion, type Variants } from "motion/react";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { DEFAULT_ABOUT, DEFAULT_VISION, splitStoryParagraph, type VisionContent } from "@/lib/homeContent";
import { useSectionReveal } from "./useSectionReveal";

function GoldFrame({ side, reduceMotion }: { side: "left" | "right"; reduceMotion: boolean }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scaleY: 0.25, transition: { duration: 0 } },
        visible: { opacity: 1, scaleY: 1, transition: { duration: reduceMotion ? 0 : 0.85, delay: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] } },
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
  const { revealed, setRevealed, revealRun } = useSectionReveal("vision", reduceMotion);

  const content: VisionContent = { ...DEFAULT_VISION, ...initialContent };
  const story = [
    { paragraphs: splitStoryParagraph(content.paragraph_1), delay: 0.3 },
    { paragraphs: splitStoryParagraph(content.paragraph_2), delay: 0.4 },
  ].filter(({ paragraphs }) => paragraphs.length > 0);
  const ease = [0.22, 1, 0.36, 1] as const;
  const reveal: Variants = {
    hidden: { opacity: 0, y: 16, transition: { duration: 0 } },
    visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : delay, ease } }),
  };
  const headingReveal: Variants = {
    hidden: { opacity: 0, y: "105%", transition: { duration: 0 } },
    visible: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.75, delay: reduceMotion ? 0 : delay, ease } }),
  };

  return (
    <section
      id="vision"
      aria-labelledby="vision-heading"
      className="vision-section relative scroll-mt-24 max-sm:my-8 max-sm:border-y max-sm:border-[#b89248]/25 max-sm:bg-[#f5efe5] max-sm:dark:bg-[#141f31] px-6 py-12 sm:px-6 sm:py-24 lg:px-8 lg:py-32"
    >
      <motion.div
        key={revealRun}
        initial="hidden"
        animate={reduceMotion || revealed ? "visible" : "hidden"}
        viewport={{ margin: "-80px 0px -48px 0px" }}
        onViewportEnter={() => setRevealed(true)}
        onViewportLeave={() => setRevealed(false)}
        className="relative mx-auto w-full max-w-5xl text-center sm:px-14 md:px-20 lg:max-w-[1180px] lg:px-28"
      >
        <GoldFrame side="left" reduceMotion={reduceMotion} />
        <GoldFrame side="right" reduceMotion={reduceMotion} />
        <div className="relative z-10 flex flex-col items-center max-sm:items-start max-sm:text-left">
          <motion.div variants={reveal} custom={0} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E5B842]/25 bg-[#E5B842]/10 px-3.5 py-1 text-[11px] font-semibold tracking-widest text-[#6B3448] uppercase max-sm:rounded-none max-sm:border-0 max-sm:border-l-2 max-sm:border-[#b89248] max-sm:bg-transparent max-sm:py-0 max-sm:pr-0 max-sm:pl-3 sm:mb-6 sm:text-xs dark:text-[#E5B842]">
            {content.tag?.trim().toLowerCase() === DEFAULT_ABOUT.tag.toLowerCase() ? DEFAULT_VISION.tag : content.tag || DEFAULT_VISION.tag}
          </motion.div>
          <h2
            id="vision-heading"
            className="mb-6 max-w-3xl text-balance font-serif text-[clamp(1.7rem,7vw,2.15rem)] leading-[1.2] font-normal tracking-tight text-[#0F172A] sm:mb-8 sm:text-3xl sm:leading-[1.18] md:text-4xl lg:max-w-4xl lg:text-[2.65rem] dark:text-[#FAF8F5]"
          >
            <span className="block overflow-hidden pb-1">
              <motion.span variants={headingReveal} custom={0.1} className="block">{content.heading_line_1 || DEFAULT_VISION.heading_line_1}</motion.span>
            </span>
            {content.heading_line_2 && (
              <span className="block overflow-hidden pb-1">
                <motion.span variants={headingReveal} custom={0.2} className="block">{content.heading_line_2}</motion.span>
              </span>
            )}
          </h2>
          <div className="w-full max-w-xl space-y-5 sm:space-y-3 text-left font-sans text-base leading-[1.75] text-[#0F172A]/85 [overflow-wrap:anywhere] dark:text-slate-200 sm:text-base [&>div:first-child>p:first-child]:font-medium">
            {story.map(({ paragraphs, delay }) => (
              <motion.div key={delay} variants={reveal} custom={delay} className="space-y-5 sm:space-y-3">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
