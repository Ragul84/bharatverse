// Pure view model for the Subject Mastery / review panel (BharatVerse M1).
// DOM-free; unit-tested. Painter: mastery_panel.ts.

import { type MasteryProgress, masteryProgress } from '../sim/recall/subject_mastery';

export interface MasteryRowView {
  subject: string;
  level: number;
  tier: number;
  /** 0..1 bar fill. */
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number | null;
  totalXp: number;
}

export interface MasteryPanelView {
  rows: MasteryRowView[];
  dueCount: number;
  combo: number;
  empty: boolean;
}

export interface MasteryPanelInput {
  /** subject -> total mastery XP. */
  mastery: ReadonlyMap<string, number> | Record<string, number>;
  dueCount: number;
  combo: number;
  /** Optional fixed subject order; unknown subjects append sorted. */
  preferredOrder?: readonly string[];
}

function toMap(src: MasteryPanelInput['mastery']): Map<string, number> {
  if (src instanceof Map) return new Map(src);
  return new Map(Object.entries(src));
}

function rowFor(subject: string, totalXp: number): MasteryRowView {
  const p: MasteryProgress = masteryProgress(totalXp);
  return {
    subject,
    level: p.level,
    tier: p.tier,
    progress: p.progress,
    xpIntoLevel: Math.round(p.xpIntoLevel),
    xpForLevel: Number.isFinite(p.xpForLevel) ? Math.round(p.xpForLevel) : null,
    totalXp: Math.max(0, Math.floor(totalXp)),
  };
}

/**
 * Build the mastery panel rows. Subjects with XP are listed first in preferred
 * order, then any remaining keys alphabetically. Always shows preferred subjects
 * at zero XP so the panel teaches the subject set even on a new character.
 */
export function buildMasteryPanelView(input: MasteryPanelInput): MasteryPanelView {
  const map = toMap(input.mastery);
  const preferred = input.preferredOrder ?? ['gk', 'science', 'maths', 'history'];
  const seen = new Set<string>();
  const rows: MasteryRowView[] = [];
  for (const s of preferred) {
    seen.add(s);
    rows.push(rowFor(s, map.get(s) ?? 0));
  }
  const extras = [...map.keys()].filter((k) => !seen.has(k)).sort();
  for (const s of extras) rows.push(rowFor(s, map.get(s) ?? 0));
  const anyXp = rows.some((r) => r.totalXp > 0);
  return {
    rows,
    dueCount: Math.max(0, Math.floor(input.dueCount)),
    combo: Math.max(0, Math.floor(input.combo)),
    empty: !anyXp && input.dueCount <= 0,
  };
}
