import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/home/HeroSection";
import ServicesPreview from "@/components/home/ServicesPreview";
import AboutPreview from "@/components/home/AboutPreview";
import VisionSection from "@/components/home/VisionSection";
import ReviewsSection from "@/components/home/ReviewsSection";
import FinalCTASection from "@/components/home/FinalCTASection";
import Footer from "@/components/layout/Footer";
import { DEFAULT_ABOUT, DEFAULT_VISION } from "@/lib/homeContent";
import { withRequestTimeout } from "@/lib/requestTimeout";

// Force fresh data on every request — no stale cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Fetch About Me + Vision directly from Supabase on the server */
async function getHomeContent() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
    );

    const { data: profilesData } = await withRequestTimeout(signal => supabase
      .from("profiles")
      .select("bio, vision")
      .limit(1)
      .abortSignal(signal), 3000);

    let about = DEFAULT_ABOUT;
    let vision = DEFAULT_VISION;

    if (profilesData && profilesData.length > 0) {
      const p = profilesData[0];

      if (p.bio) {
        try {
          const parsed = JSON.parse(p.bio);
          about = { ...DEFAULT_ABOUT, ...parsed };
        } catch {
          about = { ...DEFAULT_ABOUT, paragraph_1: p.bio };
        }
      }

      if (p.vision) {
        try {
          const parsed = JSON.parse(p.vision);
          vision = { ...DEFAULT_VISION, ...parsed };
        } catch {
          vision = { ...DEFAULT_VISION, tag: p.vision };
        }
      }
    }

    return { about, vision };
  } catch {
    return { about: DEFAULT_ABOUT, vision: DEFAULT_VISION };
  }
}

export default async function Home() {
  // Fetch once on the server — no client-side flash possible
  const { about, vision } = await getHomeContent();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] transition-colors duration-300 flex flex-col justify-between relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      {/* ── Whole-Page Ambient Celestial Backdrop (Fixed across all sections) ── */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        <Image
          src="/Bg_light_mode.png"
          alt="Celestial Background Light"
          fill
          priority
          unoptimized
          className="object-cover object-center opacity-20 dark:hidden"
        />
        <Image
          src="/Bg_dark_mode.png"
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
        {/* Pass server-fetched content directly — no client-side fetch needed */}
        <AboutPreview initialContent={about} />
        <VisionSection initialContent={vision} />
        <ReviewsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
