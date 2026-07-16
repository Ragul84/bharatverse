import Phaser, { GameObjects } from 'phaser';

/**
 * Ambient particle field: drifting, twinkling motes that give the world air and
 * life (dust in daylight, fireflies at dusk/night). Screen-space, additive, so
 * they glow against the day/night tint without being darkened by it.
 *
 * Presentation only; reads the scene clock and viewport size. Procedural
 * canvas texture (no image files), matching the rest of the renderer.
 */

const D_PARTICLES = 99000; // above atmosphere tint/vignette (90000), below UI (100000)
const MOTE_COUNT_DESKTOP = 46;
const MOTE_COUNT_MOBILE = 22; // cheaper on phones
const MOTE_KEY = 'bv_mote';

interface Mote {
  img: GameObjects.Image;
  vx: number; // px/sec drift
  vy: number;
  phase: number; // twinkle phase
  twinkleSpeed: number;
  baseAlpha: number;
  size: number;
}

function isLikelyPhone(scene: Phaser.Scene): boolean {
  const w = scene.scale.width;
  // The game canvas is sized to window*dpr; treat narrow or short as mobile.
  return w < 1000 || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

export class Ambient {
  private scene: Phaser.Scene;
  private motes: Mote[] = [];
  private lastW = 0;
  private lastH = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    Ambient.ensureMote(scene);
    const count = isLikelyPhone(scene) ? MOTE_COUNT_MOBILE : MOTE_COUNT_DESKTOP;
    const { width, height } = scene.scale;
    this.lastW = width;
    this.lastH = height;
    for (let i = 0; i < count; i++) {
      const size = 3 + Math.random() * 6;
      const img = scene.add.image(Math.random() * width, Math.random() * height, MOTE_KEY)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(size, size)
        .setDepth(D_PARTICLES)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScrollFactor(0);
      this.motes.push({
        img,
        vx: (Math.random() - 0.5) * 10,
        vy: -4 - Math.random() * 10, // gentle upward drift like embers/fireflies
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.6 + Math.random() * 1.6,
        baseAlpha: 0.25 + Math.random() * 0.4,
        size,
      });
    }
  }

  private static ensureMote(scene: Phaser.Scene): void {
    if (scene.textures.exists(MOTE_KEY)) return;
    const S = 32;
    const tex = scene.textures.createCanvas(MOTE_KEY, S, S);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2;
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, S / 2);
    grad.addColorStop(0, 'rgba(255,244,214,1)');
    grad.addColorStop(0.4, 'rgba(255,224,160,0.6)');
    grad.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    tex.refresh();
  }

  update(dtMs: number): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    if (w !== this.lastW || h !== this.lastH) { this.lastW = w; this.lastH = h; }
    const dt = Math.min(0.05, dtMs / 1000); // clamp to avoid jumps after stalls
    const t = this.scene.time.now * 0.001;
    for (const m of this.motes) {
      m.img.x += m.vx * dt;
      m.img.y += m.vy * dt;
      // recycle off-screen: wrap to the opposite edge with a fresh x
      if (m.img.y < -10) { m.img.y = h + 10; m.img.x = Math.random() * w; }
      if (m.img.y > h + 10) { m.img.y = -10; m.img.x = Math.random() * w; }
      if (m.img.x < -10) m.img.x = w + 10;
      else if (m.img.x > w + 10) m.img.x = -10;
      const twinkle = 0.5 + 0.5 * Math.sin(t * m.twinkleSpeed + m.phase);
      m.img.setAlpha(m.baseAlpha * twinkle);
    }
  }
}
