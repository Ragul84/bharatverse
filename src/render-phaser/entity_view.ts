/**
 * EntityView - the in-world visual for one entity: a body marker plus a
 * nameplate, HP bar, resource bar, and a cast bar that appears while casting.
 *
 * All the decisions (fractions, colors, visibility) live in the pure,
 * unit-tested entity_view_logic.ts; this file is just the Phaser glue that
 * builds the GameObjects and applies those values each frame. Body markers are
 * placeholder rectangles; real character sprites are WP2.
 */

import { GameObjects, Scene } from 'phaser';
import type { Entity } from '../sim/types';
import * as L from './entity_view_logic';
import { archetypeFor } from './character_archetype';
import { characterTextureKey, CHAR_H } from './character_sprites';

const BAR_W = 30;
const BAR_X = -BAR_W / 2; // left edge, so left-origin fills grow rightward

export class EntityView {
  readonly container: GameObjects.Container;
  private readonly body: GameObjects.Image;
  private readonly hpFill: GameObjects.Rectangle;
  private readonly resBg: GameObjects.Rectangle;
  private readonly resFill: GameObjects.Rectangle;
  private readonly castBg: GameObjects.Rectangle;
  private readonly castFill: GameObjects.Rectangle;
  private readonly name: GameObjects.Text;

  constructor(scene: Scene, e: Entity, isPlayer: boolean) {
    // Procedural per-archetype sprite, anchored at the feet so depth sorting and
    // the ground point line up. Players render a touch larger.
    this.body = scene.add.image(0, 0, characterTextureKey(archetypeFor(e)))
      .setOrigin(0.5, (CHAR_H - 1.5) / CHAR_H)
      .setScale((isPlayer ? 1.15 : 1) * Math.max(0.6, e.scale || 1));

    // Overlays sit above the ~36px-tall sprite (feet at y=0, head near y=-35).
    this.name = scene.add.text(0, -50, '', {
      fontSize: '10px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1);

    const hpBg = scene.add.rectangle(BAR_X, -44, BAR_W, 4, 0x111827).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(BAR_X, -44, BAR_W, 4, 0x22c55e).setOrigin(0, 0.5);
    this.resBg = scene.add.rectangle(BAR_X, -39, BAR_W, 3, 0x111827).setOrigin(0, 0.5);
    this.resFill = scene.add.rectangle(BAR_X, -39, BAR_W, 3, 0x3b82f6).setOrigin(0, 0.5);
    this.castBg = scene.add.rectangle(BAR_X, -33, BAR_W, 4, 0x1f2937).setOrigin(0, 0.5);
    this.castFill = scene.add.rectangle(BAR_X, -33, 0, 4, 0xfacc15).setOrigin(0, 0.5);

    this.container = scene.add.container(0, 0, [
      this.body, hpBg, this.hpFill, this.resBg, this.resFill, this.castBg, this.castFill, this.name,
    ]);

    this.update(e);
  }

  /** Apply the current entity state to every overlay. */
  update(e: Entity): void {
    // Sprite color is baked per archetype; only dead state recolors (gray).
    if (e.dead) this.body.setTint(0x4b5563);
    else this.body.clearTint();

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
    this.container.setAlpha(e.dead ? 0.6 : 1);
  }

  /** Make the body clickable; `onClick` fires on pointer-down (for targeting). */
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
