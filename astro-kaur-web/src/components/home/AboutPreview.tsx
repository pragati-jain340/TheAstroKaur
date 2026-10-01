import Image from "next/image";
import { InView } from "@/components/ui/in-view";

export default function AboutPreview() {
  return (
    <section
      id="about"
      className="py-12 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-16 bg-transparent relative overflow-hidden text-[#FAF8F5]"
    >
      {/* ── Outer Section Container: Expanded horizontal width ── */}
      <div className="max-w-6xl mx-auto w-full relative z-10">
        
        {/* ── Signature Curved Feature Block: Generous Horizontal Proportions with Sleek Height ── */}
        <div className="relative rounded-3xl sm:rounded-[36px] bg-[#0B1322]/90 dark:bg-[#0D1829]/95 backdrop-blur-md border border-[#E5B842]/25 py-7 sm:py-9 lg:py-10 px-8 sm:px-12 lg:px-16 xl:px-20 shadow-[0_20px_50px_rgba(0,0,0,0.35)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden">
          
          {/* Subtle Ambient Celestial Accents inside the curved block */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#E5B842]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1E3A8A]/25 rounded-full blur-[120px] pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 sm:gap-12 lg:gap-16 xl:gap-20 relative z-10">
            
            {/* ── Left Column: Celestial Arch Frame (Tuned Proportion) ── */}
            <InView
              variants={{
                hidden: { opacity: 0, x: -24 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{
                duration: 0.65,
                ease: [0.25, 0.1, 0.25, 1.0] as const,
              }}
              viewOptions={{ margin: "0px 0px -20px 0px" }}
              once={false}
              className="w-full max-w-[260px] sm:max-w-[290px] lg:max-w-[315px] shrink-0"
            >
              <div className="relative w-full aspect-[3/4]">
                
                {/* 1. Photo Arch Frame */}
                <div className="relative w-full h-full rounded-tr-[135px] sm:rounded-tr-[155px] lg:rounded-tr-[170px] rounded-tl-none rounded-bl-none rounded-br-none overflow-hidden border border-[#E5B842] shadow-[0_16px_40px_rgba(0,0,0,0.65)] group z-10">
                  <Image
                    src="/Owner_image.png"
                    alt="TheAstroKaur — Vedic Astrologer"
                    fill
                    priority
                    className="object-cover object-top sm:object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 260px, (max-width: 1024px) 290px, 315px"
                  />
                  {/* Subtle base vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1322]/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* 2. Precision SVG Overlay for Bottom-Left Corner Elements */}
                <svg
                  viewBox="0 0 300 400"
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <filter id="previewCelestialGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Extended Horizontal Border Line at Bottom-Left Corner */}
                  <line
                    x1="-24"
                    y1="400"
                    x2="0"
                    y2="400"
                    stroke="#E5B842"
                    strokeWidth="1.25"
                  />

                  {/* Extended Vertical Border Line at Bottom-Left Corner */}
                  <line
                    x1="0"
                    y1="400"
                    x2="0"
                    y2="424"
                    stroke="#E5B842"
                    strokeWidth="1.25"
                  />

                  {/* 4-Pointed Golden Sparkle Star Centered Directly on Bottom-Left Corner (0, 400) */}
                  <g transform="translate(0, 400)">
                    <path
                      d="M 0 -16 C 0 -6 0 -6 6 0 C 0 6 0 6 0 16 C 0 6 0 6 -6 0 C 0 -6 0 -6 0 -16 Z"
                      fill="#E5B842"
                      filter="url(#previewCelestialGlow)"
                    />
                    <circle cx="0" cy="0" r="1.5" fill="#FFF7E0" />
                  </g>
                </svg>

              </div>
            </InView>

            {/* ── Right Column: Text & Story Content (Expanded Horizontal Space) ── */}
            <InView
              variants={{
                hidden: { opacity: 0, x: 24 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{
                duration: 0.65,
                delay: 0.08,
                ease: [0.25, 0.1, 0.25, 1.0] as const,
              }}
              viewOptions={{ margin: "0px 0px -20px 0px" }}
              once={false}
              className="w-full flex-1 max-w-[560px] flex flex-col items-start text-left"
            >
              {/* Pill Tag */}
              <div className="inline-flex items-center px-3.5 py-1 rounded-full text-[10.5px] sm:text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#E5B842] border border-[#E5B842]/70 bg-transparent mb-4">
                ANALYTICAL MIND · VEDIC HEART
              </div>

              {/* Heading: "Meet TheAstroKaur" */}
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-normal leading-[1.12] tracking-tight mb-4">
                <span className="block text-white">Meet</span>
                <span className="block text-[#E5B842]">TheAstroKaur</span>
              </h2>

              {/* Body Paragraphs */}
              <div className="space-y-3.5 text-xs sm:text-[14px] text-slate-300 font-light leading-[1.75] mb-6">
                <p>
                  Graduating from top universities in India and abroad and building a career in technology, I was trained to think analytically and rely on logic, evidence, and structured reasoning. Like many people, I believed that success and life&apos;s outcomes were entirely within my control, leaving little room for ancient wisdom such as Vedic astrology.
                </p>
                <p>
                  Everything changed when I began noticing recurring patterns in my own life—similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, not as a prediction tool, but as a profound framework for self-awareness and personal growth.
                </p>
              </div>

              {/* Solid Warm Gold Pill Button */}
              <a
                href="#about"
                className="inline-flex items-center gap-2.5 px-7 py-3 sm:px-8 sm:py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs sm:text-[12.5px] tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:-translate-y-0.5 group"
              >
                <span>Read My Full Story</span>
                <span className="text-base font-bold transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </a>
            </InView>

          </div>
        </div>

      </div>
    </section>
  );
}
