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
import { optionalAssets } from '../bv_assets';

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

    // Question bank (first batch loaded at boot)
    this.load.json('questions_sample', 'data/questions_sample.json');

    // Optional real-art assets (Kenney CC0). Any that 404 are simply skipped.
    this.load.on('loaderror', () => { /* missing optional asset -> procedural fallback */ });
    for (const a of optionalAssets()) {
      this.load.image(a.key, a.url);
    }

    // Roguelike RPG spritesheet (legacy, kept as fallback)
    this.load.spritesheet('roguelike_sheet', 'assets/tilesets/roguelikeSheet_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,   // sheet has no outer border: 968 = 57 tiles * (16+1) - 1
      spacing: 1,
    });

    // Tiny Swords (Free Pack) - terrain tilemap (576x384, 9 cols x 6 rows, 64x64 each)
    this.load.spritesheet('ts-tilemap-grass', 'assets/tiny-swords/terrain/tilemap_grass.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('ts-tilemap-dirt',  'assets/tiny-swords/terrain/tilemap_dirt.png',  { frameWidth: 64, frameHeight: 64 });

    // Tiny Swords water tile (64x64) + sand tilemap for shores
    this.load.image('ts-water', 'assets/tiny-swords/terrain/water_bg.png');
    this.load.spritesheet('ts-tilemap-sand', 'assets/tiny-swords/terrain/tilemap_sand.png', { frameWidth: 64, frameHeight: 64 });

    // Tiny Swords decorations: bushes are 8-frame 128x128 sheets; rocks are 64x64
    this.load.spritesheet('ts-bush1', 'assets/tiny-swords/decorations/bush1.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('ts-bush2', 'assets/tiny-swords/decorations/bush2.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('ts-bush3', 'assets/tiny-swords/decorations/bush3.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('ts-bush4', 'assets/tiny-swords/decorations/bush4.png', { frameWidth: 128, frameHeight: 128 });
    this.load.image('ts-rock1', 'assets/tiny-swords/decorations/rock1.png');
    this.load.image('ts-rock2', 'assets/tiny-swords/decorations/rock2.png');
    this.load.image('ts-rock3', 'assets/tiny-swords/decorations/rock3.png');
    this.load.image('ts-rock4', 'assets/tiny-swords/decorations/rock4.png');

    // Tiny Swords buildings
    this.load.image('ts-castle',    'assets/tiny-swords/buildings/castle.png');
    this.load.image('ts-house1',    'assets/tiny-swords/buildings/house1.png');
    this.load.image('ts-house2',    'assets/tiny-swords/buildings/house2.png');
    this.load.image('ts-tower',     'assets/tiny-swords/buildings/tower.png');
    this.load.image('ts-barracks',  'assets/tiny-swords/buildings/barracks.png');
    this.load.image('ts-monastery', 'assets/tiny-swords/buildings/monastery.png');

    // Tiny Swords blue (friendly) unit spritesheets - 192x192 per frame
    this.load.spritesheet('ts-blue-warrior-idle', 'assets/tiny-swords/units/blue_warrior_idle.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-warrior-run',  'assets/tiny-swords/units/blue_warrior_run.png',  { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-archer-idle',  'assets/tiny-swords/units/blue_archer_idle.png',  { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-archer-run',   'assets/tiny-swords/units/blue_archer_run.png',   { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-lancer-idle',  'assets/tiny-swords/units/blue_lancer_idle.png',  { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-lancer-run',   'assets/tiny-swords/units/blue_lancer_run.png',   { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-pawn-idle',    'assets/tiny-swords/units/blue_pawn_idle.png',    { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-blue-pawn-run',     'assets/tiny-swords/units/blue_pawn_run.png',     { frameWidth: 192, frameHeight: 192 });

    // Tiny Swords red (hostile) unit spritesheets
    this.load.spritesheet('ts-red-warrior-idle',  'assets/tiny-swords/units/red_warrior_idle.png',  { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-warrior-run',   'assets/tiny-swords/units/red_warrior_run.png',   { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-archer-idle',   'assets/tiny-swords/units/red_archer_idle.png',   { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-archer-run',    'assets/tiny-swords/units/red_archer_run.png',    { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-pawn-idle',     'assets/tiny-swords/units/red_pawn_idle.png',     { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-pawn-run',      'assets/tiny-swords/units/red_pawn_run.png',      { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-lancer-idle',   'assets/tiny-swords/units/red_lancer_idle.png',   { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('ts-red-lancer-run',    'assets/tiny-swords/units/red_lancer_run.png',    { frameWidth: 192, frameHeight: 192 });
  }

  create(): void {
    // Register Tiny Swords animations
    const anims: Array<{ key: string; tex: string; frames: number; fps: number }> = [
      { key: 'ts-blue-warrior-idle', tex: 'ts-blue-warrior-idle', frames: 8, fps: 8  },
      { key: 'ts-blue-warrior-run',  tex: 'ts-blue-warrior-run',  frames: 6, fps: 10 },
      { key: 'ts-blue-archer-idle',  tex: 'ts-blue-archer-idle',  frames: 6, fps: 7  },
      { key: 'ts-blue-archer-run',   tex: 'ts-blue-archer-run',   frames: 4, fps: 10 },
      { key: 'ts-blue-lancer-idle',  tex: 'ts-blue-lancer-idle',  frames: 6, fps: 7  },
      { key: 'ts-blue-lancer-run',   tex: 'ts-blue-lancer-run',   frames: 6, fps: 10 },
      { key: 'ts-blue-pawn-idle',    tex: 'ts-blue-pawn-idle',    frames: 8, fps: 8  },
      { key: 'ts-blue-pawn-run',     tex: 'ts-blue-pawn-run',     frames: 6, fps: 10 },
      { key: 'ts-red-warrior-idle',  tex: 'ts-red-warrior-idle',  frames: 8, fps: 8  },
      { key: 'ts-red-warrior-run',   tex: 'ts-red-warrior-run',   frames: 6, fps: 10 },
      { key: 'ts-red-archer-idle',   tex: 'ts-red-archer-idle',   frames: 6, fps: 7  },
      { key: 'ts-red-archer-run',    tex: 'ts-red-archer-run',    frames: 4, fps: 10 },
      { key: 'ts-red-pawn-idle',     tex: 'ts-red-pawn-idle',     frames: 8, fps: 8  },
      { key: 'ts-red-pawn-run',      tex: 'ts-red-pawn-run',      frames: 6, fps: 10 },
      { key: 'ts-red-lancer-idle',   tex: 'ts-red-lancer-idle',   frames: 6, fps: 7  },
      { key: 'ts-red-lancer-run',    tex: 'ts-red-lancer-run',    frames: 6, fps: 10 },
    ];
    for (const def of anims) {
      if (!this.anims.exists(def.key) && this.textures.exists(def.tex)) {
        this.anims.create({
          key: def.key,
          frames: this.anims.generateFrameNumbers(def.tex, { start: 0, end: def.frames - 1 }),
          frameRate: def.fps,
          repeat: -1,
        });
      }
    }

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
