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
/**
 * Phaser rasterises Text into a bitmap at `style.resolution` (default 1) and then
 * the browser upscales that bitmap to the device's real pixels — on any scaled or
 * hi-DPI display (Windows 125%/150%, retina) that upscale is what makes text look
 * blurry. Default every Text to the device pixel ratio so the bitmap is rendered
 * at native resolution and stays crisp. Done once, globally, before any Text.
 */
function patchTextResolutionForDpi(): void {
  // World-space text (nameplates) is drawn at device pixels AND further scaled by
  // the camera zoom (2-3x), so its bitmap must be rendered at ~dpr + a zoom margin
  // to stay crisp. HUD text (no zoom) is just over-resolved, which is fine.
  const res = Math.min(4, Math.max(2, Math.round(window.devicePixelRatio || 1) + 1));
  const proto = Phaser.GameObjects.TextStyle.prototype as unknown as {
    setStyle: (style: Record<string, unknown>, updateText?: boolean, setDefaults?: boolean) => unknown;
    __dpiPatched?: boolean;
  };
  if (proto.__dpiPatched) return;
  const orig = proto.setStyle;
  proto.setStyle = function (style, updateText, setDefaults) {
    const s = style ? { ...style } : {};
    if (s.resolution == null) s.resolution = res;
    return orig.call(this, s, updateText, setDefaults);
  };
  proto.__dpiPatched = true;
}

export function createPhaserGame(parentElement: HTMLElement): Phaser.Game {
  patchTextResolutionForDpi();
  // Some machines can't create a WebGL context (hardware acceleration off /
  // blocked driver) and Phaser falls back to the Canvas 2D renderer. `?canvas2d`
  // forces that path in dev so the blur can be reproduced + verified.
  const forceCanvas = import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('canvas2d');
  // Render at the DEVICE's real pixels, not CSS pixels. On a scaled/hi-DPI display
  // (e.g. 150% Windows = devicePixelRatio 1.62) the browser blows a CSS-sized
  // canvas up to the real pixel grid — rendering *below* screen resolution, which
  // looks blurry no matter the smoothing. So we size the game to window×DPR and
  // display it at the CSS size: the backing store then matches the screen 1:1.
  const dpr = Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const winW = typeof window !== 'undefined' ? window.innerWidth : GAME_WIDTH;
  const winH = typeof window !== 'undefined' ? window.innerHeight : GAME_HEIGHT;
  const config: Types.Core.GameConfig = {
    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO, // WebGL preferred, Canvas fallback
    parent: parentElement,
    backgroundColor: '#1a0a2e', // Deep indigo - BharatVerse night sky base
    scale: {
      mode: Phaser.Scale.NONE, // we size the backing store to device pixels manually
      width: Math.round(winW * dpr),
      height: Math.round(winH * dpr),
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

  const game = new Phaser.Game(config);
  game.registry.set('dpr', dpr);
  // Keep the backing store at device pixels (game size = window×dpr) while the
  // canvas DISPLAYS at CSS size — so it maps 1:1 to the screen and stays sharp.
  // Also force nearest-neighbor for any residual scaling (crisp pixel art).
  const fitDevicePixels = (): void => {
    const c = game.canvas;
    if (!c) return;
    const w = window.innerWidth, h = window.innerHeight;
    game.scale.resize(Math.round(w * dpr), Math.round(h * dpr));
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.imageRendering = 'pixelated';
  };
  fitDevicePixels();
  game.events.once('ready', fitDevicePixels);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => window.requestAnimationFrame(fitDevicePixels));
  }
  return game;
}
