/**
 * WorldScene - BharatVerse Open World (Flat Top-Down)
 *
 * Renders a beautiful tile-based world using the Kenney Roguelike RPG Pack
 * spritesheet (roguelikeSheet_transparent.png). The world is a flat top-down
 * map matching the Sample1.png reference: grass terrain, lake, dirt paths,
 * pine/round trees, buildings, tents, fences, flowers and decorations.
 *
 * Tile reference (frame index = row * 57 + col, 0-indexed):
 *   Grass plain:   row 0, col 0  => frame 0
 *   Grass variant: row 0, col 1  => frame 1
 *   Dirt/path:     row 1, col 0  => frame 57
 *   Water center:  row 0, col 2  => frame 2
 *   Pine tree:     row 2, col 52 => frame 166
 *   Round tree:    row 3, col 52 => frame 223
 *   etc.
 */

import Phaser, { Scene, GameObjects, Input } from 'phaser';
import { Events } from '../index';
import { SimBridge, interpPos } from '../sim_bridge';
import { EntityView } from '../entity_view';
import { generateCharacterTextures } from '../character_sprites';
import { ZONES } from '../../sim/data';
import { hash2 } from '../../sim/rng';
import type { IWorld } from '../../world_api';
import type { Entity } from '../../sim/types';
import type { Question } from '../../sim/content/questions';
import { loadDaily, saveDaily, bumpDaily as bumpDailyState, type DailyState } from '../daily';
import {
  loadCosmetics, saveCosmetics, petDef,
  type CosmeticState, type PetDef,
} from '../cosmetics';
import {
  loadResources, saveResources, addResource, RESOURCE_DEFS,
  type ResourceState, type ResourceId,
} from '../resources';

// ---- Tile constants (roguelikeSheet_transparent.png layout) ----
// Sheet: 57 cols x 31 rows, each tile 16x16 with 1px margin.
// Frame index = row * 57 + col (Phaser spritesheet 0-indexed).

const S = 57; // columns per row in roguelikeSheet_transparent.png (frame = row*S + col)

// ---- Ground tiles (verified against the sheet) ----
const T_GRASS       = 0 * S + 5;   // 5   plain green grass
const T_GRASS2      = 1 * S + 5;   // 62  grass variant
const T_GRASS3      = 1 * S + 9;   // 66  grass with flecks
const T_DIRT        = 0 * S + 6;   // 6   bare earth / path
const T_DIRT2       = 1 * S + 6;   // 63  earth variant
const T_WATER_C     = 0 * S + 0;   // 0   water
const T_WATER_N     = 0 * S + 0;
const T_WATER_S     = 0 * S + 0;
const T_WATER_W     = 0 * S + 0;
const T_WATER_E     = 0 * S + 0;
const T_WATER_NW    = 0 * S + 0;
const T_GRASS_DARK  = 1 * S + 5;   // 62  marsh (darker grass variant)
const T_STONE       = 0 * S + 7;   // 7   grey stone (peaks)

// Water 9-slice (grass-banked pond, sheet cols 2-4 / rows 0-2) for autotiled
// shorelines: flat water (T_WATER_C) is replaced by the matching edge/corner.
const W_NW = 0 * S + 2; const W_N = 0 * S + 3; const W_NE = 0 * S + 4;
const W_W  = 1 * S + 2; const W_C = 1 * S + 3; const W_E  = 1 * S + 4;
const W_SW = 2 * S + 2; const W_S = 2 * S + 3; const W_SE = 2 * S + 4;

// ---- Trees: single 16x16 tiles (sheet rows 9-11, cols 12-18) ----
const T_PINE_TOP    = 9 * S + 14;  // 527 green pine
const T_PINE_BOT    = 9 * S + 16;  // 529 green pine (variant)
const T_ROUND_TOP   = 9 * S + 12;  // 525 round green tree
const T_ROUND_BOT   = 9 * S + 12;
const T_ROUND2_TOP  = 9 * S + 13;  // 526 autumn round tree
const T_ROUND2_BOT  = 9 * S + 13;
const T_STUMP       = 9 * S + 27;  // 540 bare/dead tree

// ---- Shrubs (used where the map asked for "rocks") ----
const T_ROCK1       = 9 * S + 24;  // 537 bush
const T_ROCK2       = 9 * S + 25;  // 538 bush
const T_ROCK3       = 9 * S + 26;  // 539 bush

// ---- Small plants / flowers (sheet row 9, cols 24-29) ----
const T_FLOWER_R    = 9 * S + 28;  // 541 flower cluster
const T_FLOWER_Y    = 9 * S + 29;  // 542 flower cluster
const T_MUSHROOM    = 9 * S + 26;  // 539 small bush
const T_PLANT       = 9 * S + 24;  // 537 small bush

// ---- Houses: uniform tan brick wall (869) + tan roof ----
const T_HOUSE_TL = 15 * S + 14; const T_HOUSE_TM = 15 * S + 14; const T_HOUSE_TR = 15 * S + 14;
const T_HOUSE_ML = 15 * S + 14; const T_HOUSE_MM = 15 * S + 14; const T_HOUSE_MR = 15 * S + 14;
const T_HOUSE_BL = 15 * S + 14; const T_HOUSE_BM = 15 * S + 14; const T_HOUSE_BR = 15 * S + 14;

// Roof: ridge row (1040) over body row (1097)
const T_ROOF_TL = 18 * S + 14; const T_ROOF_TM = 18 * S + 14; const T_ROOF_TR = 18 * S + 14;
const T_ROOF_BL = 19 * S + 14; const T_ROOF_BM = 19 * S + 14; const T_ROOF_BR = 19 * S + 14;

// Tents -> small roofed huts (reuse roof tiles)
const T_TENT_TL = 18 * S + 14; const T_TENT_TM = 18 * S + 14; const T_TENT_TR = 18 * S + 14;
const T_TENT_BL = 19 * S + 14; const T_TENT_BM = 19 * S + 14; const T_TENT_BR = 19 * S + 14;

// Fence -> hedge (bush) row
const T_FENCE_H  = 9 * S + 25; const T_FENCE_V  = 9 * S + 25;
const T_FENCE_TL = 9 * S + 25; const T_FENCE_TR = 9 * S + 25;
const T_FENCE_BL = 9 * S + 25; const T_FENCE_BR = 9 * S + 25;

// Campfire (sheet row 8, col 14)
const T_FIRE        = 8 * S + 14;  // 470

// Sign -> bare-tree post
const T_SIGN        = 9 * S + 27;  // 540

// ---- Scale factor: render each 16x16 tile at 4x = 64x64 screen pixels ----
const TILE_PX  = 16;   // source tile size
const TILE_SCL = 4;    // display scale
const TILE_SZ  = TILE_PX * TILE_SCL; // 64 pixels on screen

// World map dimensions in tiles
export const MAP_W = 80;  // columns
export const MAP_H = 60;  // rows

// Depth layers
const D_GROUND   = 0;
const D_ENTITY   = 2000;
const D_UI       = 100000;

// Click-to-move arrival radius
const ARRIVE_PX = 8;

// Important buildings to highlight on the minimap, as [col, row] map anchors.
export const MM_LANDMARKS: [number, number][] = [[18, 37], [40, 45], [66, 23], [70, 32], [73, 26]];

/** Classify a GROUND_MAP cell (Kenney frame ids) into terrain, for the minimap. */
export function classifyGround(frame: number): 'water' | 'dirt' | 'grass' {
  if (frame === T_WATER_C || frame === W_NW || frame === W_N || frame === W_NE ||
      frame === W_W || frame === W_C || frame === W_E ||
      frame === W_SW || frame === W_S || frame === W_SE) return 'water';
  if (frame === T_DIRT || frame === T_DIRT2) return 'dirt';
  return 'grass';
}

// ---- Tile map definition ----
// We define a handcrafted map inspired exactly by Sample1.png:
// grass base + lake + dirt roads + pine forest + buildings + tents

function buildTileMap(): { ground: number[][]; objects: (number | null)[][] } {
  const ground: number[][] = [];
  const objects: (number | null)[][] = [];

  for (let r = 0; r < MAP_H; r++) {
    ground.push(new Array(MAP_W).fill(T_GRASS));
    objects.push(new Array(MAP_W).fill(null));
  }

  // ---- Helper to set tiles ----
  const g = (r: number, c: number, tile: number) => {
    if (r >= 0 && r < MAP_H && c >= 0 && c < MAP_W) ground[r][c] = tile;
  };
  const o = (r: number, c: number, tile: number) => {
    if (r >= 0 && r < MAP_H && c >= 0 && c < MAP_W) objects[r][c] = tile;
  };

  // ---- Grass variation (random-looking but deterministic) ----
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const h = hash2(c, r, 42);
      if (h < 0.04) g(r, c, T_GRASS2);
      else if (h < 0.06) g(r, c, T_GRASS3);
    }
  }

  // ---- Lake (center-left area, rows 18-32, cols 28-42) ----
  // Fill water center
  for (let r = 20; r <= 34; r++) {
    for (let c = 28; c <= 44; c++) {
      g(r, c, T_WATER_C);
    }
  }
  // Irregular lake shape (carve corners)
  for (let r = 20; r <= 22; r++) for (let c = 28; c <= 30; c++) g(r, c, T_GRASS);
  for (let r = 20; r <= 21; r++) for (let c = 41; c <= 44; c++) g(r, c, T_GRASS);
  for (let r = 32; r <= 34; r++) for (let c = 28; c <= 29; c++) g(r, c, T_GRASS);
  for (let r = 33; r <= 34; r++) for (let c = 42; c <= 44; c++) g(r, c, T_GRASS);
  // Extra bump top
  for (let c = 37; c <= 39; c++) g(18, c, T_WATER_C);
  for (let c = 36; c <= 40; c++) g(19, c, T_WATER_C);
  // Water edges (transition tiles: just use grass-adjacent water tiles)
  // N edge
  for (let c = 31; c <= 40; c++) g(19, c, T_WATER_N);
  for (let c = 37; c <= 38; c++) g(17, c, T_WATER_N);
  for (let c = 36; c <= 40; c++) g(18, c, T_WATER_C);
  // S edge
  for (let c = 29; c <= 41; c++) g(35, c, T_WATER_S);
  // W edge  
  for (let r = 21; r <= 33; r++) g(r, 27, T_WATER_W);
  // E edge
  for (let r = 21; r <= 33; r++) g(r, 45, T_WATER_E);

  // Water lily / lily pad decoration objects on water
  o(23, 37, T_FLOWER_Y);
  o(27, 31, T_FLOWER_Y);
  o(29, 41, T_FLOWER_Y);
  o(31, 35, T_PLANT);
  o(25, 43, T_PLANT);

  // ---- Dirt road: horizontal path across map (row 10-11) ----
  for (let c = 0; c < MAP_W; c++) {
    g(10, c, T_DIRT);
    g(11, c, T_DIRT2);
  }
  // Dirt road: vertical right side (cols 62-63)
  for (let r = 0; r < MAP_H; r++) {
    g(r, 62, T_DIRT);
    g(r, 63, T_DIRT2);
  }
  // Bottom path (rows 46-47)
  for (let c = 28; c < MAP_W; c++) {
    g(46, c, T_DIRT);
    g(47, c, T_DIRT2);
  }
  // Vertical path connecting road to bottom (cols 45-46, rows 10-47)
  for (let r = 10; r <= 47; r++) {
    g(r, 55, T_DIRT);
    g(r, 56, T_DIRT2);
  }
  // Short path near lake top (campsite access)
  for (let r = 0; r <= 10; r++) {
    g(r, 42, T_DIRT);
    g(r, 43, T_DIRT2);
  }
  // Path from lake west shore to road
  for (let c = 24; c <= 28; c++) {
    g(28, c, T_DIRT);
    g(29, c, T_DIRT2);
  }

  // ---- Dark grass (swampy area, left side) ----
  for (let r = 5; r <= 18; r++) {
    for (let c = 0; c <= 10; c++) {
      const h = hash2(c, r, 99);
      if (h < 0.5) g(r, c, T_GRASS_DARK);
    }
  }

  // ---- Stone/grey area (right side, "town plaza") ----
  for (let r = 12; r <= 20; r++) {
    for (let c = 64; c <= 78; c++) {
      const h = hash2(c, r, 77);
      if (h < 0.6) g(r, c, T_STONE);
    }
  }
  // Pool on right side
  for (let r = 14; r <= 19; r++) {
    for (let c = 70; c <= 77; c++) {
      g(r, c, T_WATER_C);
    }
  }

  // ---- Pine forest (left side, rows 5-45, cols 0-20) ----
  const pinePositions: [number, number][] = [];
  for (let r = 3; r < 50; r += 3) {
    for (let c = 0; c < 22; c += 3) {
      const h = hash2(c, r, 13);
      if (h < 0.75) {
        const dr = Math.round((hash2(c, r, 101) - 0.5) * 1.5);
        const dc = Math.round((hash2(c, r, 202) - 0.5) * 1.5);
        pinePositions.push([r + dr, c + dc]);
      }
    }
  }
  for (const [r, c] of pinePositions) {
    if (r >= 0 && r < MAP_H && c >= 0 && c < MAP_W) {
      // Single-tile pine (two variants for variety)
      o(r, c, hash2(c, r, 88) > 0.5 ? T_PINE_TOP : T_PINE_BOT);
    }
  }

  // ---- Round trees scattered on grass (middle/right areas) ----
  const roundTreePositions: [number, number][] = [
    [4, 32], [4, 48], [5, 55], [7, 38], [7, 60], [12, 25], [12, 50],
    [15, 35], [15, 68], [17, 47], [18, 60], [22, 18], [25, 22], [25, 68],
    [30, 18], [35, 18], [38, 25], [40, 55], [42, 62], [45, 35], [48, 48],
    [50, 25], [52, 38], [55, 18], [55, 55], [58, 42],
  ];
  for (const [r, c] of roundTreePositions) {
    if (r >= 0 && r < MAP_H && c < MAP_W) {
      // Single-tile round tree (green / autumn variant)
      o(r, c, hash2(c, r, 55) > 0.5 ? T_ROUND2_TOP : T_ROUND_TOP);
    }
  }

  // ---- Rocks ----
  const rocks: [number, number][] = [
    [14, 28], [28, 20], [33, 26], [40, 30], [42, 45], [48, 52],
  ];
  for (const [r, c] of rocks) {
    const t = [T_ROCK1, T_ROCK2, T_ROCK3][Math.floor(hash2(c, r, 7) * 3)];
    o(r, c, t);
  }

  // ---- Lush ground flora: flowers + bushes scattered over ALL grass ----
  // Only on grass tiles, never overwriting a tree/building, so the meadow feels
  // alive without cluttering paths, water or the village.
  const isGrassTile = (r: number, c: number) => {
    const f = ground[r][c];
    return f === T_GRASS || f === T_GRASS2 || f === T_GRASS3 || f === T_GRASS_DARK;
  };
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      if (objects[r][c] !== null || !isGrassTile(r, c)) continue;
      const h = hash2(c, r, 33);
      if (h < 0.06) o(r, c, T_FLOWER_R);
      else if (h < 0.12) o(r, c, T_FLOWER_Y);
      else if (h < 0.17) o(r, c, [T_ROCK1, T_ROCK2, T_ROCK3][Math.floor(hash2(c, r, 7) * 3)]);
    }
  }

  // ---- Campsite top-center: a small dirt clearing under the tents + fire ----
  for (let r = 2; r <= 5; r++) for (let c = 37; c <= 48; c++) {
    g(r, c, hash2(c, r, 66) < 0.3 ? T_DIRT2 : T_DIRT);
  }
  // Tent 1 (rows 2-3, cols 38-41)
  o(2, 38, T_TENT_TL); o(2, 39, T_TENT_TM); o(2, 40, T_TENT_TM); o(2, 41, T_TENT_TR);
  o(3, 38, T_TENT_BL); o(3, 39, T_TENT_BM); o(3, 40, T_TENT_BM); o(3, 41, T_TENT_BR);
  // Tent 2 (rows 2-3, cols 44-47)
  o(2, 44, T_TENT_TL); o(2, 45, T_TENT_TM); o(2, 46, T_TENT_TM); o(2, 47, T_TENT_TR);
  o(3, 44, T_TENT_BL); o(3, 45, T_TENT_BM); o(3, 46, T_TENT_BM); o(3, 47, T_TENT_BR);
  // Campfire center
  o(5, 43, T_FIRE);

  // ---- House 1: bottom-left area (dirt hugs the footprint) ----
  for (let r = 35; r <= 38; r++) for (let c = 16; c <= 21; c++) g(r, c, T_DIRT);
  // House walls 4x3 grid
  o(35, 17, T_HOUSE_TL); o(35, 18, T_HOUSE_TM); o(35, 19, T_HOUSE_TM); o(35, 20, T_HOUSE_TR);
  o(36, 17, T_HOUSE_ML); o(36, 18, T_HOUSE_MM); o(36, 19, T_HOUSE_MM); o(36, 20, T_HOUSE_MR);
  o(37, 17, T_HOUSE_BL); o(37, 18, T_HOUSE_BM); o(37, 19, T_HOUSE_BM); o(37, 20, T_HOUSE_BR);
  // Roof
  o(33, 17, T_ROOF_TL); o(33, 18, T_ROOF_TM); o(33, 19, T_ROOF_TM); o(33, 20, T_ROOF_TR);
  o(34, 17, T_ROOF_BL); o(34, 18, T_ROOF_BM); o(34, 19, T_ROOF_BM); o(34, 20, T_ROOF_BR);

  // ---- House 2: bottom-center (dirt hugs the footprint) ----
  for (let r = 42; r <= 45; r++) for (let c = 38; c <= 43; c++) g(r, c, T_DIRT);
  o(42, 39, T_HOUSE_TL); o(42, 40, T_HOUSE_TM); o(42, 41, T_HOUSE_TM); o(42, 42, T_HOUSE_TR);
  o(43, 39, T_HOUSE_ML); o(43, 40, T_HOUSE_MM); o(43, 41, T_HOUSE_MM); o(43, 42, T_HOUSE_MR);
  o(44, 39, T_HOUSE_BL); o(44, 40, T_HOUSE_BM); o(44, 41, T_HOUSE_BM); o(44, 42, T_HOUSE_BR);
  o(40, 39, T_ROOF_TL); o(40, 40, T_ROOF_TM); o(40, 41, T_ROOF_TM); o(40, 42, T_ROOF_TR);
  o(41, 39, T_ROOF_BL); o(41, 40, T_ROOF_BM); o(41, 41, T_ROOF_BM); o(41, 42, T_ROOF_BR);

  // ---- Town buildings (right side): dirt only under each building + plaza paths ----
  for (let r = 19; r <= 24; r++) for (let c = 64; c <= 68; c++) g(r, c, T_DIRT); // A
  for (let r = 26; r <= 31; r++) for (let c = 67; c <= 71; c++) g(r, c, T_DIRT); // B
  for (let r = 31; r <= 36; r++) for (let c = 63; c <= 68; c++) g(r, c, T_DIRT); // C
  // Building A
  o(21, 65, T_HOUSE_TL); o(21, 66, T_HOUSE_TM); o(21, 67, T_HOUSE_TR);
  o(22, 65, T_HOUSE_ML); o(22, 66, T_HOUSE_MM); o(22, 67, T_HOUSE_MR);
  o(23, 65, T_HOUSE_BL); o(23, 66, T_HOUSE_BM); o(23, 67, T_HOUSE_BR);
  o(19, 65, T_ROOF_TL); o(19, 66, T_ROOF_TM); o(19, 67, T_ROOF_TR);
  o(20, 65, T_ROOF_BL); o(20, 66, T_ROOF_BM); o(20, 67, T_ROOF_BR);
  // Building B
  o(28, 68, T_HOUSE_TL); o(28, 69, T_HOUSE_TM); o(28, 70, T_HOUSE_TR);
  o(29, 68, T_HOUSE_ML); o(29, 69, T_HOUSE_MM); o(29, 70, T_HOUSE_MR);
  o(30, 68, T_HOUSE_BL); o(30, 69, T_HOUSE_BM); o(30, 70, T_HOUSE_BR);
  o(26, 68, T_ROOF_TL); o(26, 69, T_ROOF_TM); o(26, 70, T_ROOF_TR);
  o(27, 68, T_ROOF_BL); o(27, 69, T_ROOF_BM); o(27, 70, T_ROOF_BR);
  // Building C (large)
  o(33, 64, T_HOUSE_TL); o(33, 65, T_HOUSE_TM); o(33, 66, T_HOUSE_TM); o(33, 67, T_HOUSE_TR);
  o(34, 64, T_HOUSE_ML); o(34, 65, T_HOUSE_MM); o(34, 66, T_HOUSE_MM); o(34, 67, T_HOUSE_MR);
  o(35, 64, T_HOUSE_BL); o(35, 65, T_HOUSE_BM); o(35, 66, T_HOUSE_BM); o(35, 67, T_HOUSE_BR);
  o(31, 64, T_ROOF_TL); o(31, 65, T_ROOF_TM); o(31, 66, T_ROOF_TM); o(31, 67, T_ROOF_TR);
  o(32, 64, T_ROOF_BL); o(32, 65, T_ROOF_BM); o(32, 66, T_ROOF_BM); o(32, 67, T_ROOF_BR);

  // ---- Fences (right side, bottom) ----
  for (let c = 64; c <= 75; c++) o(44, c, T_FENCE_H);
  for (let r = 38; r <= 43; r++) o(r, 64, T_FENCE_V);
  o(38, 64, T_FENCE_TL); o(38, 75, T_FENCE_TR);
  o(44, 64, T_FENCE_BL); o(44, 75, T_FENCE_BR);
  for (let r = 38; r <= 43; r++) o(r, 75, T_FENCE_V);

  // ---- Signs ----
  o(10, 54, T_SIGN);
  o(47, 45, T_SIGN);

  // ---- Stumps ----
  o(20, 8, T_STUMP);
  o(38, 14, T_STUMP);

  // ---- Autotile water shorelines ----
  // Snapshot which cells are flat water, then replace each with the grass-banked
  // 9-slice tile matching which sides border land, so the lake/pool get smooth
  // grassy banks instead of a hard square edge.
  const water = ground.map((row) => row.map((f) => f === T_WATER_C));
  const isW = (r: number, c: number) =>
    r >= 0 && r < MAP_H && c >= 0 && c < MAP_W && water[r][c];
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      if (!water[r][c]) continue;
      const n = !isW(r - 1, c), s = !isW(r + 1, c), w = !isW(r, c - 1), e = !isW(r, c + 1);
      let f = W_C;
      if (n && w) f = W_NW;
      else if (n && e) f = W_NE;
      else if (s && w) f = W_SW;
      else if (s && e) f = W_SE;
      else if (n) f = W_N;
      else if (s) f = W_S;
      else if (w) f = W_W;
      else if (e) f = W_E;
      ground[r][c] = f;
    }
  }

  return { ground, objects };
}

// Pre-build the map once
const { ground: GROUND_MAP, objects: OBJECT_MAP } = buildTileMap();
export { GROUND_MAP };

// Sim world bounds (from sim/data.ts — hardcoded here to avoid circular import)
const SIM_X_MIN = -180;
const SIM_Z_MIN = -180;
const SIM_X_MAX =  180;
const SIM_Z_MAX =  900;
const TILE_WORLD_X = (SIM_X_MAX - SIM_X_MIN) / MAP_W;
const TILE_WORLD_Z = (SIM_Z_MAX - SIM_Z_MIN) / MAP_H;

export function worldToTile(x: number, z: number): { col: number; row: number } {
  return {
    col: (x - SIM_X_MIN) / TILE_WORLD_X,
    row: (z - SIM_Z_MIN) / TILE_WORLD_Z,
  };
}

function worldToPixel(x: number, z: number): { px: number; py: number } {
  const t = worldToTile(x, z);
  return { px: t.col * TILE_SZ, py: t.row * TILE_SZ };
}

function pixelToWorld(px: number, py: number): { x: number; z: number } {
  return {
    x: (px / TILE_SZ) * TILE_WORLD_X + SIM_X_MIN,
    z: (py / TILE_SZ) * TILE_WORLD_Z + SIM_Z_MIN,
  };
}

// ---- WorldScene ----
export class WorldScene extends Scene {
  private world!: IWorld;
  private bridge!: SimBridge;

  private playerView!: EntityView;

  // Equipped cosmetic pet: a follower sprite that trails the player.
  private petSprite?: GameObjects.Sprite;
  private petMeta?: PetDef;
  private petPx = 0; private petPy = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Input.Keyboard.Key;
    down: Input.Keyboard.Key;
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
  };

  private entityViews = new Map<number, EntityView>();
  private inCombat = false;
  private offline = false;
  private zoneLabel!: GameObjects.Text;
  private targetRing!: GameObjects.Graphics;
  private moveTarget: { x: number; z: number } | null = null;
  private moveMarker!: GameObjects.Graphics;

  // Radial-ish action menu shown when an entity is clicked (Chat / Fight / …).
  private entityMenu?: GameObjects.Container;

  // Gathering (recall-gated woodcutting + mining) + a unified Gold total.
  private gathering = false;
  private gatherNode?: GameObjects.Image;
  private gatherKind: 'wood' | 'ore' = 'wood';
  private gold = 0;
  private woodcuttingXp = 0;
  private miningXp = 0;

  constructor() {
    super({ key: 'WorldScene', active: false });
  }

  init(): void {
    this.world = this.registry.get('world') as IWorld;
    this.bridge = this.registry.get('simBridge') as SimBridge;
    this.inCombat = false;
    this.offline = this.world.realm === '';
  }

  create(): void {
    const { width, height } = this.scale;

    // Build ground + object layers from tile map
    this.buildGroundLayer();
    this.buildObjectLayer();

    // Procedural character textures (fallback)
    generateCharacterTextures(this);

    // Zone label
    this.zoneLabel = this.add.text(width / 2, 16, 'Vidya Nagar', {
      fontSize: '14px',
      fontFamily: '"Noto Sans", sans-serif',
      color: '#fde68a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(D_UI).setScrollFactor(0);

    // Target ring
    this.targetRing = this.add.graphics().setDepth(D_ENTITY - 0.5);
    this.targetRing.lineStyle(3, 0xffd700, 0.85);
    this.targetRing.strokeCircle(0, 0, TILE_SZ * 0.5);
    this.targetRing.setVisible(false);

    // Move-to marker
    this.moveMarker = this.add.graphics().setDepth(D_UI - 1);
    this.moveMarker.lineStyle(2, 0x00ff88, 0.9);
    this.moveMarker.strokeCircle(0, 0, 10);
    this.moveMarker.setVisible(false);

    // Player view
    const pp = worldToPixel(this.world.player.pos.x, this.world.player.pos.z);
    this.playerView = new EntityView(this, this.world.player, true)
      .setPosition(pp.px, pp.py)
      .setDepth(D_ENTITY);

    // Keyboard input
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Input.Keyboard.KeyCodes.D),
    };

    // Camera: follow player, bounded by the world map
    const mapPxW = MAP_W * TILE_SZ;
    const mapPxH = MAP_H * TILE_SZ;
    this.cameras.main.setBounds(0, 0, mapPxW, mapPxH);
    this.cameras.main.startFollow(this.playerView.container, true, 0.1, 0.1);
    // Zoom framed for a spacious isometric-MMO feel (kintara/RuneScape show a lot
    // of the world at once): ~14 tiles across the 1280 canvas, so characters read
    // ~1 tile and don't crowd the view. (Canvas is native-res so this stays sharp;
    // only the previous low-res upscale caused blur.)
    this.cameras.main.setZoom(1.4);

    // Click empty ground to move; clicking an entity (or a menu button) is handled
    // by that object and must NOT also move or dismiss via this handler.
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over && over.length > 0) return; // an interactive object was clicked
      this.closeEntityMenu();
      const w = pixelToWorld(ptr.worldX, ptr.worldY);
      this.moveTarget = { x: w.x, z: w.z };
    });

    // Combat end listener
    this.events.on(Events.COMBAT_END, this.onCombatEnd, this);

    // HUD scene (owns the minimap, using the exported map data)
    this.scene.launch('HUDScene');

    // Gold total for the HUD (offline: seed from the sim; combat + gathering add).
    this.gold = this.world.copper || 0;
    this.events.emit(Events.HUD_UPDATE_MINDCOINS, this.gold);

    // Recall-gated gathering results — QuizScene emits back here via returnTo.
    this.events.on(Events.QUIZ_CORRECT, () => this.finishGather(true), this);
    this.events.on(Events.QUIZ_WRONG, () => this.finishGather(false), this);
    this.events.on(Events.QUIZ_TIMEOUT, () => this.finishGather(false), this);

    // Daily quests: shared state in the registry; HUD claims award Gold here.
    this.registry.set('daily', loadDaily());
    this.events.on(Events.DAILY_CLAIM, (r: { gold: number; xp: number }) => {
      this.addGold(r.gold);
      this.emitMsg(`Daily complete!  +${r.gold} Gold`);
    }, this);

    // Cosmetic shop: shared state in the registry; WorldScene owns Gold + look.
    const cos = loadCosmetics();
    this.registry.set('cosmetics', cos);
    this.registry.set('equippedHat', cos.equippedHat);
    if (cos.equippedPet) this.spawnPet(cos.equippedPet);
    this.events.on(Events.SHOP_BUY, this.onShopBuy, this);
    this.events.on(Events.SHOP_EQUIP, this.onShopEquip, this);

    // Gathered-resource inventory + Trading Post sales.
    this.registry.set('resources', loadResources());
    this.events.on(Events.MARKET_SELL, this.onMarketSell, this);
  }

  /** Sell gathered resources for Gold at the Trading Post. */
  private onMarketSell(o: { kind: ResourceId; count: number }): void {
    const res = this.registry.get('resources') as ResourceState | undefined;
    if (!res) return;
    const def = RESOURCE_DEFS.find((d) => d.id === o.kind);
    const count = Math.min(o.count, res[o.kind]);
    if (!def || count <= 0) return;
    const gold = count * def.price;
    addResource(res, o.kind, -count);
    saveResources(res);
    this.addGold(gold);
    this.emitMsg(`Sold ${count} ${def.label}  ·  +${gold} Gold`);
    this.events.emit(Events.RESOURCES_CHANGED);
  }

  // ---- Cosmetic shop (Gold spend + appearance) ----------------------------

  private onShopBuy(o: { kind: 'hat' | 'pet'; ref: number | string; price: number }): void {
    const cos = this.registry.get('cosmetics') as CosmeticState | undefined;
    if (!cos) return;
    if (this.gold < o.price) { this.emitMsg('Not enough Gold.'); return; }
    this.gold -= o.price;
    if (o.kind === 'hat') cos.ownedHats[o.ref as number] = true;
    else cos.ownedPets[o.ref as string] = true;
    saveCosmetics(cos);
    this.pushHUDUpdate();
    this.emitMsg(`Purchased!  -${o.price} Gold`);
    this.events.emit(Events.SHOP_CHANGED);
  }

  private onShopEquip(o: { kind: 'hat' | 'pet'; ref: number | string }): void {
    const cos = this.registry.get('cosmetics') as CosmeticState | undefined;
    if (!cos) return;
    if (o.kind === 'hat') {
      const idx = o.ref as number;
      cos.equippedHat = cos.equippedHat === idx ? 0 : idx; // toggle off if re-equipping
      this.registry.set('equippedHat', cos.equippedHat);
      this.playerView.refreshLpcAppearance();
    } else {
      const id = o.ref as string;
      cos.equippedPet = cos.equippedPet === id ? '' : id;
      if (cos.equippedPet) this.spawnPet(cos.equippedPet); else this.clearPet();
    }
    saveCosmetics(cos);
    this.events.emit(Events.SHOP_CHANGED);
  }

  private spawnPet(id: string): void {
    const def = petDef(id);
    if (!def || !this.textures.exists(def.key)) { this.clearPet(); return; }
    this.clearPet();
    this.petMeta = def;
    const pp = worldToPixel(this.world.player.pos.x, this.world.player.pos.z);
    this.petPx = pp.px - 22; this.petPy = pp.py + 6;
    this.petSprite = this.add.sprite(this.petPx, this.petPy, def.key, 1)
      .setOrigin(0.5, 0.9).setScale(1.6).setDepth(D_ENTITY);
  }

  private clearPet(): void {
    this.petSprite?.destroy();
    this.petSprite = undefined;
    this.petMeta = undefined;
  }

  /** Trail the player; face + animate a 3-frame walk toward the target point. */
  private updatePet(targetX: number, targetY: number): void {
    const s = this.petSprite, def = this.petMeta;
    if (!s || !def) return;
    // A point just behind/beside the player, so the pet doesn't overlap the body.
    const tx = targetX - 22, ty = targetY + 6;
    const dx = tx - this.petPx, dy = ty - this.petPy;
    const dist = Math.hypot(dx, dy);
    const moving = dist > 1.5;
    if (moving) { const k = Math.min(1, 0.15); this.petPx += dx * k; this.petPy += dy * k; }
    s.setPosition(this.petPx, this.petPy).setDepth(D_ENTITY + this.petPy);
    // Direction row: 0 down, 1 left, 2 right, 3 up (standard 4-row walk sheets).
    let dir = 0;
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 2 : 1;
    else dir = dy >= 0 ? 0 : 3;
    const col = moving ? Math.floor(this.time.now / 150) % def.cols : 1;
    s.setFrame(dir * def.cols + col);
  }

  /** Advance daily-quest progress for a gameplay event + notify the HUD. */
  private bumpDaily(type: 'chop' | 'battle' | 'answer', n = 1): void {
    const s = this.registry.get('daily') as DailyState | undefined;
    if (!s) return;
    bumpDailyState(s, type, n);
    saveDaily(s);
    this.events.emit(Events.DAILY_CHANGED);
  }

  // Classify a GROUND_MAP cell into terrain (shared with the HUD minimap).
  private terrainOf(frame: number): 'water' | 'dirt' | 'grass' {
    return classifyGround(frame);
  }

  /** Tiny Swords ground: painterly grass / dirt path / water, to match the units. */
  private buildGroundLayer(): void {
    const hasTS = this.textures.exists('ts-tilemap-grass');
    const GRASS = [10]; // pure-grass centre tile of the 9x6 tilemap (no foam edge)
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const t = this.terrainOf(GROUND_MAP[r][c]);
        const cx = c * TILE_SZ + TILE_SZ / 2;
        const cy = r * TILE_SZ + TILE_SZ / 2;
        if (hasTS) {
          if (t === 'water') {
            this.add.image(cx, cy, 'ts-water').setDisplaySize(TILE_SZ + 2, TILE_SZ + 2).setDepth(D_GROUND);
          } else if (t === 'dirt') {
            this.add.image(cx, cy, 'ts-tilemap-dirt', 10).setDisplaySize(TILE_SZ + 2, TILE_SZ + 2).setDepth(D_GROUND + 1);
          } else {
            const f = GRASS[Math.floor(hash2(c, r, 5) * GRASS.length)];
            this.add.image(cx, cy, 'ts-tilemap-grass', f).setDisplaySize(TILE_SZ + 2, TILE_SZ + 2).setDepth(D_GROUND);
          }
        } else {
          const col = t === 'water' ? 0x3f6f8f : t === 'dirt' ? 0x9a6f43 : 0x6aa84f;
          this.add.graphics().setDepth(D_GROUND).fillStyle(col, 1)
            .fillRect(c * TILE_SZ, r * TILE_SZ, TILE_SZ, TILE_SZ);
        }
      }
    }
  }

  /**
   * Tiny Swords decorations + buildings. The hand-map's object frames are mapped
   * to TS art: trees/bushes -> lush bushes, rocks -> boulders, flowers -> small
   * bushes; the tiled house/roof/tent frames are skipped and replaced by whole
   * TS building sprites placed at the village/town anchors.
   */
  private buildObjectLayer(): void {
    if (!this.textures.exists('ts-bush1')) return;
    const TREE = new Set<number>([T_PINE_TOP, T_PINE_BOT, T_ROUND_TOP, T_ROUND2_TOP]);
    const SMALL = new Set<number>([T_ROCK1, T_ROCK2, T_ROCK3, T_FLOWER_R, T_FLOWER_Y, T_MUSHROOM, T_PLANT]);
    const BUSHES = ['ts-bush1', 'ts-bush2', 'ts-bush3', 'ts-bush4'];
    const ROCKS = ['ts-rock1', 'ts-rock2', 'ts-rock3', 'ts-rock4'];

    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const frame = OBJECT_MAP[r][c];
        if (frame === null) continue;
        const baseY = r * TILE_SZ + TILE_SZ;          // bottom of the tile
        const cx = c * TILE_SZ + TILE_SZ / 2;
        const depth = D_ENTITY + baseY;
        if (TREE.has(frame)) {
          const key = BUSHES[Math.floor(hash2(c, r, 3) * BUSHES.length)];
          const tree = this.add.image(cx, baseY, key, 0).setOrigin(0.5, 0.85)
            .setDisplaySize(TILE_SZ * 1.4, TILE_SZ * 1.4).setDepth(depth)
            .setInteractive({ useHandCursor: true });
          tree.on('pointerdown', () => this.startGather(tree)); // recall-gated woodcutting
        } else if (SMALL.has(frame)) {
          if (hash2(c, r, 9) < 0.5) {
            const key = BUSHES[Math.floor(hash2(c, r, 4) * BUSHES.length)];
            this.add.image(cx, baseY, key, 0).setOrigin(0.5, 0.85)
              .setDisplaySize(TILE_SZ * 0.8, TILE_SZ * 0.8).setDepth(depth);
          } else {
            const key = ROCKS[Math.floor(hash2(c, r, 6) * ROCKS.length)];
            const rock = this.add.image(cx, baseY, key).setOrigin(0.5, 0.9)
              .setDisplaySize(TILE_SZ * 0.7, TILE_SZ * 0.7).setDepth(depth)
              .setInteractive({ useHandCursor: true });
            rock.on('pointerdown', () => this.startGather(rock, 'ore')); // recall-gated mining
          }
        }
        // house/roof/tent/fire/sign frames are intentionally skipped here.
      }
    }
    this.buildBuildings();
  }

  /** Place whole Tiny Swords building sprites at the village + town anchors. */
  private buildBuildings(): void {
    const place = (key: string, col: number, row: number, w: number, h: number) => {
      if (!this.textures.exists(key)) return;
      const x = col * TILE_SZ + TILE_SZ / 2;
      const baseY = row * TILE_SZ + TILE_SZ;
      this.add.image(x, baseY, key).setOrigin(0.5, 1)
        .setDisplaySize(w, h).setDepth(D_ENTITY + baseY);
    };
    // Village houses (south-west + south-centre). House1 is the Trading Post
    // where gathered Wood/Ore is sold for Gold.
    this.placeBuilding('ts-house1', 18, 37, TILE_SZ * 2, TILE_SZ * 3, 'Trading Post', Events.OPEN_MARKET);
    place('ts-house2', 40, 45, TILE_SZ * 2, TILE_SZ * 3);
    // Town (east): a tower, the big castle and a monastery around the plaza
    place('ts-tower', 66, 23, TILE_SZ * 2, TILE_SZ * 4);
    place('ts-castle', 70, 32, TILE_SZ * 5, TILE_SZ * 4);
    // Monastery doubles as the Cosmetics Emporium — click it to open the shop.
    this.placeBuilding('ts-monastery', 73, 26, TILE_SZ * 3, TILE_SZ * 3, 'Cosmetics Emporium', Events.OPEN_SHOP);
  }

  /** A labelled, clickable building that opens a panel (shop / market). */
  private placeBuilding(key: string, col: number, row: number, w: number, h: number, label: string, event: string): void {
    if (!this.textures.exists(key)) return;
    const x = col * TILE_SZ + TILE_SZ / 2;
    const baseY = row * TILE_SZ + TILE_SZ;
    const b = this.add.image(x, baseY, key).setOrigin(0.5, 1)
      .setDisplaySize(w, h).setDepth(D_ENTITY + baseY)
      .setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => this.events.emit(event));
    this.add.text(x, baseY - h - 4, label, {
      fontSize: '12px', fontFamily: '"Noto Sans", sans-serif',
      color: '#fde68a', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(D_ENTITY + baseY + 1);
  }

  update(): void {
    const events = this.bridge ? this.bridge.drain() : [];
    if (events.length) this.events.emit(Events.SIM_EVENTS, events);

    if (this.inCombat) return;

    const alpha = this.bridge ? this.bridge.alpha : 1;

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    if (this.offline) this.steerOffline(up, down, left, right);
    else {
      this.world.moveInput.forward     = up;
      this.world.moveInput.back        = down;
      this.world.moveInput.strafeLeft  = left;
      this.world.moveInput.strafeRight = right;
    }

    // Sync player view
    const playerIp = interpPos(this.world.player, alpha);
    const pp = worldToPixel(playerIp.x, playerIp.z);
    this.playerView
      .setPosition(pp.px, pp.py)
      .setDepth(D_ENTITY + pp.py);
    this.playerView.update(this.world.player);

    // Cosmetic pet trails the player.
    if (this.petSprite) this.updatePet(pp.px, pp.py);

    // Sync entities
    this.syncEntities(alpha);

    // Target ring
    this.updateTargetRing(alpha);

    // Combat is now started intentionally (click a mob -> Fight), not by auto-aggro.

    // Zone label
    this.updateZoneLabel();
  }

  private updateZoneLabel(): void {
    const p = this.world.player;
    for (const zone of ZONES) {
      const dx = p.pos.x - zone.hub.x;
      const dz = p.pos.z - zone.hub.z;
      if (Math.sqrt(dx * dx + dz * dz) < zone.hub.radius * 2) {
        this.zoneLabel.setText(zone.hub.name);
        return;
      }
    }
    this.zoneLabel.setText('');
  }

  private steerOffline(up: boolean, down: boolean, left: boolean, right: boolean): void {
    const mi = this.world.moveInput;
    mi.forward = mi.back = mi.strafeLeft = mi.strafeRight = mi.turnLeft = mi.turnRight = false;

    const p = this.world.player;
    let facing: number | null = null;

    const dsx = (right ? 1 : 0) - (left ? 1 : 0); // +1 = screen-right
    const dsy = (down  ? 1 : 0) - (up   ? 1 : 0); // +1 = screen-down
    if (dsx !== 0 || dsy !== 0) {
      this.moveTarget = null;
      // Screen maps directly to world: +x = right, +z = down. Sim forward is
      // (sin facing, cos facing) = (worldX, worldZ), so facing = atan2(dx, dz).
      facing = Math.atan2(dsx, dsy);
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - p.pos.x;
      const dz = this.moveTarget.z - p.pos.z;
      if (dx * dx + dz * dz <= (ARRIVE_PX / TILE_SZ * TILE_WORLD_X) ** 2)
        this.moveTarget = null;
      else
        facing = Math.atan2(dx, dz);
    }

    if (facing !== null) {
      p.facing = facing;
      mi.forward = true;
    }

    if (this.moveTarget) {
      const mp = worldToPixel(this.moveTarget.x, this.moveTarget.z);
      this.moveMarker.setVisible(true).setPosition(mp.px, mp.py);
    } else {
      this.moveMarker.setVisible(false);
    }
  }

  private updateTargetRing(alpha: number): void {
    const tid = this.world.player.targetId;
    const target = tid != null ? this.world.entities.get(tid) : undefined;
    if (!target || target.dead) {
      this.targetRing.setVisible(false);
      return;
    }
    const ip = interpPos(target, alpha);
    const pp = worldToPixel(ip.x, ip.z);
    this.targetRing
      .setVisible(true)
      .setPosition(pp.px, pp.py);
  }

  private syncEntities(alpha: number): void {
    const currentIds = new Set<number>();
    for (const [id, entity] of this.world.entities.entries()) {
      if (id === this.world.playerId) continue;
      if (this.offline && entity.kind === 'player') continue;
      currentIds.add(id);

      const ip = interpPos(entity, alpha);
      const pp = worldToPixel(ip.x, ip.z);

      let view = this.entityViews.get(id);
      if (!view) {
        view = new EntityView(this, entity, false)
          .setInteractiveTarget(() => { this.world.targetEntity(id); this.openEntityMenu(id); });
        this.entityViews.set(id, view);
      }
      view.setPosition(pp.px, pp.py).setDepth(D_ENTITY + pp.py);
      view.update(entity);
    }

    for (const id of this.entityViews.keys()) {
      if (!currentIds.has(id)) {
        this.entityViews.get(id)!.destroy();
        this.entityViews.delete(id);
      }
    }
  }

  /** Action menu (Chat / Fight / Challenge / Talk) shown above a clicked entity. */
  private openEntityMenu(id: number): void {
    this.closeEntityMenu();
    const e = this.world.entities.get(id);
    if (!e || e.dead) return;

    interface Act { label: string; color: number; fn: () => void; }
    const acts: Act[] = [];
    if (e.kind === 'mob') {
      acts.push({ label: 'Fight', color: 0xb91c1c, fn: () => this.startCombat(e) });
      acts.push({ label: 'Inspect', color: 0x3b2a1e, fn: () => this.emitMsg(`${e.name}  ·  Lv ${(e as { level?: number }).level ?? 1}`) });
    } else if (e.kind === 'npc') {
      acts.push({ label: 'Talk', color: 0x1d4ed8, fn: () => { this.world.targetEntity(id); this.world.interact(); } });
      acts.push({ label: 'Chat', color: 0x3b2a1e, fn: () => this.emitMsg(`You greet ${e.name}.`) });
    } else if (e.kind === 'player') {
      acts.push({ label: 'Chat', color: 0x1d4ed8, fn: () => this.emitMsg('Namaste!') });
      acts.push({ label: 'Challenge', color: 0xb91c1c, fn: () => { this.world.duelRequest(id); this.emitMsg(`Challenge sent to ${e.name}.`); } });
    } else {
      return; // objects have no menu
    }

    const pp = worldToPixel(e.pos.x, e.pos.z);
    const bw = 118, bh = 30, gap = 6;
    const cont = this.add.container(pp.px, pp.py).setDepth(D_UI);
    acts.forEach((a, i) => {
      const by = -72 - (acts.length - 1 - i) * (bh + gap);
      const r = this.add.rectangle(0, by, bw, bh, a.color, 0.96).setStrokeStyle(2, 0xfde68a, 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => r.setFillStyle(a.color, 1).setScale(1.04))
        .on('pointerout', () => r.setFillStyle(a.color, 0.96).setScale(1))
        .on('pointerdown', () => { a.fn(); this.closeEntityMenu(); });
      const t = this.add.text(0, by, a.label, {
        fontSize: '13px', fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      cont.add([r, t]);
    });
    this.entityMenu = cont;
  }

  private closeEntityMenu(): void {
    this.entityMenu?.destroy();
    this.entityMenu = undefined;
  }

  private emitMsg(text: string): void {
    this.events.emit(Events.HUD_SHOW_MESSAGE, text);
  }

  /** Recall-gated gathering: fell a tree (wood) or mine a rock (ore) by
   *  answering a question correctly. */
  private startGather(node: GameObjects.Image, kind: 'wood' | 'ore' = 'wood'): void {
    if (this.gathering || this.inCombat) return;
    this.closeEntityMenu();
    const q = this.pickGatherQuestion();
    if (!q) { this.emitMsg('No questions available.'); return; }
    const p = this.world.player;
    const tw = pixelToWorld(node.x, node.y);
    if (this.offline) p.facing = Math.atan2(tw.x - p.pos.x, tw.z - p.pos.z); // face the node
    this.gathering = true;
    this.gatherNode = node;
    this.gatherKind = kind;
    this.emitMsg(kind === 'ore' ? 'Mining — answer to break it!' : 'Chopping — answer to fell it!');
    this.scene.launch('QuizScene', { question: q, abilityId: kind === 'ore' ? 'mine' : 'chop', returnTo: 'WorldScene' });
  }

  private finishGather(correct: boolean): void {
    if (!this.gathering) return;
    this.gathering = false;
    this.scene.stop('QuizScene');
    const node = this.gatherNode;
    const ore = this.gatherKind === 'ore';
    this.gatherNode = undefined;
    if (correct) {
      const xp = 10;
      if (ore) this.miningXp += xp; else this.woodcuttingXp += xp;
      // Gathering yields resources; sell them at the Trading Post for Gold.
      const res = this.registry.get('resources') as ResourceState | undefined;
      if (res) { addResource(res, ore ? 'ore' : 'wood', 1); saveResources(res); this.events.emit(Events.RESOURCES_CHANGED); }
      this.bumpDaily(ore ? 'answer' : 'chop'); // no dedicated mine daily yet
      this.bumpDaily('answer');
      this.floatWorldText(node, `+1 ${ore ? 'Ore' : 'Wood'}`, '#fde047');
      this.emitMsg(`${ore ? 'Mining' : 'Woodcutting'} +${xp} XP  ·  sell at the Trading Post`);
      if (node) {
        this.tweens.add({ targets: node, angle: { from: -7, to: 7 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => node.setAngle(0) });
      }
    } else {
      this.floatWorldText(node, ore ? 'The rock holds firm!' : 'The tree resists!', '#fca5a5');
    }
  }

  private pickGatherQuestion(): Question | null {
    const raw = this.registry.get('questions') as Question[] | { questions: Question[] } | undefined;
    const arr = Array.isArray(raw) ? raw : raw?.questions ?? [];
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  }

  private addGold(n: number): void {
    this.gold += n;
    this.events.emit(Events.HUD_UPDATE_MINDCOINS, this.gold);
  }

  private floatWorldText(obj: GameObjects.Image | undefined, text: string, color: string): void {
    const pref = worldToPixel(this.world.player.pos.x, this.world.player.pos.z);
    const px = obj?.x ?? pref.px;
    const py = (obj?.y ?? pref.py) - 50;
    const t = this.add.text(px, py, text, {
      fontSize: '16px', fontFamily: '"Noto Sans", sans-serif', color, fontStyle: 'bold',
      stroke: '#0b160b', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_UI - 1);
    this.tweens.add({ targets: t, y: py - 44, alpha: { from: 1, to: 0 }, duration: 1000, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  private checkAggroEncounters(): void {
    if (!this.world.player.inCombat) return;
    let closestHostile: Entity | null = null;
    let minDist = 99999;
    for (const entity of this.world.entities.values()) {
      if (entity.kind === 'npc' || entity.dead || entity.id === this.world.playerId) continue;
      const dist = Math.hypot(
        this.world.player.pos.x - entity.pos.x,
        this.world.player.pos.z - entity.pos.z,
      );
      if (dist < 10 && dist < minDist) { minDist = dist; closestHostile = entity; }
    }
    if (closestHostile) this.startCombat(closestHostile);
  }

  private startCombat(enemy: Entity): void {
    this.inCombat = true;
    this.cameras.main.flash(200, 220, 38, 38);
    this.world.moveInput.forward = this.world.moveInput.back =
      this.world.moveInput.strafeLeft = this.world.moveInput.strafeRight = false;

    this.time.delayedCall(250, () => {
      this.scene.launch('CombatScene', {
        enemy: {
          id: enemy.id,
          label: enemy.name || 'Monster',
          subject: 'maths',
          tier: Math.max(1, Math.min(6, Math.floor(((enemy as any).level ?? 1) / 10) + 1)),
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
    if (result.mindcoins) this.gold += result.mindcoins; // combat gold folds into the total
    if (result.won) { this.bumpDaily('battle'); this.bumpDaily('answer'); }
    this.pushHUDUpdate();
    this.scene.resume('WorldScene');
  }

  private pushHUDUpdate(): void {
    this.events.emit(Events.HUD_UPDATE_HP, { hp: this.world.player.hp, maxHp: this.world.player.maxHp });
    this.events.emit(Events.HUD_UPDATE_MINDCOINS, this.gold);
    this.events.emit(Events.HUD_UPDATE_XP, this.world.xp);
  }
}
