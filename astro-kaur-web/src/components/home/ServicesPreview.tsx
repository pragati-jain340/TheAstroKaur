"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";

export interface ReadingServiceItem {
  id: string;
  slug: string;
  title: string;
  format: string;
  isCall: boolean;
  price: string;
  priceNumber: number;
  description: string;
  highlights: string[];
  image_url?: string | null;
}

const STATIC_SERVICES: ReadingServiceItem[] = [
  {
    id: "matchmaking-call",
    slug: "matchmaking-reading",
    title: "Matchmaking Reading",
    format: "Voice call · 45 mins",
    isCall: true,
    price: "€60",
    priceNumber: 60,
    description:
      "Explore compatibility between two birth charts, relationship strengths, recurring challenges, and conscious ways to strengthen bonds.",
    highlights: [
      "Compatibility synthesis between both birth charts",
      "Relationship strengths and conscious ways to nurture harmony",
    ],
  },
  {
    id: "future-partner-text",
    slug: "future-partner",
    title: "Future Partner Reading",
    format: "Text-based reading",
    isCall: false,
    price: "€20",
    priceNumber: 20,
    description:
      "Explore the qualities of your future partner, possible circumstances or places where you may meet, and potential marriage timelines.",
    highlights: [
      "Core personality traits and likely settings where paths cross",
      "Significant astrological timing windows for meeting and marriage",
    ],
  },
  {
    id: "career-money-text",
    slug: "career-money-reading",
    title: "Career & Money Reading",
    format: "Text-based reading",
    isCall: false,
    price: "€20",
    priceNumber: 20,
    description:
      "Explore suitable professions, possible promotion timelines, and themes related to money flow and financial growth.",
    highlights: [
      "Ideal vocations and timelines for promotions or career transitions",
      "Financial cycles, wealth retention, and money flow dynamics",
    ],
  },
  {
    id: "career-guidance-call",
    slug: "career-money-guidance",
    title: "Career & Money Guidance",
    format: "Voice call · 30 mins",
    isCall: true,
    price: "€40",
    priceNumber: 40,
    description:
      "Explore suitable professions, promotions, financial growth, and potential strategic career transitions through an interactive 1-on-1 dialogue.",
    highlights: [
      "Live 1-on-1 strategic dialogue addressing your career questions",
      "Upcoming planetary transits influencing leadership, pivots, and income",
    ],
  },
  {
    id: "relationship-karma-call",
    slug: "relationship-karma",
    title: "Relationship Karma",
    format: "Voice call · 30 mins",
    isCall: true,
    price: "€40",
    priceNumber: 40,
    description:
      "Explore relationship patterns, lessons, marriage, attracting a partner, and possible circumstances in which you may meet.",
    highlights: [
      "Root causes of recurring emotional loops and karmic soul lessons",
      "Astrological timing windows for welcoming healthy, reciprocal love",
    ],
  },
  {
    id: "extensive-chart-call",
    slug: "extensive-chart",
    title: "Extensive Birth Chart Reading",
    format: "Voice call · 45 mins",
    isCall: true,
    price: "€60",
    priceNumber: 60,
    description:
      "Explore life path, purpose, karmic lessons, planetary dashas, and deep emotional patterns through an extensive analysis.",
    highlights: [
      "Deep foundational synthesis of your 12 houses and planetary placements",
      "Current Mahadasha & Antardasha planetary cycles guiding your path",
    ],
  },
];

function mapDbServiceToReadingItem(db: any): ReadingServiceItem {
  const isCall = db.format === "voice_call";
  const format = isCall
    ? `Voice call${db.duration_minutes ? ` · ${db.duration_minutes} mins` : ""}`
    : "Text-based reading";

  const titleLower = (db.title || "").toLowerCase();
  let slug = "extensive-chart";
  if (titleLower.includes("matchmaking")) slug = "matchmaking-reading";
  else if (titleLower.includes("future partner") && !titleLower.includes("karma")) slug = "future-partner";
  else if (titleLower.includes("karma") || titleLower.includes("relationship")) slug = "relationship-karma";
  else if (titleLower.includes("guidance") || (titleLower.includes("career") && isCall)) slug = "career-money-guidance";
  else if (titleLower.includes("career") || titleLower.includes("money")) slug = "career-money-reading";
  else if (titleLower.includes("extensive") || titleLower.includes("birth chart")) slug = "extensive-chart";

  const staticMatch = STATIC_SERVICES.find(
    (s) => s.slug === slug || s.id === db.id || s.title.toLowerCase() === titleLower
  );

  const priceNumber = Math.round((db.price_cents || 0) / 100);

  return {
    id: db.id,
    slug,
    title: db.title,
    format,
    isCall,
    price: `€${priceNumber}`,
    priceNumber,
    description: db.description || staticMatch?.description || "",
    image_url: db.image_url || null,
    highlights: staticMatch?.highlights || [
      "In-depth personalized astrological insights based on your Vedic birth chart",
      "Actionable remedies, planetary timing windows, and guidance",
    ],
  };
}

const CARD_TRANSITION = {
  type: "spring" as const,
  stiffness: 300,
  damping: 26,
  mass: 0.75,
};

const HEADING_TEXT = "Readings for Every Chapter";
const HEADING_WORDS = HEADING_TEXT.split(" ");

const sentenceVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.15, // Brief settling delay once entered viewport
      staggerChildren: 0.04, // 40ms per character (requested 35–45ms range)
    },
  },
};

const letterVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.01 },
  },
};

function TypewriterHeading() {
  return (
    <motion.h2
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.3 }}
      variants={sentenceVariants}
      className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight text-center"
      aria-label={HEADING_TEXT}
    >
      {HEADING_WORDS.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              variants={letterVariants}
              aria-hidden="true"
            >
              {char}
            </motion.span>
          ))}
          {wordIndex < HEADING_WORDS.length - 1 && (
            <span aria-hidden="true">&nbsp;</span>
          )}
        </span>
      ))}
    </motion.h2>
  );
}

export default function ServicesPreview() {
  const { openBookingModal } = useAuth();
  const [servicesList, setServicesList] = useState<ReadingServiceItem[]>(STATIC_SERVICES);
  const [selectedService, setSelectedService] = useState<ReadingServiceItem | null>(null);

  // Load live services from database
  useEffect(() => {
    fetch("/api/content")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.services) && data.services.length > 0) {
          setServicesList(data.services.map(mapDbServiceToReadingItem));
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcut (Escape) & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedService(null);
      }
    };

    if (selectedService) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedService]);

  const handleBook = (service: ReadingServiceItem) => {
    setSelectedService(null);
    openBookingModal?.({
      id: service.id,
      title: service.title,
      format: service.format,
      isCall: service.isCall,
      price: service.price,
      description: service.description,
    });
  };

  return (
    <section
      id="readings"
      className="scroll-mt-28 sm:scroll-mt-32 py-20 lg:py-28 px-4 sm:px-6 lg:px-16 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Section Header ── */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 mb-4">
            <span className="text-[#E5B842] text-sm">✦</span>
            YOUR QUESTIONS, OUR READINGS
          </div>

          <TypewriterHeading />

          <p className="text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-3.5 font-light leading-relaxed max-w-xl mx-auto">
            Every question is personal. Explore our readings to find the one that speaks to yours.
          </p>
        </div>

        {/* ── App Store Motion Grid: 2 columns on mobile, 3 columns on laptop/desktop ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8">
          {servicesList.map((service) => (
            <motion.div
              key={service.id}
              layoutId={`reading-card-${service.id}`}
              transition={CARD_TRANSITION}
              onClick={() => setSelectedService(service)}
              className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 bg-white/80 dark:bg-[#0D1829]/75 backdrop-blur-sm border border-[#E5B842]/25 dark:border-[#E5B842]/20 hover:border-[#E5B842]/60 shadow-[0_4px_20px_rgba(229,184,66,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_36px_rgba(229,184,66,0.18)] flex flex-col items-center justify-between text-center cursor-pointer select-none group"
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${service.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedService(service);
                }
              }}
            >
              {/* Illustration (Light & Dark Responsive) */}
              <motion.div
                layoutId={`reading-img-${service.id}`}
                transition={CARD_TRANSITION}
                className="relative w-full aspect-square max-w-[150px] sm:max-w-[210px] mx-auto mb-3 sm:mb-4 flex items-center justify-center pointer-events-none"
              >
                {service.image_url ? (
                  <Image
                    src={service.image_url}
                    alt={service.title}
                    fill
                    sizes="(max-width: 640px) 150px, (max-width: 1024px) 210px, 240px"
                    className="object-contain"
                  />
                ) : (
                  <>
                    <Image
                      src={`/readings_logo/${service.slug}-light.webp`}
                      alt={service.title}
                      fill
                      sizes="(max-width: 640px) 150px, (max-width: 1024px) 210px, 240px"
                      className="object-contain dark:hidden"
                    />
                    <Image
                      src={`/readings_logo/${service.slug}-dark.webp`}
                      alt={service.title}
                      fill
                      sizes="(max-width: 640px) 150px, (max-width: 1024px) 210px, 240px"
                      className="object-contain hidden dark:block"
                    />
                  </>
                )}
              </motion.div>

              {/* Title */}
              <h3 className="font-serif text-sm sm:text-base lg:text-lg font-normal text-[#0F172A] dark:text-[#FAF8F5] leading-snug mb-1.5 group-hover:text-[#6B3448] dark:group-hover:text-[#E5B842] transition-colors">
                {service.title}
              </h3>

              {/* Format & Duration Badge (Voice call duration vs Text reading) */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium text-[#6B3448] dark:text-[#E5B842] bg-[#E5B842]/10 border border-[#E5B842]/20 mb-2">
                {service.isCall ? (
                  <svg className="w-3 h-3 text-[#B87936] dark:text-[#E5B842] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-[#6B3448] dark:text-[#E5B842] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                )}
                <span>{service.format}</span>
              </div>

              {/* Delicate Celestial Divider */}
              <div className="w-10 sm:w-12 h-px bg-[#0F172A]/10 dark:bg-[#FAF8F5]/10 my-1 relative flex items-center justify-center">
                <span className="text-[#E5B842] text-[9px] sm:text-[10px] bg-white/90 dark:bg-[#0D1829] px-1">✦</span>
              </div>

              {/* Price Only */}
              <p className="font-serif text-lg sm:text-2xl font-normal text-[#6B3448] dark:text-[#E5B842] tracking-tight mt-0.5">
                {service.price}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Free Reading Banner Block (Tasteful, Clean Interactive Pop) ── */}
        <motion.a
          href="/free-reading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          className="group relative mt-12 sm:mt-16 w-full block rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-white/80 dark:bg-[#0D1829]/80 backdrop-blur-md border border-[#E5B842]/30 hover:border-[#E5B842]/70 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
          aria-label="Explore free Vedic rising sign reading"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left Column: Icon + Text Content */}
            <div className="flex items-center gap-4 sm:gap-6 text-center md:text-left flex-col md:flex-row">
              {/* Gift Icon with continuous gentle shake animation */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#E5B842]/15 dark:bg-[#E5B842]/10 border border-[#E5B842]/40 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#E5B842] transition-all duration-300 shadow-sm">
                <span className="animate-gift-shake">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#B87936] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </span>
              </div>

              <div>
                <h4 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-normal leading-tight group-hover:text-[#B87936] dark:group-hover:text-[#E5B842] transition-colors duration-200">
                  Looking for a Free Reading?
                </h4>
                <p className="text-xs sm:text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-1 font-light leading-relaxed max-w-xl">
                  Experience how Vedic astrology offers a deeper lens on your personal path and rising sign.
                </p>
              </div>
            </div>

            {/* Right Column: Clean, Crisp CTA Button */}
            <div className="shrink-0 w-full sm:w-auto flex justify-center">
              <span className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#E5B842] hover:bg-[#d9a832] text-[#070D18] font-bold text-xs sm:text-sm tracking-wider uppercase shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200 whitespace-nowrap">
                <span>Explore Free Reading</span>
                <span className="text-base group-hover:translate-x-1 transition-transform duration-200">→</span>
              </span>
            </div>
          </div>
        </motion.a>
      </div>

      {/* ── App Store Style Modal Expanded View ── */}
      <AnimatePresence>
        {selectedService && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-reading-title"
          >
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedService(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
            />

            {/* Expanded Modal Card (Spacious, Elegant & Focused) */}
            <motion.div
              layoutId={`reading-card-${selectedService.id}`}
              transition={CARD_TRANSITION}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md sm:max-w-[500px] bg-[#FFFDF9] dark:bg-[#0D1829] border border-[#E5B842]/35 rounded-3xl p-6 sm:p-7 sm:px-8 shadow-[0_25px_60px_rgba(0,0,0,0.55)] text-[#0F172A] dark:text-[#FAF8F5] max-h-[90vh] overflow-y-auto no-scrollbar my-auto"
            >
              {/* Top Tag & Close Button */}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#E5B842]/15 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/30">
                  <span className="text-[#E5B842] text-xs">✦</span>
                  READING DETAILS
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="w-8 h-8 rounded-full border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-black/5 dark:bg-white/5 hover:bg-[#E5B842]/20 flex items-center justify-center text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                  aria-label="Close reading details"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Prominent Celestial Artwork */}
              <motion.div
                layoutId={`reading-img-${selectedService.id}`}
                transition={CARD_TRANSITION}
                className="relative w-full max-w-[210px] sm:max-w-[250px] aspect-square mx-auto my-1.5 sm:my-2.5 flex items-center justify-center pointer-events-none"
              >
                {selectedService.image_url ? (
                  <Image
                    src={selectedService.image_url}
                    alt={selectedService.title}
                    fill
                    sizes="260px"
                    className="object-contain"
                    priority
                  />
                ) : (
                  <>
                    <Image
                      src={`/readings_logo/${selectedService.slug}-light.webp`}
                      alt={selectedService.title}
                      fill
                      sizes="260px"
                      className="object-contain dark:hidden"
                      priority
                    />
                    <Image
                      src={`/readings_logo/${selectedService.slug}-dark.webp`}
                      alt={selectedService.title}
                      fill
                      sizes="260px"
                      className="object-contain hidden dark:block"
                      priority
                    />
                  </>
                )}
              </motion.div>

              {/* Content Fade-in Container (prevents text distortion during card expansion) */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* Title & Format Badge */}
                <div className="text-center mb-3">
                  <h2
                    id="expanded-reading-title"
                    className="font-serif text-2xl sm:text-[1.7rem] font-normal text-[#0F172A] dark:text-[#FAF8F5] tracking-tight mb-2"
                  >
                    {selectedService.title}
                  </h2>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium text-[#6B3448] dark:text-[#E5B842] bg-[#E5B842]/10 border border-[#E5B842]/25">
                    {selectedService.isCall ? (
                      <svg className="w-3.5 h-3.5 text-[#B87936] dark:text-[#E5B842] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-[#6B3448] dark:text-[#E5B842] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                    )}
                    <span>{selectedService.format}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#0F172A]/75 dark:text-[#FAF8F5]/75 text-center font-light leading-relaxed max-w-sm mx-auto mb-6">
                  {selectedService.description}
                </p>

                {/* Bottom Price & Booking CTA */}
                <div className="pt-4 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                      PRICE
                    </p>
                    <p className="font-serif text-2xl sm:text-3xl font-normal text-[#6B3448] dark:text-[#E5B842] leading-tight">
                      {selectedService.price}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBook(selectedService)}
                    className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full bg-gradient-to-r from-[#B87936] via-[#E5B842] to-[#B87936] bg-[length:200%_auto] hover:bg-right text-[#070D18] font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_4px_16px_rgba(229,184,66,0.35)] hover:shadow-[0_6px_22px_rgba(229,184,66,0.55)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <span>Book This Reading</span>
                    <span>→</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
