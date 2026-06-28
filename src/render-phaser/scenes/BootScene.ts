/**
 * BootScene - BharatVerse loading screen
 *
 * Responsibilities:
 *  - Show BharatVerse logo + loading progress bar
 *  - Preload all shared assets (tilesets, spritesheets, audio)
 *  - Transition to WorldScene when done
 */

import { Scene } from 'phaser';
import { Events } from '../index';

export class BootScene extends Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBg!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // --- Loading bar background ---
    this.progressBg = this.add.graphics();
    this.progressBg.fillStyle(0x2d1b69, 1); // deep purple
    this.progressBg.fillRoundedRect(cx - 160, cy + 80, 320, 24, 12);

    // --- Progress fill ---
    this.progressBar = this.add.graphics();

    // --- Title text ---
    this.add.text(cx, cy - 60, 'BharatVerse', {
      fontSize: '42px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f59e0b', // saffron gold
      stroke: '#7c3aed',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 10, 'The MindGains MMO', {
      fontSize: '18px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#a78bfa',
      align: 'center',
    }).setOrigin(0.5);

    this.loadingText = this.add.text(cx, cy + 120, 'Loading...', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#9ca3af',
    }).setOrigin(0.5);

    // --- Load progress callbacks ---
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xf59e0b, 1); // saffron
      this.progressBar.fillRoundedRect(cx - 156, cy + 84, 312 * value, 16, 8);
      this.loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('Enter the Realm...');
    });

    // ---- Asset loading ----
    // Tilemaps (Tiled JSON format)
    // this.load.tilemapTiledJSON('map_indraprastha', 'assets/tilemaps/indraprastha.json');

    // Tilesets
    // this.load.image('tileset_city', 'assets/tilesets/city_india.png');
    // this.load.image('tileset_nature', 'assets/tilesets/nature_india.png');

    // Character spritesheets (placeholder - 48x48 frames, 4 directions x 4 frames)
    // this.load.spritesheet('char_arjuna', 'assets/characters/arjuna_spritesheet.png', { frameWidth: 48, frameHeight: 48 });
    // this.load.spritesheet('char_mage', 'assets/characters/mage_spritesheet.png', { frameWidth: 48, frameHeight: 48 });

    // UI atlas
    // this.load.atlas('ui', 'assets/ui/ui_atlas.png', 'assets/ui/ui_atlas.json');

    // Question bank (first batch loaded at boot)
    this.load.json('questions_sample', 'data/questions_sample.json');

    // Audio
    // this.load.audio('bgm_indraprastha', ['assets/audio/bgm_indraprastha.ogg', 'assets/audio/bgm_indraprastha.mp3']);
    // this.load.audio('sfx_correct', ['assets/audio/correct.ogg']);
    // this.load.audio('sfx_wrong', ['assets/audio/wrong.ogg']);
  }

  create(): void {
    // Cache question bank into registry for all scenes to access
    const questions = this.cache.json.get('questions_sample');
    this.registry.set('questions', questions);
    this.registry.set('mindcoins', 0);
    this.registry.set('playerHp', 100);
    this.registry.set('playerMaxHp', 100);
    this.registry.set('playerXp', 0);
    this.registry.set('playerClass', 'arjuna'); // default, overridden at char select

    // Small delay so player can read the "Enter the Realm" text
    this.time.delayedCall(600, () => {
      this.scene.start('WorldScene');
    });
  }
}
