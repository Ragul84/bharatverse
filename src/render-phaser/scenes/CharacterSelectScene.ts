import Phaser, { Scene, GameObjects } from 'phaser';
import {
  compositeLpc, normalizeConfig, randomConfig,
  LPC_SKINS, LPC_HAIRS, LPC_SHIRTS, LPC_PANTS,
  type LpcConfig,
} from '../lpc_composite';
import { CLASSES, BHARATVERSE_CLASSES } from '../../sim/content/classes';
import type { PlayerClass } from '../../sim/types';
import type { CharacterSummary } from '../../net/online';

/**
 * Cinematic, in-canvas character select + creator for the online flow.
 *
 * Replaces the old DOM #charselect-panel / #charcreate-panel with a full-bleed
 * real-MMO-style screen: dusk-garden backdrop, a big animated hero preview, a
 * roster of existing characters, and a class + name + appearance creator.
 *
 * It owns NO auth logic: every network call is delegated through a
 * registry-injected `charSelectApi` (set up by main.ts from the real `api` /
 * `enterWorld` / `validateCharacterName`), so this scene stays presentation-only
 * and the authoritative auth path is unchanged.
 *
 * Strings are English literals here, matching the established pattern in the
 * other render-phaser scenes (BootScene, CharacterCreatorScene, WorldScene); the
 * i18n layer in src/ui/i18n.ts is DOM-oriented and is not wired into Phaser.
 */

export interface CharSelectApi {
  list: () => Promise<CharacterSummary[]>;
  create: (name: string, cls: PlayerClass, skin: number) => Promise<void>;
  del: (id: number, name: string) => Promise<void>;
  enter: (c: CharacterSummary) => void | Promise<void>;
  validateName: (name: string) => boolean;
  errorText: (err: unknown) => string;
}

const D_BACK = -20;
const D_CARD = 10;
const D_PREVIEW = 50;
const D_UI = 1000;
const C_GOLD = 0xfde68a;
const C_INK = 0x0b0716;

type Mode = 'list' | 'create';

export class CharacterSelectScene extends Scene {
  private api: CharSelectApi | null = null;
  private chars: CharacterSummary[] = [];
  private selectedIdx = 0;
  private mode: Mode = 'list';

  private cfg: LpcConfig = { skin: 0, hair: 0, shirt: 0, pants: 0, hat: 0 };
  private chosenClass: PlayerClass = BHARATVERSE_CLASSES[0];
  private preview!: GameObjects.Sprite;

  private status!: GameObjects.Text;
  private classCardBgs: GameObjects.Rectangle[] = [];
  private rosterCards: GameObjects.Container[] = [];
  private listPane!: GameObjects.Container;
  private createPane!: GameObjects.Container;
  private nameInput!: GameObjects.DOMElement;

  constructor() {
    super({ key: 'CharacterSelectScene', active: false });
  }

  create(): void {
    const { width, height } = this.scale;
    this.api = this.registry.get('charSelectApi') as CharSelectApi | null;
    this.cfg = normalizeConfig(this.loadCustomization());
    this.buildBackdrop(width, height);

    this.status = this.add.text(width / 2, height - 28, '', {
      fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#fca5a5',
      stroke: '#0b0716', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D_UI);

    this.listPane = this.add.container(0, 0).setDepth(D_UI).setVisible(false);
    this.createPane = this.add.container(0, 0).setDepth(D_UI).setVisible(false);

    this.buildListPane(width, height);
    this.buildCreatePane(width, height);

    this.input.keyboard?.once('keydown-ESC', () => { if (this.mode === 'create') this.setMode('list'); });

    this.setMode('list');
    void this.refresh();
  }

  // --- backdrop: dusk-garden cinematic (mirrors CharacterCreatorScene) ---
  private buildBackdrop(width: number, height: number): void {
    const cx = width / 2;
    const horizon = height * 0.56;
    this.add.graphics().setDepth(D_BACK)
      .fillGradientStyle(0x160b2e, 0x160b2e, 0x3b1d4e, 0x6b2f4a, 1).fillRect(0, 0, width, horizon);
    this.add.graphics().setDepth(D_BACK + 1)
      .fillGradientStyle(0xf59e0b, 0xf59e0b, 0x6b2f4a, 0x6b2f4a, 0.32, 0.32, 0, 0)
      .fillRect(0, horizon - height * 0.14, width, height * 0.14);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width, y = Math.random() * horizon * 0.7;
      const s = this.add.circle(x, y, Math.random() < 0.2 ? 2 : 1, 0xfef9c3, 0.9).setDepth(D_BACK + 2);
      this.tweens.add({ targets: s, alpha: 0.15, duration: 900 + Math.random() * 1600, yoyo: true, repeat: -1, delay: Math.random() * 1500 });
    }
    this.add.ellipse(width * 0.22, horizon + 8, width * 0.9, height * 0.3, 0x241134, 0.9).setDepth(D_BACK + 4);
    this.add.ellipse(width * 0.82, horizon + 12, width * 0.8, height * 0.26, 0x1c0f2c, 0.95).setDepth(D_BACK + 4);
    if (this.textures.exists('ts-tilemap-grass')) {
      this.add.tileSprite(cx, horizon + (height - horizon) / 2, width, height - horizon, 'ts-tilemap-grass', 10).setTint(0x8a9a6a).setDepth(D_BACK + 5);
    } else {
      this.add.rectangle(cx, horizon + (height - horizon) / 2, width, height - horizon, 0x2f4a24).setDepth(D_BACK + 5);
    }
    this.add.graphics().setDepth(D_BACK + 6)
      .fillGradientStyle(0x2a1140, 0x2a1140, 0x2a1140, 0x2a1140, 0.85, 0.85, 0, 0).fillRect(0, horizon - 4, width, height * 0.1);
    // cinematic edge vignette
    const vig = this.add.graphics().setDepth(D_UI - 1);
    vig.fillStyle(0x000000, 0.4);
    vig.fillRect(0, 0, width, height * 0.06); vig.fillRect(0, height * 0.94, width, height * 0.06);
    vig.fillRect(0, 0, width * 0.05, height); vig.fillRect(width * 0.95, 0, width * 0.05, height);
  }

  // --- list pane: title, roster cards, Enter/Delete, Create New ---
  private buildListPane(width: number, height: number): void {
    const cx = width / 2;
    this.listPane.add(this.add.text(cx, 52, 'Choose Your Hero', {
      fontSize: '30px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a',
      fontStyle: 'bold', stroke: '#0b0716', strokeThickness: 5,
    }).setOrigin(0.5));

    this.listPane.add(this.add.text(cx, 86, 'Select a champion to enter the realm, or forge a new one.', {
      fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
    }).setOrigin(0.5));

    // Empty-state placeholder while loading / when no characters exist.
    this.listPane.add(this.add.text(cx, height * 0.4, 'No heroes yet. Create one to begin.', {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color: '#94a3b8',
    }).setOrigin(0.5).setName('empty-hint'));

    this.mkButton(width - 150, height - 60, 'Create New', 0x15803d, () => this.setMode('create'), this.listPane);
    this.mkButton(150, height - 60, 'Enter World', 0xb45309, () => this.enterSelected(), this.listPane);
    this.mkButton(width / 2, height - 60, 'Delete', 0x7f1d1d, () => this.deleteSelected(), this.listPane);
  }

  private buildRoster(): void {
    for (const c of this.rosterCards) c.destroy();
    this.rosterCards = [];
    const empty = this.listPane.getByName('empty-hint') as GameObjects.Text | null;
    if (empty) empty.setVisible(this.chars.length === 0);

    const { width } = this.scale;
    const n = this.chars.length;
    const cardW = 150, gap = 18;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = width / 2 - totalW / 2 + cardW / 2;
    for (let i = 0; i < n; i++) {
      const c = this.chars[i];
      const x = startX + i * (cardW + gap);
      const y = this.scale.height * 0.42;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, 160, 0x0b0716, 0.65).setStrokeStyle(2, 0x4c1d95, 1);
      const accent = this.add.rectangle(0, -80, cardW, 6, CLASSES[c.class]?.color ?? 0xfde68a);
      const mini = this.add.sprite(0, 10, compositeLpc(this, this.cfg)).setOrigin(0.5, 0.9).setScale(1.4);
      const name = this.add.text(0, 64, c.name, {
        fontSize: '14px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
      }).setOrigin(0.5);
      const cls = this.add.text(0, 82, `${CLASSES[c.class]?.name ?? c.class}  Lv ${c.level}`, {
        fontSize: '11px', fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
      }).setOrigin(0.5);
      card.add([bg, accent, mini, name, cls]).setDepth(D_CARD).setSize(cardW, 160);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x1e1b4b, 0.85));
      bg.on('pointerout', () => this.refreshCardHighlight(i));
      bg.on('pointerdown', () => { this.selectedIdx = i; this.refreshCardHighlight(-1); });
      this.listPane.add(card);
      this.rosterCards.push(card);
    }
    this.refreshCardHighlight(-1);
  }

  private refreshCardHighlight(changedIdx: number): void {
    for (let i = 0; i < this.rosterCards.length; i++) {
      const card = this.rosterCards[i];
      const bg = card.getAt(0) as GameObjects.Rectangle;
      const sel = i === this.selectedIdx;
      bg.setFillStyle(sel ? 0x3730a3 : 0x0b0716, sel ? 0.92 : 0.65);
      bg.setStrokeStyle(sel ? 3 : 2, sel ? C_GOLD : 0x4c1d95, 1);
      void changedIdx;
    }
  }

  // --- create pane: class cards, name, appearance, Create/Back ---
  private buildCreatePane(width: number, height: number): void {
    const cx = width / 2;
    this.createPane.add(this.add.text(cx, 52, 'Forge a New Hero', {
      fontSize: '30px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a',
      fontStyle: 'bold', stroke: '#0b0716', strokeThickness: 5,
    }).setOrigin(0.5));

    // big animated preview
    this.add.ellipse(cx, height * 0.46, 140, 36, 0x000000, 0.35).setDepth(D_PREVIEW - 1);
    this.preview = this.add.sprite(cx, height * 0.42, compositeLpc(this, this.cfg))
      .setOrigin(0.5, 0.9).setScale(2.6).setDepth(D_PREVIEW);
    this.createPane.add(this.preview);

    // class cards row
    const cls = BHARATVERSE_CLASSES;
    this.classCardBgs = [];
    const cw = 130, gap = 12;
    const totalW = cls.length * cw + (cls.length - 1) * gap;
    const startX = cx - totalW / 2 + cw / 2;
    const clsY = height * 0.66;
    for (let i = 0; i < cls.length; i++) {
      const x = startX + i * (cw + gap);
      const def = CLASSES[cls[i]];
      const card = this.add.container(x, clsY);
      const bg = this.add.rectangle(0, 0, cw, 70, 0x0b0716, 0.7).setStrokeStyle(2, def?.color ?? 0xfde68a, 1);
      this.classCardBgs.push(bg);
      const accent = this.add.rectangle(0, -34, cw, 5, def?.color ?? 0xfde68a);
      const nm = this.add.text(0, -6, def?.name ?? cls[i], {
        fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
        wordWrap: { width: cw - 12 }, align: 'center',
      }).setOrigin(0.5);
      const role = this.add.text(0, 20, this.classRole(cls[i]), {
        fontSize: '10px', fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
      }).setOrigin(0.5);
      card.add([bg, accent, nm, role]).setDepth(D_CARD).setSize(cw, 70);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x1e1b4b, 0.9));
      bg.on('pointerout', () => this.refreshClassHighlight());
      bg.on('pointerdown', () => { this.chosenClass = cls[i]; this.refreshClassHighlight(); });
      this.createPane.add(card);
    }
    this.refreshClassHighlight();

    // name input (DOM element for real text entry)
    const nameHtml = '<input id="bv-char-name" type="text" maxlength="16" placeholder="Hero name" autocomplete="off" ' +
      'style="width:260px;height:40px;font-size:18px;text-align:center;border-radius:8px;border:2px solid #f59e0b;background:#0b0716;color:#fde68a;outline:none;font-family:Noto Sans,sans-serif;" />';
    this.nameInput = this.add.dom(cx, height * 0.8, 'div', undefined, nameHtml).setOrigin(0.5).setDepth(D_UI);
    this.createPane.add(this.nameInput);
    const inputEl = this.nameInput.node.querySelector('input') as HTMLInputElement | null;
    if (inputEl) {
      inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); this.confirmCreate(); }
        if (e.key === 'Escape') { e.preventDefault(); this.setMode('list'); }
      });
      inputEl.addEventListener('input', () => this.status.setText(''));
    }

    // appearance cycles
    let ry = height * 0.88;
    this.mkCycle(cx - 200, ry, 'Skin', 'skin', LPC_SKINS, this.createPane);
    this.mkCycle(cx - 66, ry, 'Hair', 'hair', LPC_HAIRS, this.createPane);
    this.mkCycle(cx + 66, ry, 'Shirt', 'shirt', LPC_SHIRTS, this.createPane);
    this.mkCycle(cx + 200, ry, 'Pants', 'pants', LPC_PANTS, this.createPane);

    this.mkButton(cx, height - 36, 'Create Hero', 0x15803d, () => this.confirmCreate(), this.createPane);
    this.mkButton(90, height - 36, 'Back', 0x3730a3, () => this.setMode('list'), this.createPane);
    this.mkButton(width - 90, height - 36, 'Randomize', 0x4c1d95, () => {
      this.cfg = randomConfig(Date.now());
      this.preview.setTexture(compositeLpc(this, this.cfg));
    }, this.createPane);
  }

  private classRole(cls: PlayerClass): string {
    switch (cls) {
      case 'brahmarishi': return 'Scholar';
      case 'kshatriya': return 'Warrior';
      case 'vaishya': return 'Archer';
      case 'shilpi': return 'Mage';
      case 'vaidya': return 'Healer';
      case 'shaman': return 'Hybrid';
      default: return 'Hero';
    }
  }

  private refreshClassHighlight(): void {
    const cls = BHARATVERSE_CLASSES;
    const selIdx = Math.max(0, cls.indexOf(this.chosenClass));
    for (let i = 0; i < this.classCardBgs.length; i++) {
      const bg = this.classCardBgs[i];
      const def = CLASSES[cls[i]];
      const sel = i === selIdx;
      bg.setFillStyle(sel ? 0x3730a3 : 0x0b0716, sel ? 0.95 : 0.7);
      bg.setStrokeStyle(sel ? 3 : 2, sel ? C_GOLD : (def?.color ?? 0xfde68a), 1);
    }
  }

  private mkCycle(x: number, y: number, label: string, field: keyof LpcConfig, catalog: { label: string }[], pane: GameObjects.Container): void {
    pane.add(this.add.text(x, y - 22, label, {
      fontSize: '12px', fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
    }).setOrigin(0.5));
    this.mkArrow(x - 44, y, '\u25C0', () => this.cycle(field, catalog, -1), pane);
    this.mkArrow(x + 44, y, '\u25B6', () => this.cycle(field, catalog, +1), pane);
  }

  private cycle(field: keyof LpcConfig, catalog: { label: string }[], dir: number): void {
    const arr = this.catalogArray(field, catalog);
    this.cfg[field] = ((this.cfg[field] as number) + dir + arr.length) % arr.length;
    this.preview.setTexture(compositeLpc(this, this.cfg));
  }

  private catalogArray(field: keyof LpcConfig, catalog: { label: string }[]): { label: string }[] {
    switch (field) {
      case 'skin': return LPC_SKINS;
      case 'hair': return LPC_HAIRS;
      case 'shirt': return LPC_SHIRTS;
      case 'pants': return LPC_PANTS;
      default: return catalog;
    }
  }

  private mkArrow(x: number, y: number, glyph: string, onClick: () => void, pane: GameObjects.Container): void {
    const r = this.add.rectangle(x, y, 34, 34, 0x1e1b4b, 0.9).setStrokeStyle(2, 0xf59e0b, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => r.setFillStyle(0x3730a3, 1))
      .on('pointerout', () => r.setFillStyle(0x1e1b4b, 0.9))
      .on('pointerdown', onClick);
    pane.add(r);
    pane.add(this.add.text(x, y, glyph, { fontSize: '14px', fontFamily: 'sans-serif', color: '#ffffff' }).setOrigin(0.5));
  }

  private mkButton(x: number, y: number, label: string, color: number, onClick: () => void, pane: GameObjects.Container): void {
    const w = 150, h = 44;
    const r = this.add.rectangle(x, y, w, h, color, 1).setStrokeStyle(2, 0xfde68a, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => r.setScale(1.04))
      .on('pointerout', () => r.setScale(1))
      .on('pointerdown', onClick);
    pane.add(r);
    pane.add(this.add.text(x, y, label, {
      fontSize: '15px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  // --- flow ---
  private setMode(mode: Mode): void {
    this.mode = mode;
    this.listPane.setVisible(mode === 'list');
    this.createPane.setVisible(mode === 'create');
    if (mode === 'create') {
      this.preview.setTexture(compositeLpc(this, this.cfg));
      const inputEl = this.nameInput.node.querySelector('input') as HTMLInputElement | null;
      inputEl?.focus();
    }
    this.status.setText('');
  }

  private async refresh(): Promise<void> {
    if (!this.api) return;
    this.status.setText('Loading heroes...');
    try {
      this.chars = await this.api.list();
      if (this.chars.length && this.selectedIdx >= this.chars.length) this.selectedIdx = 0;
      this.buildRoster();
      this.status.setText('');
    } catch (err) {
      this.status.setText(this.api.errorText(err));
    }
  }

  private async enterSelected(): Promise<void> {
    if (!this.api || !this.chars[this.selectedIdx]) {
      this.status.setText('No hero selected.');
      return;
    }
    this.status.setText('Entering the realm...');
    try { await this.api.enter(this.chars[this.selectedIdx]); }
    catch (err) { this.status.setText(this.api.errorText(err)); }
  }

  private async deleteSelected(): Promise<void> {
    if (!this.api || !this.chars[this.selectedIdx]) return;
    const c = this.chars[this.selectedIdx];
    this.status.setText(`Deleting ${c.name}...`);
    try {
      await this.api.del(c.id, c.name);
      this.status.setText(`${c.name} deleted.`);
      await this.refresh();
    } catch (err) { this.status.setText(this.api.errorText(err)); }
  }

  private async confirmCreate(): Promise<void> {
    if (!this.api) return;
    const inputEl = this.nameInput.node.querySelector('input') as HTMLInputElement | null;
    const name = (inputEl?.value ?? '').trim();
    if (!name) { this.status.setText('Please enter a hero name.'); inputEl?.focus(); return; }
    if (!this.api.validateName(name)) { this.status.setText('That name is not allowed.'); inputEl?.focus(); return; }
    this.saveCustomization();
    this.status.setText('Forging hero...');
    try {
      await this.api.create(name, this.chosenClass, 0);
      if (inputEl) inputEl.value = '';
      this.status.setText('');
      this.setMode('list');
      await this.refresh();
    } catch (err) { this.status.setText(this.api.errorText(err)); }
  }

  update(): void {
    if (this.mode === 'create' && this.preview) {
      const col = 1 + (Math.floor(this.time.now / 140) % 8);
      this.preview.setFrame(10 * 13 + col); // LPC walk-down cycle
    }
  }

  private loadCustomization(): Partial<LpcConfig> {
    try { return JSON.parse(localStorage.getItem('bv_customization') ?? '{}'); } catch { return {}; }
  }
  private saveCustomization(): void {
    try { localStorage.setItem('bv_customization', JSON.stringify(this.cfg)); } catch { /* ignore */ }
  }
}
