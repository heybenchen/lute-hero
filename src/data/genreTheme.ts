import { Genre } from "@/types";

/**
 * Single source of truth for genre/element presentation:
 * emoji identity, hex color, and rgb triplet (for rgba() styles).
 * Colors match the Tailwind theme (ballad/folk/hymn/shanty).
 */
export const GENRE_THEME: Record<Genre, { emoji: string; color: string; rgb: string }> = {
  Ballad: { emoji: "🔥", color: "#e82040", rgb: "232, 32, 64" },
  Folk: { emoji: "🌿", color: "#4caf50", rgb: "76, 175, 80" },
  Hymn: { emoji: "💨", color: "#00b8d4", rgb: "0, 184, 212" },
  Shanty: { emoji: "🌊", color: "#2979ff", rgb: "41, 121, 255" },
};

export const ALL_GENRES: Genre[] = ["Ballad", "Folk", "Hymn", "Shanty"];
