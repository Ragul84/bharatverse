/**
 * Per-family monster art. Mobs render as real creature sheets (skeleton, spider,
 * …) instead of red-tinted humans. Each family maps to a MobSheet describing its
 * frame grid + direction rows; unmapped families fall back to the tinted LPC
 * human in entity_view. Texture keys are loaded in BootScene.
 */

import { MOBS } from '../sim/data';
import type { Entity } from '../sim/types';

export interface MobSheet {
  key: string;
  /** 'lpc' = 13-wide humanoid layout (walk rows 8-11); 'grid' = dir rows 0-3. */
  kind: 'lpc' | 'grid';
  cols: number;        // columns in the sheet
  walkFrames: number;  // animation frames used per direction
  scale: number;
  frameStep: number;   // ms per frame
}

// A mob family → its sheet. Only families with real art are listed; the rest
// keep the tinted-LPC fallback.
const FAMILY_SHEETS: Partial<Record<string, MobSheet>> = {
  undead: { key: 'mob-skeleton', kind: 'lpc',  cols: 13, walkFrames: 8, scale: 1.5, frameStep: 110 },
  spider: { key: 'mob-spider',   kind: 'grid', cols: 10, walkFrames: 8, scale: 1.3, frameStep: 100 },
};

/** The monster sheet for this entity's family, or null to use the fallback. */
export function mobSheetFor(e: Entity): MobSheet | null {
  if (e.kind !== 'mob') return null;
  const fam = MOBS[e.templateId]?.family;
  return (fam && FAMILY_SHEETS[fam]) ?? null;
}

/** Frame index for the entity's 4-direction facing + walk cycle. */
export function mobFrame(sheet: MobSheet, e: Entity, moving: boolean, nowMs: number): number {
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
