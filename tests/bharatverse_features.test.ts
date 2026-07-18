import { describe, expect, it } from 'vitest';
import { PRODUCT_NAME, SITE_ORIGIN, siteLogoUrl } from '../src/game/bharatverse_site';
import { bvActionAllowed } from '../src/game/bharatverse_surface_trim';
import {
  BV_FEATURES,
  bvAnySideInstanceEnabled,
  bvFeatureEnabled,
} from '../src/sim/bharatverse_features';
import { Sim } from '../src/sim/sim';

describe('BharatVerse M-Trim feature gates', () => {
  it('keeps the core learning-MMO loop on', () => {
    expect(BV_FEATURES.overworld).toBe(true);
    expect(BV_FEATURES.storyDungeons).toBe(true);
    expect(BV_FEATURES.dungeonFinder).toBe(true);
  });

  it('disables heavy upstream side systems for the light mobile product', () => {
    expect(BV_FEATURES.delves).toBe(false);
    expect(BV_FEATURES.heroicDungeons).toBe(false);
    expect(BV_FEATURES.nythraxisRaid).toBe(false);
    expect(BV_FEATURES.worldBosses).toBe(false);
    expect(BV_FEATURES.rankedArena).toBe(false);
    expect(BV_FEATURES.fiesta).toBe(false);
    expect(BV_FEATURES.valeCup).toBe(false);
    expect(BV_FEATURES.protectYumi).toBe(false);
    expect(BV_FEATURES.cryptoWallet).toBe(false);
    expect(BV_FEATURES.claudiumStore).toBe(false);
    expect(BV_FEATURES.dailyRewardsWoc).toBe(false);
  });

  it('exposes bvFeatureEnabled for every flag key', () => {
    for (const key of Object.keys(BV_FEATURES) as (keyof typeof BV_FEATURES)[]) {
      expect(bvFeatureEnabled(key)).toBe(BV_FEATURES[key]);
    }
  });

  it('reports no side-instance modes while M-Trim is active', () => {
    expect(bvAnySideInstanceEnabled()).toBe(false);
  });

  it('blocks cut HUD actions and allows dungeon finder', () => {
    expect(bvActionAllowed('arena')).toBe(false);
    expect(bvActionAllowed('valecup')).toBe(false);
    expect(bvActionAllowed('dailyRewards')).toBe(false);
    expect(bvActionAllowed('delve')).toBe(false);
    expect(bvActionAllowed('dungeonFinder')).toBe(true);
  });

  it('does not auto-schedule world bosses while worldBosses is off', () => {
    const sim = new Sim({ seed: 1, playerClass: 'warrior', autoEquip: true, noPlayer: true });
    const nextAt = (sim as unknown as { worldBossNextAt: number[] }).worldBossNextAt;
    expect(nextAt.every((t) => !Number.isFinite(t) || t === Number.POSITIVE_INFINITY)).toBe(true);
    sim.tick();
    const hasBoss = [
      ...(sim as unknown as { entities: Map<number, { templateId: string }> }).entities.values(),
    ].some((e) => e.templateId === 'thunzharr_waking_peak');
    expect(hasBoss).toBe(false);
  });
});

describe('BharatVerse site brand', () => {
  it('uses BharatVerse identity, never the upstream domain', () => {
    expect(PRODUCT_NAME).toBe('BharatVerse');
    expect(SITE_ORIGIN.toLowerCase()).not.toContain('claudecraft');
    expect(SITE_ORIGIN.toLowerCase()).not.toContain('worldofclaude');
    expect(siteLogoUrl()).toContain('bharatverse');
    expect(siteLogoUrl().toLowerCase()).not.toContain('woc_logo');
  });
});
