import { describe, expect, it } from 'vitest';
import { normalizeQuizQuestion } from '../src/sim/recall/question_types';
import { RECALL_SESSION, resolveRecall } from '../src/sim/recall/recall_session';
import { RECALL_POWER } from '../src/sim/recall/recall_power';

const q = normalizeQuizQuestion({
  id: 'q1',
  question: 'Capital of India?',
  type: 'mcq',
  options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
  correct_answer: 1,
  explanation: 'New Delhi is the capital.',
  difficulty: 'medium',
})!;

describe('resolveRecall (server-authoritative recall outcome)', () => {
  it('a correct fast answer: crit power, XP granted, combo advances, explanation returned', () => {
    const r = resolveRecall({ question: q, response: { type: 'mcq', selectedIndex: 1 }, masteryXp: 0, combo: 0, timingMs: 1000 });
    expect(r.correct).toBe(true);
    expect(r.isCrit).toBe(true);
    expect(r.powerMult).toBeGreaterThan(1);
    expect(r.masteryXpGain).toBeGreaterThan(0);
    expect(r.nextCombo).toBe(1);
    expect(r.explanation).toBe('New Delhi is the capital.');
  });

  it('a wrong answer: reduced power, NO XP, combo breaks, but still explains (learning)', () => {
    const r = resolveRecall({ question: q, response: { type: 'mcq', selectedIndex: 0 }, masteryXp: 500, combo: 4, timingMs: 800 });
    expect(r.correct).toBe(false);
    expect(r.powerMult).toBe(RECALL_POWER.WRONG);
    expect(r.masteryXpGain).toBe(0);
    expect(r.nextCombo).toBe(0);
    expect(r.explanation).toBe('New Delhi is the capital.'); // taught on a miss too
  });

  it('XP scales with question difficulty', () => {
    const base = { response: { type: 'mcq', selectedIndex: 1 } as const, masteryXp: 0, combo: 0, timingMs: 9999 };
    const easy = resolveRecall({ ...base, question: { ...q, difficulty: 'easy' } });
    const hard = resolveRecall({ ...base, question: { ...q, difficulty: 'hard' } });
    expect(hard.masteryXpGain).toBeGreaterThan(easy.masteryXpGain);
    expect(easy.masteryXpGain).toBe(RECALL_SESSION.XP_PER_CORRECT); // easy = 1x, slow = no crit bonus
  });

  it('higher accumulated Mastery XP raises the tier and the power', () => {
    const base = { question: q, response: { type: 'mcq', selectedIndex: 1 } as const, combo: 0, timingMs: 9999 };
    const low = resolveRecall({ ...base, masteryXp: 0 });
    const high = resolveRecall({ ...base, masteryXp: 100000 });
    expect(high.masteryTier).toBeGreaterThan(low.masteryTier);
    expect(high.powerMult).toBeGreaterThan(low.powerMult);
  });

  it('is pure/deterministic (server can replay it)', () => {
    const p = { question: q, response: { type: 'mcq', selectedIndex: 1 } as const, masteryXp: 250, combo: 2, timingMs: 1500 };
    expect(resolveRecall(p)).toEqual(resolveRecall(p));
  });
});
