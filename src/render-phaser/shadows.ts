import Phaser, { GameObjects } from 'phaser';

/**
 * Soft, feathered ground shadow used by entities and trees so sprites feel
 * grounded instead of floating - the kintara.gg presentation detail.
 *
 * One procedural canvas texture (radial gradient, dark centre to transparent
 * edge) is generated lazily and reused everywhere; callers control size and
 * aspect via setDisplaySize. No image files.
 */

const SHADOW_KEY = 'bv_soft_shadow';

/** Ensure the shared soft-shadow texture exists, returning its key. */
export function ensureSoftShadow(scene: Phaser.Scene): string {
  if (scene.textures.exists(SHADOW_KEY)) return SHADOW_KEY;
  const S = 128;
  const tex = scene.textures.createCanvas(SHADOW_KEY, S, S);
  if (!tex) return SHADOW_KEY;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2;
  const cy = S / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.26)');
  grad.addColorStop(0.75, 'rgba(0,0,0,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  tex.refresh();
  return SHADOW_KEY;
}

/**
 * Add a soft ground shadow image at (x, y) with the given display width/height
 * and depth. Returns the image so callers can hide/destroy it.
 */
export function addSoftShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  alpha = 0.85,
): GameObjects.Image {
  const key = ensureSoftShadow(scene);
  return scene.add.image(x, y, key)
    .setOrigin(0.5, 0.5)
    .setDisplaySize(width, height)
    .setDepth(depth)
    .setAlpha(alpha);
}
