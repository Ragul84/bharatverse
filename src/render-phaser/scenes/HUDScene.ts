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

export class HUDScene extends Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private mindcoinsText!: Phaser.GameObjects.Text;
  private messageQueue: string[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private messageVisible = false;

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
