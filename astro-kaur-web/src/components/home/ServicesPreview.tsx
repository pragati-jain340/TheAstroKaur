"use client";

import React, { useRef, useState } from "react";

interface ServiceItem {
  id: string;
  title: string;
  format: string;
  isCall: boolean;
  price: string;
  description: string;
  icon: React.ReactNode;
}

const services: ServiceItem[] = [
  {
    id: "future-partner-text",
    title: "Future Partner Reading",
    format: "Text-based reading",
    isCall: false,
    price: "€20",
    description:
      "Explore the qualities of your future partner, possible circumstances or places where you may meet, and potential marriage timelines.",
    icon: (
      <svg className="w-5 h-5 text-[#6B3448] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    id: "career-finance-text",
    title: "Career & Money Reading",
    format: "Text-based reading",
    isCall: false,
    price: "€20",
    description:
      "Explore suitable professions, possible promotion timelines, and themes related to money flow and financial growth.",
    icon: (
      <svg className="w-5 h-5 text-[#B87936] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.694m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
  {
    id: "relationship-karma-call",
    title: "Relationship Karma",
    format: "Voice call · 30 mins",
    isCall: true,
    price: "€40",
    description:
      "Explore relationship patterns, lessons, marriage, attracting a partner, and possible circumstances in which you may meet.",
    icon: (
      <svg className="w-5 h-5 text-[#6B3448] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    id: "career-guidance-call",
    title: "Career & Money Guidance",
    format: "Voice call · 30 mins",
    isCall: true,
    price: "€40",
    description:
      "Explore suitable professions, promotions, financial growth, and potential strategic career transitions.",
    icon: (
      <svg className="w-5 h-5 text-[#B87936] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    id: "matchmaking-call",
    title: "Matchmaking Reading",
    format: "Voice call · 45 mins",
    isCall: true,
    price: "€60",
    description:
      "Explore compatibility between two birth charts, relationship strengths, recurring challenges, and conscious ways to strengthen bonds.",
    icon: (
      <svg className="w-5 h-5 text-[#6B3448] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    id: "extensive-chart-call",
    title: "Extensive Birth Chart Reading",
    format: "Voice call · 45 mins",
    isCall: true,
    price: "€60",
    description:
      "Explore life path, purpose, karmic lessons, planetary dashas, and deep emotional patterns through an extensive analysis.",
    icon: (
      <svg className="w-5 h-5 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
];

import { useAuth } from "@/context/AuthContext";

function ServiceCard({
  service,
  isDuplicate = false,
  onSelect,
}: {
  service: ServiceItem;
  isDuplicate?: boolean;
  onSelect?: (service: ServiceItem) => void;
}) {
  return (
    <div
      aria-hidden={isDuplicate ? "true" : undefined}
      className="shrink-0 w-[290px] sm:w-[330px] md:w-[360px] bg-white dark:bg-[#1E293B]/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 shadow-sm hover:shadow-md hover:border-[#E5B842]/40 transition-all group/card"
    >
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 rounded-full bg-[#FAF8F5] dark:bg-[#0F172A] border border-[#E5B842]/20 flex items-center justify-center transition-transform group-hover/card:scale-110">
            {service.icon}
          </div>
          <span
            className={`text-[11px] font-medium tracking-wide px-3 py-1 rounded-full ${
              service.isCall
                ? "bg-[#6B3448]/10 text-[#6B3448] dark:bg-[#E5B842]/15 dark:text-[#E5B842]"
                : "bg-[#0F172A]/5 text-[#0F172A]/80 dark:bg-[#FAF8F5]/10 dark:text-[#FAF8F5]/80"
            }`}
          >
            {service.format}
          </span>
        </div>

        <h3 className="font-serif text-xl text-[#0F172A] dark:text-[#FAF8F5] font-normal mb-2.5">
          {service.title}
        </h3>
        <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 line-clamp-3 leading-relaxed font-light">
          {service.description}
        </p>
      </div>

      <div className="pt-6 mt-6 border-t border-[#0F172A]/5 dark:border-[#FAF8F5]/10 flex items-center justify-between">
        <span className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
          {service.price}
        </span>
        <button
          type="button"
          tabIndex={isDuplicate ? -1 : 0}
          onClick={() => onSelect?.(service)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#0F172A] dark:text-[#FAF8F5] group-hover/card:text-[#E5B842] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 rounded-sm cursor-pointer"
        >
          <span>Book Reading</span>
          <svg
            className="w-4 h-4 transition-transform group-hover/card:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ServicesPreview() {
  const { openBookingModal } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 370;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="readings" className="scroll-mt-28 sm:scroll-mt-32 py-20 lg:py-28 px-6 lg:px-16 bg-transparent relative overflow-hidden">
      {/* ── Seamless Marquee Keyframes & Accessibility Styles ── */}
      <style>{`
        @keyframes servicesInfiniteMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .services-marquee-track {
          animation: servicesInfiniteMarquee 42s linear infinite;
          will-change: transform;
        }

        @media (hover: hover) and (pointer: fine) {
          .services-marquee-track:hover {
            animation-play-state: paused;
          }
        }

        .services-marquee-track:focus-within {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 mb-3">
              Offerings & Discovery
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight">
              Explore My Readings
            </h2>
            <p className="text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-xl mt-3 font-light leading-relaxed">
              Choose a reading that aligns with the questions and areas of life you would like to explore.
            </p>
          </div>

          {/* Carousel Arrows / Manual Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-11 h-11 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white/70 dark:bg-[#1E293B]/70 hover:bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-11 h-11 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white/70 dark:bg-[#1E293B]/70 hover:bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Continuous Infinite Horizontal Slider ── */}
        <div className="relative w-full overflow-hidden services-marquee-container">
          {/* Subtle edge fade overlays for luxury presentation */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-r from-[#FAF8F5] dark:from-[#0F172A] to-transparent opacity-80" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-l from-[#FAF8F5] dark:from-[#0F172A] to-transparent opacity-80" />

          {/* Scrollable Container Wrapper with Smooth Marquee Track inside */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              className="flex w-max services-marquee-track"
              style={isPaused ? { animationPlayState: "paused" } : undefined}
            >
              {/* Primary Track (Interactive for Screen Readers & Keyboard) */}
              <div className="flex shrink-0 gap-6 pr-6">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isDuplicate={false}
                    onSelect={openBookingModal}
                  />
                ))}
              </div>

              {/* Duplicate Track (Hidden from Screen Readers & Tab Order for Accessibility) */}
              <div className="flex shrink-0 gap-6 pr-6" aria-hidden="true">
                {services.map((service) => (
                  <ServiceCard
                    key={`dup-${service.id}`}
                    service={service}
                    isDuplicate={true}
                    onSelect={openBookingModal}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Free Reading Banner — Placed directly below the service cards */}
        <div className="mt-12 w-full bg-gradient-to-r from-white/80 via-[#F7F2E9]/80 to-white/80 dark:from-[#1E293B]/80 dark:via-[#162032]/80 dark:to-[#1E293B]/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-[#E5B842]/30 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-5 text-center md:text-left flex-col md:flex-row">
            <div className="w-13 h-13 rounded-full bg-[#E5B842]/15 border border-[#E5B842]/40 flex items-center justify-center text-[#B87936] dark:text-[#E5B842] shrink-0 p-3">
              <svg className="w-7 h-7 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <div>
              <h4 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                Looking for a Free Reading?
              </h4>
              <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-1 font-light">
                Experience how Vedic astrology offers a deeper lens on your personal path and rising sign.
              </p>
            </div>
          </div>

          <a
            href="#free-reading"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-sm hover:shadow transition-all shrink-0 whitespace-nowrap"
          >
            <span>Explore Free Reading</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
