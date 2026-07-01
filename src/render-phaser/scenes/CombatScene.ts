/**
 * CombatScene - BharatVerse MindGains Combat
 *
 * The Core Innovation: every ability cast triggers a quiz question.
 * Correct = full power. Wrong = 40% power. Timeout = ability fails.
 *
 * Flow:
 *  1. Player presses ability button
 *  2. QuizScene launches as overlay (pauses this scene)
 *  3. QuizScene emits QUIZ_CORRECT / QUIZ_WRONG / QUIZ_TIMEOUT
 *  4. CombatScene resumes and resolves ability at appropriate power level
 *  5. On enemy/player death -> emit COMBAT_END -> WorldScene resumes
 */

import { Scene } from 'phaser';
import { Events } from '../index';
import type { Question } from '../../sim/content/questions';
import { compositeLpc, randomConfig, lpcReady, type LpcConfig } from '../lpc_composite';

// LPC 13-wide sheet: idle frame (col 0) of the up / down walk rows.
const LPC_UP_IDLE = 8 * 13;    // 104 — facing away (player, lower, faces the enemy)
const LPC_DOWN_IDLE = 10 * 13; // 130 — facing us (enemy, upper)

/** Stable numeric seed from an enemy id (string or number). */
function idSeed(id: string | number): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface CombatData {
  enemy: {
    id: string;
    label: string;
    subject: string;
    tier: number;
    hp: number;
    maxHp: number;
  };
  playerHp: number;
  playerMaxHp: number;
  playerClass: string;
  questions: Question[];
}

type AbilityResult = 'correct' | 'wrong' | 'timeout';

/** Base damage values per class (scaled by answer quality) */
const BASE_DAMAGE: Record<string, number> = {
  arjuna: 28,
  mage: 42,
  warrior: 22,
  healer: 15,
  scholar: 20,
  bard: 18,
};

const HEAL_AMOUNT = 20;

export class CombatScene extends Scene {
  private data_!: CombatData;

  // State
  private playerHp = 100;
  private playerMaxHp = 100;
  private enemyHp = 100;
  private enemyMaxHp = 100;
  private playerTurn = true;
  private awaitingQuiz = false;
  private currentAbility = '';
  private correctStreak = 0;
  private turnCount = 0;

  // UI elements
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpText!: Phaser.GameObjects.Text;
  private playerHpText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private abilityBtns: Phaser.GameObjects.Container[] = [];
  private streakText!: Phaser.GameObjects.Text;

  // Combatant sprites (Tiny Swords units)
  private enemySprite!: Phaser.GameObjects.Sprite;
  private enemyLabel!: Phaser.GameObjects.Text;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private enemyBaseTint = 0xffffff; // restored after a hit-flash (keeps the mob's red)

  constructor() {
    super({ key: 'CombatScene', active: false });
  }

  init(combatData: CombatData): void {
    // Normalize questions array if wrapped in a JSON object
    if (combatData.questions && (combatData.questions as any).questions) {
      combatData.questions = (combatData.questions as any).questions;
    }
    this.data_ = combatData;
    this.playerHp = combatData.playerHp;
    this.playerMaxHp = combatData.playerMaxHp;
    this.enemyHp = combatData.enemy.hp;
    this.enemyMaxHp = combatData.enemy.maxHp;
    this.playerTurn = true;
    this.correctStreak = 0;
    this.turnCount = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ---- Battlefield backdrop: dusk sky gradient over a Tiny Swords grass field.
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x3b2a63, 0x3b2a63, 0x1a3a24, 0x1a3a24, 1);
    bg.fillRect(0, 0, width, height);
    const groundTop = Math.round(height * 0.50);
    if (this.textures.exists('ts-tilemap-grass')) {
      this.add.tileSprite(0, groundTop, width, height - groundTop, 'ts-tilemap-grass', 10)
        .setOrigin(0, 0).setDepth(1);
    } else {
      this.add.rectangle(cx, (groundTop + height) / 2, width, height - groundTop, 0x2f6b34).setDepth(1);
    }

    const enemyY = Math.round(height * 0.34);
    const playerY = Math.round(height * 0.55); // sits above the player HP bar
    // Shadows sit at the feet: LPC sprites are feet-anchored (origin y≈0.92),
    // so the disc goes just under `enemyY`/`playerY` (not the old TS +36).
    const shadowDy = lpcReady(this) ? 4 : 36;
    this.add.ellipse(cx, enemyY + shadowDy, 96, 26, 0x000000, 0.30).setDepth(2);
    this.add.ellipse(cx, playerY + shadowDy, 96, 26, 0x000000, 0.30).setDepth(2);

    // ---- Enemy header (name + HP + subject) at the top ----
    this.enemyLabel = this.add.text(cx, 34, this.data_.enemy.label, {
      fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#fecaca',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);
    this.add.rectangle(cx, 58, 224, 16, 0x2a1520).setStrokeStyle(2, 0x000000, 0.5).setDepth(10);
    this.enemyHpBar = this.add.graphics().setDepth(11);
    this.enemyHpText = this.add.text(cx, 58, '', {
      fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff',
    }).setOrigin(0.5).setDepth(12);
    this.add.text(cx, 80, `Subject: ${this.data_.enemy.subject.toUpperCase()}  ·  Tier ${this.data_.enemy.tier}`, {
      fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#c4b5fd',
    }).setOrigin(0.5).setDepth(11);

    // ---- Combatant sprites: LPC characters (match the overworld art), with a
    // Tiny Swords fallback if the composited sheets aren't available. ----
    if (lpcReady(this)) {
      // Enemy faces us (down); player faces away toward the enemy (up). A red
      // tint marks the hostile mob until dedicated monster art lands.
      this.enemySprite = this.makeLpcCombatant(cx, enemyY, this.enemyLpcKey(), LPC_DOWN_IDLE, 1.7, 0xff9a9a).setDepth(3);
      this.enemyBaseTint = 0xff9a9a;
      this.playerSprite = this.makeLpcCombatant(cx, playerY, this.playerLpcKey(), LPC_UP_IDLE, 1.8).setDepth(4);
    } else {
      this.enemySprite = this.makeCombatant(cx, enemyY, this.enemyTexKey(), true, 1.2).setDepth(3);
      this.playerSprite = this.makeCombatant(cx, playerY, this.playerTexKey(), false, 1.45).setDepth(4);
    }

    // ---- Player HP bar (above the ability tray) ----
    this.add.rectangle(cx, height - 245, 224, 16, 0x14231a).setStrokeStyle(2, 0x000000, 0.5).setDepth(10);
    this.playerHpBar = this.add.graphics().setDepth(11);
    this.playerHpText = this.add.text(cx, height - 245, '', {
      fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff',
    }).setOrigin(0.5).setDepth(12);

    // ---- Streak counter ----
    this.streakText = this.add.text(width - 12, 12, '', {
      fontSize: '13px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
      align: 'right',
    }).setOrigin(1, 0).setDepth(10);

    // ---- Turn indicator ----
    this.turnText = this.add.text(cx, height - 220, 'YOUR TURN', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#86efac',
      fontStyle: 'bold',
      stroke: '#0b160b',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(12);

    // ---- Message area ----
    this.messageText = this.add.text(cx, height - 195, '', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f8fafc',
      align: 'center',
      stroke: '#0b160b',
      strokeThickness: 4,
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5).setDepth(12);

    // ---- Ability buttons ----
    this.buildAbilityButtons();

    // ---- Listen for quiz results ----
    this.events.on(Events.QUIZ_CORRECT, this.onQuizCorrect, this);
    this.events.on(Events.QUIZ_WRONG, this.onQuizWrong, this);
    this.events.on(Events.QUIZ_TIMEOUT, this.onQuizTimeout, this);

    // Initial render
    this.refreshHPBars();
  }

  private buildAbilityButtons(): void {
    const { width, height } = this.scale;
    const abilities = this.getAbilitiesForClass(this.data_.playerClass);
    const btnW = (width - 24) / 2;
    const btnH = 52;
    const startY = height - 140;

    abilities.forEach((ability, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 8 + col * (btnW + 8) + btnW / 2;
      const by = startY + row * (btnH + 8);

      // Wooden ability card with a saffron border (matches the world's palette).
      const bg = this.add.rectangle(bx, by, btnW, btnH, 0x3b2a1e).setDepth(10)
        .setStrokeStyle(2, 0xf59e0b, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x5a4230))
        .on('pointerout', () => bg.setFillStyle(0x3b2a1e))
        .on('pointerdown', () => this.useAbility(ability.id));

      const nameText = this.add.text(bx, by - 8, ability.name, {
        fontSize: '13px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#fde68a',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);

      const descText = this.add.text(bx, by + 10, ability.desc, {
        fontSize: '10px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#d6c7a8',
      }).setOrigin(0.5).setDepth(11);

      this.abilityBtns.push(this.add.container(0, 0, [bg, nameText, descText]).setDepth(10));
    });
  }

  private getAbilitiesForClass(cls: string): { id: string; name: string; desc: string }[] {
    const classes: Record<string, { id: string; name: string; desc: string }[]> = {
      arjuna: [
        { id: 'arrow_shot', name: 'Ganit Arrow', desc: 'Maths question - full damage on hit' },
        { id: 'rapid_fire', name: 'Rapid Fire', desc: '3 quick questions, 3 shots' },
        { id: 'heal_focus', name: 'Focus Breath', desc: 'Heal 20 HP (no question)' },
        { id: 'power_shot', name: 'Brahmastra', desc: 'Science question - massive damage' },
      ],
      mage: [
        { id: 'fireball', name: 'Zero Point Blast', desc: 'Physics question - high damage' },
        { id: 'ice_bolt', name: 'Absolute Zero', desc: 'Chemistry question - freeze chance' },
        { id: 'mana_shield', name: 'Energy Shield', desc: 'Reduce next hit (no question)' },
        { id: 'meteor', name: 'Meteor Strike', desc: 'Hard Maths - massive AoE' },
      ],
      warrior: [
        { id: 'slash', name: 'Jai Hind Strike', desc: 'Civics question - solid damage' },
        { id: 'rally', name: 'Rally Cry', desc: 'Buff self - History question' },
        { id: 'block', name: 'Iron Shield', desc: 'Block next attack (no question)' },
        { id: 'cleave', name: 'Desh Bhakt Cleave', desc: 'Current Affairs - sweep damage' },
      ],
    };
    return classes[cls] ?? classes.arjuna;
  }

  private useAbility(abilityId: string): void {
    if (!this.playerTurn || this.awaitingQuiz) return;

    // Abilities that don't need a question
    if (abilityId === 'heal_focus' || abilityId === 'mana_shield' || abilityId === 'block') {
      this.resolveAbility(abilityId, 'correct'); // treat as correct (free action)
      return;
    }

    this.currentAbility = abilityId;
    this.awaitingQuiz = true;
    this.setAbilityButtonsEnabled(false);

    // Pick a question matching the enemy's subject and tier
    const filtered = (this.data_.questions as Question[]).filter(
      q => q.subject === this.data_.enemy.subject && q.tier <= this.data_.enemy.tier + 1,
    );
    const question = filtered.length
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : (this.data_.questions as Question[])[Math.floor(Math.random() * this.data_.questions.length)];

    // Launch quiz overlay (doesn't pause this scene - uses event callbacks)
    this.scene.launch('QuizScene', { question, abilityId });
  }

  private onQuizCorrect(): void {
    this.awaitingQuiz = false;
    this.correctStreak++;
    this.resolveAbility(this.currentAbility, 'correct');
    this.scene.stop('QuizScene');
  }

  private onQuizWrong(): void {
    this.awaitingQuiz = false;
    this.correctStreak = 0;
    this.resolveAbility(this.currentAbility, 'wrong');
    this.scene.stop('QuizScene');
  }

  private onQuizTimeout(): void {
    this.awaitingQuiz = false;
    this.correctStreak = 0;
    this.resolveAbility(this.currentAbility, 'timeout');
    this.scene.stop('QuizScene');
  }

  private resolveAbility(abilityId: string, result: AbilityResult): void {
    const base = BASE_DAMAGE[this.data_.playerClass] ?? 20;
    const streakMult = 1 + Math.min(this.correctStreak * 0.1, 0.5); // up to +50% at 5-streak

    let damage = 0;
    let heal = 0;
    let message = '';

    switch (result) {
      case 'correct':
        damage = Math.round(base * streakMult);
        message = this.correctStreak >= 3
          ? `Combo x${this.correctStreak}! Critical hit for ${damage} damage!`
          : `Correct! ${damage} damage dealt!`;
        break;
      case 'wrong':
        damage = Math.round(base * 0.4);
        message = `Wrong answer. Weakened hit - ${damage} damage.`;
        break;
      case 'timeout':
        message = 'Time ran out! Ability failed!';
        damage = 0;
        break;
    }

    // Special ability overrides
    if (abilityId === 'heal_focus' || abilityId === 'mana_shield' || abilityId === 'block') {
      heal = HEAL_AMOUNT;
      damage = 0;
      message = `Healed for ${HEAL_AMOUNT} HP.`;
    }

    // Apply damage
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);

    // Hit feedback on the enemy
    if (damage > 0) {
      this.enemySprite.setTint(0xff8888);
      this.time.delayedCall(90, () => this.enemySprite.setTint(this.enemyBaseTint));
      this.tweens.add({ targets: this.enemySprite, x: this.enemySprite.x + 10, duration: 55, yoyo: true, repeat: 2 });
      this.floatText(this.enemySprite.x, this.enemySprite.y - 56, `-${damage}`, result === 'correct' && this.correctStreak >= 3 ? '#fde047' : '#fca5a5');
      this.cameras.main.shake(120, 0.006);
    } else if (heal > 0) {
      this.playerSprite.setTint(0x86efac);
      this.time.delayedCall(220, () => this.playerSprite.clearTint());
      this.floatText(this.playerSprite.x, this.playerSprite.y - 80, `+${heal}`, '#86efac');
    }

    this.showMessage(message, result === 'correct' ? '#4ade80' : result === 'timeout' ? '#f87171' : '#fbbf24');
    this.refreshHPBars();
    this.updateStreakDisplay();

    if (this.enemyHp <= 0) {
      this.time.delayedCall(800, () => this.endCombat(true));
      return;
    }

    // Enemy turn after short delay
    this.playerTurn = false;
    this.turnText.setText('ENEMY TURN').setColor('#f87171');
    this.time.delayedCall(1200, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    const dmg = Math.floor(8 + Math.random() * 14);
    this.playerHp = Math.max(0, this.playerHp - dmg);
    this.showMessage(`${this.data_.enemy.label} hits you for ${dmg} damage!`, '#f87171');
    this.floatText(this.playerSprite.x, this.playerSprite.y - 84, `-${dmg}`, '#fca5a5');

    // Enemy lunges, player flinches red
    this.tweens.add({ targets: this.enemySprite, y: this.enemySprite.y + 16, duration: 110, yoyo: true, ease: 'Quad.out' });
    this.playerSprite.setTint(0xff6b6b);
    this.time.delayedCall(120, () => this.playerSprite.clearTint());
    this.tweens.add({
      targets: this.playerSprite,
      x: this.playerSprite.x + 8,
      duration: 60,
      yoyo: true,
      repeat: 3,
    });

    this.refreshHPBars();

    if (this.playerHp <= 0) {
      this.time.delayedCall(800, () => this.endCombat(false));
      return;
    }

    this.time.delayedCall(600, () => {
      this.playerTurn = true;
      this.turnText.setText('YOUR TURN').setColor('#4ade80');
      this.setAbilityButtonsEnabled(true);
    });
  }

  private refreshHPBars(): void {
    const cx = this.scale.width / 2;
    const barW = 224;

    this.enemyHpBar.clear();
    const enemyPct = this.enemyHp / this.enemyMaxHp;
    const enemyColor = enemyPct > 0.5 ? 0x22c55e : enemyPct > 0.25 ? 0xeab308 : 0xdc2626;
    this.enemyHpBar.fillStyle(enemyColor, 1);
    this.enemyHpBar.fillRect(cx - barW / 2, 50, barW * enemyPct, 16);
    this.enemyHpText.setText(`${this.enemyHp} / ${this.enemyMaxHp}`);

    this.playerHpBar.clear();
    const { height } = this.scale;
    const playerPct = this.playerHp / this.playerMaxHp;
    const playerColor = playerPct > 0.5 ? 0x22c55e : playerPct > 0.25 ? 0xeab308 : 0xdc2626;
    this.playerHpBar.fillStyle(playerColor, 1);
    this.playerHpBar.fillRect(cx - barW / 2, height - 253, barW * playerPct, 16);
    this.playerHpText.setText(`${this.playerHp} / ${this.playerMaxHp}`);
  }

  /** Create an LPC combatant: a static facing frame with a gentle idle bob. */
  private makeLpcCombatant(x: number, y: number, texKey: string, frame: number, scale: number, tint?: number): Phaser.GameObjects.Sprite {
    const s = this.add.sprite(x, y, texKey, frame).setOrigin(0.5, 0.92).setScale(scale);
    if (tint !== undefined) s.setTint(tint);
    this.tweens.add({ targets: s, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return s;
  }

  /** The player's own composited look (creator choices + equipped cosmetic hat). */
  private playerLpcKey(): string {
    const cfg = {
      ...(this.registry.get('customization') as Partial<LpcConfig> | undefined ?? {}),
      hat: (this.registry.get('equippedHat') as number | undefined) ?? 0,
    };
    return compositeLpc(this, cfg);
  }

  /** A stable-random LPC look for the enemy (red-tinted until monster art lands). */
  private enemyLpcKey(): string {
    return compositeLpc(this, randomConfig(idSeed(this.data_.enemy.id)));
  }

  /** Create a combatant as a Tiny Swords unit sprite (idle anim), feet-anchored. */
  private makeCombatant(x: number, y: number, texKey: string, flip: boolean, scale = 1.2): Phaser.GameObjects.Sprite {
    const s = this.add.sprite(x, y, this.textures.exists(texKey) ? texKey : '__DEFAULT')
      .setOrigin(0.5, 0.82).setScale(scale).setFlipX(flip);
    if (this.anims.exists(texKey)) s.play(texKey, true);
    else s.setTint(flip ? 0xdc2626 : 0x4f46e5); // degraded fallback if art missing
    return s;
  }

  /** Floating combat number that rises and fades above a point. */
  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '22px', fontFamily: '"Noto Sans", sans-serif', color,
      fontStyle: 'bold', stroke: '#0b160b', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 46, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  /** Tiny Swords idle texture for the enemy (a red unit). */
  private enemyTexKey(): string {
    const units = ['warrior', 'archer', 'lancer', 'pawn'];
    let h = 0;
    for (const ch of String(this.data_.enemy.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `ts-red-${units[h % units.length]}-idle`;
  }

  /** Tiny Swords idle texture for the player's class (a blue unit). */
  private playerTexKey(): string {
    const cls = this.data_.playerClass;
    const unit = cls === 'vaishya' || cls === 'hunter' || cls === 'rogue' ? 'archer'
      : cls === 'shilpi' || cls === 'vaidya' ? 'lancer' : 'warrior';
    return `ts-blue-${unit}-idle`;
  }

  private showMessage(msg: string, color = '#e5e7eb'): void {
    this.messageText.setText(msg).setColor(color);
    this.tweens.add({
      targets: this.messageText,
      alpha: { from: 0, to: 1 },
      duration: 200,
    });
  }

  private updateStreakDisplay(): void {
    this.streakText.setText(
      this.correctStreak >= 2 ? `Streak ${this.correctStreak}x` : '',
    );
  }

  private setAbilityButtonsEnabled(enabled: boolean): void {
    // Containers don't have setAlpha for children directly - use alpha on container
    for (const btn of this.abilityBtns) {
      btn.setAlpha(enabled ? 1 : 0.4);
    }
  }

  private endCombat(won: boolean): void {
    const xpGained = won ? Math.round(20 + this.data_.enemy.tier * 15 + this.correctStreak * 5) : 5;
    const mindcoins = won ? Math.round(10 + this.data_.enemy.tier * 8 + this.correctStreak * 3) : 0;

    const { width, height } = this.scale;
    const cx = width / 2;

    // Defeated enemy fades and drops on a win.
    if (won) {
      this.tweens.add({ targets: this.enemySprite, alpha: 0, y: this.enemySprite.y + 18, angle: 20, duration: 500 });
    } else {
      this.cameras.main.flash(300, 120, 0, 0);
    }

    // Result banner
    this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.55).setDepth(30);
    const banner = this.add.text(cx, height / 2 - 30, won ? 'VICTORY!' : 'DEFEATED', {
      fontSize: '44px', fontFamily: '"Noto Sans", sans-serif',
      color: won ? '#fde047' : '#f87171', fontStyle: 'bold',
      stroke: '#0b160b', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(31).setScale(0.3);
    this.tweens.add({ targets: banner, scale: 1, duration: 400, ease: 'Back.out' });
    this.add.text(cx, height / 2 + 24, won ? `+${xpGained} XP    ·    +${mindcoins} Gold` : 'Recover, then try again.', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif',
      color: '#f8fafc', stroke: '#0b160b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(31);

    this.time.delayedCall(1800, () => {
      // Notify WorldScene
      const worldScene = this.scene.get('WorldScene');
      worldScene.events.emit(Events.COMBAT_END, {
        won,
        remainingHp: this.playerHp,
        xpGained,
        mindcoins,
        enemyId: this.data_.enemy.id,
      });

      this.scene.stop('CombatScene');
    });
  }
}
