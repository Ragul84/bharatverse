// BharatVerse public site identity. Single place for origin, product name, and
// community placeholders so player-facing surfaces never hardcode the upstream
// World of ClaudeCraft brand. Swap SITE_ORIGIN when a production domain lands.

/** Canonical public origin (trailing slash). Relative-safe for local dev SEO. */
export const SITE_ORIGIN = 'https://bharatverse.game/';

/** Short product name shown in titles and chrome. */
export const PRODUCT_NAME = 'BharatVerse';

/** Longer product line for SEO descriptions. */
export const PRODUCT_TAGLINE = "India's first educational MMO";

/** Default social / OG logo path (same-origin). */
export const SITE_LOGO_PATH = '/bharatverse-logo.png';

/** Absolute logo URL for structured data / Open Graph. */
export function siteLogoUrl(origin = SITE_ORIGIN): string {
  const base = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${base}${SITE_LOGO_PATH}`;
}

/**
 * Community links. Empty strings hide the control until real BharatVerse
 * channels exist. Do not point at upstream Discord / socials.
 */
export const COMMUNITY = {
  discordInvite: '',
  donate: '',
  github: '',
  youtube: '',
  x: '',
  instagram: '',
  tiktok: '',
  reddit: '',
} as const;

/** Desktop deep-link scheme for the BharatVerse shell (if/when shipped). */
export const DESKTOP_SCHEME = 'bharatverse';
