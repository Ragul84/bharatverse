/**
 * QuizScene - MindGains Question Overlay
 *
 * Runs ON TOP of CombatScene as a transparent overlay.
 * Shows the question, 4 options, and a countdown timer.
 * Emits QUIZ_CORRECT, QUIZ_WRONG, or QUIZ_TIMEOUT back to CombatScene.
 *
 * Design:
 *  - 5-second timer (ticking sound and visual urgency)
 *  - Correct = green flash + particles
 *  - Wrong = red flash + explanation shown briefly
 *  - Timeout = screen shake
 */

import { Scene } from 'phaser';
import { Events } from '../index';
import type { Question } from '../../sim/content/questions';

/** Timer duration in seconds */
const TIMER_SECONDS = 8;

interface QuizData {
  question: Question;
  abilityId: string;
  /** Scene key to emit the result back to (default CombatScene). */
  returnTo?: string;
}

export class QuizScene extends Scene {
  private timerSeconds = TIMER_SECONDS;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerBar!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private answered = false;

  private optionBtns: {
    bg: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
    key: string;
  }[] = [];

  private data_!: QuizData;

  constructor() {
    super({ key: 'QuizScene', active: false });
  }

  init(quizData: QuizData): void {
    this.data_ = quizData;
    this.timerSeconds = TIMER_SECONDS;
    this.answered = false;
    this.optionBtns = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ---- Dark backdrop ----
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0).setDepth(20);

    // ---- Question card ----
    const cardH = height * 0.7;
    const cardY = height / 2;
    const cardBg = this.add.rectangle(cx, cardY, width - 24, cardH, 0x1e1b4b).setDepth(21);
    // Saffron border
    const border = this.add.graphics().setDepth(22);
    border.lineStyle(2, 0xf59e0b, 1);
    border.strokeRect(cx - (width - 24) / 2, cardY - cardH / 2, width - 24, cardH);

    // ---- Timer bar ----
    const timerBarY = cardY - cardH / 2 + 8;
    this.add.rectangle(cx, timerBarY, width - 32, 8, 0x374151).setDepth(22);
    this.timerBar = this.add.graphics().setDepth(23);

    this.timerText = this.add.text(cx, timerBarY + 12, `${TIMER_SECONDS}`, {
      fontSize: '13px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
    }).setOrigin(0.5).setDepth(23);

    // ---- Subject badge ----
    this.add.text(cx, timerBarY + 28, `[ ${this.data_.question.subject.toUpperCase()} | Class ${this.data_.question.ncert_class ?? '?'} ]`, {
      fontSize: '11px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#a78bfa',
    }).setOrigin(0.5).setDepth(23);

    // ---- Question text ----
    this.add.text(cx, cardY - cardH / 2 + 80, this.data_.question.question, {
      fontSize: '16px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f3f4f6',
      align: 'center',
      wordWrap: { width: width - 56 },
    }).setOrigin(0.5, 0).setDepth(23);

    // ---- Options ----
    const optionKeys = ['a', 'b', 'c', 'd'] as const;
    const optionColors = [0xa855f7, 0x0891b2, 0xd97706, 0x059669]; // purple, teal, amber, green
    const optionY = cardY + 20;
    const optionW = (width - 32) / 2 - 4;
    const optionH = 54;

    optionKeys.forEach((key, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ox = 12 + col * (optionW + 8) + optionW / 2;
      const oy = optionY + row * (optionH + 8);

      const bg = this.add.rectangle(ox, oy, optionW, optionH, optionColors[i], 0.9)
        .setDepth(23)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setAlpha(1))
        .on('pointerout', () => bg.setAlpha(0.9))
        .on('pointerdown', () => this.selectOption(key));

      const label = this.data_.question.options[key];
      const text = this.add.text(ox, oy, `${key.toUpperCase()}) ${label}`, {
        fontSize: '13px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: optionW - 12 },
      }).setOrigin(0.5).setDepth(24);

      this.optionBtns.push({ bg, text, key });
    });

    // ---- Start countdown ----
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: TIMER_SECONDS - 1,
      callback: this.tickTimer,
      callbackScope: this,
    });

    this.refreshTimerBar(1);
  }

  private tickTimer(): void {
    this.timerSeconds--;
    this.timerText.setText(`${this.timerSeconds}`);
    this.refreshTimerBar(this.timerSeconds / TIMER_SECONDS);

    // Urgency: turn red when <= 3 seconds
    if (this.timerSeconds <= 3) {
      this.timerText.setColor('#f87171');
      this.cameras.main.shake(50, 0.003);
    }

    if (this.timerSeconds <= 0) {
      this.onTimeout();
    }
  }

  private refreshTimerBar(fraction: number): void {
    const { width } = this.scale;
    const barW = width - 32;
    const { height } = this.scale;
    const timerBarY = height / 2 - height * 0.35 + 8;

    this.timerBar.clear();
    const color = fraction > 0.5 ? 0x22c55e : fraction > 0.25 ? 0xeab308 : 0xdc2626;
    this.timerBar.fillStyle(color, 1);
    this.timerBar.fillRect(16, timerBarY - 4, barW * fraction, 8);
  }

  private selectOption(key: string): void {
    if (this.answered) return;
    this.answered = true;
    this.timerEvent?.destroy();

    const correct = this.data_.question.correct === key;

    // Highlight selected option
    for (const btn of this.optionBtns) {
      if (btn.key === key) {
        btn.bg.setFillStyle(correct ? 0x16a34a : 0xdc2626);
      } else if (btn.key === this.data_.question.correct) {
        btn.bg.setFillStyle(0x16a34a); // always show the correct answer
      } else {
        btn.bg.setAlpha(0.3);
      }
      // Disable further clicks
      btn.bg.disableInteractive();
    }

    if (correct) {
      this.cameras.main.flash(150, 0, 200, 0); // green flash
    } else {
      this.cameras.main.shake(200, 0.008); // shake on wrong
    }

    // Show explanation briefly
    if (this.data_.question.explanation) {
      const { width, height } = this.scale;
      this.add.text(width / 2, height / 2 + height * 0.28, this.data_.question.explanation, {
        fontSize: '12px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#d1fae5',
        align: 'center',
        wordWrap: { width: width - 40 },
        backgroundColor: '#052e16',
        padding: { x: 8, y: 6 },
      }).setOrigin(0.5).setDepth(25);
    }

    this.time.delayedCall(1200, () => {
      const target = this.scene.get(this.data_.returnTo ?? 'CombatScene');
      target.events.emit(correct ? Events.QUIZ_CORRECT : Events.QUIZ_WRONG);
    });
  }

  private onTimeout(): void {
    if (this.answered) return;
    this.answered = true;
    this.timerEvent?.destroy();
    this.cameras.main.shake(300, 0.012);

    for (const btn of this.optionBtns) {
      btn.bg.disableInteractive().setAlpha(0.3);
    }

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 + height * 0.25, 'TIME UP!', {
      fontSize: '28px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f87171',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);

    this.time.delayedCall(900, () => {
      this.scene.get(this.data_.returnTo ?? 'CombatScene').events.emit(Events.QUIZ_TIMEOUT);
    });
  }
}
