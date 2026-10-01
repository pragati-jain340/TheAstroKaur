"use client";

/**
 * AstrologyWheel.tsx
 * ------------------
 * Rotating Vedic horoscope wheel for TheAstroKaur.
 *
 * - Artwork: Exact authentic horoscope artwork (with moon, star, constellations
 *   and zodiac glyphs) with dark charcoal line art & antique-gold accents in light mode,
 *   and radiant antique-gold linework in dark mode.
 * - Background: 100% transparent. No solid beige disc, no circular border, allowing the
 *   ambient hero background artwork to be visible directly through the wheel.
 * - Glow: Very soft antique-gold radial glow behind the wheel at 8–12% opacity with
 *   smooth feathered falloff and no visible circular boundary.
 * - Animation: Continuous, butter-smooth 360° celestial rotation (~30s per cycle).
 */

import React from "react";

// ─── Props ───────────────────────────────────────────────────────────────────
export interface AstrologyWheelProps {
  /**
   * Rotation duration in seconds for one full 360° turn.
   * Default: 30s (smooth, graceful, visibly moving).
   */
  duration?: number;

  /**
   * Overall opacity of the wheel artwork (0-1).
   * Default: 0.96
   */
  opacity?: number;

  /**
   * Tailwind or CSS class names for responsive sizing.
   */
  className?: string;

  /**
   * Optional custom path to light-mode SVG asset.
   * Default: "/astrology-wheel-light.svg?v=2"
   */
  lightAssetPath?: string;

  /**
   * Optional custom path to dark-mode SVG asset.
   * Default: "/astrology-wheel-dark.svg?v=2"
   */
  darkAssetPath?: string;

  /**
   * Accessibility label for screen readers.
   */
  ariaLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AstrologyWheel({
  duration = 30,
  opacity = 0.96,
  className = "w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px]",
  lightAssetPath = "/astrology-wheel-light.svg?v=2",
  darkAssetPath = "/astrology-wheel-dark.svg?v=2",
  ariaLabel = "Rotating Vedic horoscope wheel featuring constellations, zodiac glyphs, and antique-gold celestial accents",
}: AstrologyWheelProps) {
  return (
    <>
      {/* ── Keyframe Animations ── */}
      <style>{`
        @keyframes astroWheelSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* ── Outer Wheel Container (100% Transparent) ── */}
      <div
        className={`relative inline-flex items-center justify-center select-none bg-transparent ${className}`}
        role="img"
        aria-label={ariaLabel}
      >
        {/*
         * Very soft antique-gold radial glow behind the wheel:
         * - Opacity: 8–10% in light mode, ~12% in dark mode
         * - Zero visible circular boundary: extends beyond box bounds and feathers seamlessly to transparent (0%)
         */}
        <div
          className="absolute -inset-10 sm:-inset-16 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(229, 184, 66, 0.09) 0%, rgba(229, 184, 66, 0.045) 40%, rgba(229, 184, 66, 0.015) 60%, transparent 75%)",
            filter: "blur(36px)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Dark-mode specific glow enhancement */}
        <div
          className="absolute -inset-10 sm:-inset-16 pointer-events-none hidden dark:block"
          style={{
            background:
              "radial-gradient(circle at center, rgba(229, 184, 66, 0.12) 0%, rgba(229, 184, 66, 0.06) 42%, rgba(229, 184, 66, 0.018) 62%, transparent 78%)",
            filter: "blur(40px)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* ── Continuous Rotating Zodiac Chakra Layer ── */}
        <div
          className="relative w-full h-full bg-transparent"
          style={{
            animation: `astroWheelSpin ${Math.max(1, duration)}s linear infinite`,
            animationPlayState: "running",
            willChange: "transform",
            opacity: opacity,
            zIndex: 1,
          }}
        >
          {/*
           * Light Mode Artwork:
           * Crisp dark charcoal linework (#2B2D31), dark celestial center disc,
           * and fine antique-gold accents (#E5B842 / #D4AF37) on stars and decorative rings.
           * Background is 100% transparent.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightAssetPath}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain pointer-events-none dark:hidden"
            loading="eager"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src && !target.src.includes("astrology-wheel.svg")) {
                target.src = "/astrology-wheel.svg";
              }
            }}
          />

          {/*
           * Dark Mode Artwork:
           * Luminous antique-gold linework (#E2CE9F / #E5B842) on deep celestial navy center disc,
           * giving radiant clarity and readability against dark backgrounds (#0F172A).
           * Background is 100% transparent.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={darkAssetPath}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain pointer-events-none hidden dark:block"
            loading="eager"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src && !target.src.includes("astrology-wheel.svg")) {
                target.src = "/astrology-wheel.svg";
              }
            }}
          />
        </div>
      </div>
    </>
  );
}

