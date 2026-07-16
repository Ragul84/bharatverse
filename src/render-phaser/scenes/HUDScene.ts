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
import { QUESTS } from '../../sim/data';
import { MAP_W, MAP_H, GROUND_MAP, worldToTile, classifyGround, MM_LANDMARKS } from './WorldScene';
import { DAILY_DEFS, saveDaily, isComplete, isClaimable, type DailyState } from '../daily';
import {
  HAT_SHOP, PET_SHOP, hatLabel, ownsHat, ownsPet, type CosmeticState,
} from '../cosmetics';
import { compositeLpc, lpcReady } from '../lpc_composite';
import { RESOURCE_DEFS, type ResourceState, loadResources, saveResources, loadLocker, saveLocker, type LockerState } from '../resources';
import { SKILL_DEFS, levelProgress, MAX_LEVEL, type SkillState, addSkillXp, saveSkills } from '../skills';

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

  // Cosmetic shop
  private shopPanel?: Phaser.GameObjects.Container;
  private shopTab: 'hat' | 'pet' = 'hat';
  private gold = 0;

  // Trading Post (sell gathered resources)
  private marketPanel?: Phaser.GameObjects.Container;

  // Subject Mastery panel
  private skillsPanel?: Phaser.GameObjects.Container;

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
    world.events.on(Events.OPEN_STUDY_HALL, () => {
      const modal = document.getElementById('study-hall-modal');
      if (modal) modal.style.display = 'block';
    }, this);
    world.events.on(Events.OPEN_SHOP, () => this.toggleShopPanel(true), this);
    world.events.on(Events.SHOP_CHANGED, () => { if (this.shopPanel) this.buildShopPanel(); }, this);
    world.events.on(Events.OPEN_MARKET, () => this.toggleMarketPanel(true), this);
    world.events.on(Events.RESOURCES_CHANGED, () => { if (this.marketPanel) this.buildMarketPanel(); }, this);
    world.events.on(Events.SKILLS_CHANGED, () => { if (this.skillsPanel) this.buildSkillsPanel(); }, this);

    // Initial render
    this.onHPUpdate({ hp: 100, maxHp: 100 });
    this.xpBar.clear();

    // Minimap (top-right)
    this.buildMinimap();

    // Daily-quest button (under the minimap)
    this.buildDailyButton();

    // Initialize Study Hall HTML overlays
    this.initStudyHallDOM();
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

    // Compass: N is up (world -z), E right (+x), S down (+z), W left (-x).
    const compass: [string, number, number][] = [
      ['N', cx, cy - MM_R + 9], ['S', cx, cy + MM_R - 9],
      ['E', cx + MM_R - 9, cy], ['W', cx - MM_R + 9, cy],
    ];
    for (const [ch, tx, ty] of compass) {
      this.add.text(tx, ty, ch, {
        fontSize: '10px', fontFamily: '"Noto Sans", sans-serif',
        color: ch === 'N' ? '#fca5a5' : '#e5e7eb', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(153);
    }
  }

  update(): void {
    const g = this.mmDyn;
    if (!g) return;
    const world = this.registry.get('world') as
      | { entities: Map<number, { id: number; kind: string; dead?: boolean; pos: { x: number; z: number }; facing: number }>;
          player: { pos: { x: number; z: number }; facing: number }; playerId: number; realm: string }
      | undefined;
    if (!world || !world.player) return;
    g.clear();
    const rr = (MM_R - 3) * (MM_R - 3);
    const inside = (x: number, y: number) => {
      const dx = x - this.mmCx, dy = y - this.mmCy; return dx * dx + dy * dy <= rr;
    };
    const plot = (x: number, z: number) => {
      const t = worldToTile(x, z);
      return { x: this.mmOx + t.col * this.mmSc, y: this.mmOy + t.row * this.mmSc };
    };
    // The minimap shows only *where you are* + key buildings (painted once in
    // buildMinimap) — no other-entity clutter.
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
    this.gold = coins;
    if (this.shopPanel) this.buildShopPanel(); // keep the shop's Gold label live
    if (this.marketPanel) this.buildMarketPanel();
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
  private onSimEvents(events: Array<any>): void {
    const world = this.registry.get('world') as any;
    const selfId = world?.playerId;

    for (const e of events) {
      if (!e) continue;
      
      // Match player-specific events
      if (e.pid !== undefined && selfId !== undefined && e.pid !== selfId) {
        continue;
      }

      if (e.type === 'duelRequest') {
        this.showDuelPrompt(e.fromName || 'A rival');
      } else if (e.type === 'levelup') {
        this.showMessage(`★ LEVEL UP! You reached level ${e.level}! ★`);
      } else if (e.type === 'xp') {
        this.showMessage(`+${e.amount} XP gained`);
      } else if (e.type === 'loot') {
        this.showMessage(e.text);
      } else if (e.type === 'questAccepted') {
        const q = QUESTS[e.questId];
        if (q) this.showMessage(`Quest Accepted: ${q.name}`);
      } else if (e.type === 'questDone') {
        const q = QUESTS[e.questId];
        if (q) this.showMessage(`Quest Completed: ${q.name}!`);
      } else if (e.type === 'playerDeath') {
        const worldScene = this.scene.get('WorldScene') as any;
        const p = worldScene?.world?.player;
        if (p && p.pos.z < -30 && p.pos.x >= 0) {
          const res = loadResources();
          const lostWood = Math.floor(res.wood * 0.15);
          const lostOre = Math.floor(res.ore * 0.15);
          if (lostWood > 0 || lostOre > 0) {
            res.wood -= lostWood;
            res.ore -= lostOre;
            saveResources(res);
            this.registry.set('resources', res);
            worldScene.events.emit(Events.RESOURCES_CHANGED);
            this.showMessage(`Lost in Wilderness: -${lostWood} Wood, -${lostOre} Ore!`);
          }
        }
      }
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

    // Shop button (just below the daily button)
    const sy = by + 34;
    this.add.rectangle(cx, sy, 118, 30, 0x1a1206, 0.92)
      .setStrokeStyle(2, 0xf59e0b, 1).setDepth(150).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleShopPanel());
    this.add.text(cx, sy, 'Cosmetics', {
      fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);

    // Trading Post button
    const my = sy + 34;
    this.add.rectangle(cx, my, 118, 30, 0x1a1206, 0.92)
      .setStrokeStyle(2, 0xf59e0b, 1).setDepth(150).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMarketPanel());
    this.add.text(cx, my, 'Trading Post', {
      fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);

    // Skills (Subject Mastery) button
    const ky = my + 34;
    this.add.rectangle(cx, ky, 118, 30, 0x1a1206, 0.92)
      .setStrokeStyle(2, 0xf59e0b, 1).setDepth(150).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSkillsPanel());
    this.add.text(cx, ky, 'Skills', {
      fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
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

  // ---- Cosmetic shop -------------------------------------------------------

  private toggleShopPanel(forceOpen = false): void {
    if (this.shopPanel && !forceOpen) { this.shopPanel.destroy(); this.shopPanel = undefined; return; }
    this.buildShopPanel();
  }

  private buildShopPanel(): void {
    this.shopPanel?.destroy();
    const cos = this.registry.get('cosmetics') as CosmeticState | undefined;
    const cx = this.scale.width / 2, cy = this.scale.height / 2;
    const W = 540, H = 380;
    const panel = this.add.container(cx, cy).setDepth(320).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, W, H, 0x140d04, 0.98).setStrokeStyle(3, 0xf59e0b, 1);
    const title = this.add.text(-W / 2 + 18, -H / 2 + 16, 'Cosmetics Emporium', {
      fontSize: '18px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const goldT = this.add.text(W / 2 - 40, -H / 2 + 16, `Gold: ${this.gold.toLocaleString()}`, {
      fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0.5);
    const close = this.add.text(W / 2 - 14, -H / 2 + 16, '✕', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.shopPanel?.destroy(); this.shopPanel = undefined; });
    panel.add([bg, title, goldT, close]);

    // Tabs
    const mkTab = (x: number, key: 'hat' | 'pet', label: string) => {
      const on = this.shopTab === key;
      const r = this.add.rectangle(x, -H / 2 + 46, 92, 26, on ? 0x7c3f12 : 0x2a1c0a, 1)
        .setStrokeStyle(2, on ? 0xfde68a : 0x6b4a24, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.shopTab = key; this.buildShopPanel(); });
      const t = this.add.text(x, -H / 2 + 46, label, {
        fontSize: '13px', fontFamily: '"Noto Sans", sans-serif',
        color: on ? '#fde68a' : '#cbd5e1', fontStyle: 'bold',
      }).setOrigin(0.5);
      panel.add([r, t]);
    };
    mkTab(-W / 2 + 66, 'hat', 'Hats');
    mkTab(-W / 2 + 164, 'pet', 'Pets');

    // Item grid (3 columns)
    const cardW = 156, cardH = 128, cols = 3;
    const gx = -W / 2 + 20 + cardW / 2, gy = -H / 2 + 78 + cardH / 2, sx = cardW + 10, sy = cardH + 8;
    const items = this.shopTab === 'hat'
      ? HAT_SHOP.map((h) => ({ kind: 'hat' as const, ref: h.hatIndex as number | string, price: h.price, label: hatLabel(h.hatIndex) }))
      : PET_SHOP.map((p) => ({ kind: 'pet' as const, ref: p.id as number | string, price: p.price, label: p.label }));

    items.forEach((it, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      this.buildShopCard(panel, gx + col * sx, gy + row * sy, cardW, cardH, it, cos);
    });

    panel.setScale(0.7);
    this.tweens.add({ targets: panel, scale: 1, duration: 200, ease: 'Back.out' });
    this.shopPanel = panel;
  }

  private buildShopCard(
    panel: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number,
    it: { kind: 'hat' | 'pet'; ref: number | string; price: number; label: string },
    cos: CosmeticState | undefined,
  ): void {
    const owned = it.kind === 'hat'
      ? (cos ? ownsHat(cos, it.ref as number) : false)
      : (cos ? ownsPet(cos, it.ref as string) : false);
    const equipped = it.kind === 'hat'
      ? cos?.equippedHat === it.ref
      : cos?.equippedPet === it.ref;

    const card = this.add.rectangle(x, y, w, h, 0x21160a, 1).setStrokeStyle(2, equipped ? 0x22c55e : 0x6b4a24, 1);
    panel.add(card);

    // Preview sprite
    const prev = this.buildPreviewSprite(it);
    if (prev) { prev.setPosition(x, y - 22); panel.add(prev); }

    const name = this.add.text(x, y + 22, it.label, {
      fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(name);

    // Action button
    const by = y + h / 2 - 18;
    if (equipped) {
      const btn = this.add.rectangle(x, by, w - 24, 26, 0x166534, 1).setStrokeStyle(2, 0x22c55e, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.shopEquip(it.kind, it.ref));
      const t = this.add.text(x, by, 'Equipped ✓', {
        fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#dcfce7', fontStyle: 'bold',
      }).setOrigin(0.5);
      panel.add([btn, t]);
    } else if (owned) {
      const btn = this.add.rectangle(x, by, w - 24, 26, 0x1d4ed8, 1).setStrokeStyle(2, 0x93c5fd, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.shopEquip(it.kind, it.ref));
      const t = this.add.text(x, by, 'Equip', {
        fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      panel.add([btn, t]);
    } else {
      const afford = this.gold >= it.price;
      const btn = this.add.rectangle(x, by, w - 24, 26, afford ? 0x854d0e : 0x3a2a12, 1)
        .setStrokeStyle(2, afford ? 0xfde68a : 0x6b4a24, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { if (afford) this.shopBuy(it.kind, it.ref, it.price); });
      const t = this.add.text(x, by, `Buy · ${it.price} Gold`, {
        fontSize: '12px', fontFamily: '"Noto Sans", sans-serif',
        color: afford ? '#fef9c3' : '#8a7a5a', fontStyle: 'bold',
      }).setOrigin(0.5);
      panel.add([btn, t]);
    }
  }

  /** A small preview of a hat (on a base LPC head) or a pet, for a shop card. */
  private buildPreviewSprite(it: { kind: 'hat' | 'pet'; ref: number | string }): Phaser.GameObjects.Sprite | null {
    if (it.kind === 'hat') {
      if (!lpcReady(this)) return null;
      const key = compositeLpc(this, { hat: it.ref as number });
      // Row 10 (facing down), col 0 = idle → frame 130 of the 13-wide sheet.
      return this.add.sprite(0, 0, key, 130).setScale(1.4);
    }
    const def = PET_SHOP.find((p) => p.id === it.ref);
    if (!def || !this.textures.exists(def.key)) return null;
    return this.add.sprite(0, 0, def.key, 1).setScale(1.7); // frame 1 = down idle
  }

  private shopBuy(kind: 'hat' | 'pet', ref: number | string, price: number): void {
    this.scene.get('WorldScene').events.emit(Events.SHOP_BUY, { kind, ref, price });
  }
  private shopEquip(kind: 'hat' | 'pet', ref: number | string): void {
    this.scene.get('WorldScene').events.emit(Events.SHOP_EQUIP, { kind, ref });
  }

  // ---- Trading Post (sell gathered resources) ------------------------------

  private toggleMarketPanel(forceOpen = false): void {
    if (this.marketPanel && !forceOpen) { this.marketPanel.destroy(); this.marketPanel = undefined; return; }
    this.buildMarketPanel();
  }

  private buildMarketPanel(): void {
    this.marketPanel?.destroy();
    const res = this.registry.get('resources') as ResourceState | undefined;
    const cx = this.scale.width / 2, cy = this.scale.height / 2;
    const W = 380, rowH = 70, H = 96 + RESOURCE_DEFS.length * rowH;
    const panel = this.add.container(cx, cy).setDepth(320).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, W, H, 0x140d04, 0.98).setStrokeStyle(3, 0xf59e0b, 1);
    const title = this.add.text(-W / 2 + 18, -H / 2 + 18, 'Trading Post', {
      fontSize: '18px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const goldT = this.add.text(W / 2 - 38, -H / 2 + 18, `Gold: ${this.gold.toLocaleString()}`, {
      fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0.5);
    const close = this.add.text(W / 2 - 14, -H / 2 + 18, '✕', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.marketPanel?.destroy(); this.marketPanel = undefined; });
    panel.add([bg, title, goldT, close]);

    RESOURCE_DEFS.forEach((d, i) => {
      const y = -H / 2 + 70 + i * rowH + rowH / 2 - 8;
      const count = res ? res[d.id] : 0;
      panel.add(this.add.rectangle(-W / 2 + 32, y, 26, 26, d.color, 1).setStrokeStyle(2, 0x000000, 0.4));
      panel.add(this.add.text(-W / 2 + 56, y - 9, `${d.label}  ×${count}`, {
        fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc', fontStyle: 'bold',
      }).setOrigin(0, 0.5));
      panel.add(this.add.text(-W / 2 + 56, y + 12, `${d.price} Gold each`, {
        fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#fbbf24',
      }).setOrigin(0, 0.5));

      const has = count > 0;
      const bx = W / 2 - 78;
      const btn = this.add.rectangle(bx, y, 128, 34, has ? 0x854d0e : 0x3a2a12, 1)
        .setStrokeStyle(2, has ? 0xfde68a : 0x6b4a24, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { if (has) this.marketSell(d.id, count); });
      const bt = this.add.text(bx, y, has ? `Sell all · ${count * d.price}` : 'None', {
        fontSize: '12px', fontFamily: '"Noto Sans", sans-serif',
        color: has ? '#fef9c3' : '#8a7a5a', fontStyle: 'bold',
      }).setOrigin(0.5);
      panel.add([btn, bt]);
    });

    panel.setScale(0.7);
    this.tweens.add({ targets: panel, scale: 1, duration: 200, ease: 'Back.out' });
    this.marketPanel = panel;
  }

  private marketSell(kind: 'wood' | 'ore', count: number): void {
    this.scene.get('WorldScene').events.emit(Events.MARKET_SELL, { kind, count });
  }

  // ---- Subject Mastery panel -----------------------------------------------

  private toggleSkillsPanel(): void {
    if (this.skillsPanel) { this.skillsPanel.destroy(); this.skillsPanel = undefined; return; }
    this.buildSkillsPanel();
  }

  private buildSkillsPanel(): void {
    this.skillsPanel?.destroy();
    const skills = this.registry.get('skills') as SkillState | undefined;
    const cx = this.scale.width / 2, cy = this.scale.height / 2;
    const W = 360, rowH = 64, H = 70 + SKILL_DEFS.length * rowH;
    const panel = this.add.container(cx, cy).setDepth(320).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, W, H, 0x140d04, 0.98).setStrokeStyle(3, 0xf59e0b, 1);
    const title = this.add.text(-W / 2 + 18, -H / 2 + 18, 'Subject Mastery', {
      fontSize: '18px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const close = this.add.text(W / 2 - 14, -H / 2 + 18, '✕', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.skillsPanel?.destroy(); this.skillsPanel = undefined; });
    panel.add([bg, title, close]);

    SKILL_DEFS.forEach((d, i) => {
      const xp = skills ? skills[d.id] : 0;
      const { level, frac } = levelProgress(xp);
      const y = -H / 2 + 60 + i * rowH + rowH / 2 - 8;
      panel.add(this.add.text(-W / 2 + 20, y - 12, d.label, {
        fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc', fontStyle: 'bold',
      }).setOrigin(0, 0.5));
      panel.add(this.add.text(W / 2 - 20, y - 12, `Lv ${level}${level >= MAX_LEVEL ? ' (MAX)' : ''}`, {
        fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#fbbf24', fontStyle: 'bold',
      }).setOrigin(1, 0.5));
      // XP bar
      const barX = -W / 2 + 20, barW = W - 40, barY = y + 12;
      panel.add(this.add.rectangle(barX, barY, barW, 9, 0x374151).setOrigin(0, 0.5));
      panel.add(this.add.rectangle(barX, barY, barW * frac, 9, d.color).setOrigin(0, 0.5));
    });

    panel.setScale(0.7);
    this.tweens.add({ targets: panel, scale: 1, duration: 200, ease: 'Back.out' });
    this.skillsPanel = panel;
  }

  // ---- Study Hall & Book Reader Library implementation -----------------------

  private booksData: any[] = [];
  private currentBook: any = null;
  private currentChapterIdx = 0;
  private currentPageIdx = 0;
  private currentTheme = 'sepia';
  private currentFontSize = 18;

  private initStudyHallDOM(): void {
    const shModal = document.getElementById('study-hall-modal');
    const brModal = document.getElementById('book-reader-modal');
    const lockerModal = document.getElementById('library-locker-modal');
    if (shModal) shModal.style.display = 'none';
    if (brModal) brModal.style.display = 'none';
    if (lockerModal) lockerModal.style.display = 'none';
    
    document.getElementById('study-hall-close')?.addEventListener('click', () => {
      if (shModal) shModal.style.display = 'none';
    });
    document.getElementById('book-reader-close')?.addEventListener('click', () => {
      if (brModal) brModal.style.display = 'none';
    });
    document.getElementById('library-locker-close')?.addEventListener('click', () => {
      if (lockerModal) lockerModal.style.display = 'none';
    });
    
    document.getElementById('study-hall-quiz-btn')?.addEventListener('click', () => {
      this.startFocusedMasteryQuiz();
    });
    document.getElementById('study-hall-library-btn')?.addEventListener('click', () => {
      if (shModal) shModal.style.display = 'none';
      this.openBookCatalog();
    });
    document.getElementById('study-hall-locker-btn')?.addEventListener('click', () => {
      if (shModal) shModal.style.display = 'none';
      this.openLocker();
    });

    // Wire Locker transaction buttons
    document.getElementById('locker-deposit-wood-1')?.addEventListener('click', () => {
      this.transferLocker('wood', 1);
    });
    document.getElementById('locker-deposit-wood-all')?.addEventListener('click', () => {
      const res = loadResources();
      this.transferLocker('wood', res.wood);
    });
    document.getElementById('locker-withdraw-wood-1')?.addEventListener('click', () => {
      this.transferLocker('wood', -1);
    });
    document.getElementById('locker-withdraw-wood-all')?.addEventListener('click', () => {
      const locker = loadLocker();
      this.transferLocker('wood', -locker.wood);
    });

    document.getElementById('locker-deposit-ore-1')?.addEventListener('click', () => {
      this.transferLocker('ore', 1);
    });
    document.getElementById('locker-deposit-ore-all')?.addEventListener('click', () => {
      const res = loadResources();
      this.transferLocker('ore', res.ore);
    });
    document.getElementById('locker-withdraw-ore-1')?.addEventListener('click', () => {
      this.transferLocker('ore', -1);
    });
    document.getElementById('locker-withdraw-ore-all')?.addEventListener('click', () => {
      const locker = loadLocker();
      this.transferLocker('ore', -locker.ore);
    });
    
    document.getElementById('book-theme-toggle')?.addEventListener('click', () => {
      const themes = ['sepia', 'light', 'dark'];
      const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
      this.currentTheme = themes[nextIdx];
      const container = document.getElementById('book-pages-container');
      if (container) container.className = this.currentTheme;
    });
    
    document.getElementById('book-font-inc')?.addEventListener('click', () => {
      if (this.currentFontSize < 26) {
        this.currentFontSize += 2;
        this.applyFontSize();
      }
    });
    document.getElementById('book-font-dec')?.addEventListener('click', () => {
      if (this.currentFontSize > 14) {
        this.currentFontSize -= 2;
        this.applyFontSize();
      }
    });
    
    document.getElementById('book-toc-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('book-toc-sidebar');
      if (sidebar) {
        if (sidebar.style.transform === 'translateX(0px)') {
          sidebar.style.transform = 'translateX(-100%)';
        } else {
          sidebar.style.transform = 'translateX(0px)';
        }
      }
    });
    
    document.getElementById('book-page-prev')?.addEventListener('click', () => {
      this.turnPage(-1);
    });
    document.getElementById('book-page-next')?.addEventListener('click', () => {
      this.turnPage(1);
    });
    
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (shModal) shModal.style.display = 'none';
        if (brModal) brModal.style.display = 'none';
        if (lockerModal) lockerModal.style.display = 'none';
      }
      if (brModal && brModal.style.display === 'block') {
        if (ev.key === 'ArrowLeft') this.turnPage(-1);
        else if (ev.key === 'ArrowRight') this.turnPage(1);
      }
    });
    
    fetch('data/books.json')
      .then(r => r.json())
      .then(data => {
        this.booksData = data;
        this.renderCatalog('all');
      })
      .catch(err => console.error('Failed to load books:', err));
      
    const filterBtns = document.querySelectorAll('.catalog-filters button');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (ev) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        const target = ev.currentTarget as HTMLButtonElement;
        target.classList.add('active');
        const cat = target.getAttribute('data-category') || 'all';
        this.renderCatalog(cat);
      });
    });
  }

  private applyFontSize(): void {
    const left = document.getElementById('page-left');
    const right = document.getElementById('page-right');
    if (left) left.style.fontSize = `${this.currentFontSize}px`;
    if (right) right.style.fontSize = `${this.currentFontSize}px`;
  }

  private renderCatalog(category: string): void {
    const grid = document.getElementById('book-list-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtered = category === 'all' 
      ? this.booksData 
      : this.booksData.filter(b => b.category === category);
      
    filtered.forEach(book => {
      const card = document.createElement('div');
      card.className = 'window panel';
      card.style.padding = '16px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '12px';
      card.style.justifyContent = 'space-between';
      
      card.innerHTML = `
        <div>
          <h4 style="margin: 0; font-family: var(--font-display); color: #fde68a; font-size: 15px; border: none; padding: 0;">${book.title}</h4>
          <span style="font-size: 12px; color: #a1a1aa;">By ${book.author}</span>
          <div style="margin-top: 8px; font-size: 11px; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">${book.category}</div>
        </div>
        <button type="button" class="btn" style="width: 100%; font-size: 13px; font-family: var(--font-display);" data-book-id="${book.id}">Read Book</button>
      `;
      
      card.querySelector('button')?.addEventListener('click', () => {
        this.openBook(book);
      });
      
      grid.appendChild(card);
    });
  }

  private openBookCatalog(): void {
    const brModal = document.getElementById('book-reader-modal');
    if (brModal) {
      brModal.style.display = 'block';
      document.getElementById('book-catalog-view')!.style.display = 'flex';
      document.getElementById('book-pages-view')!.style.display = 'none';
      document.getElementById('book-reader-title')!.innerText = 'Reading Room';
    }
  }

  private openBook(book: any): void {
    this.currentBook = book;
    this.currentChapterIdx = 0;
    this.currentPageIdx = 0;
    
    document.getElementById('book-catalog-view')!.style.display = 'none';
    document.getElementById('book-pages-view')!.style.display = 'block';
    document.getElementById('book-reader-title')!.innerText = book.title;
    
    const tocList = document.getElementById('book-toc-list');
    if (tocList) {
      tocList.innerHTML = '';
      book.chapters.forEach((ch: any, idx: number) => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.padding = '6px 8px';
        li.style.borderRadius = '4px';
        li.style.transition = 'background 0.2s';
        li.innerText = ch.title;
        li.addEventListener('click', () => {
          this.currentChapterIdx = idx;
          this.currentPageIdx = 0;
          this.renderPages();
          document.getElementById('book-toc-sidebar')!.style.transform = 'translateX(-100%)';
        });
        tocList.appendChild(li);
      });
    }
    
    this.renderPages();
    this.applyFontSize();
  }

  private renderPages(): void {
    if (!this.currentBook) return;
    const chapters = this.currentBook.chapters;
    const ch = chapters[this.currentChapterIdx];
    
    const tocItems = document.querySelectorAll('#book-toc-list li');
    tocItems.forEach((item, idx) => {
      if (idx === this.currentChapterIdx) {
        (item as HTMLElement).style.background = 'rgba(251, 191, 36, 0.15)';
        (item as HTMLElement).style.color = '#fbbf24';
      } else {
        (item as HTMLElement).style.background = 'transparent';
        (item as HTMLElement).style.color = '#f8fafc';
      }
    });
    
    const leftPage = document.getElementById('page-left');
    const rightPage = document.getElementById('page-right');
    const indicator = document.getElementById('book-page-indicator');
    
    let totalPages = 0;
    chapters.forEach((c: any) => totalPages += c.pages.length);
    
    let currentGlobalPage = 1;
    for (let i = 0; i < this.currentChapterIdx; i++) {
      currentGlobalPage += chapters[i].pages.length;
    }
    currentGlobalPage += this.currentPageIdx;
    
    if (indicator) {
      indicator.innerText = `Page ${currentGlobalPage} of ${totalPages}`;
    }
    
    const isDualPage = window.innerWidth >= 768;
    
    if (leftPage) {
      leftPage.innerHTML = `
        <h4 style="font-family: var(--font-display); color: #c8a838; font-size: 14px; margin-top: 0; text-transform: uppercase; border: none; padding: 0;">${ch.title}</h4>
        <p style="margin-top: 16px;">${ch.pages[this.currentPageIdx] || ''}</p>
      `;
    }
    
    if (rightPage) {
      if (isDualPage && this.currentPageIdx + 1 < ch.pages.length) {
        rightPage.innerHTML = `
          <h4 style="font-family: var(--font-display); color: #c8a838; font-size: 14px; margin-top: 0; text-transform: uppercase; border: none; padding: 0;">${ch.title}</h4>
          <p style="margin-top: 16px;">${ch.pages[this.currentPageIdx + 1]}</p>
        `;
      } else if (isDualPage && this.currentChapterIdx + 1 < chapters.length) {
        const nextCh = chapters[this.currentChapterIdx + 1];
        rightPage.innerHTML = `
          <h4 style="font-family: var(--font-display); color: #c8a838; font-size: 14px; margin-top: 0; text-transform: uppercase; border: none; padding: 0;">${nextCh.title}</h4>
          <p style="margin-top: 16px;">${nextCh.pages[0] || ''}</p>
        `;
      } else {
        rightPage.innerHTML = '';
      }
    }
  }

  private turnPage(dir: number): void {
    if (!this.currentBook) return;
    const chapters = this.currentBook.chapters;
    const ch = chapters[this.currentChapterIdx];
    const isDualPage = window.innerWidth >= 768;
    const step = isDualPage ? 2 : 1;
    
    const animClass = dir > 0 ? 'page-flip-next' : 'page-flip-prev';
    const leftPage = document.getElementById('page-left');
    const rightPage = document.getElementById('page-right');
    if (leftPage) leftPage.classList.add(animClass);
    if (rightPage) rightPage.classList.add(animClass);
    
    setTimeout(() => {
      if (leftPage) leftPage.classList.remove(animClass);
      if (rightPage) rightPage.classList.remove(animClass);
    }, 200);

    if (dir > 0) {
      if (this.currentPageIdx + step < ch.pages.length) {
        this.currentPageIdx += step;
      } else if (this.currentChapterIdx + 1 < chapters.length) {
        this.currentChapterIdx++;
        this.currentPageIdx = 0;
      }
    } else {
      if (this.currentPageIdx - step >= 0) {
        this.currentPageIdx -= step;
      } else if (this.currentChapterIdx - 1 >= 0) {
        this.currentChapterIdx--;
        const prevCh = chapters[this.currentChapterIdx];
        this.currentPageIdx = Math.max(0, prevCh.pages.length - (prevCh.pages.length % step === 0 ? step : prevCh.pages.length % step));
      }
    }
    this.renderPages();
  }

  private startFocusedMasteryQuiz(): void {
    const resources = this.registry.get('resources') as ResourceState | undefined;
    const skills = this.registry.get('skills') as SkillState | undefined;
    
    const woodCount = resources?.wood ?? 0;
    const oreCount = resources?.ore ?? 0;
    const worldScene = this.scene.get('WorldScene') as any;
    const goldCount = worldScene.gold ?? 0;
    
    if (woodCount < 5 || oreCount < 5 || goldCount < 20) {
      this.showMessage('Needs 5 Wood, 5 Ore, and 20 Gold.');
      return;
    }
    
    if (resources) {
      resources.wood -= 5;
      resources.ore -= 5;
      saveResources(resources);
      worldScene.events.emit(Events.RESOURCES_CHANGED);
    }
    worldScene.gold -= 20;
    worldScene.events.emit(Events.HUD_UPDATE_MINDCOINS, worldScene.gold);
    
    const subjects = ['maths', 'science', 'english', 'history'];
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    
    const raw = this.registry.get('questions') as any;
    const arr = Array.isArray(raw) ? raw : raw?.questions ?? [];
    const filtered = arr.filter((q: any) => q.subject.toLowerCase() === sub);
    const q = filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : arr[Math.floor(Math.random() * arr.length)];
    
    if (q) {
      const modal = document.getElementById('study-hall-modal');
      if (modal) modal.style.display = 'none';
      
      this.events.once(Events.QUIZ_CORRECT, () => {
        this.events.off(Events.QUIZ_WRONG);
        this.events.off(Events.QUIZ_TIMEOUT);
        this.scene.resume('WorldScene');
        this.scene.stop('QuizScene');
        
        if (skills) {
          const skillId = sub === 'maths' ? 'mining' : (sub === 'english' ? 'woodcutting' : 'combat');
          addSkillXp(skills, skillId, 50);
          saveSkills(skills);
          worldScene.events.emit(Events.SKILLS_CHANGED);
        }
        this.showMessage('★ Correct! Mastery Upgraded (+50 XP)! ★');
      });
      
      const onWrong = () => {
        this.events.off(Events.QUIZ_CORRECT);
        this.scene.resume('WorldScene');
        this.scene.stop('QuizScene');
        
        if (skills) {
          const skillId = sub === 'maths' ? 'mining' : (sub === 'english' ? 'woodcutting' : 'combat');
          addSkillXp(skills, skillId, 10);
          saveSkills(skills);
          worldScene.events.emit(Events.SKILLS_CHANGED);
        }
        this.showMessage('Incorrect. Awarded +10 Mastery XP.');
      };
      
      this.events.once(Events.QUIZ_WRONG, onWrong);
      this.events.once(Events.QUIZ_TIMEOUT, onWrong);
      
      this.scene.launch('QuizScene', { question: q, returnTo: 'HUDScene' });
      this.scene.pause('WorldScene');
    }
  }

  private openLocker(): void {
    const modal = document.getElementById('library-locker-modal');
    if (modal) {
      modal.style.display = 'block';
      this.refreshLockerUI();
    }
  }

  private refreshLockerUI(): void {
    const res = loadResources();
    const locker = loadLocker();
    
    const carryWood = document.getElementById('locker-carry-wood');
    const vaultWood = document.getElementById('locker-vault-wood');
    const carryOre = document.getElementById('locker-carry-ore');
    const vaultOre = document.getElementById('locker-vault-ore');
    
    if (carryWood) carryWood.innerText = String(res.wood);
    if (vaultWood) vaultWood.innerText = String(locker.wood);
    if (carryOre) carryOre.innerText = String(res.ore);
    if (vaultOre) vaultOre.innerText = String(locker.ore);
  }

  private transferLocker(kind: 'wood' | 'ore', amount: number): void {
    const res = loadResources();
    const locker = loadLocker();
    const worldScene = this.scene.get('WorldScene') as any;
    
    if (amount > 0) {
      // Deposit
      const toTransfer = Math.min(amount, res[kind]);
      if (toTransfer > 0) {
        res[kind] -= toTransfer;
        locker[kind] += toTransfer;
        saveResources(res);
        saveLocker(locker);
        this.registry.set('resources', res);
        if (worldScene) worldScene.events.emit(Events.RESOURCES_CHANGED);
        this.refreshLockerUI();
      }
    } else if (amount < 0) {
      // Withdraw
      const toTransfer = Math.min(Math.abs(amount), locker[kind]);
      if (toTransfer > 0) {
        res[kind] += toTransfer;
        locker[kind] -= toTransfer;
        saveResources(res);
        saveLocker(locker);
        this.registry.set('resources', res);
        if (worldScene) worldScene.events.emit(Events.RESOURCES_CHANGED);
        this.refreshLockerUI();
      }
    }
  }
}
