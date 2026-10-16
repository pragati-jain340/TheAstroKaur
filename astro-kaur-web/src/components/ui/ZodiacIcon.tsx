"use client";

import React from "react";
import Image from "next/image";

interface ZodiacIconProps {
  sign: string;
  size?: number;
  className?: string;
  glyph?: string;
}

const ZODIAC_FILES: Record<string, string> = {
  aries: "/zodiac/aries.svg",
  taurus: "/zodiac/taurus.svg",
  gemini: "/zodiac/gemini.svg",
  cancer: "/zodiac/cancer.svg",
  leo: "/zodiac/leo.svg",
  virgo: "/zodiac/virgo.svg",
  libra: "/zodiac/libra.svg",
  scorpio: "/zodiac/scorpio.svg",
  sagittarius: "/zodiac/sagittarius.svg",
  capricorn: "/zodiac/capricorn.svg",
  aquarius: "/zodiac/aquarius.svg",
  pisces: "/zodiac/pisces.svg",
};

export default function ZodiacIcon({
  sign,
  size = 48,
  className = "",
  glyph,
}: ZodiacIconProps) {
  const normalizedKey = (sign || "").toLowerCase().trim();
  const filePath = ZODIAC_FILES[normalizedKey];

  if (!filePath) {
    return <span className={`inline-block font-serif text-2xl ${className}`}>{glyph || "✦"}</span>;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center text-[#E5B842] dark:text-[#E5B842] ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${sign} Zodiac Sign`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={filePath}
        alt={`${sign} zodiac symbol`}
        width={size}
        height={size}
        className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(229,184,66,0.25)] dark:drop-shadow-[0_2px_12px_rgba(229,184,66,0.35)]"
      />
    </div>
  );
}
