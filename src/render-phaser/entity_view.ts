/**
 * EntityView - in-world visual for one entity.
 * Now uses Tiny Swords animated sprite sheets for smooth 8-frame animations.
 * Falls back to procedural textures if spritesheet hasn't loaded.
 */

import { GameObjects, Scene } from 'phaser';
import type { Entity } from '../sim/types';
import * as L from './entity_view_logic';
import { archetypeFor } from './character_archetype';
import { CHAR_H } from './character_sprites';
import { resolveCharacterTexture } from './bv_assets';
import { compositeLpc, randomConfig, lpcReady, type LpcConfig } from './lpc_composite';

const BAR_W = 32;
const BAR_X = -BAR_W / 2;

// Target on-screen height in pixels for entity bodies
const TARGET_BODY_H = 64;


// Unit pools for variety: a stable per-entity pick (by id) so a crowd of NPCs
// or mobs isn't a row of identical sprites. All idle+run anims are registered in
// BootScene; both colours have warrior/archer/lancer/pawn.
const RED_UNITS = ['warrior', 'archer', 'lancer', 'pawn'];
const BLUE_UNITS = ['pawn', 'archer', 'lancer', 'warrior'];

/** Pick a Tiny Swords spritesheet key + anim key based on entity kind/class. */
function tsSpriteKey(e: Entity, moving: boolean): { tex: string; anim: string } | null {
  const suffix = moving ? 'run' : 'idle';
  if (e.kind === 'mob') {
    const u = RED_UNITS[Math.abs(e.id) % RED_UNITS.length];
    const tex = `ts-red-${u}-${suffix}`;
    return { tex, anim: tex };
  }
  if (e.kind === 'npc') {
    const u = BLUE_UNITS[Math.abs(e.id) % BLUE_UNITS.length];
    const tex = `ts-blue-${u}-${suffix}`;
    return { tex, anim: tex };
  }
  if (e.kind === 'player') {
    const cls = (e as { class?: string }).class ?? '';
    // Kshatriya / warrior → Blue Warrior
    if (cls === 'kshatriya' || cls === 'warrior') {
      return moving
        ? { tex: 'ts-blue-warrior-run',  anim: 'ts-blue-warrior-run'  }
        : { tex: 'ts-blue-warrior-idle', anim: 'ts-blue-warrior-idle' };
    }
    // Archers / hunters / vaishya → Blue Archer
    if (cls === 'vaishya' || cls === 'hunter' || cls === 'rogue') {
      return moving
        ? { tex: 'ts-blue-archer-run',  anim: 'ts-blue-archer-run'  }
        : { tex: 'ts-blue-archer-idle', anim: 'ts-blue-archer-idle' };
    }
    // Lancer for shilpi / vaidya
    if (cls === 'shilpi' || cls === 'vaidya') {
      return moving
        ? { tex: 'ts-blue-lancer-run',  anim: 'ts-blue-lancer-run'  }
        : { tex: 'ts-blue-lancer-idle', anim: 'ts-blue-lancer-idle' };
    }
    // Default: Blue Warrior for all others (brahmarishi etc.)
    return moving
      ? { tex: 'ts-blue-warrior-run',  anim: 'ts-blue-warrior-run'  }
      : { tex: 'ts-blue-warrior-idle', anim: 'ts-blue-warrior-idle' };
  }
  return null;
}

export class EntityView {
  readonly container: GameObjects.Container;
  private body: GameObjects.Sprite;
  private readonly shadow: GameObjects.Graphics;
  private readonly hpFill: GameObjects.Rectangle;
  private readonly resBg: GameObjects.Rectangle;
  private readonly resFill: GameObjects.Rectangle;
  private readonly castBg: GameObjects.Rectangle;
  private readonly castFill: GameObjects.Rectangle;
  private readonly name: GameObjects.Text;

  // Track current anim to avoid re-playing same animation every frame
  private currentAnim = '';
  // When the composited LPC sheet is available, the body is an LPC character
  // driven by 4-directional frames (rows 8-11) instead of Tiny Swords anims.
  private useLpc = false;
  private isPlayer = false;

  constructor(scene: Scene, e: Entity, isPlayer: boolean) {
    this.isPlayer = isPlayer;
    // Prefer the composited LPC character (top-down, 4-directional walk); fall
    // back to Tiny Swords animated units, then procedural/_v3 art.
    this.useLpc = lpcReady(scene);
    const tsInfo = this.useLpc ? null : tsSpriteKey(e, false);
    let useSprite = false;
    let texKey: string;
    if (this.useLpc) {
      // Player: creator appearance + the currently equipped cosmetic hat. Others:
      // a stable random config by id (no hat), so the crowd varies.
      const cfg = isPlayer
        ? { ...(scene.registry.get('customization') as Partial<LpcConfig> | undefined ?? {}),
            hat: (scene.registry.get('equippedHat') as number | undefined) ?? 0 }
        : randomConfig(e.id);
      texKey = compositeLpc(scene, cfg ?? {});
    } else if (tsInfo && scene.textures.exists(tsInfo.tex)) {
      texKey = tsInfo.tex;
      useSprite = true;
    } else {
      texKey = resolveCharacterTexture((k) => scene.textures.exists(k), archetypeFor(e));
    }

    this.body = scene.add.sprite(0, 0, texKey);

    if (this.useLpc) {
      this.body.setFrame(this.lpcFrame(e, false));
      this.body.setOrigin(0.5, 0.92)
        .setScale((isPlayer ? 1.5 : 1.35) * Math.max(0.7, e.scale || 1));
    } else {
      const texH = this.body.height || CHAR_H;
      // Tiny Swords frames have empty space below the feet; procedural/_v3 art has
      // feet at the very bottom. Anchor at the real feet so the body stands on its
      // shadow instead of floating above it.
      const feetOrigin = useSprite ? 0.82 : (texH - 2) / texH;
      this.body
        .setOrigin(0.5, feetOrigin)
        .setScale((TARGET_BODY_H / texH) * (isPlayer ? 1.2 : 1) * Math.max(0.6, e.scale || 1));
      if (useSprite && tsInfo) {
        this.body.play(tsInfo.anim, true);
        this.currentAnim = tsInfo.anim;
      }
    }

    // Drop shadow
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.3);
    this.shadow.fillEllipse(0, 2, 28, 10);

    // Name + bars
    this.name = scene.add.text(0, -56, '', {
      fontSize: '10px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);

    const hpBg = scene.add.rectangle(BAR_X, -49, BAR_W, 4, 0x111827).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(BAR_X, -49, BAR_W, 4, 0x22c55e).setOrigin(0, 0.5);
    this.resBg  = scene.add.rectangle(BAR_X, -44, BAR_W, 3, 0x111827).setOrigin(0, 0.5);
    this.resFill = scene.add.rectangle(BAR_X, -44, BAR_W, 3, 0x3b82f6).setOrigin(0, 0.5);
    this.castBg  = scene.add.rectangle(BAR_X, -38, BAR_W, 4, 0x1f2937).setOrigin(0, 0.5);
    this.castFill = scene.add.rectangle(BAR_X, -38, 0,    4, 0xfacc15).setOrigin(0, 0.5);

    this.container = scene.add.container(0, 0, [
      this.shadow, this.body,
      hpBg, this.hpFill,
      this.resBg, this.resFill,
      this.castBg, this.castFill,
      this.name,
    ]);

    this.update(e);
  }

  update(e: Entity): void {
    const speed = Math.hypot(e.vx, e.vz);
    const moving = speed > 0.15 && !e.dead;

    if (this.useLpc) {
      // LPC: pick the frame for the current 4-direction facing + walk cycle.
      this.body.setFrame(this.lpcFrame(e, moving));
      if (e.dead) { this.body.setTint(0x4b5563); this.shadow.setVisible(false); }
      else if (e.kind === 'mob') { this.body.setTint(0xff9a9a); this.shadow.setVisible(true); }
      else { this.body.clearTint(); this.shadow.setVisible(true); }
    } else {
      if (e.dead) { this.body.setTint(0x4b5563); this.shadow.setVisible(false); }
      else { this.body.clearTint(); this.shadow.setVisible(true); }

      // flipX when heading left (Tiny Swords sprites face right by default)
      const flipX = Math.sin(e.facing) < -0.1;
      const tsInfo = tsSpriteKey(e, moving);
      if (tsInfo && this.body.scene.textures.exists(tsInfo.tex)) {
        if (this.body.texture.key !== tsInfo.tex) {
          this.body.setTexture(tsInfo.tex);
          this.body.setOrigin(0.5, 0.82); // Tiny Swords feet line
        }
        if (this.currentAnim !== tsInfo.anim) {
          this.body.play(tsInfo.anim, true);
          this.currentAnim = tsInfo.anim;
        }
      } else {
        const fallbackKey = resolveCharacterTexture((k) => this.body.scene.textures.exists(k), archetypeFor(e));
        if (this.body.texture.key !== fallbackKey) this.body.setTexture(fallbackKey);
      }
      this.body.setFlipX(flipX);
    }

    const hpF = L.hpFraction(e);
    this.hpFill.setSize(BAR_W * hpF, 4).setFillStyle(L.hpColor(hpF));
    this.hpFill.setVisible(!e.dead);

    const hasRes = L.hasResourceBar(e) && !e.dead;
    this.resBg.setVisible(hasRes);
    this.resFill.setVisible(hasRes);
    if (hasRes) {
      this.resFill.setSize(BAR_W * L.resourceFraction(e), 3).setFillStyle(L.resourceColor(e.resourceType));
    }

    const casting = L.showCast(e);
    this.castBg.setVisible(casting);
    this.castFill.setVisible(casting);
    if (casting) this.castFill.setSize(BAR_W * L.castProgress(e), 4);

    this.name.setText(L.nameplateText(e));
    this.container.setAlpha(e.dead ? 0.55 : 1);
  }

  /** LPC frame for the entity's 4-direction facing + walk cycle (rows 8-11). */
  private lpcFrame(e: Entity, moving: boolean): number {
    const vx = Math.sin(e.facing), vz = Math.cos(e.facing);
    let row: number;
    if (Math.abs(vx) > Math.abs(vz)) row = vx > 0 ? 11 : 9; // right : left
    else row = vz >= 0 ? 10 : 8;                            // down : up
    const col = moving ? 1 + (Math.floor(this.body.scene.time.now / 110) % 8) : 0; // 0 = idle
    return row * 13 + col;
  }

  /** Re-bake the player's LPC sheet after a cosmetic hat change (equip/unequip). */
  refreshLpcAppearance(): void {
    if (!this.useLpc || !this.isPlayer) return;
    const scene = this.body.scene;
    const cfg = {
      ...(scene.registry.get('customization') as Partial<LpcConfig> | undefined ?? {}),
      hat: (scene.registry.get('equippedHat') as number | undefined) ?? 0,
    };
    const key = compositeLpc(scene, cfg);
    if (this.body.texture.key !== key) this.body.setTexture(key);
  }

  setInteractiveTarget(onClick: () => void): this {
    this.body.setInteractive({ useHandCursor: true });
    this.body.on('pointerdown', onClick);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }
}
