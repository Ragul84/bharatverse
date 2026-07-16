import { describe, expect, it } from 'vitest';
import { evaluateRecallPower, RECALL_POWER } from '../src/sim/recall/recall_power';

describe('evaluateRecallPower', () => {
  it('a wrong answer acts at reduced power, no crit, no XP, and breaks the combo', () => {
    const r = evaluateRecallPower({ correct: false, timingMs: 500, masteryTier: 3, combo: 5 });
    expect(r.powerMult).toBe(RECALL_POWER.WRONG);
    expect(r.isCrit).toBe(false);
    expect(r.grantsMasteryXp).toBe(false);
    expect(r.nextCombo).toBe(0);
  });

  it('a correct SLOW answer is full base power, grants XP, advances the combo, no crit', () => {
    const r = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 0, combo: 0 });
    expect(r.powerMult).toBe(1); // base * mastery(1) * combo(1) * crit(1)
    expect(r.isCrit).toBe(false);
    expect(r.grantsMasteryXp).toBe(true);
    expect(r.nextCombo).toBe(1);
  });

  it('a correct FAST answer crits (1.5x)', () => {
    const slow = evaluateRecallPower({ correct: true, timingMs: 8000, masteryTier: 0, combo: 0 });
    const fast = evaluateRecallPower({ correct: true, timingMs: 1000, masteryTier: 0, combo: 0 });
    expect(fast.isCrit).toBe(true);
    expect(fast.powerMult).toBeCloseTo(slow.powerMult * RECALL_POWER.CRIT_MULT, 10);
  });

  it('higher Subject Mastery tier scales power up', () => {
    const t0 = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 0, combo: 0 }).powerMult;
    const t3 = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 3, combo: 0 }).powerMult;
    expect(t3).toBeCloseTo(1 + 3 * RECALL_POWER.MASTERY_STEP, 10);
    expect(t3).toBeGreaterThan(t0);
  });

  it('combo scales power up and is capped', () => {
    const c0 = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 0, combo: 0 }).powerMult;
    const c5 = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 0, combo: 5 }).powerMult;
    expect(c5).toBeCloseTo(1 + 5 * RECALL_POWER.COMBO_STEP, 10);
    expect(c5).toBeGreaterThan(c0);
    // Combo count is capped both in the multiplier and the stored value.
    const capped = evaluateRecallPower({ correct: true, timingMs: 9999, masteryTier: 0, combo: 999 });
    expect(capped.nextCombo).toBe(RECALL_POWER.COMBO_CAP);
    expect(capped.powerMult).toBeCloseTo(1 + RECALL_POWER.COMBO_CAP * RECALL_POWER.COMBO_STEP, 10);
  });

  it('mastery, combo, and crit stack multiplicatively', () => {
    const r = evaluateRecallPower({ correct: true, timingMs: 1000, masteryTier: 2, combo: 4 });
    const expected =
      RECALL_POWER.BASE *
      (1 + 2 * RECALL_POWER.MASTERY_STEP) *
      (1 + 4 * RECALL_POWER.COMBO_STEP) *
      RECALL_POWER.CRIT_MULT;
    expect(r.powerMult).toBeCloseTo(expected, 10);
    expect(r.isCrit).toBe(true);
    expect(r.nextCombo).toBe(5);
  });

  it('is pure/deterministic (same input => same result)', () => {
    const input = { correct: true, timingMs: 1234, masteryTier: 2, combo: 3 };
    expect(evaluateRecallPower(input)).toEqual(evaluateRecallPower(input));
  });
});
