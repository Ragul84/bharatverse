/**
 * Per-family monster art. Mobs render as real creature sheets (skeleton, spider,
 * wolf, …) instead of red-tinted humans. Each mob maps to a MobSheet describing
 * its frame layout; unmapped mobs fall back to the tinted LPC human.
 *
 * Sheet kinds:
 *  - 'lpc'  : the 13-wide humanoid layout (walk rows 8-11), same as characters.
 *  - 'grid' : a top-down sheet with one direction per row (0=up..3=right).
 *  - 'quad' : a side-view quadruped — an explicit walk-frame list, mirrored for
 *             left; the same side view is used for vertical movement (a common
 *             top-down convention). Facing handled via mobFlipX in entity_view.
 */

import { MOBS } from '../sim/data';
import type { Entity } from '../sim/types';

export interface MobSheet {
  key: string;
  kind: 'lpc' | 'grid' | 'quad';
  cols: number;         // columns in the sheet (grid/lpc)
  walkFrames: number;   // frames per direction (grid/lpc)
  scale: number;
  frameStep: number;    // ms per frame
  sideFrames?: number[]; // 'quad': the side-view walk cycle (faces right)
}

// Whole mob families that map to one sheet.
const FAMILY_SHEETS: Partial<Record<string, MobSheet>> = {
  undead: { key: 'mob-skeleton', kind: 'lpc',  cols: 13, walkFrames: 8, scale: 1.5, frameStep: 110 },
  spider: { key: 'mob-spider',   kind: 'grid', cols: 10, walkFrames: 8, scale: 1.3, frameStep: 100 },
};

// Specific creatures (by templateId keyword) that override the family sheet.
const WOLF: MobSheet = {
  key: 'mob-wolf', kind: 'quad', cols: 10, walkFrames: 4, scale: 1.35,
  frameStep: 120, sideFrames: [15, 16, 17, 18], // row-1 side-view walk (faces right)
};

/** The monster sheet for this entity, or null to use the fallback. */
export function mobSheetFor(e: Entity): MobSheet | null {
  if (e.kind !== 'mob') return null;
  const tid = e.templateId;
  if (tid.includes('wolf') || tid === 'old_greyjaw') return WOLF;
  const fam = MOBS[tid]?.family;
  return (fam && FAMILY_SHEETS[fam]) ?? null;
}

/** True when a side-view ('quad') mob should be mirrored (heading left). */
export function mobFlipX(sheet: MobSheet, e: Entity): boolean {
  return sheet.kind === 'quad' && Math.sin(e.facing) < -0.1;
}

/** Frame index for the entity's facing + walk cycle. */
export function mobFrame(sheet: MobSheet, e: Entity, moving: boolean, nowMs: number): number {
  if (sheet.kind === 'quad') {
    const fr = sheet.sideFrames!;
    return moving ? fr[Math.floor(nowMs / sheet.frameStep) % fr.length] : fr[0];
  }

  const vx = Math.sin(e.facing), vz = Math.cos(e.facing);
  // dir: 0 up, 1 left, 2 down, 3 right
  let dir: number;
  if (Math.abs(vx) > Math.abs(vz)) dir = vx > 0 ? 3 : 1;
  else dir = vz >= 0 ? 2 : 0;

  if (sheet.kind === 'lpc') {
    const row = [8, 9, 10, 11][dir]; // up, left, down, right
    const col = moving ? 1 + (Math.floor(nowMs / sheet.frameStep) % sheet.walkFrames) : 0;
    return row * sheet.cols + col;
  }
  // grid: one direction per row (0..3), col 0 = idle
  const col = moving ? Math.floor(nowMs / sheet.frameStep) % sheet.walkFrames : 0;
  return dir * sheet.cols + col;
}
