import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/home/HeroSection";
import ServicesPreview from "@/components/home/ServicesPreview";
import AboutPreview from "@/components/home/AboutPreview";
import VisionSection from "@/components/home/VisionSection";
import FinalCTASection from "@/components/home/FinalCTASection";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] transition-colors duration-300 flex flex-col justify-between relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      {/* ── Whole-Page Ambient Celestial Backdrop (Fixed across all sections) ── */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        <Image
          src="/Bg_light_mode.png?v=1"
          alt="Celestial Background Light"
          fill
          priority
          unoptimized
          className="object-cover object-center opacity-15 dark:hidden"
        />
        <Image
          src="/Bg_dark_mode.png?v=1"
          alt="Celestial Background Dark"
          fill
          priority
          unoptimized
          className="object-cover object-center opacity-8 hidden dark:block"
        />
      </div>

      <Navbar />
      <main className="flex-1 flex flex-col relative z-10">
        <HeroSection />
        <ServicesPreview />
        <AboutPreview />
        <VisionSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
