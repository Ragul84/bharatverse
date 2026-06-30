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

const BAR_W = 32;
const BAR_X = -BAR_W / 2;

// Target on-screen height in pixels for entity bodies
const TARGET_BODY_H = 64;

/** Pick a Tiny Swords spritesheet key + anim key based on entity kind/class. */
function tsSpriteKey(e: Entity, moving: boolean): { tex: string; anim: string } | null {
  if (e.kind === 'mob') {
    return moving
      ? { tex: 'ts-red-warrior-run',  anim: 'ts-red-warrior-run'  }
      : { tex: 'ts-red-warrior-idle', anim: 'ts-red-warrior-idle' };
  }
  if (e.kind === 'npc') {
    return moving
      ? { tex: 'ts-blue-pawn-run',  anim: 'ts-blue-pawn-run'  }
      : { tex: 'ts-blue-pawn-idle', anim: 'ts-blue-pawn-idle' };
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

  constructor(scene: Scene, e: Entity, isPlayer: boolean) {
    // Try to use a Tiny Swords animated sprite first
    const tsInfo = tsSpriteKey(e, false);
    let texKey: string;
    let useSprite = false;

    if (tsInfo && scene.textures.exists(tsInfo.tex)) {
      texKey = tsInfo.tex;
      useSprite = true;
    } else {
      texKey = resolveCharacterTexture((k) => scene.textures.exists(k), archetypeFor(e));
    }

    this.body = scene.add.sprite(0, 0, texKey);
    const texH = this.body.height || CHAR_H;
    this.body
      .setOrigin(0.5, (texH - 2) / texH)
      .setScale((TARGET_BODY_H / texH) * (isPlayer ? 1.2 : 1) * Math.max(0.6, e.scale || 1));

    // Play idle animation immediately if using spritesheet
    if (useSprite && tsInfo) {
      this.body.play(tsInfo.anim, true);
      this.currentAnim = tsInfo.anim;
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
    if (e.dead) {
      this.body.setTint(0x4b5563);
      this.shadow.setVisible(false);
    } else {
      this.body.clearTint();
      this.shadow.setVisible(true);
    }

    const speed = Math.hypot(e.vx, e.vz);
    const moving = speed > 0.15 && !e.dead;

    // Facing: in flat top-down, facing angle 0 = north (-Z), PI/2 = east (+X)
    // flipX when entity is heading left (negative X component)
    const flipX = Math.sin(e.facing) < -0.1; // sin(facing) gives X component

    const tsInfo = tsSpriteKey(e, moving);
    if (tsInfo && this.body.scene.textures.exists(tsInfo.tex)) {
      // Switch texture if changed
      if (this.body.texture.key !== tsInfo.tex) {
        this.body.setTexture(tsInfo.tex);
        const texH = this.body.height || CHAR_H;
        this.body.setOrigin(0.5, (texH - 2) / texH);
      }
      // Play animation if changed
      if (this.currentAnim !== tsInfo.anim) {
        this.body.play(tsInfo.anim, true);
        this.currentAnim = tsInfo.anim;
      }
    } else {
      // Fallback: static image from Kenney / procedural
      const fallbackKey = resolveCharacterTexture((k) => this.body.scene.textures.exists(k), archetypeFor(e));
      if (this.body.texture.key !== fallbackKey) {
        this.body.setTexture(fallbackKey);
      }
    }

    this.body.setFlipX(flipX);

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
