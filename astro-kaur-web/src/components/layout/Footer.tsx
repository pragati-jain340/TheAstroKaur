import Image from "next/image";

export default function Footer() {
  return (
    <footer id="contact" className="scroll-mt-28 sm:scroll-mt-32 border-t border-[#E5B842]/20 pt-16 pb-12 px-6 lg:px-16 bg-[#FAF8F5]/80 dark:bg-[#0F172A]/80 backdrop-blur-sm text-[#0F172A] dark:text-[#FAF8F5]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
          {/* Brand & Tagline */}
          <div className="md:col-span-5 flex flex-col items-start space-y-4">
            <a href="/" className="flex items-center gap-4 group">
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
                <span className="text-[10px] tracking-[0.24em] uppercase text-[#6B3448] dark:text-[#E5B842] font-semibold">
                  Vedic Astrology
                </span>
              </div>
            </a>
            <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-sm font-light leading-relaxed">
              Ancient wisdom. Modern perspective. Guiding conscious self-awareness and life clarity through authentic Vedic astrology.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 sm:col-span-6">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-[#0F172A]/75 dark:text-[#FAF8F5]/75 font-light">
              <li>
                <a href="/" className="hover:text-[#E5B842] transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-[#E5B842] transition-colors">
                  About TheAstroKaur
                </a>
              </li>
              <li>
                <a href="#readings" className="hover:text-[#E5B842] transition-colors">
                  Readings &amp; Services
                </a>
              </li>
              <li>
                <a href="#free-reading" className="hover:text-[#E5B842] transition-colors">
                  Free Reading
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-[#E5B842] transition-colors">
                  Contact &amp; Inquiries
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-4 sm:col-span-6">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] mb-4">
              Legal &amp; Policies
            </h4>
            <ul className="space-y-2.5 text-sm text-[#0F172A]/75 dark:text-[#FAF8F5]/75 font-light">
              <li>
                <a href="#privacy" className="hover:text-[#E5B842] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-[#E5B842] transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#cancellation" className="hover:text-[#E5B842] transition-colors">
                  Cancellation &amp; Refund Policy
                </a>
              </li>
              <li>
                <a href="#disclaimer" className="hover:text-[#E5B842] transition-colors">
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
