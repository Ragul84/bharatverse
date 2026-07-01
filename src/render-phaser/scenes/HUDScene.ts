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
import { DAILY_DEFS, saveDaily, isComplete, isClaimable, type DailyState } from '../daily';

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

  // Incoming duel-challenge prompt (Accept / Decline)
  private duelPrompt?: Phaser.GameObjects.Container;

  // Daily-quest board (toggled from the button under the minimap)
  private dailyPanel?: Phaser.GameObjects.Container;
  private dailyBadge?: Phaser.GameObjects.Arc;

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
    this.mindcoinsText = this.add.text(width - 10, 14, 'Gold: 0', {
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
    world.events.on(Events.SIM_EVENTS, this.onSimEvents, this);
    world.events.on(Events.DAILY_CHANGED, this.onDailyChanged, this);

    // Initial render
    this.onHPUpdate({ hp: 100, maxHp: 100 });
    this.xpBar.clear();

    // Minimap (top-right)
    this.buildMinimap();

    // Daily-quest button (under the minimap)
    this.buildDailyButton();
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
    this.mindcoinsText.setText(`Gold: ${coins.toLocaleString()}`);

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

  /** Watch the sim event stream for an incoming duel challenge. */
  private onSimEvents(events: Array<{ type?: string; fromName?: string }>): void {
    for (const e of events) {
      if (e && e.type === 'duelRequest') { this.showDuelPrompt(e.fromName || 'A rival'); return; }
    }
  }

  /** Modal Accept / Decline prompt when another player challenges you to a duel. */
  showDuelPrompt(name: string): void {
    this.closeDuelPrompt();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const panel = this.add.container(cx, cy).setDepth(300).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, 320, 150, 0x1a1206, 0.97).setStrokeStyle(3, 0xf59e0b, 1);
    const title = this.add.text(0, -46, 'Duel Challenge', {
      fontSize: '18px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5);
    const msg = this.add.text(0, -14, `${name} challenges you!`, {
      fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc',
    }).setOrigin(0.5);

    const world = this.registry.get('world') as { duelAccept?: () => void; duelDecline?: () => void } | undefined;
    const mkBtn = (x: number, label: string, color: number, fn?: () => void): Phaser.GameObjects.GameObject[] => {
      const r = this.add.rectangle(x, 36, 132, 40, color, 1).setStrokeStyle(2, 0xfde68a, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { fn?.(); this.closeDuelPrompt(); });
      const t = this.add.text(x, 36, label, {
        fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      return [r, t];
    };
    panel.add([bg, title, msg,
      ...mkBtn(-74, 'Accept', 0x15803d, () => world?.duelAccept?.()),
      ...mkBtn(74, 'Decline', 0xb91c1c, () => world?.duelDecline?.())]);
    panel.setScale(0.5);
    this.tweens.add({ targets: panel, scale: 1, duration: 250, ease: 'Back.out' });
    this.duelPrompt = panel;
    this.time.delayedCall(30000, () => this.closeDuelPrompt()); // invite window
  }

  private closeDuelPrompt(): void {
    this.duelPrompt?.destroy();
    this.duelPrompt = undefined;
  }

  // ---- Daily-quest board ---------------------------------------------------

  /** Pill button under the minimap; a gold dot appears when a reward is ready. */
  private buildDailyButton(): void {
    const cx = this.scale.width - MM_R - MM_MARGIN;
    const by = MM_MARGIN + 2 * MM_R + 18;
    const bg = this.add.rectangle(cx, by, 118, 30, 0x1a1206, 0.92)
      .setStrokeStyle(2, 0xf59e0b, 1).setDepth(150).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleDailyPanel());
    this.add.text(cx, by, 'Daily Quests', {
      fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
    this.dailyBadge = this.add.circle(cx + 55, by - 12, 5, 0x22c55e)
      .setStrokeStyle(1.5, 0x052e16, 1).setDepth(152).setScrollFactor(0).setVisible(false);
    void bg;
    this.refreshDailyBadge();
  }

  /** Show the green "reward ready" dot if any daily is claimable. */
  private refreshDailyBadge(): void {
    const s = this.registry.get('daily') as DailyState | undefined;
    const ready = !!s && DAILY_DEFS.some((d) => isClaimable(s, d));
    this.dailyBadge?.setVisible(ready);
  }

  private onDailyChanged(): void {
    this.refreshDailyBadge();
    if (this.dailyPanel) this.buildDailyPanel(); // rebuild while open to show progress
  }

  private toggleDailyPanel(): void {
    if (this.dailyPanel) { this.dailyPanel.destroy(); this.dailyPanel = undefined; return; }
    this.buildDailyPanel();
  }

  private buildDailyPanel(): void {
    this.dailyPanel?.destroy();
    const s = this.registry.get('daily') as DailyState | undefined;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const W = 360, rowH = 62, headH = 54, footH = 16;
    const H = headH + DAILY_DEFS.length * rowH + footH;
    const panel = this.add.container(cx, cy).setDepth(310).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, W, H, 0x140d04, 0.98).setStrokeStyle(3, 0xf59e0b, 1);
    const title = this.add.text(0, -H / 2 + 20, 'Daily Quests', {
      fontSize: '19px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5);
    const close = this.add.text(W / 2 - 16, -H / 2 + 16, '✕', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.dailyPanel?.destroy(); this.dailyPanel = undefined; });
    panel.add([bg, title, close]);

    DAILY_DEFS.forEach((d, i) => {
      const y = -H / 2 + headH + i * rowH + rowH / 2 - 6;
      const done = s ? isComplete(s, d) : false;
      const claimed = !!s?.claimed[d.id];
      const cur = s?.progress[d.id] ?? 0;
      const label = this.add.text(-W / 2 + 18, y - 16, d.label, {
        fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const reward = this.add.text(-W / 2 + 18, y + 18, `+${d.gold} Gold   +${d.xp} XP`, {
        fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#fbbf24',
      }).setOrigin(0, 0.5);
      // progress bar
      const barX = -W / 2 + 18, barW = 210, barY = y + 2;
      const track = this.add.rectangle(barX, barY, barW, 8, 0x374151).setOrigin(0, 0.5);
      const fillW = Math.max(0, Math.min(1, cur / d.goal)) * barW;
      const fill = this.add.rectangle(barX, barY, fillW, 8, done ? 0x22c55e : 0xa855f7).setOrigin(0, 0.5);
      const prog = this.add.text(barX + barW + 8, barY, `${Math.min(cur, d.goal)}/${d.goal}`, {
        fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
      }).setOrigin(0, 0.5);
      panel.add([label, reward, track, fill, prog]);

      // Claim button / state
      const bx = W / 2 - 52;
      if (claimed) {
        panel.add(this.add.text(bx, y, 'Claimed', {
          fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#64748b',
        }).setOrigin(0.5));
      } else if (done) {
        const btn = this.add.rectangle(bx, y, 78, 34, 0x15803d, 1).setStrokeStyle(2, 0xfde68a, 1)
          .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.claimDaily(d.id));
        const bt = this.add.text(bx, y, 'Claim', {
          fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        panel.add([btn, bt]);
      } else {
        panel.add(this.add.text(bx, y, 'In progress', {
          fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#94a3b8',
        }).setOrigin(0.5));
      }
    });

    panel.setScale(0.6);
    this.tweens.add({ targets: panel, scale: 1, duration: 200, ease: 'Back.out' });
    this.dailyPanel = panel;
  }

  private claimDaily(id: string): void {
    const s = this.registry.get('daily') as DailyState | undefined;
    const d = DAILY_DEFS.find((x) => x.id === id);
    if (!s || !d || !isClaimable(s, d)) return;
    s.claimed[id] = true;
    saveDaily(s);
    // WorldScene owns the Gold total — award there via the shared event bus.
    this.scene.get('WorldScene').events.emit(Events.DAILY_CLAIM, { gold: d.gold, xp: d.xp });
    this.refreshDailyBadge();
    this.buildDailyPanel(); // reflect the "Claimed" state immediately
  }
}
