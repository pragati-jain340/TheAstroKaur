"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export interface VisionContent {
  tag: string;
  heading_line_1: string;
  heading_line_2: string;
  paragraph_1: string;
  paragraph_2: string;
}

export const DEFAULT_VISION: VisionContent = {
  tag: "A VISION FOR ASTROLOGY",
  heading_line_1: "There Is More Than One Way",
  heading_line_2: "to See Your Story.",
  paragraph_1:
    "The same experiences can look different when we understand ourselves a little better. Astrology offers a perspective on the relationships we build, the choices we face, and the paths we take.",
  paragraph_2:
    "Through my practice, I hope to bridge the gap between ancient Vedic wisdom and the modern world, making astrology easier to understand and relevant to everyday life. Rather than seeing it as a way to reflect on our experiences, understand ourselves better, and approach life's uncertainties with greater awareness.",
};

export default function VisionSection({ initialContent }: { initialContent?: Partial<VisionContent> }) {
  const containerRef = useRef<HTMLElement>(null);
  // Content is fully resolved server-side and passed as a prop — no client fetch, no flash
  const content: VisionContent = {
    ...DEFAULT_VISION,
    ...initialContent,
  };

  // Track scroll progress while the Vision section is pinned in the viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Stage Progression Linked to Scroll ──
  // Stage 1 (0.00 - 0.25): Initial View - Eyebrow label & partial zoomed-in headline ("There Is More Than One Way")
  // Stage 2 (0.25 - 0.50): Mid-scroll - Headline smoothly zooms down into view, side lines extend vertically
  // Stage 3 (0.50 - 0.75): Focused View - Full headline at peak focal scale, lines frame it, Paragraph 1 enters
  // Stage 4 (0.75 - 1.00): Final View - Full composition settled and readable with Paragraph 1 & 2 before next section

  // Heading scroll-linked zoom effect: restrained scale (1.35 down to 1.0) so it stays comfortably framed
  const headingScale = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [1.35, 1.15, 1.0, 1.0]);
  const headingY = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [12, 6, 0, 0]);

  // Eyebrow label
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.2, 1], [0.85, 1, 1]);
  const eyebrowScale = useTransform(scrollYProgress, [0, 0.35, 1], [1.08, 1, 1]);

  // Decorative side lines: extend vertically from compact to full height & settle outward
  const lineScaleY = useTransform(scrollYProgress, [0, 0.3, 0.65, 1], [0.4, 0.75, 1.0, 1.0]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 1], [0.4, 0.75, 1.0, 1.0]);
  const leftLineX = useTransform(scrollYProgress, [0, 0.35, 0.65], [16, 6, 0]);
  const rightLineX = useTransform(scrollYProgress, [0, 0.35, 0.65], [-16, -6, 0]);

  // Paragraphs (crisp, readable, stable, NO blur)
  const p1Opacity = useTransform(scrollYProgress, [0, 0.45, 0.7, 1], [0, 0.2, 1, 1]);
  const p1Y = useTransform(scrollYProgress, [0, 0.45, 0.7, 1], [24, 20, 0, 0]);

  const p2Opacity = useTransform(scrollYProgress, [0, 0.58, 0.82, 1], [0, 0.1, 1, 1]);
  const p2Y = useTransform(scrollYProgress, [0, 0.58, 0.82, 1], [28, 24, 0, 0]);

  return (
    <section
      id="vision"
      ref={containerRef}
      className="vision-section relative scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-0 sm:h-[280vh] bg-transparent"
    >
      {/* Sticky viewport frame: keeps the content centered in view during scroll progress without trapping window */}
      <div className="sm:sticky top-0 sm:h-screen w-full flex items-center justify-center overflow-hidden px-5 sm:px-6 lg:px-8">
        <div className="relative w-full max-w-5xl lg:max-w-[1180px] mx-auto sm:px-14 md:px-20 lg:px-28 text-center">
          
          {/* ── Left Animated Decorative Gold Line ── */}
          <motion.div
            style={{
              scaleY: lineScaleY,
              opacity: lineOpacity,
              x: leftLineX,
            }}
            className="absolute left-0 sm:left-2 md:left-4 lg:left-6 top-6 bottom-6 w-4 hidden sm:flex flex-col items-center pointer-events-none origin-center"
            aria-hidden="true"
          >
            {/* Top Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-80 shrink-0" />
            
            {/* Upper Line Segment */}
            <span className="w-px flex-1 bg-gradient-to-b from-transparent via-[#C89B3C]/60 dark:via-[#E5B842]/60 to-[#C89B3C] dark:to-[#E5B842]" />
            
            {/* Celestial Star & Dot Accents */}
            <div className="my-2.5 flex flex-col items-center gap-1.5 shrink-0 text-[#C89B3C] dark:text-[#E5B842]">
              <span className="w-1 h-1 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-75" />
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" />
              </svg>
              <span className="w-1 h-1 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-75" />
            </div>
            
            {/* Lower Line Segment */}
            <span className="w-px flex-1 bg-gradient-to-b from-[#C89B3C] dark:from-[#E5B842] via-[#C89B3C]/60 dark:via-[#E5B842]/60 to-transparent" />
            
            {/* Bottom Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-80 shrink-0" />
          </motion.div>

          {/* ── Right Animated Decorative Gold Line ── */}
          <motion.div
            style={{
              scaleY: lineScaleY,
              opacity: lineOpacity,
              x: rightLineX,
            }}
            className="absolute right-0 sm:right-2 md:right-4 lg:right-6 top-6 bottom-6 w-4 hidden sm:flex flex-col items-center pointer-events-none origin-center"
            aria-hidden="true"
          >
            {/* Top Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-80 shrink-0" />
            
            {/* Upper Line Segment */}
            <span className="w-px flex-1 bg-gradient-to-b from-transparent via-[#C89B3C]/60 dark:via-[#E5B842]/60 to-[#C89B3C] dark:to-[#E5B842]" />
            
            {/* Celestial Star & Dot Accents */}
            <div className="my-2.5 flex flex-col items-center gap-1.5 shrink-0 text-[#C89B3C] dark:text-[#E5B842]">
              <span className="w-1 h-1 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-75" />
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" />
              </svg>
              <span className="w-1 h-1 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-75" />
            </div>
            
            {/* Lower Line Segment */}
            <span className="w-px flex-1 bg-gradient-to-b from-[#C89B3C] dark:from-[#E5B842] via-[#C89B3C]/60 dark:via-[#E5B842]/60 to-transparent" />
            
            {/* Bottom Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] dark:bg-[#E5B842] opacity-80 shrink-0" />
          </motion.div>

          {/* ── Section Content ── */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Eyebrow Label */}
            <motion.div
              style={{
                opacity: eyebrowOpacity,
                scale: eyebrowScale,
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 mb-4 sm:mb-6"
            >
              {content.tag || DEFAULT_VISION.tag}
            </motion.div>

            {/* Scroll-Linked Zoom Heading */}
            <motion.h2
              style={{
                scale: headingScale,
                y: headingY,
              }}
              className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight leading-[1.2] sm:leading-[1.18] mb-6 sm:mb-8 origin-center will-change-transform max-w-3xl lg:max-w-4xl"
            >
              <span className="block">{content.heading_line_1 || DEFAULT_VISION.heading_line_1}</span>
              {content.heading_line_2 && (
                <span className="block mt-1">{content.heading_line_2}</span>
              )}
            </motion.h2>

            {/* Paragraph 1 */}
            {content.paragraph_1 && (
              <motion.p
                style={{
                  opacity: p1Opacity,
                  y: p1Y,
                }}
                className="text-sm sm:text-base lg:text-[1.05rem] text-[#0F172A]/75 dark:text-[#FAF8F5]/80 font-light leading-relaxed max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto mb-4 sm:mb-5"
              >
                {content.paragraph_1}
              </motion.p>
            )}

            {/* Paragraph 2 */}
            {content.paragraph_2 && (
              <motion.p
                style={{
                  opacity: p2Opacity,
                  y: p2Y,
                }}
              className="text-sm lg:text-[0.95rem] text-[#0F172A]/65 dark:text-[#FAF8F5]/70 font-light leading-relaxed max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto"
              >
                {content.paragraph_2}
              </motion.p>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
