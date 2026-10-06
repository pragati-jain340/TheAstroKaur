"use client";

import React, { useState } from "react";
import { getCelestialAvatar } from "@/lib/avatar/celestialAvatars";

export interface AvatarDisplayProps {
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: { box: "w-7 h-7", text: "text-[10px]", symbol: "text-xs" },
  sm: { box: "w-8 h-8", text: "text-xs", symbol: "text-sm" },
  md: { box: "w-10 h-10", text: "text-sm", symbol: "text-base" },
  lg: { box: "w-14 h-14", text: "text-lg", symbol: "text-2xl" },
  xl: { box: "w-20 h-20", text: "text-2xl", symbol: "text-4xl" },
  "2xl": { box: "w-24 h-24", text: "text-3xl", symbol: "text-5xl" },
};

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AvatarDisplay({
  avatarUrl,
  avatarSeed,
  name,
  size = "md",
  className = "",
  showBorder = true,
}: AvatarDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const celestial = getCelestialAvatar(avatarSeed);

  // Border & container styles matching TheAstroKaur luxury palette
  const borderClass = showBorder
    ? "border border-[#E5B842]/40 shadow-xs"
    : "border border-transparent";

  // 1. Priority 1: Custom Uploaded Photo (avatar_url)
  if (avatarUrl && !imageError) {
    return (
      <div
        className={`relative ${sizeConfig.box} rounded-full overflow-hidden shrink-0 bg-[#FAF8F5] dark:bg-[#070D18] ${borderClass} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={name ? `${name}'s avatar` : "Profile Avatar"}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // 2. Priority 2: Predefined Celestial Avatar (avatar_seed)
  if (celestial) {
    return (
      <div
        className={`relative ${sizeConfig.box} rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#E5B842]/20 via-[#FAF8F5] to-[#E5B842]/10 dark:from-[#E5B842]/25 dark:via-[#0D1829] dark:to-[#070D18] ${borderClass} select-none ${className}`}
        title={celestial.label}
      >
        <span className={`${sizeConfig.symbol} leading-none transform transition-transform duration-200`}>
          {celestial.symbol}
        </span>
      </div>
    );
  }

  // 3. Priority 3: User Initials Fallback
  const initials = getInitials(name);
  return (
    <div
      className={`relative ${sizeConfig.box} rounded-full shrink-0 flex items-center justify-center bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] font-serif font-bold ${sizeConfig.text} ${borderClass} select-none tracking-wider ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}
