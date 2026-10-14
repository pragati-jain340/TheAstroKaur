import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdnwmfriilknnwqrepuy.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

export const dynamic = "force-dynamic";

const DEFAULT_ABOUT = {
  tag: "THE PERSON BEHIND THE READINGS",
  heading_prefix: "Meet",
  heading_name: "TheAstroKaur",
  paragraph_1:
    "Graduating from top universities in India and Germany and building a career in IT & technology, I was trained to think analytically and rely on logic and structured reasoning. Like many people, I believed that success and life's outcomes were entirely within my control, leaving little room for magic.",
  paragraph_2:
    "Everything changed when I began noticing recurring patterns in my own life—similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, that completely changed my perspective on life. Not just as a prediction tool, but astrology has helped me for self-awareness and personal growth.",
  image_url: "/Owner_image.png",
};

const DEFAULT_VISION = {
  tag: "A VISION FOR ASTROLOGY",
  heading_line_1: "There Is More Than One Way",
  heading_line_2: "to See Your Story.",
  paragraph_1:
    "The same experiences can look different when we understand ourselves a little better. Astrology offers a perspective on the relationships we build, the choices we face, and the paths we take.",
  paragraph_2:
    "Through my practice, I hope to bridge the gap between ancient Vedic wisdom and the modern world, making astrology easier to understand and relevant to everyday life. Rather than seeing it as a way to reflect on our experiences, understand ourselves better, and approach life's uncertainties with greater awareness.",
};

export async function GET() {
  try {
    // 1. Services
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // 2. About Me Profile & Vision
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    let aboutContent = DEFAULT_ABOUT;
    let visionContent = DEFAULT_VISION;

    if (profilesData && profilesData.length > 0) {
      const p = profilesData[0];
      if (p.bio) {
        try {
          const parsed = JSON.parse(p.bio);
          aboutContent = { ...DEFAULT_ABOUT, ...parsed };
        } catch {
          aboutContent = {
            ...DEFAULT_ABOUT,
            paragraph_1: p.bio,
            heading_name: p.display_name || DEFAULT_ABOUT.heading_name,
            tag: DEFAULT_ABOUT.tag,
          };
        }
      }

      if (p.vision) {
        try {
          const parsedVision = JSON.parse(p.vision);
          visionContent = { ...DEFAULT_VISION, ...parsedVision };
        } catch {
          visionContent = {
            ...DEFAULT_VISION,
            tag: p.vision,
          };
        }
      }
    }

    return NextResponse.json({
      about: aboutContent,
      vision: visionContent,
      services: servicesData || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      about: DEFAULT_ABOUT,
      vision: DEFAULT_VISION,
      services: [],
      error: err.message,
    });
  }
}
