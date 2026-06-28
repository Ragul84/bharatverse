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
import type { IWorld } from '../../world_api';
import type { Entity } from '../../sim/types';

// Scale factor: 1 simulation yard = 5 pixels
const SCALE = 5.0;
const OFFSET_X = 960;
const OFFSET_Y = 960;

/** Convert simulation coordinates to Phaser pixels */
function simToPhaser(x: number, z: number) {
  return {
    x: x * SCALE + OFFSET_X,
    y: z * SCALE + OFFSET_Y // z in 3D maps to y in 2D
  };
}

export class WorldScene extends Scene {
  private world!: IWorld;
  private bridge!: SimBridge;

  // Player
  private playerSprite!: GameObjects.Rectangle;
  private playerLabel!: GameObjects.Text;

  // Keyboard inputs
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Input.Keyboard.Key;
    down: Input.Keyboard.Key;
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
  };

  // Entity sprites cache (maps simulation entityId -> Phaser sprite container)
  private entitySprites = new Map<number, {
    container: GameObjects.Container;
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
  }>();

  private worldBounds = { width: 1920, height: 1920 };
  private inCombat = false;
  private zoneLabel!: GameObjects.Text;

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

    // ---- World background (Indraprastha terracotta base) ----
    this.add.rectangle(0, 0, this.worldBounds.width, this.worldBounds.height, 0x8b5e3c)
      .setOrigin(0, 0);

    // Grid representing paths
    const roadGraphics = this.add.graphics();
    roadGraphics.fillStyle(0xc4a882, 1);
    for (let x = 0; x < this.worldBounds.width; x += 192) {
      roadGraphics.fillRect(x, 0, 32, this.worldBounds.height);
    }
    for (let y = 0; y < this.worldBounds.height; y += 192) {
      roadGraphics.fillRect(0, y, this.worldBounds.width, 32);
    }

    // Zone name text
    this.zoneLabel = this.add.text(width / 2, 16, 'Vidya Nagar - Gangapur Nagari', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fbbf24',
      backgroundColor: '#00000088',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

    // ---- Player ----
    // Set starting position from simulation player
    const startPos = simToPhaser(this.world.player.pos.x, this.world.player.pos.z);
    this.playerSprite = this.add.rectangle(startPos.x, startPos.y, 24, 24, 0x4f46e5).setDepth(10);
    this.playerLabel = this.add.text(startPos.x, startPos.y - 20, this.world.player.name || 'Hero', {
      fontSize: '12px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(11);

    // Set camera bounds & follow
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // ---- Keyboard input setup ----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Listen for combat end
    this.events.on(Events.COMBAT_END, this.onCombatEnd, this);

    // Launch HUD
    this.scene.launch('HUDScene');
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

    // ---- 2. Sync Player Sprite from Sim (interpolated) ----
    const playerIp = interpPos(this.world.player, alpha);
    const playerPhaserPos = simToPhaser(playerIp.x, playerIp.z);

    this.playerSprite.setPosition(playerPhaserPos.x, playerPhaserPos.y);
    this.playerLabel.setPosition(playerPhaserPos.x, playerPhaserPos.y - 20);

    // ---- 3. Sync Other Entities from Sim ----
    this.syncEntities(alpha);

    // ---- 4. Check Proximity for Combat ----
    this.checkAggroEncounters();
  }

  private syncEntities(alpha: number): void {
    const currentIds = new Set<number>();

    for (const [id, entity] of this.world.entities.entries()) {
      if (id === this.world.playerId) continue; // skip local player

      currentIds.add(id);
      const ip = interpPos(entity, alpha);
      const pos = simToPhaser(ip.x, ip.z);

      if (this.entitySprites.has(id)) {
        // Update existing sprite position
        const cached = this.entitySprites.get(id)!;
        cached.container.setPosition(pos.x, pos.y);
        
        // Show status changes (e.g., dead state grayed out)
        if (entity.dead) {
          cached.rect.setFillStyle(0x4b5563); // gray
          cached.label.setColor('#9ca3af');
        } else {
          cached.rect.setFillStyle(entity.kind === 'npc' ? 0x059669 : 0xdc2626); // green for friendly NPC, red for hostile
        }
      } else {
        // Create new sprite representation
        const color = entity.kind === 'npc' ? 0x059669 : 0xdc2626;
        const rect = this.add.rectangle(0, 0, 20, 20, color);
        
        const label = this.add.text(0, -14, entity.name || 'NPC', {
          fontSize: '10px',
          fontFamily: '"Noto Sans", sans-serif',
          color: entity.kind === 'npc' ? '#a7f3d0' : '#fca5a5',
          stroke: '#000000',
          strokeThickness: 1.5,
        }).setOrigin(0.5, 1);

        const container = this.add.container(pos.x, pos.y, [rect, label]).setDepth(5);
        this.entitySprites.set(id, { container, rect, label });
      }
    }

    // Clean up removed entities
    for (const id of this.entitySprites.keys()) {
      if (!currentIds.has(id)) {
        const cached = this.entitySprites.get(id)!;
        cached.container.destroy();
        this.entitySprites.delete(id);
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
