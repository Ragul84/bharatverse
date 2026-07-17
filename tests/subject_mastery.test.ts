import { describe, expect, it } from 'vitest';
import {
  cumulativeXpForLevel,
  masteryLevelFromXp,
  masteryProgress,
  masteryTierFromLevel,
  SUBJECT_MASTERY,
  xpForNextLevel,
} from '../src/sim/recall/subject_mastery';

describe('subject mastery XP curve', () => {
  it('starts at level 1 with 0 XP and rises with the curve', () => {
    expect(masteryLevelFromXp(0)).toBe(1);
    expect(masteryLevelFromXp(-100)).toBe(1);
    expect(xpForNextLevel(1)).toBe(SUBJECT_MASTERY.BASE_XP);
    // Exactly enough for level 2.
    expect(masteryLevelFromXp(SUBJECT_MASTERY.BASE_XP)).toBe(2);
    expect(masteryLevelFromXp(SUBJECT_MASTERY.BASE_XP - 1)).toBe(1);
  });

  it('the level-up requirement rises each level', () => {
    expect(xpForNextLevel(2)).toBe(SUBJECT_MASTERY.BASE_XP + SUBJECT_MASTERY.XP_STEP);
    expect(xpForNextLevel(5)).toBeGreaterThan(xpForNextLevel(2));
  });

  it('caps at MAX_LEVEL (no XP advances past it)', () => {
    expect(xpForNextLevel(SUBJECT_MASTERY.MAX_LEVEL)).toBe(Infinity);
    expect(masteryLevelFromXp(1e12)).toBe(SUBJECT_MASTERY.MAX_LEVEL);
  });

  it('cumulative XP is monotonic and consistent with masteryLevelFromXp', () => {
    for (let lvl = 1; lvl <= SUBJECT_MASTERY.MAX_LEVEL; lvl++) {
      const floorXp = cumulativeXpForLevel(lvl);
      // The exact cumulative XP for a level resolves to that level...
      expect(masteryLevelFromXp(floorXp)).toBe(lvl);
      // ...and one XP short resolves to the previous level (except level 1).
      if (lvl > 1) expect(masteryLevelFromXp(floorXp - 1)).toBe(lvl - 1);
    }
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(3)).toBe(xpForNextLevel(1) + xpForNextLevel(2));
  });

  it('tiers span ~4 levels each (0..4 across L1-20) and clamp', () => {
    expect(masteryTierFromLevel(1)).toBe(0);
    expect(masteryTierFromLevel(4)).toBe(0);
    expect(masteryTierFromLevel(5)).toBe(1);
    expect(masteryTierFromLevel(20)).toBe(4);
    expect(masteryTierFromLevel(4)).toBeLessThan(masteryTierFromLevel(9));
    // Never exceeds the tier cap that recall_power expects.
    expect(masteryTierFromLevel(999)).toBeLessThanOrEqual(SUBJECT_MASTERY.TIER_CAP);
  });

  it('masteryProgress reports level/tier + a 0..1 bar', () => {
    const start = masteryProgress(0);
    expect(start.level).toBe(1);
    expect(start.tier).toBe(0);
    expect(start.progress).toBe(0);

    const half = masteryProgress(Math.floor(xpForNextLevel(1) / 2));
    expect(half.level).toBe(1);
    expect(half.progress).toBeGreaterThan(0);
    expect(half.progress).toBeLessThan(1);

    const capped = masteryProgress(1e12);
    expect(capped.level).toBe(SUBJECT_MASTERY.MAX_LEVEL);
    expect(capped.progress).toBe(1); // no next level at the cap
    expect(capped.xpForLevel).toBe(Infinity);
  });

  it('is pure/deterministic', () => {
    expect(masteryProgress(500)).toEqual(masteryProgress(500));
  });
});
