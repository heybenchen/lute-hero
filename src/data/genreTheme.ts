import { Genre } from "@/types";

/**
 * Single source of truth for genre/element presentation:
 * emoji identity, hex color, and rgb triplet (for rgba() styles).
 * Colors match the Tailwind theme (ballad/folk/hymn/shanty).
 */
export const GENRE_THEME: Record<Genre, { emoji: string; color: string; rgb: string }> = {
  Ballad: { emoji: "🔥", color: "#e82040", rgb: "232, 32, 64" },
  Folk: { emoji: "🌿", color: "#4caf50", rgb: "76, 175, 80" },
  Hymn: { emoji: "💨", color: "#facc15", rgb: "250, 204, 21" },
  Shanty: { emoji: "🌊", color: "#2979ff", rgb: "41, 121, 255" },
};

export const ALL_GENRES: Genre[] = ["Ballad", "Folk", "Hymn", "Shanty"];

/**
 * Choose black or white text for legibility on an arbitrary background color,
 * using sRGB-weighted perceptual luminance.
 */
export function readableTextColor(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a140a" : "#ffffff";
}
