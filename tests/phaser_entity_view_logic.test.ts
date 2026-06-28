import { describe, it, expect } from 'vitest';
import {
  hpFraction, resourceFraction, hasResourceBar, castProgress, showCast,
  hpColor, resourceColor, bodyColor, nameplateText,
} from '../src/render-phaser/entity_view_logic';
import type { Entity } from '../src/sim/types';

describe('bar fractions', () => {
  it('hpFraction clamps to [0,1] and handles zero maxHp', () => {
    expect(hpFraction({ hp: 50, maxHp: 100 })).toBe(0.5);
    expect(hpFraction({ hp: 200, maxHp: 100 })).toBe(1);
    expect(hpFraction({ hp: -5, maxHp: 100 })).toBe(0);
    expect(hpFraction({ hp: 5, maxHp: 0 })).toBe(0);
  });

  it('resourceFraction + hasResourceBar', () => {
    expect(resourceFraction({ resource: 30, maxResource: 120 })).toBe(0.25);
    expect(hasResourceBar({ maxResource: 0 })).toBe(false);
    expect(hasResourceBar({ maxResource: 100 })).toBe(true);
  });

  it('castProgress runs 0 -> 1 as the cast completes', () => {
    expect(castProgress({ castTotal: 2, castRemaining: 2 })).toBe(0);
    expect(castProgress({ castTotal: 2, castRemaining: 1 })).toBe(0.5);
    expect(castProgress({ castTotal: 2, castRemaining: 0 })).toBe(1);
    expect(castProgress({ castTotal: 0, castRemaining: 0 })).toBe(0);
  });
});

describe('showCast', () => {
  it('only shows while actively casting and alive', () => {
    expect(showCast({ castingAbility: 'fireball', castTotal: 2, dead: false })).toBe(true);
    expect(showCast({ castingAbility: null, castTotal: 2, dead: false })).toBe(false);
    expect(showCast({ castingAbility: 'fireball', castTotal: 0, dead: false })).toBe(false);
    expect(showCast({ castingAbility: 'fireball', castTotal: 2, dead: true })).toBe(false);
  });
});

describe('colors', () => {
  it('hpColor is green/yellow/red by fraction', () => {
    expect(hpColor(0.8)).toBe(0x22c55e);
    expect(hpColor(0.4)).toBe(0xeab308);
    expect(hpColor(0.1)).toBe(0xdc2626);
  });

  it('resourceColor maps each resource type with a default', () => {
    expect(resourceColor('rage')).toBe(0xdc2626);
    expect(resourceColor('energy')).toBe(0xeab308);
    expect(resourceColor('mana')).toBe(0x3b82f6);
    expect(resourceColor(null)).toBe(0x3b82f6);
  });

  it('bodyColor: dead gray, player blue, npc green, hostile red', () => {
    expect(bodyColor({ dead: true, kind: 'mob', hostile: true }, false)).toBe(0x4b5563);
    expect(bodyColor({ dead: false, kind: 'player', hostile: false }, true)).toBe(0x4f46e5);
    expect(bodyColor({ dead: false, kind: 'npc', hostile: false }, false)).toBe(0x059669);
    expect(bodyColor({ dead: false, kind: 'mob', hostile: true }, false)).toBe(0xdc2626);
  });
});

describe('nameplateText', () => {
  it('appends the level number with no translatable word', () => {
    expect(nameplateText({ name: 'Gyaan Bhediya', level: 3 })).toBe('Gyaan Bhediya  3');
    expect(nameplateText({ name: 'Merchant', level: 0 })).toBe('Merchant');
  });
});

// Type guard: the Pick<> param types must accept a real Entity shape.
describe('accepts a full Entity', () => {
  it('compiles and reads through a cast Entity', () => {
    const e = {
      hp: 10, maxHp: 20, resource: 1, maxResource: 2,
      castingAbility: null, castTotal: 0, castRemaining: 0,
      dead: false, kind: 'mob', hostile: true, name: 'X', level: 1,
      resourceType: 'rage',
    } as unknown as Entity;
    expect(hpFraction(e)).toBe(0.5);
    expect(bodyColor(e, false)).toBe(0xdc2626);
  });
});
