import Image from "next/image";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F5]/90 dark:bg-[#0F172A]/90 border-b border-[#E5B842]/20">
      <div className="max-w-7xl mx-auto px-6 h-24 sm:h-28 flex items-center justify-between">
        {/* Official Brand Logo: Celestial Emblem + Typography */}
        <a
          href="/"
          className="flex items-center gap-4 sm:gap-5 group py-2"
          aria-label="TheAstroKaur Home"
        >
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/astro-emblem-light.png?v=4"
              alt="TheAstroKaur Celestial Logo"
              fill
              unoptimized
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/astro-emblem-dark.png?v=4"
              alt="TheAstroKaur Celestial Logo"
              fill
              unoptimized
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif text-2xl sm:text-3xl md:text-[2rem] tracking-wide font-medium text-[#0F172A] dark:text-[#FAF8F5] leading-tight">
              TheAstroKaur
            </span>
            <span className="text-[10px] sm:text-xs tracking-[0.28em] uppercase text-[#6B3448] dark:text-[#E5B842] mt-1 font-semibold">
              Vedic Astrology
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
          <a href="#about" className="hover:text-[#E5B842] transition-colors">
            About
          </a>
          <a href="#readings" className="hover:text-[#E5B842] transition-colors">
            Readings
          </a>
          <a href="#vision" className="hover:text-[#E5B842] transition-colors">
            Vision
          </a>
          <a href="#contact" className="hover:text-[#E5B842] transition-colors">
            Contact
          </a>
        </nav>

        {/* Action Controls: Theme Switch Button & Book Reading CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <a
            href="#readings"
            className="px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] shadow-sm transition-all whitespace-nowrap"
          >
            Book Reading
          </a>
        </div>
      </div>
    </header>
  );
}
