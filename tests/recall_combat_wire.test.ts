import { describe, expect, it } from 'vitest';
import { DEFAULT_RECALL_BANK } from '../src/sim/recall/fixture_bank';
import {
  answerRecallMoment,
  applyRecallCharge,
  pickQuestionHashed,
  poolKeyForOffer,
  RECALL_COMBAT,
  toClientPrompt,
  tryBuildRecallOffer,
} from '../src/sim/recall/recall_combat';
import { Sim } from '../src/sim/sim';
import { buildRecallPromptView } from '../src/ui/recall_prompt_view';

describe('recall combat pure helpers', () => {
  it('hash pick is deterministic for a seed + salt', () => {
    const a = pickQuestionHashed(DEFAULT_RECALL_BANK, 'gk:easy', 42, 1, 7);
    const b = pickQuestionHashed(DEFAULT_RECALL_BANK, 'gk:easy', 42, 1, 7);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it('rotates pool keys across subjects', () => {
    expect(poolKeyForOffer(0)).toBe('gk:easy');
    expect(poolKeyForOffer(1)).toBe('science:easy');
    expect(poolKeyForOffer(2)).toBe('maths:easy');
    expect(poolKeyForOffer(3)).toBe('history:easy');
    expect(poolKeyForOffer(4)).toBe('gk:easy');
  });

  it('builds an offer when off cooldown and strips answer keys for the client', () => {
    const pending = tryBuildRecallOffer({
      bank: DEFAULT_RECALL_BANK,
      worldSeed: 99,
      now: 10,
      offerIndex: 0,
      playerId: 1,
      cooldownUntil: 0,
      hasPending: false,
    });
    expect(pending).not.toBeNull();
    const client = toClientPrompt(pending!);
    expect(client.prompt.length).toBeGreaterThan(0);
    expect(client.options.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(client)).not.toMatch(/answer_index|correct_answer|answer_key/);
  });

  it('applies charge mult and consumes one hit', () => {
    const r = applyRecallCharge(100, 1.5, 1);
    expect(r.amount).toBe(150);
    expect(r.chargeHitsLeft).toBe(0);
    expect(r.applied).toBe(true);
  });

  it('answer moment arms power and grants mastery on correct', () => {
    const pending = tryBuildRecallOffer({
      bank: DEFAULT_RECALL_BANK,
      worldSeed: 1,
      now: 0,
      offerIndex: 0,
      playerId: 1,
      cooldownUntil: 0,
      hasPending: false,
    })!;
    const correctIdx = pending.question.answer_index ?? 0;
    const out = answerRecallMoment({
      pending,
      selectedIndex: correctIdx,
      timingMs: 500,
      masteryXp: 0,
      combo: 0,
      now: 1,
    });
    expect(out.result.correct).toBe(true);
    expect(out.chargeMult).toBeGreaterThan(1);
    expect(out.masteryXpGain).toBeGreaterThan(0);
  });
});

describe('recall combat sim wiring', () => {
  it('offers a power-moment after a direct player hit on a mob', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warrior', autoEquip: true });
    const p = sim.player;
    // Find any overworld mob entity.
    let targetId: number | null = null;
    for (const e of sim.entities.values()) {
      if (e.kind === 'mob' && !e.dead) {
        targetId = e.id;
        break;
      }
    }
    expect(targetId).not.toBeNull();
    const tgt = sim.entities.get(targetId!)!;
    p.pos = { ...tgt.pos, x: tgt.pos.x + 1 };
    p.targetId = tgt.id;
    // Force a direct hit via dealDamage
    (sim as any).dealDamage(p, tgt, 5, false, 'physical', null, 'hit', false, undefined, true);
    const meta = (sim as any).players.get(p.id);
    expect(meta.recallPending).not.toBeNull();
    expect(sim.recallPrompt).not.toBeNull();
    expect(sim.recallPrompt!.options.length).toBeGreaterThan(0);
  });

  it('answerRecall multiplies the next outgoing hit and grants mastery', () => {
    const sim = new Sim({ seed: 11, playerClass: 'warrior', autoEquip: true });
    const p = sim.player;
    let tgt = [...sim.entities.values()].find((e) => e.kind === 'mob' && !e.dead)!;
    p.pos = { ...tgt.pos, x: tgt.pos.x + 1 };
    (sim as any).dealDamage(p, tgt, 5, false, 'physical', null, 'hit', false, undefined, true);
    const meta = (sim as any).players.get(p.id);
    expect(meta.recallPending).not.toBeNull();
    const correctIdx = meta.recallPending.question.answer_index ?? 0;
    sim.answerRecall(correctIdx, 800);
    expect(sim.recallPrompt).toBeNull();
    expect(meta.recallChargeHitsLeft).toBe(RECALL_COMBAT.CHARGE_HITS);
    expect(meta.recallChargeMult).toBeGreaterThan(1);
    expect(sim.recallLastResult?.correct).toBe(true);
    expect(meta.recallMastery.size).toBeGreaterThan(0);

    // Next hit should consume charge (target may have low remaining HP, so
    // assert the charge was spent rather than an absolute damage floor).
    const mult = meta.recallChargeMult;
    tgt = [...sim.entities.values()].find((e) => e.kind === 'mob' && !e.dead)!;
    const hpBefore = tgt.hp;
    (sim as any).dealDamage(p, tgt, 20, false, 'physical', null, 'hit', false, undefined, true);
    const dealt = hpBefore - tgt.hp;
    expect(meta.recallChargeHitsLeft).toBe(0);
    expect(dealt).toBeGreaterThan(0);
    // When the mob had enough HP, charged damage exceeds the uncharged base.
    if (hpBefore > Math.round(20 * mult)) {
      expect(dealt).toBe(Math.round(20 * mult));
    }
  });
});

describe('recall prompt view', () => {
  it('opens with options and closes to a result flash shape', () => {
    const open = buildRecallPromptView({
      prompt: {
        id: 'q',
        prompt: '2+2?',
        options: ['3', '4'],
        subject: 'maths',
        expiresAt: 10,
      },
      lastResult: null,
      combo: 2,
      now: 5,
    });
    expect(open.open).toBe(true);
    expect(open.options).toEqual(['3', '4']);
    expect(open.timeFrac).toBeGreaterThan(0);

    const closed = buildRecallPromptView({
      prompt: null,
      lastResult: {
        correct: true,
        powerMult: 1.5,
        isCrit: true,
        masteryXpGain: 20,
        combo: 1,
        masteryTier: 0,
        explanation: 'Because 2+2=4',
        prompt: '2+2?',
      },
      combo: 1,
      now: 0,
    });
    expect(closed.open).toBe(false);
    expect(closed.lastResult?.explanation).toContain('4');
  });
});
