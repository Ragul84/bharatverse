/**
 * BharatVerse - Phaser 3 Game Entry Point
 * Mobile-first 2D renderer (replaces Three.js 3D renderer)
 *
 * Architecture:
 *  - BootScene    : asset preload + loading screen
 *  - WorldScene   : open world exploration (Indraprastha etc.)
 *  - CombatScene  : turn-based combat with MindGains quiz mechanic
 *  - QuizScene    : quiz question popup overlay (runs on top of CombatScene)
 *  - HUDScene     : persistent HUD (HP bar, MindCoins, minimap)
 */

import Phaser, { Types } from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharacterCreatorScene } from './scenes/CharacterCreatorScene';
import { WorldScene } from './scenes/WorldScene';
import { CombatScene } from './scenes/CombatScene';
import { QuizScene } from './scenes/QuizScene';
import { HUDScene } from './scenes/HUDScene';

/** Base logical resolution - scales to fill device screen. Higher than the
 *  display of most laptops so the FIT scaler downscales (crisp) rather than
 *  bilinear-upscaling a low-res canvas (which blurs sprites AND text). */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720; // 16:9

/**
 * Shared event bus keys used across scenes.
 * All cross-scene communication goes through Phaser's event emitter
 * to keep scenes decoupled.
 */
export const Events = {
  // Combat -> QuizScene
  QUIZ_START: 'quiz:start',
  QUIZ_RESULT: 'quiz:result',

  // QuizScene -> CombatScene
  QUIZ_CORRECT: 'quiz:correct',
  QUIZ_WRONG: 'quiz:wrong',
  QUIZ_TIMEOUT: 'quiz:timeout',

  // WorldScene -> HUDScene
  HUD_UPDATE_HP: 'hud:hp',
  HUD_UPDATE_MINDCOINS: 'hud:mindcoins',
  HUD_UPDATE_XP: 'hud:xp',
  HUD_SHOW_MESSAGE: 'hud:message',

  // WorldScene -> CombatScene
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',

  // Server sync
  SERVER_SNAPSHOT: 'net:snapshot',

  // SimBridge -> scenes: a drained batch of SimEvents for this render frame
  // (damage / heal / death / loot / xp / levelup ...). Consumers turn these
  // into floating combat text and other feedback.
  SIM_EVENTS: 'sim:events',

  // Daily quests: WorldScene bumps progress -> DAILY_CHANGED; HUD claim ->
  // DAILY_CLAIM ({ gold, xp }) back to WorldScene to award.
  DAILY_CHANGED: 'daily:changed',
  DAILY_CLAIM: 'daily:claim',

  // Cosmetic shop: world building/HUD button -> OPEN_SHOP (HUD opens panel);
  // HUD -> SHOP_BUY / SHOP_EQUIP ({ kind, ref, price }) to WorldScene, which owns
  // Gold + appearance; WorldScene -> SHOP_CHANGED so the HUD panel refreshes.
  OPEN_SHOP: 'shop:open',
  SHOP_BUY: 'shop:buy',
  SHOP_EQUIP: 'shop:equip',
  SHOP_CHANGED: 'shop:changed',

  // Marketplace: building/HUD -> OPEN_MARKET; HUD sell -> MARKET_SELL
  // ({ kind, count }) to WorldScene (owns Gold + resources); WorldScene ->
  // RESOURCES_CHANGED so the market + any counters refresh.
  OPEN_MARKET: 'market:open',
  MARKET_SELL: 'market:sell',
  RESOURCES_CHANGED: 'resources:changed',
} as const;

/**
 * Create and return the Phaser Game instance.
 * Called from src/main.ts when the player selects offline or online mode.
 * The parent element is the full-screen game container div.
 */
export function createPhaserGame(parentElement: HTMLElement): Phaser.Game {
  const config: Types.Core.GameConfig = {
    type: Phaser.AUTO, // WebGL preferred, Canvas fallback (for low-end Android)
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: parentElement,
    backgroundColor: '#1a0a2e', // Deep indigo - BharatVerse night sky base
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      min: {
        width: 480,
        height: 270,
      },
      max: {
        width: 1920,
        height: 1080,
      },
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, // Top-down, no gravity
        debug: import.meta.env.DEV,
      },
    },
    input: {
      activePointers: 2, // Support dual-touch (joystick + action button)
    },
    scene: [
      BootScene,
      CharacterCreatorScene,
      WorldScene,
      CombatScene,
      QuizScene,
      HUDScene,
    ],
    // Crisp pixel-art rendering: the world (Kenney 16px tiles) and characters
    // (Tiny Swords pixel sprites) are pixel art, so nearest-neighbor sampling
    // keeps them sharp instead of the blurry bilinear upscale. roundPixels stops
    // sub-pixel shimmer as the camera scrolls.
    pixelArt: true,
    roundPixels: true,
  };

  return new Phaser.Game(config);
}
