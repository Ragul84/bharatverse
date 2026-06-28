/**
 * Pure styling for procedural world decorations (trees/rocks) placed from the
 * sim's deterministic generateDecorations(). No Phaser import, so it is
 * unit-testable; WorldScene builds the textures and applies these choices.
 */

import type { BiomeId } from '../sim/types';
import type { Decoration } from '../sim/world';

export type DecoTexKey = 'bv-tree' | 'bv-tree2' | 'bv-rock';

/** Which generated texture a decoration kind uses. */
export function decoTexture(kind: Decoration['kind']): DecoTexKey {
  if (kind === 'rock') return 'bv-rock';
  if (kind === 'tree2') return 'bv-tree2';
  return 'bv-tree';
}

/**
 * Per-biome tint multiplier for foliage so each zone's greenery reads
 * differently. Rocks are never tinted (white = original texture color).
 * 0xffffff means "no tint".
 */
export function decoTint(kind: Decoration['kind'], biome: BiomeId): number {
  if (kind === 'rock') return 0xffffff;
  switch (biome) {
    case 'vale': return 0xffffff;  // textures are authored vale-green
    case 'marsh': return 0xc8d0a0; // olive wash
    case 'peaks': return 0xa9c0a8; // greyer, hardy pines
    default: return 0xffffff;
  }
}
