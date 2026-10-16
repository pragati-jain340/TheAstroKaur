"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";

const NAV_ITEMS = [
  { label: "About", href: "/#about" },
  { label: "Readings", href: "/#readings" },
  { label: "Vision", href: "/#vision" },
  { label: "Reviews", href: "/#reviews" },
  { label: "Contact", href: "/#contact" },
];

const AVATAR_EMOJIS: Record<string, string> = {
  sun: "☀️",
  moon: "🌙",
  star: "✨",
  lotus: "🪷",
  cosmos: "🪐",
};

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const router = useRouter();

  const { user, profile, isAdmin, openAuthModal, openProfileModal, openContactModal, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavItemClick = (e: React.MouseEvent<HTMLAnchorElement>, label: string) => {
    if (label === "Contact") {
      e.preventDefault();
      openContactModal();
    }
  };

  // Close user dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (user?.email ? user.email.split("@")[0] : "");

  // ─── Scroll-Direction Awareness ──────────────────────────────────────────
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const SCROLL_THRESHOLD = 15;
    const TOP_THRESHOLD = 80;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY);
        const previousScrollY = lastScrollYRef.current;
        const diff = currentScrollY - previousScrollY;

        // 1. Always visible at the top of the page
        if (currentScrollY <= TOP_THRESHOLD) {
          setIsVisible(true);
          lastScrollYRef.current = currentScrollY;
        }
        // 2. Beyond top threshold: evaluate direction if movement exceeds threshold
        else if (Math.abs(diff) >= SCROLL_THRESHOLD) {
          if (diff > 0) {
            // Scrolling down -> hide navbar
            setIsVisible(false);
          } else {
            // Scrolling up -> reveal navbar
            setIsVisible(true);
          }
          lastScrollYRef.current = currentScrollY;
        }

        ticking = false;
      });
    };

    lastScrollYRef.current = Math.max(0, window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Do not hide navbar while account dropdown or mobile navigation menu is active
  const isNavbarVisible = isVisible || userDropdownOpen || mobileMenuOpen;

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F5]/90 dark:bg-[#0F172A]/90 border-b border-[#E5B842]/20 transition-transform duration-300 ease-in-out motion-reduce:transition-none will-change-transform ${
        isNavbarVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-18 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Official Brand Logo: Celestial Emblem + Typography */}
        <a
          href="/"
          className="flex items-center gap-1.5 sm:gap-3.5 group py-1.5 min-w-0"
          aria-label="TheAstroKaur Home"
        >
          <div className="relative h-8 w-8 sm:h-16 sm:w-16 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/astro-emblem-light.png?v=6"
              alt="TheAstroKaur Celestial Logo"
              fill
              unoptimized
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/astro-emblem-dark.png?v=6"
              alt="TheAstroKaur Celestial Logo"
              fill
              unoptimized
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif text-lg sm:text-2xl md:text-[1.65rem] tracking-wide font-medium text-[#0F172A] dark:text-[#FAF8F5] leading-tight">
              TheAstroKaur
            </span>
            <span className="text-[7px] sm:text-[10.5px] md:text-xs tracking-[0.22em] uppercase text-[#6B3448] dark:text-[#E5B842] mt-0.5 font-semibold whitespace-nowrap">
              Written In The Stars
            </span>
          </div>
        </a>

        {/* Navigation Tabs - Open & Elegant Layout */}
        <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-0 2xl:gap-3.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavItemClick(e, item.label)}
              className="relative px-2 2xl:px-4.5 py-1.5 rounded-full text-base 2xl:text-[18.5px] font-serif font-medium tracking-wide whitespace-nowrap text-[#0F172A]/85 dark:text-[#FAF8F5]/90 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] transition-all duration-300 group cursor-pointer"
            >
              {/* Subtle ambient hover background */}
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E5B842]/12 via-[#E5B842]/18 to-[#6B3448]/12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

              {/* Tab Content with Celestial Star Indicator */}
              <span className="relative z-10 flex items-center gap-1.5 leading-none">
                <span className="text-[#E5B842] opacity-0 -translate-x-1.5 scale-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-300 text-xs">
                  ✦
                </span>
                <span>{item.label}</span>
              </span>

              {/* Glowing Luminous Beam Underline */}
              <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#E5B842] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center rounded-full" />
            </a>
          ))}
        </nav>

        {/* Action Controls: Theme Switch, User Profile Icon & Book Reading CTA */}
        <div className="flex items-center gap-1 sm:gap-3.5 flex-shrink-0">
          <ThemeToggle />

          {/* User Profile Trigger Button */}
          <div className="relative" ref={dropdownRef}>
            {user ? (
              // Logged-in state: Avatar with Priority (Custom URL -> Celestial Preset -> Initials)
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 cursor-pointer"
                aria-label="User Account Menu"
              >
                <AvatarDisplay
                  avatarUrl={profile?.avatar_url}
                  avatarSeed={profile?.avatar_seed}
                  name={displayName}
                  size="md"
                  showBorder={true}
                />
              </button>
            ) : (
              // Logged-out state: Person Silhouette Button
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="w-10 h-10 rounded-full border border-[#0F172A]/15 dark:border-[#FAF8F5]/20 hover:border-[#E5B842] flex items-center justify-center text-[#0F172A]/80 dark:text-[#FAF8F5]/80 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-all cursor-pointer group"
                title="Sign In / Register"
                aria-label="Sign In or Register"
              >
                <svg
                  className="w-5 h-5 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              </button>
            )}

            {/* Logged-In User Dropdown Menu */}
            {userDropdownOpen && user && (
              <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 shadow-2xl p-2.5 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header with Avatar */}
                <div className="p-3 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center gap-3">
                  <AvatarDisplay
                    avatarUrl={profile?.avatar_url}
                    avatarSeed={profile?.avatar_seed}
                    name={displayName}
                    size="md"
                    showBorder={true}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#0F172A] dark:text-[#FAF8F5] truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 truncate mt-0.5">
                      {user.email}
                    </p>
                    {isAdmin && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A] shadow-xs">
                          ADMIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Menu Links */}
                <div className="py-1.5 space-y-0.5">
                  {/* Home Page Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      router.push("/");
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/15 transition-colors cursor-pointer group"
                  >
                    <svg className="w-3.5 h-3.5 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span>Home Page</span>
                  </button>

                  {/* ✦ My Account */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      router.push("/account");
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/15 transition-colors cursor-pointer group"
                  >
                    <span className="text-[#E5B842] text-sm group-hover:rotate-12 transition-transform">✦</span>
                    <span>My Account</span>
                  </button>

                  {/* Admin Dashboard */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push("/admin");
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#B8871E] dark:text-[#E5B842] hover:bg-[#E5B842]/15 transition-colors cursor-pointer group"
                    >
                      <svg className="w-3.5 h-3.5 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                      </svg>
                      <span>Admin Dashboard</span>
                    </button>
                  )}
                </div>

                {/* Sign Out Button */}
                <div className="pt-1.5 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Sign Out</span>
                    <span className="text-sm">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Book Reading CTA Button */}
          <a
            href="/#readings"
            className="group relative hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-[#0F172A] bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] bg-[length:200%_auto] hover:bg-right shadow-[0_4px_16px_rgba(229,184,66,0.35)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.55)] transition-all duration-300 active:scale-95 whitespace-nowrap"
          >
            <span>Book Reading</span>
            <span className="text-[#6B3448] font-bold text-xs transition-transform duration-300 group-hover:rotate-45">✦</span>
          </a>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden w-10 h-10 flex items-center justify-center rounded-full border border-[#E5B842]/30 text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="xl:hidden absolute top-full inset-x-0 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-[#E5B842]/20 bg-[#FAF8F5]/98 dark:bg-[#0F172A]/98 backdrop-blur-xl px-4 sm:px-6 py-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavItemClick(e, item.label);
                }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-lg font-serif font-medium text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/15 transition-all"
              >
                <span>{item.label}</span>
                <span className="text-[#E5B842] text-sm">✦</span>
              </a>
            ))}
            <Link href="/#readings" onClick={() => setMobileMenuOpen(false)} className="sm:hidden mt-2 px-5 py-3.5 rounded-full bg-[#E5B842] text-[#0F172A] text-center text-sm font-semibold">
              Book a Reading
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
