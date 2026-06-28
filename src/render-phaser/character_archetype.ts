/**
 * Maps an entity to a character archetype key + color palette for its procedural
 * sprite. Pure (no Phaser), so the mapping is unit-testable; character_sprites.ts
 * bakes one texture per palette and entity_view.ts picks the texture per entity.
 */

import type { Entity } from '../sim/types';

export interface CharPalette {
  skin: number;   // head + hands
  tunic: number;  // torso + arms
  legs: number;   // legs
  accent: number; // belt / trim
}

const C = (skin: number, tunic: number, legs: number, accent: number): CharPalette =>
  ({ skin, tunic, legs, accent });

// One palette per archetype key. Player keys are `cls-<class>`; non-players are
// keyed by kind. `default` backstops any unmapped key.
export const CHAR_PALETTES: Record<string, CharPalette> = {
  // BharatVerse archetypes
  'cls-kshatriya':   C(0xb5793f, 0x8c2f24, 0x5a3b22, 0xd4af37), // crimson + gold
  'cls-brahmarishi': C(0xc89b6a, 0xece5d5, 0xb08d57, 0xd4af37), // saffron-white robe
  'cls-vaishya':     C(0xb5793f, 0x2f5d3a, 0x33301f, 0xc0c0c0), // green leather
  'cls-shilpi':      C(0xb5793f, 0x355b8c, 0x2a3550, 0xb87333), // blue + copper
  'cls-vaidya':      C(0xc89b6a, 0xe8e8e8, 0x4f7d4a, 0x2e8b57), // white + green
  // classic classes
  'cls-warrior': C(0xb5793f, 0x8a8d93, 0x44474d, 0xd0d0d0),
  'cls-paladin': C(0xc89b6a, 0xd9c27a, 0x9c8030, 0xf0e68c),
  'cls-hunter':  C(0xb5793f, 0x3f6b3a, 0x33301f, 0x8b5a2b),
  'cls-rogue':   C(0xb5793f, 0x333640, 0x222530, 0x6b7280),
  'cls-priest':  C(0xc89b6a, 0xf0f0f0, 0xcfcfcf, 0xffe08a),
  'cls-shaman':  C(0xb5793f, 0x2f6f7d, 0x274b50, 0x59c3d4),
  'cls-mage':    C(0xc89b6a, 0x4338a8, 0x2a2466, 0x8b7bf0),
  'cls-warlock': C(0xb5793f, 0x4a2f6b, 0x2c1d40, 0x9b59b6),
  'cls-druid':   C(0xc89b6a, 0x6b4a2f, 0x3f3320, 0x7cbf5a),
  // non-players
  npc:     C(0xc89b6a, 0xb9986a, 0x6e5a3a, 0xe0c890),
  mob:     C(0x8a5a3a, 0x6b2f2f, 0x3a1f1f, 0xc0392b),
  object:  C(0x9c7a3c, 0x7d6440, 0x5a3b22, 0xd4af37),
  default: C(0xb5793f, 0x6b7280, 0x44474d, 0x9aa0a6),
};

/** Archetype key for an entity: `cls-<class>` for players, else the kind. */
export function archetypeFor(e: Pick<Entity, 'kind' | 'templateId'>): string {
  if (e.kind === 'player') return `cls-${e.templateId}`;
  if (e.kind === 'npc') return 'npc';
  if (e.kind === 'object') return 'object';
  return 'mob';
}

/** Palette for an archetype key, falling back to `default`. */
export function paletteFor(key: string): CharPalette {
  return CHAR_PALETTES[key] ?? CHAR_PALETTES.default;
}
