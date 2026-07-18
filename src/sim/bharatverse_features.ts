// BharatVerse content / surface feature flags (M-Trim).
// Pure, host-agnostic: safe to import from sim, server, and client.
// Off systems stay in the tree for now; entry points and live spawns consult these
// flags so the shipped experience is a lighter learning MMO, not the full upstream
// endgame. Later trim slices delete the dead code + assets once the gate is green.
// See docs/bharatverse/world-plan.md section 6.

/** Live feature gates for the BharatVerse product surface. */
export const BV_FEATURES = {
  // --- Keep (core loop) ---
  /** Overworld zones, towns, quests, gathering, market, guilds, chat, bank. */
  overworld: true,
  /** Normal (non-heroic) story dungeons that gate early quests (e.g. Hollow Crypt). */
  storyDungeons: true,
  /** Group finder for story dungeons (not delves / heroics). */
  dungeonFinder: true,

  // --- Cut for mobile weight + off-theme (M-Trim) ---
  /** Scalable delves + lockpick minigame. */
  delves: false,
  /** Heroic dungeon difficulty tier + heroic loot arms. */
  heroicDungeons: false,
  /** Nythraxis raid encounter + raid attunement chain entry. */
  nythraxisRaid: false,
  /** Scheduled overworld world bosses (Thunzharr etc.). */
  worldBosses: false,
  /** Ranked 1v1 / 2v2 Ashen Coliseum. */
  rankedArena: false,
  /** 2v2 Fiesta mode (augments + shrinking ring). */
  fiesta: false,
  /** Vale Cup boarball tournament. */
  valeCup: false,
  /** Protect Yumi maze PvP. */
  protectYumi: false,
  /** Solana wallet link, $WOC balance, holder tiers. */
  cryptoWallet: false,
  /** Claudium store + WOC Store / Daily Rewards purchase rails. */
  claudiumStore: false,
  /** $WOC-holder daily rewards spin. */
  dailyRewardsWoc: false,
} as const;

export type BvFeature = keyof typeof BV_FEATURES;

/** True when the named BharatVerse feature is enabled for the live product. */
export function bvFeatureEnabled(feature: BvFeature): boolean {
  return BV_FEATURES[feature] === true;
}

/**
 * True when any of the heavy PvP / instanced side modes is still on.
 * Used by HUD chrome that groups arena / vale cup / yumi entry.
 */
export function bvAnySideInstanceEnabled(): boolean {
  return (
    BV_FEATURES.rankedArena ||
    BV_FEATURES.fiesta ||
    BV_FEATURES.valeCup ||
    BV_FEATURES.protectYumi ||
    BV_FEATURES.delves
  );
}
