export interface CelestialAvatar {
  id: string;
  label: string;
  symbol: string;
  meaning: string;
}

export const CELESTIAL_AVATARS: CelestialAvatar[] = [
  { id: "sun", label: "Solar", symbol: "☀️", meaning: "Vitality & Radiance" },
  { id: "moon", label: "Lunar", symbol: "🌙", meaning: "Intuition & Mystery" },
  { id: "star", label: "Star", symbol: "⭐", meaning: "Cosmic Guidance" },
  { id: "lotus", label: "Lotus", symbol: "🪷", meaning: "Spiritual Awakening" },
  { id: "eye", label: "Mystic Eye", symbol: "👁️", meaning: "Higher Perception" },
  { id: "ascendant", label: "Ascendant", symbol: "🪐", meaning: "Rising Destiny" },
];

export function getCelestialAvatar(id?: string | null): CelestialAvatar | null {
  if (!id) return null;
  return CELESTIAL_AVATARS.find((a) => a.id.toLowerCase() === id.toLowerCase()) || null;
}
