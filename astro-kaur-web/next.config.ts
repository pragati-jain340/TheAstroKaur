import type { NextConfig } from "next";

// Keep saved image URLs working while serving one optimized file per illustration.
const readingImageAliases = [
  ["Career & Money Guidance", "career-money-guidance"],
  ["Career & Money Reading", "career-money-reading"],
  ["Extensive Birth Chart Reading", "extensive-chart"],
  ["Future Partner Reading", "future-partner"],
  ["Matchmaking Reading", "matchmaking-reading"],
  ["Relationship Karma", "relationship-karma"],
] as const;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.70.44.20",
    "10.*.*.*",
    "192.168.*.*",
    "172.*.*.*",
    "*.local",
  ],
  async redirects() {
    return [
      ...readingImageAliases.flatMap(([title, slug]) =>
        ["light", "dark"].flatMap((theme) =>
          [`${title}_${theme}.png`, `${title}_${theme}.webp`, `${slug}-${theme}.png`].map((file) => ({
            source: encodeURI(`/readings_logo/${file}`),
            destination: `/readings_logo/${slug}-${theme}.webp`,
            permanent: true,
          }))
        )
      ),
      ...[
        ["/owner.jpeg", "/Owner_image.png"],
        ["/Rotating Horoscope Wheel.svg", "/astrology-wheel-light.svg"],
        ["/astrology-wheel.svg", "/astrology-wheel-light.svg"],
      ].map(([source, destination]) => ({
        source: encodeURI(source),
        destination,
        permanent: true,
      })),
    ];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
