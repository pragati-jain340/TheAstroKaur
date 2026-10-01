"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Determine initial theme
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle light and dark mode"
        className={`w-10 h-10 rounded-full flex items-center justify-center border border-[#E5B842]/30 bg-[#FAF8F5]/80 dark:bg-[#1E293B]/80 text-[#0F172A] dark:text-[#E5B842] transition-colors opacity-70 ${className}`}
        disabled
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center border border-[#E5B842]/35 hover:border-[#E5B842] bg-[#FAF8F5]/80 hover:bg-[#E5B842]/10 dark:bg-[#1E293B]/80 dark:hover:bg-[#E5B842]/20 text-[#0F172A] dark:text-[#E5B842] transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842] ${className}`}
    >
      {/* Sun Icon (shown in Light mode) */}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
          isDark ? "opacity-0 rotate-90 scale-50 pointer-events-none" : "opacity-100 rotate-0 scale-100"
        }`}
        aria-hidden="true"
      >
        <svg
          className="w-5 h-5 text-[#B87936] group-hover:text-[#E5B842] transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </span>

      {/* Moon & Star Icon (shown in Dark mode) */}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50 pointer-events-none"
        }`}
        aria-hidden="true"
      >
        <svg
          className="w-5 h-5 text-[#E5B842] group-hover:text-[#FFE082] transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          <path d="M19 3v4" />
          <path d="M21 5h-4" />
        </svg>
      </span>
    </button>
  );
}
