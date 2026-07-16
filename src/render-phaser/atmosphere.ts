import Phaser from 'phaser';

/**
 * Atmosphere overlay for the Phaser WorldScene.
 *
 * Presentation only: reads the player position and the scene clock and draws on
 * top of the world. It MUST NOT mutate sim state. Three overlays give the flat
 * top-down tilemap the day/night, cinematic vignette, and player torch glow of a
 * kintara.gg-style presentation:
 *   - day/night ambient tint  (screen-fixed, MULTIPLY)
 *   - radial vignette         (screen-fixed, MULTIPLY)
 *   - player torch glow       (world-space, ADD, below entities)
 *
 * Textures are generated once into Phaser canvas textures (no image files),
 * matching the procedural-texture discipline of the rest of the renderer.
 */

const D_ATMOS = 90000; // below D_UI (100000), above D_ENTITY (2000)
const D_GLOW = 1999;  // below entities so the light pools on the ground
const DAY_LENGTH_MS = 8 * 60 * 1000; // full dawn->noon->dusk->night cycle

interface TintStop {
  t: number; // cycle phase in [0,1]
  r: number; // multiply scale for world red,   [0,1]
  g: number; // multiply scale for world green, [0,1]
  b: number; // multiply scale for world blue,  [0,1]
  a: number; // blend weight toward the scaled colour
}

interface TintSample {
  r: number;
  g: number;
  b: number;
  a: number;
}

// cycle t in [0,1): 0 dawn, 0.2 morning, 0.5 dusk, 0.7 night, 0.92 pre-dawn.
const TINT_STOPS: TintStop[] = [
  { t: 0.0,  r: 1.0,  g: 0.62, b: 0.30, a: 0.22 }, // dawn  (warm orange)
  { t: 0.2,  r: 1.0,  g: 0.97, b: 0.92, a: 0.04 }, // morning (near clear)
  { t: 0.5,  r: 1.0,  g: 0.55, b: 0.28, a: 0.24 }, // dusk   (warm red)
  { t: 0.7,  r: 0.16, g: 0.20, b: 0.45, a: 0.40 }, // night  (deep indigo)
  { t: 0.92, r: 0.16, g: 0.20, b: 0.45, a: 0.40 }, // night hold
  { t: 1.0,  r: 1.0,  g: 0.62, b: 0.30, a: 0.22 }, // wrap to dawn
];

function sampleTint(cycle: number): TintSample {
  const s = TINT_STOPS;
  let i = 0;
  while (i < s.length - 1 && cycle > s[i + 1].t) i++;
  const a = s[i];
  const b = s[Math.min(i + 1, s.length - 1)];
  const span = b.t - a.t || 1;
  const f = Phaser.Math.Clamp((cycle - a.t) / span, 0, 1);
  return {
    r: a.r + (b.r - a.r) * f,
    g: a.g + (b.g - a.g) * f,
    b: a.b + (b.b - a.b) * f,
    a: a.a + (b.a - a.a) * f,
  };
}

/** 0 at full day, 1 at deep night: drives the torch glow intensity. */
function nightFactor(cycle: number): number {
  if (cycle < 0.12) return Phaser.Math.Linear(0.6, 0, cycle / 0.12);        // dawn -> day
  if (cycle < 0.62) return 0;                                               // day
  if (cycle < 0.7)  return Phaser.Math.Linear(0, 1, (cycle - 0.62) / 0.08); // day -> night
  if (cycle < 0.92) return 1;                                               // night
  return Phaser.Math.Linear(1, 0.6, (cycle - 0.92) / 0.08);                 // night -> dawn
}

export class Atmosphere {
  private scene: Phaser.Scene;
  private tint: Phaser.GameObjects.Rectangle;
  private vignette: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private startMs: number;
  private lastW = 0;
  private lastH = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.lastW = width;
    this.lastH = height;

    this.tint = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(D_ATMOS)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setOrigin(0.5);

    this.vignette = scene.add.image(width / 2, height / 2, Atmosphere.ensureVignette(scene))
      .setScrollFactor(0)
      .setDepth(D_ATMOS + 1)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    // World-space (not scroll-fixed): it sits below entities so it reads as a
    // light pool on the ground around the player, not a wash over the sprite.
    this.glow = scene.add.image(0, 0, Atmosphere.ensureGlow(scene))
      .setDepth(D_GLOW)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setOrigin(0.5);

    this.startMs = scene.time.now;
    this.applyResize(width, height);
  }

  private static ensureVignette(scene: Phaser.Scene): string {
    const key = 'bv_atmos_vignette';
    if (scene.textures.exists(key)) return key;
    const W = 1024;
    const H = 576;
    const tex = scene.textures.createCanvas(key, W, H);
    if (!tex) return key;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const inner = Math.min(W, H) * 0.32;
    const outer = Math.max(W, H) * 0.72;
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.12)');
    grad.addColorStop(1, 'rgba(6,4,16,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
    return key;
  }

  private static ensureGlow(scene: Phaser.Scene): string {
    const key = 'bv_atmos_glow';
    if (scene.textures.exists(key)) return key;
    const S = 256;
    const tex = scene.textures.createCanvas(key, S, S);
    if (!tex) return key;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2;
    const cy = S / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
    grad.addColorStop(0, 'rgba(255,228,170,0.95)');
    grad.addColorStop(0.35, 'rgba(255,196,120,0.5)');
    grad.addColorStop(0.7, 'rgba(255,170,90,0.16)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    tex.refresh();
    return key;
  }

  private applyResize(width: number, height: number): void {
    this.lastW = width;
    this.lastH = height;
    this.tint.setPosition(width / 2, height / 2).setSize(width, height);
    this.vignette.setPosition(width / 2, height / 2).setDisplaySize(width, height);
  }

  /** Advance the cycle. playerPx/playerPy are world-pixel coords of the player. */
  update(playerPx: number, playerPy: number): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    if (w !== this.lastW || h !== this.lastH) this.applyResize(w, h);

    const elapsed = ((this.scene.time.now - this.startMs) % DAY_LENGTH_MS + DAY_LENGTH_MS) % DAY_LENGTH_MS;
    const cycle = elapsed / DAY_LENGTH_MS;
    const s = sampleTint(cycle);
    const col = (Math.round(s.r * 255) << 16) | (Math.round(s.g * 255) << 8) | Math.round(s.b * 255);
    this.tint.setFillStyle(col, s.a);

    const night = nightFactor(cycle);
    const pulse = 0.9 + 0.1 * Math.sin(this.scene.time.now * 0.003);
    const baseScale = (1.6 + 1.8 * night) * pulse;
    this.glow.setPosition(playerPx, playerPy).setScale(baseScale).setAlpha(0.14 + 0.5 * night);
  }
}
