/**
 * CharacterCreatorScene - pick your hero's look (skin / hair / shirt / pants)
 * with a live animated LPC preview, then enter the world. The choice is saved
 * to the registry + localStorage and drives the player's composited sprite.
 */

import { Scene, GameObjects } from 'phaser';
import {
  compositeLpc, normalizeConfig, randomConfig,
  LPC_SKINS, LPC_HAIRS, LPC_SHIRTS, LPC_PANTS,
  type LpcConfig, type LpcOption,
} from '../lpc_composite';

export class CharacterCreatorScene extends Scene {
  private cfg: LpcConfig = { skin: 0, hair: 0, shirt: 0, pants: 0, hat: 0 };
  private preview!: GameObjects.Sprite;
  private valueTexts: Partial<Record<keyof LpcConfig, GameObjects.Text>> = {};

  constructor() {
    super({ key: 'CharacterCreatorScene', active: false });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.cfg = normalizeConfig(this.registry.get('customization') as Partial<LpcConfig> | undefined);

    this.buildBackdrop(width, height);

    // Soft "character stage" panel so the UI reads cleanly over the scenery.
    this.add.rectangle(cx, height * 0.36, Math.min(width * 0.6, 520), height * 0.46, 0x0b0716, 0.4)
      .setStrokeStyle(2, 0xf59e0b, 0.22).setDepth(-5);

    this.add.text(cx, 38, 'Create Your Hero', {
      fontSize: '26px', fontFamily: '"Noto Sans", sans-serif',
      color: '#fde68a', fontStyle: 'bold', stroke: '#0b160b', strokeThickness: 4,
    }).setOrigin(0.5);

    const py = Math.round(height * 0.24);
    this.add.ellipse(cx, py + 40, 110, 30, 0x000000, 0.3);
    this.preview = this.add.sprite(cx, py, compositeLpc(this, this.cfg))
      .setOrigin(0.5, 0.9).setScale(2.2);

    const rows: { label: string; field: keyof LpcConfig; catalog: LpcOption[] }[] = [
      { label: 'Skin', field: 'skin', catalog: LPC_SKINS },
      { label: 'Hair', field: 'hair', catalog: LPC_HAIRS },
      { label: 'Shirt', field: 'shirt', catalog: LPC_SHIRTS },
      { label: 'Pants', field: 'pants', catalog: LPC_PANTS },
    ];
    let ry = Math.round(height * 0.44);
    for (const row of rows) {
      this.buildRow(cx, ry, row.label, row.field, row.catalog);
      ry += 50;
    }

    this.mkButton(cx - 96, height - 56, 'Randomize', 0x3b2a1e, () => {
      this.cfg = randomConfig(Date.now());
      this.refresh();
    });
    this.mkButton(cx + 96, height - 56, 'Enter World', 0x15803d, () => this.enterWorld());
  }

  /**
   * A living dusk-garden scene behind the hero creator so the screen is never a
   * flat fill: gradient sky + twinkling stars + distant hills, a real tiled grass
   * clearing (Tiny Swords frame 10, the pure-grass centre used by WorldScene),
   * side foliage/rocks, and a warm spotlight on the character stage.
   */
  private buildBackdrop(width: number, height: number): void {
    const cx = width / 2;
    const horizon = height * 0.56;

    // --- Sky: deep night at top → warm dusk at the horizon ---
    this.add.graphics().setDepth(-20)
      .fillGradientStyle(0x160b2e, 0x160b2e, 0x3b1d4e, 0x6b2f4a, 1)
      .fillRect(0, 0, width, horizon);

    // Warm horizon glow band
    this.add.graphics().setDepth(-19)
      .fillGradientStyle(0xf59e0b, 0xf59e0b, 0x6b2f4a, 0x6b2f4a, 0.32, 0.32, 0, 0)
      .fillRect(0, horizon - height * 0.14, width, height * 0.14);

    // --- Twinkling stars in the upper sky ---
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * horizon * 0.7;
      const s = this.add.circle(x, y, Math.random() < 0.2 ? 2 : 1, 0xfef9c3, 0.9).setDepth(-18);
      this.tweens.add({
        targets: s, alpha: 0.15, duration: 900 + Math.random() * 1600,
        yoyo: true, repeat: -1, delay: Math.random() * 1500,
      });
    }

    // --- Distant hill silhouettes ---
    this.add.ellipse(width * 0.22, horizon + 8, width * 0.9, height * 0.3, 0x241134, 0.9).setDepth(-16);
    this.add.ellipse(width * 0.82, horizon + 12, width * 0.8, height * 0.26, 0x1c0f2c, 0.95).setDepth(-16);

    // --- Ground: real tiled grass clearing ---
    const groundY = horizon + (height - horizon) / 2;
    if (this.textures.exists('ts-tilemap-grass')) {
      this.add.tileSprite(cx, groundY, width, height - horizon, 'ts-tilemap-grass', 10)
        .setTint(0x8a9a6a).setDepth(-15); // dusk-shaded grass
    } else {
      this.add.rectangle(cx, groundY, width, height - horizon, 0x2f4a24).setDepth(-15);
    }
    // Fade the grass into the horizon so the seam isn't a hard line
    this.add.graphics().setDepth(-14)
      .fillGradientStyle(0x2a1140, 0x2a1140, 0x2a1140, 0x2a1140, 0.85, 0.85, 0, 0)
      .fillRect(0, horizon - 4, width, height * 0.1);

    // --- Side foliage & rocks (kept to the edges, clear of the centre stage) ---
    const decor = (key: string, x: number, y: number, scale: number, frame?: number) => {
      if (!this.textures.exists(key)) return;
      const img = frame != null ? this.add.image(x, y, key, frame) : this.add.image(x, y, key);
      img.setScale(scale).setDepth(-13).setTint(0xb9c49a);
    };
    decor('ts-bush1', width * 0.08, horizon + height * 0.16, 1.1, 0);
    decor('ts-bush2', width * 0.93, horizon + height * 0.13, 1.0, 0);
    decor('ts-bush3', width * 0.16, height - height * 0.05, 0.9, 0);
    decor('ts-rock1', width * 0.88, height - height * 0.06, 1.2);
    decor('ts-rock2', width * 0.05, horizon + height * 0.28, 1.0);

    // --- Warm spotlight pooling on the character stage ---
    this.add.ellipse(cx, height * 0.24, width * 0.5, height * 0.5, 0xfde68a, 0.06).setDepth(-12);
    this.add.ellipse(cx, height * 0.24, width * 0.3, height * 0.34, 0xfde68a, 0.06).setDepth(-12);

    // --- Subtle edge vignette for focus ---
    const vig = this.add.graphics().setDepth(-6);
    vig.fillStyle(0x000000, 0.34);
    vig.fillRect(0, 0, width, height * 0.06);
    vig.fillRect(0, height * 0.94, width, height * 0.06);
    vig.fillRect(0, 0, width * 0.05, height);
    vig.fillRect(width * 0.95, 0, width * 0.05, height);
  }

  private buildRow(cx: number, y: number, label: string, field: keyof LpcConfig, catalog: LpcOption[]): void {
    this.add.text(cx - 148, y, label, {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#e5e7eb', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.mkArrow(cx + 34, y, '◀', () => this.cycle(field, catalog, -1));
    this.valueTexts[field] = this.add.text(cx + 100, y, catalog[this.cfg[field]].label, {
      fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.mkArrow(cx + 166, y, '▶', () => this.cycle(field, catalog, +1));
  }

  private cycle(field: keyof LpcConfig, catalog: LpcOption[], dir: number): void {
    this.cfg[field] = (this.cfg[field] + dir + catalog.length) % catalog.length;
    this.valueTexts[field]?.setText(catalog[this.cfg[field]].label);
    this.preview.setTexture(compositeLpc(this, this.cfg));
  }

  private refresh(): void {
    this.preview.setTexture(compositeLpc(this, this.cfg));
    this.valueTexts.skin?.setText(LPC_SKINS[this.cfg.skin].label);
    this.valueTexts.hair?.setText(LPC_HAIRS[this.cfg.hair].label);
    this.valueTexts.shirt?.setText(LPC_SHIRTS[this.cfg.shirt].label);
    this.valueTexts.pants?.setText(LPC_PANTS[this.cfg.pants].label);
  }

  update(): void {
    // Animate the preview walking in place (LPC walk-down row 10).
    const col = 1 + (Math.floor(this.time.now / 140) % 8);
    this.preview.setFrame(10 * 13 + col);
  }

  private enterWorld(): void {
    this.registry.set('customization', this.cfg);
    try { localStorage.setItem('bv_customization', JSON.stringify(this.cfg)); } catch { /* ignore */ }
    this.scene.start('WorldScene');
  }

  private mkArrow(x: number, y: number, glyph: string, onClick: () => void): void {
    const r = this.add.rectangle(x, y, 40, 40, 0x1e1b4b, 0.9).setStrokeStyle(2, 0xf59e0b, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => r.setFillStyle(0x3730a3, 1))
      .on('pointerout', () => r.setFillStyle(0x1e1b4b, 0.9))
      .on('pointerdown', onClick);
    this.add.text(x, y, glyph, { fontSize: '16px', fontFamily: 'sans-serif', color: '#ffffff' }).setOrigin(0.5);
  }

  private mkButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const w = 170, h = 46;
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(2, 0xfde68a, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => r.setScale(1.03))
      .on('pointerout', () => r.setScale(1))
      .on('pointerdown', onClick);
    this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}
