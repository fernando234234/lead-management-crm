/**
 * Centralized Platform Constants
 * 
 * All platform-related configuration is defined here.
 * Import these constants instead of defining them locally in each file.
 * 
 * Matches the Prisma enum:
 * enum Platform {
 *   META
 *   GOOGLE_ADS
 *   LINKEDIN
 *   TIKTOK
 * }
 */

export type Platform = "META" | "GOOGLE_ADS" | "LINKEDIN" | "TIKTOK";

export const PLATFORMS: Platform[] = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];

// Default platform for new campaigns
export const DEFAULT_PLATFORM: Platform = "META";

/**
 * Human-readable labels for each platform
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  META: "Meta (FB/IG)",
  GOOGLE_ADS: "Google Ads",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

/**
 * Short labels for compact views
 */
export const PLATFORM_LABELS_SHORT: Record<Platform, string> = {
  META: "Meta",
  GOOGLE_ADS: "Google",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

/**
 * Badge/pill colors for each platform (Tailwind CSS classes)
 */
export const PLATFORM_COLORS: Record<Platform, string> = {
  META: "bg-blue-100 text-blue-700",
  GOOGLE_ADS: "bg-red-100 text-red-700",
  LINKEDIN: "bg-sky-100 text-sky-700",
  TIKTOK: "bg-gray-100 text-gray-700",
};

/**
 * Chart colors for each platform (hex values)
 */
export const PLATFORM_CHART_COLORS: Record<Platform, string> = {
  META: "#1877f2",
  GOOGLE_ADS: "#ea4335",
  LINKEDIN: "#0077b5",
  TIKTOK: "#000000",
};

/**
 * Options array for select dropdowns
 */
export const PLATFORM_OPTIONS = PLATFORMS.map((value) => ({
  value,
  label: PLATFORM_LABELS[value],
  labelShort: PLATFORM_LABELS_SHORT[value],
  color: PLATFORM_COLORS[value],
  chartColor: PLATFORM_CHART_COLORS[value],
}));

/**
 * Options array for filter dropdowns (includes "all" option)
 */
export const PLATFORM_FILTER_OPTIONS = [
  { value: "", label: "Tutte le piattaforme", labelShort: "Tutte" },
  ...PLATFORM_OPTIONS,
];

/**
 * Helper function to get platform label (with fallback)
 */
export function getPlatformLabel(platform: string | null | undefined, short = false): string {
  if (!platform) return "-";
  const p = platform as Platform;
  return short 
    ? (PLATFORM_LABELS_SHORT[p] || platform)
    : (PLATFORM_LABELS[p] || platform);
}

/**
 * Helper function to get platform badge color (with fallback)
 */
export function getPlatformColor(platform: string | null | undefined): string {
  if (!platform) return "bg-gray-100 text-gray-700";
  return PLATFORM_COLORS[platform as Platform] || "bg-gray-100 text-gray-700";
}

/**
 * Helper function to get platform chart color (with fallback)
 */
export function getPlatformChartColor(platform: string | null | undefined): string {
  if (!platform) return "#6b7280";
  return PLATFORM_CHART_COLORS[platform as Platform] || "#6b7280";
}

/**
 * Check if a string is a valid platform
 */
export function isValidPlatform(platform: string): platform is Platform {
  return PLATFORMS.includes(platform as Platform);
}
