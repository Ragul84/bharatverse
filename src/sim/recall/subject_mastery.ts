// Subject Mastery: the pure XP -> level -> tier progression for one subject. Correct recall
// answers grant Mastery XP (recall_power.ts gates that); this module turns accumulated XP
// into a level (1..20) and a tier (0..4, ~4 levels each) that feeds back into
// `evaluateRecallPower`'s `masteryTier` (higher tier = more power / better nodes).
// See docs/bharatverse/game-design.md S4.
//
// PURITY: no DOM, no `Math.random`/`Date.now`, no imports outside `src/sim`. Deterministic.
// The per-player, per-subject XP total is persisted in the JSONB character save (additive);
// this module only interprets it.

/** Tunable mastery curve constants (BharatVerse mechanic; adjust here, never inline). */
export const SUBJECT_MASTERY = {
  MAX_LEVEL: 20,
  /** ~4 levels make a tier, so L1-20 spans tiers 0..4. */
  LEVELS_PER_TIER: 4,
  /** Tier ceiling; matches RECALL_POWER.MASTERY_TIER_CAP so the two systems agree. */
  TIER_CAP: 5,
  /** XP to go from level 1 to 2. */
  BASE_XP: 60,
  /** Added to each successive level-up requirement (a gently rising curve). */
  XP_STEP: 20,
} as const;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** XP required to advance FROM `level` to `level + 1`. Infinity at/after the cap. */
export function xpForNextLevel(level: number): number {
  if (level >= SUBJECT_MASTERY.MAX_LEVEL) return Infinity;
  const l = Math.max(1, Math.floor(level));
  return SUBJECT_MASTERY.BASE_XP + (l - 1) * SUBJECT_MASTERY.XP_STEP;
}

/** Total accumulated XP needed to REACH `level` (level 1 = 0). */
export function cumulativeXpForLevel(level: number): number {
  const target = clamp(Math.floor(level), 1, SUBJECT_MASTERY.MAX_LEVEL);
  let total = 0;
  for (let l = 1; l < target; l++) total += xpForNextLevel(l);
  return total;
}

/** The mastery level (1..MAX_LEVEL) for a total XP amount. */
export function masteryLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  let level = 1;
  while (
    level < SUBJECT_MASTERY.MAX_LEVEL &&
    xp >= cumulativeXpForLevel(level) + xpForNextLevel(level)
  ) {
    level++;
  }
  return level;
}

/** The tier (0..LEVELS span, clamped to TIER_CAP) for a mastery level. Feeds recall power. */
export function masteryTierFromLevel(level: number): number {
  const l = clamp(Math.floor(level), 1, SUBJECT_MASTERY.MAX_LEVEL);
  return clamp(Math.floor((l - 1) / SUBJECT_MASTERY.LEVELS_PER_TIER), 0, SUBJECT_MASTERY.TIER_CAP);
}

export interface MasteryProgress {
  level: number;
  tier: number;
  /** XP into the current level. */
  xpIntoLevel: number;
  /** XP needed to reach the next level (Infinity at cap). */
  xpForLevel: number;
  /** 0..1 progress toward the next level (1 at cap). */
  progress: number;
}

/** A full progress read for a subject's total XP (for the HUD skills panel + power calc). */
export function masteryProgress(totalXp: number): MasteryProgress {
  const level = masteryLevelFromXp(totalXp);
  const tier = masteryTierFromLevel(level);
  const floorXp = cumulativeXpForLevel(level);
  const need = xpForNextLevel(level);
  const xpIntoLevel = Math.max(0, totalXp) - floorXp;
  const progress = Number.isFinite(need) ? clamp(xpIntoLevel / need, 0, 1) : 1;
  return { level, tier, xpIntoLevel, xpForLevel: need, progress };
}
