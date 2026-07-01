/**
 * LPC character customization: catalogs of swappable layers + an on-demand
 * compositor that bakes a chosen {skin, hair, shirt, pants} combination into a
 * single cached spritesheet (standard 13x21 LPC layout, 4-direction walk).
 *
 * Layer PNGs are loaded in BootScene; this module only references texture keys,
 * so it stays free of asset paths. The player's choice comes from the character
 * creator; NPCs get a deterministic random config by id for variety.
 */

import type { Scene } from 'phaser';

export interface LpcConfig {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
}

export interface LpcOption {
  key: string;   // texture key loaded in BootScene ('' = none)
  label: string;
}

// Ordered catalogs — the creator cycles these; index into them is the config.
export const LPC_SKINS: LpcOption[] = [
  { key: 'lpc-body', label: 'Light' },
  { key: 'lpc-body-tanned', label: 'Tan' },
  { key: 'lpc-body-dark', label: 'Deep' },
];
export const LPC_HAIRS: LpcOption[] = [
  { key: 'lpc-hair-brown', label: 'Brown' },
  { key: 'lpc-hair-black', label: 'Black' },
  { key: 'lpc-hair-blonde', label: 'Blonde' },
  { key: 'lpc-hair-white', label: 'White' },
  { key: 'lpc-hair-messy', label: 'Messy' },
  { key: 'lpc-hair-mohawk', label: 'Mohawk' },
  { key: 'lpc-hair-long', label: 'Long' },
];
export const LPC_SHIRTS: LpcOption[] = [
  { key: 'lpc-torso-white', label: 'White' },
  { key: 'lpc-torso-brown', label: 'Brown' },
  { key: 'lpc-torso-maroon', label: 'Maroon' },
];
export const LPC_PANTS: LpcOption[] = [
  { key: 'lpc-legs-teal', label: 'Teal' },
  { key: 'lpc-legs-red', label: 'Red' },
  { key: 'lpc-legs-white', label: 'Sand' },
];
const FEET_KEY = 'lpc-feet-brown';

const wrap = (i: number, n: number) => ((i % n) + n) % n;

export function normalizeConfig(c: Partial<LpcConfig> | null | undefined): LpcConfig {
  return {
    skin: wrap(c?.skin ?? 0, LPC_SKINS.length),
    hair: wrap(c?.hair ?? 0, LPC_HAIRS.length),
    shirt: wrap(c?.shirt ?? 0, LPC_SHIRTS.length),
    pants: wrap(c?.pants ?? 0, LPC_PANTS.length),
  };
}

/** Stable-random config from a numeric seed (for NPC/mob variety). */
export function randomConfig(seed: number): LpcConfig {
  const s = Math.abs(Math.floor(seed));
  return normalizeConfig({
    skin: s % 3,
    hair: (s >> 2) % LPC_HAIRS.length,
    shirt: (s >> 5) % LPC_SHIRTS.length,
    pants: (s >> 7) % LPC_PANTS.length,
  });
}

export function configKey(c: LpcConfig): string {
  return `lpc-c-${c.skin}-${c.hair}-${c.shirt}-${c.pants}`;
}

/** True once the base LPC layers are available to composite from. */
export function lpcReady(scene: Scene): boolean {
  return scene.textures.exists('lpc-body');
}

/**
 * Composite a config into a single spritesheet texture (cached by config key)
 * and return the key. Layers are stacked bottom-to-top: skin, feet, pants,
 * shirt, hair. Missing layers are skipped.
 */
export function compositeLpc(scene: Scene, cfg: Partial<LpcConfig>): string {
  const c = normalizeConfig(cfg);
  const key = configKey(c);
  if (scene.textures.exists(key)) return key;

  const layers = [
    LPC_SKINS[c.skin].key,
    FEET_KEY,
    LPC_PANTS[c.pants].key,
    LPC_SHIRTS[c.shirt].key,
    LPC_HAIRS[c.hair].key,
  ];
  const canvas = document.createElement('canvas');
  canvas.width = 832; canvas.height = 1344;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'lpc-body';
  for (const layer of layers) {
    if (layer && scene.textures.exists(layer)) {
      ctx.drawImage(scene.textures.get(layer).getSourceImage() as CanvasImageSource, 0, 0);
    }
  }
  scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth: 64, frameHeight: 64 });
  return key;
}
