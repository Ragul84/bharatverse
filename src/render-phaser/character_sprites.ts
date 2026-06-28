/**
 * Procedural character sprites. Bakes one small humanoid texture per archetype
 * palette (and a node texture for world objects) via Phaser Graphics, so the
 * game ships real per-class/per-kind figures with no external art. Called once
 * at scene create, before any EntityView is built.
 */

import type { GameObjects, Scene } from 'phaser';
import { CHAR_PALETTES, paletteFor, type CharPalette } from './character_archetype';

export const CHAR_W = 24;
export const CHAR_H = 36;

const PREFIX = 'bv-char-';

/** Texture key for a character archetype (matches archetypeFor()'s key). */
export function characterTextureKey(archetype: string): string {
  return PREFIX + archetype;
}

/** Generate every archetype texture into the scene's texture manager (idempotent). */
export function generateCharacterTextures(scene: Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  for (const key of Object.keys(CHAR_PALETTES)) {
    const texKey = characterTextureKey(key);
    if (scene.textures.exists(texKey)) continue;
    g.clear();
    if (key === 'object') paintNode(g, paletteFor(key));
    else paintHumanoid(g, paletteFor(key));
    g.generateTexture(texKey, CHAR_W, CHAR_H);
  }
  g.destroy();
}

/** A simple front-facing humanoid: legs, torso + arms, belt, head. Feet at the
 *  bottom-center so EntityView can anchor at (0.5, ~1). */
function paintHumanoid(g: GameObjects.Graphics, p: CharPalette): void {
  // legs
  g.fillStyle(p.legs, 1);
  g.fillRect(8, 26, 3, 9);
  g.fillRect(13, 26, 3, 9);
  // feet
  g.fillStyle(0x2b2b2b, 1);
  g.fillRect(7, 34, 4, 2);
  g.fillRect(13, 34, 4, 2);
  // arms
  g.fillStyle(p.tunic, 1);
  g.fillRect(4, 14, 3, 10);
  g.fillRect(17, 14, 3, 10);
  // hands
  g.fillStyle(p.skin, 1);
  g.fillCircle(5, 24, 2);
  g.fillCircle(18, 24, 2);
  // torso
  g.fillStyle(p.tunic, 1);
  g.fillRect(7, 13, 10, 13);
  // belt / trim
  g.fillStyle(p.accent, 1);
  g.fillRect(7, 22, 10, 2);
  // shoulders trim
  g.fillRect(7, 13, 10, 2);
  // head
  g.fillStyle(p.skin, 1);
  g.fillCircle(12, 8, 5);
  // hair/hat accent
  g.fillStyle(p.accent, 1);
  g.fillRect(8, 3, 8, 2);
}

/** A small resource-node/object marker: a low rock with a glinting accent. */
function paintNode(g: GameObjects.Graphics, p: CharPalette): void {
  g.fillStyle(0x7a7a7a, 1);
  g.fillEllipse(12, 28, 22, 14);
  g.fillStyle(p.legs, 1);
  g.fillEllipse(14, 30, 10, 8);
  g.fillStyle(p.accent, 1);
  g.fillCircle(9, 25, 2);
  g.fillCircle(15, 24, 2);
}
