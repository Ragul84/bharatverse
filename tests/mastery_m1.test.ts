import { describe, expect, it } from 'vitest';
import { DEFAULT_RECALL_BANK } from '../src/sim/recall/fixture_bank';
import { findQuestionById } from '../src/sim/recall/question_bank';
import {
  dueCardCount,
  dueCardIds,
  isCardDue,
  LEITNER,
  loadRecallCards,
  scheduleAfterAnswer,
  serializeRecallCards,
} from '../src/sim/recall/spaced_repetition';
import { Sim } from '../src/sim/sim';
import { buildMasteryPanelView } from '../src/ui/mastery_panel_view';

describe('Leitner spaced repetition', () => {
  it('correct advances box and schedules further out; wrong resets to box 0', () => {
    const now = 1_000_000;
    const first = scheduleAfterAnswer(null, 'gk', true, now);
    expect(first.box).toBe(1);
    expect(first.dueAtMs).toBe(now + LEITNER.INTERVALS_MS[1]);
    const second = scheduleAfterAnswer(first, 'gk', true, now + 1000);
    expect(second.box).toBe(2);
    const miss = scheduleAfterAnswer(second, 'gk', false, now + 2000);
    expect(miss.box).toBe(0);
    expect(miss.dueAtMs).toBe(now + 2000);
  });

  it('due helpers order cards by dueAt then id', () => {
    const cards = loadRecallCards({
      b: { box: 1, dueAtMs: 50, subject: 'gk' },
      a: { box: 1, dueAtMs: 50, subject: 'gk' },
      c: { box: 2, dueAtMs: 10, subject: 'maths' },
      later: { box: 3, dueAtMs: 9999, subject: 'science' },
    });
    expect(isCardDue(cards.get('later')!, 100)).toBe(false);
    expect(dueCardIds(cards, 100)).toEqual(['c', 'a', 'b']);
    expect(dueCardCount(cards, 100)).toBe(3);
  });

  it('serialize/load round-trip', () => {
    const cards = loadRecallCards({
      q1: { box: 2, dueAtMs: 123, subject: 'history' },
    });
    const raw = serializeRecallCards(cards);
    expect(loadRecallCards(raw).get('q1')).toEqual(cards.get('q1'));
  });
});

describe('mastery panel view', () => {
  it('always shows preferred subjects and sorts extras', () => {
    const view = buildMasteryPanelView({
      mastery: new Map([
        ['maths', 200],
        ['zz_extra', 10],
      ]),
      dueCount: 2,
      combo: 3,
    });
    expect(view.rows.map((r) => r.subject)).toEqual([
      'gk',
      'science',
      'maths',
      'history',
      'zz_extra',
    ]);
    expect(view.rows.find((r) => r.subject === 'maths')!.level).toBeGreaterThanOrEqual(1);
    expect(view.dueCount).toBe(2);
    expect(view.combo).toBe(3);
  });
});

describe('M1 sim mastery + review', () => {
  it('persists mastery and cards on answer, and startRecallReview opens a due card', () => {
    const sim = new Sim({ seed: 3, playerClass: 'mage', autoEquip: true });
    const p = sim.player;
    const tgt = [...sim.entities.values()].find((e) => e.kind === 'mob' && !e.dead)!;
    p.pos = { ...tgt.pos, x: tgt.pos.x + 1 };
    (sim as any).dealDamage(p, tgt, 5, false, 'physical', null, 'hit', false, undefined, true);
    const meta = (sim as any).players.get(p.id);
    expect(meta.recallPending).not.toBeNull();
    const qid = meta.recallPending.question.id as string;
    expect(findQuestionById(DEFAULT_RECALL_BANK, qid)).not.toBeNull();
    const idx = meta.recallPending.question.answer_index ?? 0;
    sim.answerRecall(idx, 600);
    expect(meta.recallMastery.size).toBeGreaterThan(0);
    expect(meta.recallCards.has(qid)).toBe(true);
    // Force the card due now and start review.
    const card = meta.recallCards.get(qid)!;
    meta.recallCards.set(qid, { ...card, dueAtMs: 0 });
    meta.recallCooldownUntil = 0;
    expect(sim.reviewDueCount).toBeGreaterThan(0);
    sim.startRecallReview();
    expect(sim.recallPrompt).not.toBeNull();
    expect(sim.masteryBySubject.size).toBeGreaterThan(0);
  });
});
