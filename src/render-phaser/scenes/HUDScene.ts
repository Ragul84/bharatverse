/**
 * HUDScene - Persistent HUD overlay
 *
 * Runs simultaneously with WorldScene and CombatScene.
 * Never restarts - persistent across all game scenes.
 * Listens to events from WorldScene/CombatScene and updates display.
 *
 * Layout (mobile portrait):
 *  TOP-LEFT  : HP bar + HP text
 *  TOP-RIGHT : MindCoins counter
 *  TOP-CENTER: XP bar (thin bar under the top edge)
 *  BOTTOM    : Zone name (set by WorldScene)
 */

import { Scene } from 'phaser';
import { Events } from '../index';
import { MAP_W, MAP_H, GROUND_MAP, worldToTile, classifyGround, MM_LANDMARKS } from './WorldScene';

// Circular minimap (top-right): radius + margin from the screen corner.
const MM_R = 74;
const MM_MARGIN = 14;

export class HUDScene extends Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private mindcoinsText!: Phaser.GameObjects.Text;
  private messageQueue: string[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private messageVisible = false;

  // Minimap (dynamic dots layer + fitted map->pixel transform)
  private mmDyn?: Phaser.GameObjects.Graphics;
  private mmOx = 0; private mmOy = 0; private mmSc = 1; private mmCx = 0; private mmCy = 0;

  constructor() {
    super({ key: 'HUDScene', active: false });
  }

  create(): void {
    const { width } = this.scale;

    // ---- HP bar (top left) ----
    // Background
    this.add.rectangle(8 + 80, 14, 160, 16, 0x374151).setOrigin(0.5).setDepth(100).setScrollFactor(0);
    this.hpBar = this.add.graphics().setDepth(101).setScrollFactor(0);
    this.hpText = this.add.text(8 + 80, 14, 'HP 100/100', {
      fontSize: '11px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f0fdf4',
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // Heart icon (unicode - acceptable non-game-icon use)
    this.add.text(10, 14, 'HP', {
      fontSize: '10px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(101).setScrollFactor(0);

    // ---- MindCoins (top right) ----
    this.mindcoinsText = this.add.text(width - 10, 14, 'MC: 0', {
      fontSize: '13px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(101).setScrollFactor(0);

    // ---- XP bar (thin strip at very top edge) ----
    this.add.rectangle(width / 2, 3, width, 5, 0x1e1b4b).setDepth(100).setScrollFactor(0);
    this.xpBar = this.add.graphics().setDepth(101).setScrollFactor(0);

    // ---- Floating message text (center of screen, fades out) ----
    this.messageText = this.add.text(width / 2, 80, '', {
      fontSize: '15px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fde68a',
      align: 'center',
      stroke: '#1f2937',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);

    // ---- Listen to world events ----
    const world = this.scene.get('WorldScene');
    world.events.on(Events.HUD_UPDATE_HP, this.onHPUpdate, this);
    world.events.on(Events.HUD_UPDATE_MINDCOINS, this.onMindCoinsUpdate, this);
    world.events.on(Events.HUD_UPDATE_XP, this.onXPUpdate, this);
    world.events.on(Events.HUD_SHOW_MESSAGE, this.showMessage, this);

    // Initial render
    this.onHPUpdate({ hp: 100, maxHp: 100 });
    this.xpBar.clear();

    // Minimap (top-right)
    this.buildMinimap();
  }

  /** Circular world-map minimap: fit the whole tile map into a disc, paint
   *  terrain once, highlight key buildings; player + units drawn each frame. */
  private buildMinimap(): void {
    const w = this.scale.width;
    const cx = w - MM_R - MM_MARGIN;
    const cy = MM_R + MM_MARGIN;
    const sc = (2 * MM_R - 10) / MAP_W;
    this.mmSc = sc; this.mmCx = cx; this.mmCy = cy;
    this.mmOx = cx - (MAP_W * sc) / 2;
    this.mmOy = cy - (MAP_H * sc) / 2;

    const bg = this.add.graphics().setScrollFactor(0).setDepth(150);
    bg.fillStyle(0x0b160b, 1).fillCircle(cx, cy, MM_R);
    const rr = (MM_R - 2) * (MM_R - 2);
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const px = this.mmOx + c * sc, py = this.mmOy + r * sc;
        const dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy > rr) continue;
        const t = classifyGround(GROUND_MAP[r][c]);
        bg.fillStyle(t === 'water' ? 0x2f6f8f : t === 'dirt' ? 0x9a6f43 : 0x4e8f3e, 1);
        bg.fillRect(px, py, Math.ceil(sc) + 1, Math.ceil(sc) + 1);
      }
    }
    for (const [c, r] of MM_LANDMARKS) {
      const px = this.mmOx + c * sc, py = this.mmOy + r * sc;
      bg.fillStyle(0x000000, 0.6).fillRect(px - 3, py - 3, 7, 7);
      bg.fillStyle(0xffd23f, 1).fillRect(px - 2, py - 2, 5, 5);
    }
    this.mmDyn = this.add.graphics().setScrollFactor(0).setDepth(151);
    const ring = this.add.graphics().setScrollFactor(0).setDepth(152);
    ring.lineStyle(4, 0x000000, 0.5).strokeCircle(cx, cy, MM_R + 1);
    ring.lineStyle(3, 0xffd23f, 0.95).strokeCircle(cx, cy, MM_R);
    this.add.text(cx, cy - MM_R - 2, 'Bharat', {
      fontSize: '10px', fontFamily: '"Noto Sans", sans-serif',
      color: '#fde68a', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(152);
  }

  update(): void {
    const g = this.mmDyn;
    if (!g) return;
    const world = this.registry.get('world') as
      | { entities: Map<number, { id: number; kind: string; dead?: boolean; pos: { x: number; z: number }; facing: number }>;
          player: { pos: { x: number; z: number }; facing: number }; playerId: number; realm: string }
      | undefined;
    if (!world || !world.player) return;
    const offline = world.realm === '';
    g.clear();
    const rr = (MM_R - 3) * (MM_R - 3);
    const inside = (x: number, y: number) => {
      const dx = x - this.mmCx, dy = y - this.mmCy; return dx * dx + dy * dy <= rr;
    };
    const plot = (x: number, z: number) => {
      const t = worldToTile(x, z);
      return { x: this.mmOx + t.col * this.mmSc, y: this.mmOy + t.row * this.mmSc };
    };
    for (const e of world.entities.values()) {
      if (e.id === world.playerId || e.dead) continue;
      if (offline && e.kind === 'player') continue;
      const p = plot(e.pos.x, e.pos.z);
      if (!inside(p.x, p.y)) continue;
      g.fillStyle(e.kind === 'mob' ? 0xef4444 : e.kind === 'npc' ? 0x60a5fa : 0x9ca3af, 0.9);
      g.fillCircle(p.x, p.y, 1.7);
    }
    const pl = world.player;
    const pp = plot(pl.pos.x, pl.pos.z);
    if (inside(pp.x, pp.y)) {
      const f = pl.facing;
      g.lineStyle(2, 0xffffff, 0.95).lineBetween(pp.x, pp.y, pp.x + Math.sin(f) * 7, pp.y + Math.cos(f) * 7);
      g.fillStyle(0xffffff, 1).fillCircle(pp.x, pp.y, 2.8);
      g.lineStyle(1.5, 0x1f2937, 0.9).strokeCircle(pp.x, pp.y, 2.8);
    }
  }

  private onHPUpdate({ hp, maxHp }: { hp: number; maxHp: number }): void {
    const pct = Math.max(0, hp / maxHp);
    const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xeab308 : 0xdc2626;

    this.hpBar.clear();
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(28, 6, 160 * pct, 16);

    this.hpText.setText(`${hp} / ${maxHp}`);
  }

  private onMindCoinsUpdate(coins: number): void {
    this.mindcoinsText.setText(`MC: ${coins.toLocaleString()}`);

    // Small bounce animation
    this.tweens.add({
      targets: this.mindcoinsText,
      y: { from: 18, to: 14 },
      duration: 150,
      ease: 'Back.out',
    });
  }

  private onXPUpdate(xp: number): void {
    const { width } = this.scale;
    // Simple XP display: treat 1000 XP = 1 level (placeholder formula)
    const xpInLevel = xp % 1000;
    const pct = xpInLevel / 1000;

    this.xpBar.clear();
    this.xpBar.fillStyle(0xa855f7, 1); // purple XP bar
    this.xpBar.fillRect(0, 0, width * pct, 5);
  }

  private showMessage(msg: string): void {
    this.messageText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      delay: 2000,
      duration: 600,
      ease: 'Sine.in',
    });
  }
}
