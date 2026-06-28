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

  // Enemy sprite (placeholder rectangle)
  private enemySprite!: Phaser.GameObjects.Rectangle;
  private enemyLabel!: Phaser.GameObjects.Text;

  // Player sprite (placeholder)
  private playerSprite!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'CombatScene', active: false });
  }

  init(combatData: CombatData): void {
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

    // Semi-transparent battle background
    this.add.rectangle(0, 0, width, height, 0x0f0a1f, 0.95).setOrigin(0, 0).setDepth(0);

    // Battle arena bg (gradient-style layered rects)
    this.add.rectangle(cx, height * 0.35, width, height * 0.5, 0x1e1040).setDepth(1);
    this.add.rectangle(cx, height * 0.75, width, height * 0.5, 0x0d0821).setDepth(1);

    // ---- Enemy area ----
    this.enemySprite = this.add.rectangle(cx, 160, 72, 72, 0xdc2626).setDepth(3);
    this.enemyLabel = this.add.text(cx, 200, this.data_.enemy.label, {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fca5a5',
    }).setOrigin(0.5).setDepth(4);

    // Enemy HP bar
    this.add.rectangle(cx, 230, 200, 16, 0x374151).setDepth(3);
    this.enemyHpBar = this.add.graphics().setDepth(4);
    this.enemyHpText = this.add.text(cx, 230, '', {
      fontSize: '11px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(5);

    // Subject badge
    this.add.text(cx, 250, `Subject: ${this.data_.enemy.subject.toUpperCase()} | Tier ${this.data_.enemy.tier}`, {
      fontSize: '11px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#a78bfa',
    }).setOrigin(0.5).setDepth(4);

    // ---- Player area ----
    this.playerSprite = this.add.rectangle(cx, height - 300, 56, 56, 0x4f46e5).setDepth(3);

    // Player HP bar
    this.add.rectangle(cx, height - 245, 200, 16, 0x374151).setDepth(3);
    this.playerHpBar = this.add.graphics().setDepth(4);
    this.playerHpText = this.add.text(cx, height - 245, '', {
      fontSize: '11px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(5);

    // ---- Streak counter ----
    this.streakText = this.add.text(width - 12, 12, '', {
      fontSize: '13px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
      align: 'right',
    }).setOrigin(1, 0).setDepth(10);

    // ---- Turn indicator ----
    this.turnText = this.add.text(cx, height - 220, 'YOUR TURN', {
      fontSize: '13px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#4ade80',
    }).setOrigin(0.5).setDepth(10);

    // ---- Message area ----
    this.messageText = this.add.text(cx, height - 195, '', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#e5e7eb',
      align: 'center',
      wordWrap: { width: width - 32 },
    }).setOrigin(0.5).setDepth(10);

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

      const bg = this.add.rectangle(bx, by, btnW, btnH, 0x1e1b4b).setDepth(10)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x3730a3))
        .on('pointerout', () => bg.setFillStyle(0x1e1b4b))
        .on('pointerdown', () => this.useAbility(ability.id));

      // Saffron border
      const border = this.add.graphics().setDepth(10);
      border.lineStyle(2, 0xf59e0b, 1);
      border.strokeRect(bx - btnW / 2, by - btnH / 2, btnW, btnH);

      const nameText = this.add.text(bx, by - 8, ability.name, {
        fontSize: '13px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#e9d5ff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);

      const descText = this.add.text(bx, by + 10, ability.desc, {
        fontSize: '10px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#9ca3af',
      }).setOrigin(0.5).setDepth(11);

      this.abilityBtns.push(this.add.container(0, 0, [bg, border, nameText, descText]).setDepth(10));
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

    // Shake player sprite
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
    const barW = 200;

    // Enemy HP bar
    this.enemyHpBar.clear();
    const enemyPct = this.enemyHp / this.enemyMaxHp;
    const enemyColor = enemyPct > 0.5 ? 0x22c55e : enemyPct > 0.25 ? 0xeab308 : 0xdc2626;
    this.enemyHpBar.fillStyle(enemyColor, 1);
    this.enemyHpBar.fillRect(cx - barW / 2, 222, barW * enemyPct, 16);
    this.enemyHpText.setText(`${this.enemyHp} / ${this.enemyMaxHp}`);

    // Player HP bar
    this.playerHpBar.clear();
    const { height } = this.scale;
    const playerPct = this.playerHp / this.playerMaxHp;
    const playerColor = playerPct > 0.5 ? 0x22c55e : playerPct > 0.25 ? 0xeab308 : 0xdc2626;
    this.playerHpBar.fillStyle(playerColor, 1);
    this.playerHpBar.fillRect(cx - barW / 2, height - 253, barW * playerPct, 16);
    this.playerHpText.setText(`${this.playerHp} / ${this.playerMaxHp}`);
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

    const resultMsg = won
      ? `Victory! +${xpGained} XP | +${mindcoins} MindCoins`
      : 'Defeated! Try again when you have recovered.';

    this.showMessage(resultMsg, won ? '#4ade80' : '#f87171');

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
