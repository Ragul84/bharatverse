import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';

// The recall STATE on PlayerMeta (Subject Mastery XP + the live combo) and its JSONB
// save/load round-trip. Mastery XP must survive a relog (it is the player's learning
// progress); the combo is deliberately session-only and must NOT persist.
const makeSim = () => new Sim({ seed: 42, playerClass: 'warrior', autoEquip: true });
const firstPid = (sim: any): number => [...sim.players.keys()][0] as number;
const metaOf = (sim: any, pid: number): any => sim.players.get(pid);

describe('recall state on PlayerMeta', () => {
  it('a fresh character starts with no mastery and no combo', () => {
    const sim = makeSim() as any;
    const meta = metaOf(sim, firstPid(sim));
    expect(meta.recallMastery.size).toBe(0);
    expect(meta.recallCombo).toBe(0);
  });

  it('serializeCharacter omits mastery entirely when empty (lean, back-compatible saves)', () => {
    const sim = makeSim() as any;
    const saved = sim.serializeCharacter(firstPid(sim));
    expect(saved).not.toBeNull();
    expect(saved.recallMastery).toBeUndefined();
  });

  it('round-trips Subject Mastery XP through save + load', () => {
    const sim = makeSim() as any;
    const pid = firstPid(sim);
    const meta = metaOf(sim, pid);
    meta.recallMastery.set('maths', 120);
    meta.recallMastery.set('history', 45);

    const saved = sim.serializeCharacter(pid);
    expect(saved.recallMastery).toEqual({ maths: 120, history: 45 });

    // Load it into a fresh Sim the way a relog would.
    const reloaded = new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true }) as any;
    const newPid = reloaded.addPlayer('warrior', 'Learner', { state: saved });
    const loaded = metaOf(reloaded, newPid);
    expect(loaded.recallMastery.get('maths')).toBe(120);
    expect(loaded.recallMastery.get('history')).toBe(45);
  });

  it('the combo is session-only (never persisted)', () => {
    const sim = makeSim() as any;
    const pid = firstPid(sim);
    metaOf(sim, pid).recallCombo = 7;
    const saved = sim.serializeCharacter(pid);
    expect((saved as Record<string, unknown>).recallCombo).toBeUndefined();

    const reloaded = new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true }) as any;
    const newPid = reloaded.addPlayer('warrior', 'Learner', { state: saved });
    expect(metaOf(reloaded, newPid).recallCombo).toBe(0);
  });

  it('drops corrupt or non-positive mastery entries on load (defensive)', () => {
    const sim = makeSim() as any;
    const base = sim.serializeCharacter(firstPid(sim));
    const reloaded = new Sim({ seed: 1, playerClass: 'warrior', noPlayer: true }) as any;
    const newPid = reloaded.addPlayer('warrior', 'Learner', {
      state: {
        ...base,
        recallMastery: { maths: 50, bad: -10, worse: Number.NaN, wrongType: 'x' },
      },
    });
    const loaded = metaOf(reloaded, newPid);
    expect(loaded.recallMastery.get('maths')).toBe(50);
    expect(loaded.recallMastery.has('bad')).toBe(false);
    expect(loaded.recallMastery.has('worse')).toBe(false);
    expect(loaded.recallMastery.has('wrongType')).toBe(false);
  });
});
