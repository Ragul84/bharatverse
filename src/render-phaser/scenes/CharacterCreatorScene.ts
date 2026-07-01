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

    this.add.graphics()
      .fillGradientStyle(0x2a1a4a, 0x2a1a4a, 0x14331e, 0x14331e, 1)
      .fillRect(0, 0, width, height);

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
