"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function FinalCTASection() {
  const { openContactModal } = useAuth();

  const scrollToReadings = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("readings");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.hash = "readings";
    }
  };

  return (
    <section className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-16 bg-transparent relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Harmonious Light & Dark Theme Container */}
        <div className="relative rounded-3xl bg-white/90 dark:bg-[#131F33] backdrop-blur-md border border-[#E5B842]/35 dark:border-[#E5B842]/20 py-16 sm:py-20 px-6 sm:px-12 text-center shadow-[0_20px_50px_rgba(229,184,66,0.12),0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden transition-colors duration-300">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
            style={{
              background:
                "radial-gradient(circle at 50% 15%, rgba(229, 184, 66, 0.22) 0%, rgba(229, 184, 66, 0.06) 45%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Subtle ambient blurred celestial accents */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#E5B842]/12 dark:bg-[#E5B842]/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#6B3448]/8 dark:bg-[#1E3A8A]/25 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Small Gold Sparkle Icon */}
            <div className="mb-6 text-[#E5B842] flex items-center justify-center">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {/* 4-point sparkle star */}
                <path d="M12 2.5 L13.5 9 L20 10.5 L13.5 12 L12 18.5 L10.5 12 L4 10.5 L10.5 9 Z" />
                {/* Small satellite sparkles */}
                <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
                <circle cx="5" cy="18" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </div>

            {/* Elegant Serif Heading */}
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#0F172A] dark:text-white font-normal tracking-tight leading-tight max-w-2xl mb-4">
              Begin Your Journey Towards Greater Clarity
            </h2>

            {/* Supporting Description */}
            <p className="text-sm sm:text-base text-[#0F172A]/70 dark:text-[#CBD5E1] max-w-xl mx-auto mb-9 font-light leading-relaxed">
              Explore the readings and find the one that feels relevant to your path, or get in touch with any preliminary questions.
            </p>

            {/* Dual Horizontally Aligned Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-7">
              {/* Primary Button: EXPLORE MY READINGS → */}
              <a
                href="#readings"
                onClick={scrollToReadings}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>EXPLORE MY READINGS</span>
                <span className="text-sm font-bold">→</span>
              </a>

              {/* Secondary Button: GET IN TOUCH */}
              <button
                type="button"
                onClick={() => openContactModal()}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white/90 hover:bg-white text-[#0F172A] border border-[#0F172A]/15 hover:border-[#6B3448]/40 shadow-sm dark:bg-[#2A374A] dark:hover:bg-[#34445A] dark:border-white/20 dark:hover:border-white/40 dark:text-white font-semibold text-xs tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>GET IN TOUCH</span>
              </button>
            </div>

            {/* Trust Line */}
            <div className="inline-flex items-center justify-center gap-2 text-xs sm:text-[13px] text-[#0F172A]/60 dark:text-[#94A3B8] font-normal">
              <span className="text-[#E5B842] text-sm" role="img" aria-label="Privacy lock">
                🔒
              </span>
              <span>Private &amp; Confidential · Online or Written Readings</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
