/**
 * WorldScene - BharatVerse Open World (Simulation-Linked)
 *
 * Responsibilities:
 *  - Render the world by syncing with the simulation's `world.entities` map.
 *  - Convert 3D simulation coordinates (x, z) to 2D screen coordinates.
 *  - Map keyboard inputs (WASD/arrows) to `world.moveInput`.
 *  - Proactively create/destroy sprite representations of all entities.
 */

import Phaser, { Scene, GameObjects, Input } from 'phaser';
import { Events } from '../index';
import { SimBridge, interpPos } from '../sim_bridge';
import { worldToIso, isoDepth, isoWorldBoundsRect } from '../iso';
import { EntityView } from '../entity_view';
import { generateCharacterTextures } from '../character_sprites';
import { decoTexture, decoTint } from '../decoration_style';
import { WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Z, WORLD_MAX_Z, ZONES } from '../../sim/data';
import { terrainHeight, zoneBiomeAt, roadDistance, WATER_LEVEL, generateDecorations } from '../../sim/world';
import type { IWorld } from '../../world_api';
import type { Entity } from '../../sim/types';

// Camera bounds + world origin offset for the isometric projection. The sim
// world is a north-running strip (x in [-180,180], z in [-180,900]), not a
// square, so bounds come from the real rectangle.
const ISO_BOUNDS = isoWorldBoundsRect(WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Z, WORLD_MAX_Z);

// Depth bands kept clear of the in-world painter's-order range (isoDepth spans
// roughly [WORLD_MIN_X+WORLD_MIN_Z, WORLD_MAX_X+WORLD_MAX_Z]).
const DEPTH_GROUND = -100000;
const DEPTH_UI = 100000;

// Base ground tint per biome; height shading is applied on top.
const BIOME_BASE: Record<string, number> = {
  vale: 0x4a7c3a,  // wooded green
  marsh: 0x4f5e34, // swampy olive
  peaks: 0x8c8378, // rocky grey-brown
};
const COLOR_WATER = 0x2c5d86;
const COLOR_ROAD = 0xb89b6a;

/** Project sim world coords to Phaser screen pixels (origin offset applied). */
function worldToScreen(x: number, z: number, y = 0): { x: number; y: number } {
  const p = worldToIso(x, z, y);
  return { x: ISO_BOUNDS.originX + p.sx, y: ISO_BOUNDS.originY + p.sy };
}

/** Multiply each RGB channel of a packed color by `f`, clamped to [0,255]. */
function shadeColor(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

export class WorldScene extends Scene {
  private world!: IWorld;
  private bridge!: SimBridge;

  // Player
  private playerView!: EntityView;

  // Keyboard inputs
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Input.Keyboard.Key;
    down: Input.Keyboard.Key;
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
  };

  // Per-entity in-world views (maps simulation entityId -> EntityView)
  private entityViews = new Map<number, EntityView>();

  private inCombat = false;
  private zoneLabel!: GameObjects.Text;
  private targetRing!: GameObjects.Graphics;

  constructor() {
    super({ key: 'WorldScene', active: false });
  }

  init(): void {
    this.world = this.registry.get('world') as IWorld;
    this.bridge = this.registry.get('simBridge') as SimBridge;
    this.inCombat = false;
  }

  create(): void {
    const { width } = this.scale;

    // ---- Isometric terrain, sampled from the sim's own heightfield ----
    const seed = this.world.cfg.seed;
    this.drawTerrain(seed);
    this.makeDecoTextures();
    this.drawDecorations(seed);
    this.drawLandmarks(seed);
    generateCharacterTextures(this); // procedural per-archetype sprites

    // Zone name text (screen-space UI, above the world)
    this.zoneLabel = this.add.text(width / 2, 16, 'Vidya Nagar - Gangapur Nagari', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
      backgroundColor: '#00000088',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0).setDepth(DEPTH_UI).setScrollFactor(0);

    // ---- Player ----
    const p = this.world.player;
    const startPos = worldToScreen(p.pos.x, p.pos.z, p.pos.y);
    this.playerView = new EntityView(this, p, true)
      .setPosition(startPos.x, startPos.y)
      .setDepth(isoDepth(p.pos.x, p.pos.z));

    // Set camera bounds & follow
    this.cameras.main.setBounds(0, 0, ISO_BOUNDS.width, ISO_BOUNDS.height);
    this.cameras.main.startFollow(this.playerView.container, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);

    // ---- Target ring (drawn under the current target's feet) ----
    this.targetRing = this.add.graphics().setVisible(false);
    this.targetRing.lineStyle(2, 0xfde047, 0.95); // gold
    this.targetRing.strokeEllipse(0, 0, 30, 15);  // 2:1 iso footprint

    // ---- Keyboard input setup ----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Tab cycles the nearest hostile target (server/sim decides which).
    this.input.keyboard!.addCapture('TAB');
    this.input.keyboard!.on('keydown-TAB', () => this.world.tabTarget());

    // Listen for combat end
    this.events.on(Events.COMBAT_END, this.onCombatEnd, this);

    // Launch HUD
    this.scene.launch('HUDScene');
  }

  /**
   * Isometric terrain baked once from the sim's own heightfield, so the Phaser
   * ground matches the simulation exactly (the repo invariant: renderer samples
   * the same `world.ts` functions). Each cell is a flat iso tile lifted to its
   * sampled height, tinted by biome + height, flooded to a flat water plane
   * below WATER_LEVEL, and tan-tinted along roads. Real art / props are WP2.
   */
  private drawTerrain(seed: number): void {
    const g = this.add.graphics().setDepth(DEPTH_GROUND);
    const step = 8;
    const s2 = step / 2;

    interface Cell { x: number; z: number; h: number; color: number }
    const cells: Cell[] = [];
    for (let z = WORLD_MIN_Z; z <= WORLD_MAX_Z; z += step) {
      for (let x = WORLD_MIN_X; x <= WORLD_MAX_X; x += step) {
        const th = terrainHeight(x, z, seed);
        let color: number;
        let h: number;
        if (th < WATER_LEVEL) {
          color = COLOR_WATER;
          h = WATER_LEVEL; // flat water surface over the basin
        } else if (roadDistance(x, z) < 3.5) {
          color = COLOR_ROAD;
          h = th;
        } else {
          const base = BIOME_BASE[zoneBiomeAt(z)] ?? BIOME_BASE.vale;
          // brighter with elevation; clamped so peaks do not blow out
          const shade = 0.7 + Math.min(1, Math.max(0, (th - WATER_LEVEL) / 40)) * 0.6;
          color = shadeColor(base, shade);
          h = th;
        }
        cells.push({ x, z, h, color });
      }
    }

    // Painter's order: back (small x+z) to front, so raised tiles overlap right.
    cells.sort((a, b) => (a.x + a.z) - (b.x + b.z));
    for (const c of cells) {
      const p1 = worldToScreen(c.x + s2, c.z + s2, c.h);
      const p2 = worldToScreen(c.x + s2, c.z - s2, c.h);
      const p3 = worldToScreen(c.x - s2, c.z - s2, c.h);
      const p4 = worldToScreen(c.x - s2, c.z + s2, c.h);
      g.fillStyle(c.color, 1);
      g.beginPath();
      g.moveTo(p1.x, p1.y);
      g.lineTo(p2.x, p2.y);
      g.lineTo(p3.x, p3.y);
      g.lineTo(p4.x, p4.y);
      g.closePath();
      g.fillPath();
    }
  }

  /** Build the small reusable tree/rock textures used by drawDecorations. */
  private makeDecoTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Broadleaf tree
    g.fillStyle(0x5a3b22, 1); g.fillRect(11, 24, 4, 12);
    g.fillStyle(0x3f7d34, 1); g.fillCircle(13, 16, 13);
    g.fillStyle(0x4f9442, 1); g.fillCircle(9, 13, 7);
    g.generateTexture('bv-tree', 26, 36); g.clear();
    // Pine
    g.fillStyle(0x5a3b22, 1); g.fillRect(11, 26, 4, 10);
    g.fillStyle(0x356b2e, 1); g.fillTriangle(2, 28, 24, 28, 13, 2);
    g.fillStyle(0x3f7d34, 1); g.fillTriangle(5, 18, 21, 18, 13, 6);
    g.generateTexture('bv-tree2', 26, 36); g.clear();
    // Rock
    g.fillStyle(0x8a8a8a, 1); g.fillEllipse(13, 11, 24, 14);
    g.fillStyle(0x6f6f6f, 1); g.fillEllipse(16, 13, 11, 8);
    g.generateTexture('bv-rock', 26, 20);
    g.destroy();
  }

  /**
   * Place trees/rocks from the sim's deterministic generateDecorations(), each a
   * depth-sorted billboard so it occludes entities correctly. Same seed as the
   * sim, so placement matches everywhere.
   */
  private drawDecorations(seed: number): void {
    for (const d of generateDecorations(seed)) {
      const pos = worldToScreen(d.x, d.z, terrainHeight(d.x, d.z, seed));
      const img = this.add.image(pos.x, pos.y, decoTexture(d.kind))
        .setOrigin(0.5, 1)
        .setScale(d.scale)
        .setDepth(isoDepth(d.x, d.z));
      const tint = decoTint(d.kind, d.biome);
      if (tint !== 0xffffff) img.setTint(tint);
    }
  }

  /**
   * A procedural isometric landmark at each zone hub, themed by biome: the vale
   * gets a Statue-of-Unity obelisk, the marsh a Taj-style marble dome, the peaks
   * a Tanjore-style stepped gopuram. Depth-sorted at the hub so the player can
   * walk in front of and behind it. Real modeled landmarks are later art.
   */
  private drawLandmarks(seed: number): void {
    for (const zone of ZONES) {
      const h = zone.hub;
      const base = worldToScreen(h.x, h.z, terrainHeight(h.x, h.z, seed));
      const g = this.add.graphics();
      if (zone.biome === 'vale') this.paintObelisk(g);
      else if (zone.biome === 'marsh') this.paintDome(g);
      else this.paintGopuram(g);
      const label = this.add.text(0, -100, h.name, {
        fontSize: '12px',
        fontFamily: '"Noto Sans", sans-serif',
        color: '#fde68a',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 1);
      this.add.container(base.x, base.y, [g, label]).setDepth(isoDepth(h.x, h.z));
    }
  }

  private paintObelisk(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x6b5536, 1); g.fillRect(-18, -20, 36, 20); // pedestal
    g.fillStyle(0x7d6440, 1); g.fillRect(-22, -6, 44, 8);   // plinth
    g.fillStyle(0x9c7a3c, 1);                               // bronze figure
    g.beginPath();
    g.moveTo(-9, -20); g.lineTo(9, -20); g.lineTo(5, -86); g.lineTo(-5, -86);
    g.closePath(); g.fillPath();
    g.fillStyle(0xb08d57, 1); g.fillCircle(0, -90, 6);
  }

  private paintDome(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xd1d5db, 1); g.fillRect(-26, -12, 52, 12); // platform
    g.fillStyle(0xe5e7eb, 1);                                // minarets
    g.fillRect(-24, -58, 4, 46); g.fillRect(20, -58, 4, 46);
    g.fillStyle(0xf1f5f9, 1); g.fillCircle(-22, -60, 3); g.fillCircle(22, -60, 3);
    g.fillStyle(0xf3f4f6, 1); g.fillRect(-16, -46, 32, 34); // main block
    g.fillStyle(0xf9fafb, 1); g.fillEllipse(0, -50, 34, 30); // onion dome
    g.fillStyle(0xb0893f, 1); g.fillRect(-1, -72, 2, 8); g.fillCircle(0, -73, 2);
  }

  private paintGopuram(g: Phaser.GameObjects.Graphics): void {
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const y0 = -i * 13;
      const y1 = y0 - 13;
      const hw = 28 - i * 4;
      const tw = hw - 4;
      g.fillStyle(i % 2 === 0 ? 0xb08d57 : 0x9c7a47, 1);
      g.beginPath();
      g.moveTo(-hw, y0); g.lineTo(hw, y0); g.lineTo(tw, y1); g.lineTo(-tw, y1);
      g.closePath(); g.fillPath();
    }
    g.fillStyle(0xd4af5a, 1); g.fillCircle(0, -tiers * 13 - 4, 4); // kalasham
  }

  update(): void {
    // Drain this frame's simulation events for downstream consumers (FCT, death,
    // loot...). Done every frame, even mid-combat, so the queue never backs up.
    const events = this.bridge ? this.bridge.drain() : [];
    if (events.length) this.events.emit(Events.SIM_EVENTS, events);

    if (this.inCombat) return;

    // Render interpolation factor between the last two sim ticks.
    const alpha = this.bridge ? this.bridge.alpha : 1;

    // ---- 1. Process Input & Send to Simulation ----
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    // Assign to simulation moveInput directly
    this.world.moveInput.forward = up;
    this.world.moveInput.back = down;
    this.world.moveInput.strafeLeft = left;
    this.world.moveInput.strafeRight = right;

    // ---- 2. Sync Player View from Sim (interpolated) ----
    const playerIp = interpPos(this.world.player, alpha);
    const playerPhaserPos = worldToScreen(playerIp.x, playerIp.z, playerIp.y);
    this.playerView
      .setPosition(playerPhaserPos.x, playerPhaserPos.y)
      .setDepth(isoDepth(playerIp.x, playerIp.z));
    this.playerView.update(this.world.player);

    // ---- 3. Sync Other Entities from Sim ----
    this.syncEntities(alpha);

    // ---- 4. Target ring on the current target ----
    this.updateTargetRing(alpha);

    // ---- 5. Check Proximity for Combat ----
    this.checkAggroEncounters();
  }

  /** Position/show the gold ring under the player's current target. */
  private updateTargetRing(alpha: number): void {
    const tid = this.world.player.targetId;
    const target = tid != null ? this.world.entities.get(tid) : undefined;
    if (!target || target.dead) {
      this.targetRing.setVisible(false);
      return;
    }
    const ip = interpPos(target, alpha);
    const pos = worldToScreen(ip.x, ip.z, ip.y);
    this.targetRing
      .setVisible(true)
      .setPosition(pos.x, pos.y)
      .setDepth(isoDepth(ip.x, ip.z) - 0.5); // just behind the target body
  }

  private syncEntities(alpha: number): void {
    const currentIds = new Set<number>();

    for (const [id, entity] of this.world.entities.entries()) {
      if (id === this.world.playerId) continue; // skip local player

      currentIds.add(id);
      const ip = interpPos(entity, alpha);
      const pos = worldToScreen(ip.x, ip.z, ip.y);
      const depth = isoDepth(ip.x, ip.z);

      let view = this.entityViews.get(id);
      if (!view) {
        view = new EntityView(this, entity, false)
          .setInteractiveTarget(() => this.world.targetEntity(id));
        this.entityViews.set(id, view);
      }
      view.setPosition(pos.x, pos.y).setDepth(depth);
      view.update(entity);
    }

    // Clean up views for entities no longer present
    for (const id of this.entityViews.keys()) {
      if (!currentIds.has(id)) {
        this.entityViews.get(id)!.destroy();
        this.entityViews.delete(id);
      }
    }
  }

  private checkAggroEncounters(): void {
    // Check if the simulation reports player in combat
    if (this.world.player.inCombat) {
      // Find the entity targeting the player or nearest hostile entity
      let closestHostile: Entity | null = null;
      let minDist = 99999;

      for (const entity of this.world.entities.values()) {
        if (entity.kind === 'npc' || entity.dead || entity.id === this.world.playerId) continue;

        const dist = Phaser.Math.Distance.Between(
          this.world.player.pos.x, this.world.player.pos.z,
          entity.pos.x, entity.pos.z
        );

        if (dist < 10 && dist < minDist) { // 10 yards aggro radius
          minDist = dist;
          closestHostile = entity;
        }
      }

      if (closestHostile) {
        this.startCombat(closestHostile);
      }
    }
  }

  private startCombat(enemy: Entity): void {
    this.inCombat = true;
    this.cameras.main.flash(200, 220, 38, 38);

    // Stop movement inputs immediately
    this.world.moveInput.forward = false;
    this.world.moveInput.back = false;
    this.world.moveInput.strafeLeft = false;
    this.world.moveInput.strafeRight = false;

    this.time.delayedCall(250, () => {
      this.scene.launch('CombatScene', {
        enemy: {
          id: enemy.id,
          label: enemy.name || 'Monster',
          subject: 'maths', // default to maths
          tier: Math.max(1, Math.min(6, Math.floor((entityLevel(enemy) ?? 1) / 10) + 1)),
          hp: enemy.hp ?? 60,
          maxHp: enemy.maxHp ?? 60,
        },
        playerHp: this.world.player.hp,
        playerMaxHp: this.world.player.maxHp,
        playerClass: this.world.cfg.playerClass,
        questions: this.registry.get('questions'),
      });

      this.scene.pause('WorldScene');
    });
  }

  private onCombatEnd(result: { won: boolean; remainingHp: number; xpGained: number; mindcoins: number; enemyId: number }): void {
    this.inCombat = false;
    this.pushHUDUpdate();
    this.scene.resume('WorldScene');
  }

  private pushHUDUpdate(): void {
    this.events.emit(Events.HUD_UPDATE_HP, {
      hp: this.world.player.hp,
      maxHp: this.world.player.maxHp,
    });
    this.events.emit(Events.HUD_UPDATE_MINDCOINS, this.world.copper);
    this.events.emit(Events.HUD_UPDATE_XP, this.world.xp);
  }
}

// Small helper to get level if not directly exposed
function entityLevel(e: any): number {
  return e.level ?? 1;
}
