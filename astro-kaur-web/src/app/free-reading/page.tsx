import Navbar from "@/components/layout/Navbar";
import SubpageBackground from "@/components/layout/SubpageBackground";
import RisingSignSection from "@/components/home/RisingSignSection";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Free Rising Sign Reading — TheAstroKaur",
  description:
    "Discover your Vedic Ascendant (Lagna) and receive a complimentary personalized rising sign reading from Astrologer Kaur.",
};

export default function FreeReadingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] transition-colors duration-300 flex flex-col justify-between relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />

      <Navbar />
      <main className="flex-1 flex flex-col relative z-10 pt-6">
        <RisingSignSection />
      </main>
      <Footer />
    </div>
  );
}
