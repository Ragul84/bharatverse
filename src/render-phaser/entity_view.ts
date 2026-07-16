/**
 * EntityView - in-world visual for one entity.
 * Now uses Tiny Swords animated sprite sheets for smooth 8-frame animations.
 * Falls back to procedural textures if spritesheet hasn't loaded.
 */

import { GameObjects, Scene } from 'phaser';
import { ensureSoftShadow } from './shadows';
import type { Entity } from '../sim/types';
import * as L from './entity_view_logic';
import { archetypeFor } from './character_archetype';
import { CHAR_H } from './character_sprites';
import { resolveCharacterTexture } from './bv_assets';
import { compositeLpc, randomConfig, lpcReady, type LpcConfig } from './lpc_composite';
import { mobSheetFor, mobFrame, mobFlipX, humanoidMobConfig, type MobSheet } from './mob_sprites';

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
    // Kshatriya / warrior â†’ Blue Warrior
    if (cls === 'kshatriya' || cls === 'warrior') {
      return moving
        ? { tex: 'ts-blue-warrior-run',  anim: 'ts-blue-warrior-run'  }
        : { tex: 'ts-blue-warrior-idle', anim: 'ts-blue-warrior-idle' };
    }
    // Archers / hunters / vaishya â†’ Blue Archer
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
  private readonly shadow: GameObjects.Image;
  private readonly hpBg: GameObjects.Rectangle;
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
  // When set, this mob renders from a dedicated creature sheet (skeleton/spider)
  // instead of the tinted LPC human.
  private mobSheet?: MobSheet;
  // Humanoid mob rendered as a rugged bandit (LPC human, no hostile red tint).
  private isBandit = false;
  private isGathering = false;
  private gatheringKind?: 'wood' | 'ore';

  // Walk-animation gating: the sim only writes vx/vz when airborne, so ground
  // walking is detected from actual position change over a short time window.
  private prevX = NaN;
  private prevZ = NaN;
  private lastMoveMs = -1e9;

  constructor(scene: Scene, e: Entity, isPlayer: boolean) {
    this.isPlayer = isPlayer;
    // Prefer the composited LPC character (top-down, 4-directional walk); fall
    // back to Tiny Swords animated units, then procedural/_v3 art.
    this.useLpc = lpcReady(scene);
    // Mobs with dedicated creature art use their own sheet, not the LPC human.
    if (this.useLpc) {
      const ms = mobSheetFor(e);
      if (ms && scene.textures.exists(ms.key)) this.mobSheet = ms;
    }
    const tsInfo = this.useLpc ? null : tsSpriteKey(e, false);
    let useSprite = false;
    let texKey: string;
    const banditCfg = this.useLpc && !this.mobSheet ? humanoidMobConfig(e) : null;
    this.isBandit = !!banditCfg;
    if (this.mobSheet) {
      texKey = this.mobSheet.key;
    } else if (this.useLpc) {
      // Player: creator appearance + the currently equipped cosmetic hat. Bandits:
      // a rugged look. Other NPCs/mobs: a stable random config by id (crowd variety).
      const cfg = isPlayer
        ? { ...(scene.registry.get('customization') as Partial<LpcConfig> | undefined ?? {}),
            hat: (scene.registry.get('equippedHat') as number | undefined) ?? 0 }
        : (banditCfg ?? randomConfig(e.id));
      texKey = compositeLpc(scene, cfg ?? {});
    } else if (tsInfo && scene.textures.exists(tsInfo.tex)) {
      texKey = tsInfo.tex;
      useSprite = true;
    } else {
      texKey = resolveCharacterTexture((k) => scene.textures.exists(k), archetypeFor(e));
    }

    this.body = scene.add.sprite(0, 0, texKey);

    if (this.mobSheet) {
      this.body.setFrame(mobFrame(this.mobSheet, e, false, 0));
      this.body.setOrigin(0.5, 0.9)
        .setScale(this.mobSheet.scale * Math.max(0.7, e.scale || 1));
    } else if (this.useLpc) {
      this.body.setFrame(this.lpcFrame(e, false));
      this.body.setOrigin(0.5, 0.92)
        // Smaller, kintara-like proportion (~1 tile) now that the camera is zoomed out.
        .setScale((isPlayer ? 1.15 : 1.05) * Math.max(0.7, e.scale || 1));
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

    // Drop shadow: a soft, feathered ground shadow so the sprite reads as
    // planted on the terrain rather than floating above it.
    this.shadow = scene.add.image(0, 2, ensureSoftShadow(scene))
      .setOrigin(0.5, 0.5).setDisplaySize(34, 14).setAlpha(0.8);

    // Name + bars
    this.name = scene.add.text(0, -56, '', {
      fontSize: '9px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#f1f5f9',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);

    const hpBg = scene.add.rectangle(BAR_X, -49, BAR_W, 4, 0x111827).setOrigin(0, 0.5);
    this.hpBg = hpBg;
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
    // Detect movement from position change (sim vx/vz is ~0 while walking on
    // ground). "Moving" persists briefly after the last change so the walk cycle
    // doesn't flicker between the 20 Hz sim ticks and the render frames.
    const now = this.body.scene.time.now;
    if (!Number.isNaN(this.prevX) && Math.hypot(e.pos.x - this.prevX, e.pos.z - this.prevZ) > 0.02) {
      this.lastMoveMs = now;
    }
    this.prevX = e.pos.x; this.prevZ = e.pos.z;
    const moving = !e.dead && (now - this.lastMoveMs) < 160;

    if (this.mobSheet) {
      // Real creature art â€” animate the walk cycle; no red tint needed.
      this.body.setFrame(mobFrame(this.mobSheet, e, moving, this.body.scene.time.now));
      this.body.setFlipX(mobFlipX(this.mobSheet, e)); // side-view mobs face their heading
      if (e.dead) { this.body.setTint(0x888888); this.shadow.setVisible(false); }
      else { this.body.clearTint(); this.shadow.setVisible(true); }
    } else if (this.useLpc) {
      // LPC: pick the frame for the current 4-direction facing + walk cycle.
      this.body.setFrame(this.lpcFrame(e, moving));
      if (e.dead) { this.body.setTint(0x4b5563); this.shadow.setVisible(false); }
      else if (e.kind === 'mob' && !this.isBandit) { this.body.setTint(0xff9a9a); this.shadow.setVisible(true); }
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
    // Declutter: NPCs are non-combat, so only show their HP bar when hurt. Mobs
    // and the player always show it.
    const showHp = !e.dead && (e.kind !== 'npc' || hpF < 0.999);
    this.hpFill.setSize(BAR_W * hpF, 4).setFillStyle(L.hpColor(hpF));
    this.hpFill.setVisible(showHp);
    this.hpBg.setVisible(showHp);

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

  setGathering(active: boolean, kind?: 'wood' | 'ore'): void {
    this.isGathering = active;
    this.gatheringKind = kind;
  }

  /** LPC frame for the entity's 4-direction facing + walk cycle (rows 8-11). */
  private lpcFrame(e: Entity, moving: boolean): number {
    const vx = Math.sin(e.facing), vz = Math.cos(e.facing);
    let row: number;
    
    if (this.isGathering) {
      // LPC Slash rows: 12 (Up), 13 (Left), 14 (Down), 15 (Right)
      if (Math.abs(vx) > Math.abs(vz)) row = vx > 0 ? 15 : 13;
      else row = vz >= 0 ? 14 : 12;
      const col = Math.floor(this.body.scene.time.now / 150) % 6; // 6 frames for Slash
      return row * 13 + col;
    }

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
