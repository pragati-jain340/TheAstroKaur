"use client";

import Image from "next/image";
import Link from "next/link";
import FooterContactButton from "./FooterContactButton";

export default function Footer() {
  return (
    <footer className="border-t border-[#E5B842]/20 pt-16 pb-12 px-6 lg:px-16 bg-[#FAF8F5]/80 dark:bg-[#0F172A]/80 backdrop-blur-sm text-[#0F172A] dark:text-[#FAF8F5]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-10 md:gap-10 pb-12 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
          {/* Brand & Tagline */}
          <div className="col-span-2 md:col-span-5 min-w-0 flex flex-col items-start space-y-4">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative h-14 w-14 flex-shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/astro-emblem-light.png?v=6"
                  alt="TheAstroKaur"
                  fill
                  unoptimized
                  className="object-contain dark:hidden"
                />
                <Image
                  src="/astro-emblem-dark.png?v=6"
                  alt="TheAstroKaur"
                  fill
                  unoptimized
                  className="object-contain hidden dark:block"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl tracking-wide font-medium">
                  TheAstroKaur
                </span>
                <span className="text-[10px] tracking-[0.22em] uppercase text-[#6B3448] dark:text-[#E5B842] font-semibold whitespace-nowrap">
                  Written In The Stars
                </span>
              </div>
            </Link>
            <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-sm font-light leading-relaxed">
              Astrology for self-discovery and clarity.
            </p>
            <div className="pt-1">
              <FooterContactButton />
            </div>
          </div>

          {/* Quick Links */}
          <div className="min-w-0 md:col-span-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-[#0F172A]/75 dark:text-[#FAF8F5]/75 font-light">
              <li>
                <Link href="/" className="hover:text-[#E5B842] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-[#E5B842] transition-colors">
                  About TheAstroKaur
                </Link>
              </li>
              <li>
                <Link href="/#readings" className="hover:text-[#E5B842] transition-colors">
                  Readings &amp; Services
                </Link>
              </li>
              <li>
                <Link href="/#reviews" className="hover:text-[#E5B842] transition-colors">
                  Reviews
                </Link>
              </li>
              <li>
                <a href="/free-reading" className="hover:text-[#E5B842] transition-colors">
                  Free Reading
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="min-w-0 md:col-span-4">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] mb-4">
              Legal &amp; Policies
            </h4>
            <ul className="space-y-2.5 text-sm text-[#0F172A]/75 dark:text-[#FAF8F5]/75 font-light">
              <li>
                <a href="/privacy-policy" className="hover:text-[#E5B842] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms-of-service" className="hover:text-[#E5B842] transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/cancellation-policy" className="hover:text-[#E5B842] transition-colors">
                  Cancellation &amp; Refund Policy
                </a>
              </li>
              <li>
                <a href="/disclaimer" className="hover:text-[#E5B842] transition-colors">
                  Astrology Disclaimer
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Astrological Note */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#0F172A]/55 dark:text-[#FAF8F5]/55 font-light">
          <p>© {new Date().getFullYear()} TheAstroKaur. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Astrological insights are offered for self-awareness, reflection, and conscious living.
          </p>
        </div>
      </div>
    </footer>
  );
}
