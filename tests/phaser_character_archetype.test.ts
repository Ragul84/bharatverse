import { describe, it, expect } from 'vitest';
import { archetypeFor, paletteFor, CHAR_PALETTES } from '../src/render-phaser/character_archetype';

describe('archetypeFor', () => {
  it('keys players by class', () => {
    expect(archetypeFor({ kind: 'player', templateId: 'kshatriya' })).toBe('cls-kshatriya');
    expect(archetypeFor({ kind: 'player', templateId: 'mage' })).toBe('cls-mage');
  });

  it('keys non-players by kind', () => {
    expect(archetypeFor({ kind: 'npc', templateId: 'guru' })).toBe('npc');
    expect(archetypeFor({ kind: 'mob', templateId: 'gyaan_bhediya' })).toBe('mob');
    expect(archetypeFor({ kind: 'object', templateId: 'copper_node' })).toBe('object');
  });
});

describe('paletteFor', () => {
  it('returns the mapped palette for a known key', () => {
    expect(paletteFor('cls-kshatriya')).toBe(CHAR_PALETTES['cls-kshatriya']);
    expect(paletteFor('mob')).toBe(CHAR_PALETTES.mob);
  });

  it('falls back to default for an unknown key', () => {
    expect(paletteFor('cls-nonesuch')).toBe(CHAR_PALETTES.default);
  });

  it('every palette has four color channels', () => {
    for (const p of Object.values(CHAR_PALETTES)) {
      expect(p.skin).toBeTypeOf('number');
      expect(p.tunic).toBeTypeOf('number');
      expect(p.legs).toBeTypeOf('number');
      expect(p.accent).toBeTypeOf('number');
    }
  });
});
