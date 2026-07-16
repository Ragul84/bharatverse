// Recall power: the pure mapping from an answer (correctness + speed) and the player's
// Subject Mastery + combo into a POWER MULTIPLIER applied to a combat hit or a gather
// yield. This is the heart of "learning is power" (docs/bharatverse/game-design.md, S3):
// recall is a MULTIPLIER, never a pass/fail toll. A wrong answer still acts, at reduced
// power and with no Mastery XP, so flow is never hard-blocked.
//
// PURITY: no DOM, no `Math.random`/`Date.now` (the clock is passed in as `timingMs`), no
// imports outside `src/sim`. Deterministic: same input -> same result. Runs server-side.

/** Tunable constants for the recall-power curve (BharatVerse mechanic, not a classic-era
 *  formula). Adjust here, never inline. */
export const RECALL_POWER = {
  /** Full power for a correct answer. */
  BASE: 1,
  /** Reduced power for a wrong answer (still acts; the existing 40% floor). */
  WRONG: 0.4,
  /** A correct answer within this many ms is a CRIT. */
  CRIT_TIME_MS: 4000,
  /** Crit power bonus multiplier. */
  CRIT_MULT: 1.5,
  /** Power added per point of combo (consecutive correct), up to COMBO_CAP. */
  COMBO_STEP: 0.05,
  /** Max combo count that contributes to the multiplier (and the stored cap). */
  COMBO_CAP: 10,
  /** Power added per Subject Mastery tier (~4 levels = a tier). */
  MASTERY_STEP: 0.1,
  /** Highest mastery tier (L1-20 => ~5 tiers). */
  MASTERY_TIER_CAP: 5,
} as const;

export interface RecallPowerInput {
  /** Did the player answer correctly (server-validated). */
  correct: boolean;
  /** Milliseconds taken to answer (from question shown to submit). */
  timingMs: number;
  /** The player's Subject Mastery tier for this subject (0..MASTERY_TIER_CAP). */
  masteryTier: number;
  /** Current consecutive-correct combo BEFORE this answer. */
  combo: number;
}

export interface RecallPowerResult {
  /** Multiplier applied to the base combat damage / gather yield. */
  powerMult: number;
  /** Correct AND fast: the satisfying power spike. */
  isCrit: boolean;
  /** Only correct answers advance Subject Mastery. */
  grantsMasteryXp: boolean;
  /** The combo to store after this answer (0 on a miss). */
  nextCombo: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * Resolve an answer into a power multiplier + crit + combo + XP flag. Wrong answers act at
 * `WRONG` power, break the combo, and grant no Mastery XP; correct answers scale with
 * Mastery tier and combo, and crit when answered fast.
 */
export function evaluateRecallPower(input: RecallPowerInput): RecallPowerResult {
  if (!input.correct) {
    return { powerMult: RECALL_POWER.WRONG, isCrit: false, grantsMasteryXp: false, nextCombo: 0 };
  }

  const tier = clamp(Math.floor(input.masteryTier), 0, RECALL_POWER.MASTERY_TIER_CAP);
  const combo = clamp(Math.floor(input.combo), 0, RECALL_POWER.COMBO_CAP);

  const masteryMult = 1 + tier * RECALL_POWER.MASTERY_STEP;
  const comboMult = 1 + combo * RECALL_POWER.COMBO_STEP;
  const isCrit = input.timingMs >= 0 && input.timingMs <= RECALL_POWER.CRIT_TIME_MS;
  const critMult = isCrit ? RECALL_POWER.CRIT_MULT : 1;

  return {
    powerMult: RECALL_POWER.BASE * masteryMult * comboMult * critMult,
    isCrit,
    grantsMasteryXp: true,
    nextCombo: clamp(combo + 1, 0, RECALL_POWER.COMBO_CAP),
  };
}
