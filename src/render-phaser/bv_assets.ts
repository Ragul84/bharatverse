/**
 * Real-art asset pipeline (Kenney CC0 target). Defines the optional image assets
 * the client tries to load and the rules for choosing a real texture vs the
 * procedural fallback. Pure (no Phaser), so the resolution is unit-testable.
 *
 * Convention (drop files here, no code change needed):
 *   public/assets/characters/<archetype>.png   e.g. cls-kshatriya.png, npc.png, mob.png
 *   public/assets/props/<name>.png             tree.png, tree2.png, rock.png
 * Anything missing falls back to the generated procedural texture, so the game
 * runs with zero, some, or all assets present. See public/assets/README.md.
 */

import { CHAR_PALETTES } from './character_archetype';
import { characterTextureKey } from './character_sprites';
import { decoTexture } from './decoration_style';
import type { Decoration } from '../sim/world';

const ART = 'bv-art-';

export const PROP_NAMES = ['tree', 'tree2', 'rock'] as const;
export type PropName = typeof PROP_NAMES[number];

export function characterArtKey(archetype: string): string {
  return `${ART}char-${archetype}`;
}
export function characterArtUrl(archetype: string): string {
  return `assets/characters/${archetype}_v3.png`;
}
export function characterPoseArtKey(archetype: string, pose: string): string {
  return `${ART}char-${archetype}-${pose}`;
}
export function characterPoseArtUrl(archetype: string, pose: string): string {
  return `assets/characters/${archetype}-${pose}_v3.png`;
}
export function propArtKey(name: PropName): string {
  return `${ART}prop-${name}`;
}
export function propArtUrl(name: PropName): string {
  return `assets/props/${name}_v3.png`;
}

/** True if a texture key is a loaded real-art asset (vs a procedural fallback). */
export function isRealArtKey(key: string): boolean {
  return key.startsWith(ART);
}

/** Choose the real character texture if it loaded, else the procedural one. */
export function resolveCharacterTexture(has: (k: string) => boolean, archetype: string): string {
  const real = characterArtKey(archetype);
  return has(real) ? real : characterTextureKey(archetype);
}

/** Choose the real character pose texture if it loaded, else the base character texture. */
export function resolveCharacterPoseTexture(has: (k: string) => boolean, archetype: string, pose: string): string {
  const poseKey = characterPoseArtKey(archetype, pose);
  return has(poseKey) ? poseKey : resolveCharacterTexture(has, archetype);
}

function propNameForKind(kind: Decoration['kind']): PropName {
  if (kind === 'rock') return 'rock';
  if (kind === 'tree2') return 'tree2';
  return 'tree';
}

/** Choose the real prop texture if it loaded, else the procedural one. */
export function resolveDecoTexture(has: (k: string) => boolean, kind: Decoration['kind']): string {
  const real = propArtKey(propNameForKind(kind));
  return has(real) ? real : decoTexture(kind);
}

export interface OptionalAsset {
  key: string;
  url: string;
}

/** Every optional real-art asset the loader should attempt (missing = fallback). */
export function optionalAssets(): OptionalAsset[] {
  const out: OptionalAsset[] = [];
  for (const archetype of Object.keys(CHAR_PALETTES)) {
    out.push({ key: characterArtKey(archetype), url: characterArtUrl(archetype) });
    // Preload walk and back poses (will fall back silently if file does not exist)
    out.push({ key: characterPoseArtKey(archetype, 'walk1'), url: characterPoseArtUrl(archetype, 'walk1') });
    out.push({ key: characterPoseArtKey(archetype, 'walk2'), url: characterPoseArtUrl(archetype, 'walk2') });
    out.push({ key: characterPoseArtKey(archetype, 'back'), url: characterPoseArtUrl(archetype, 'back') });
  }
  for (const name of PROP_NAMES) {
    out.push({ key: propArtKey(name), url: propArtUrl(name) });
  }
  return out;
}

