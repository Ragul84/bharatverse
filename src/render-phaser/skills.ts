/**
 * Subject Mastery — our version of kintara's tool tiers. Doing an activity earns
 * XP in its skill; higher levels = more gather yield and more combat damage
 * ("your mastery is your upgraded tool"). Levels cap at 20. Persists in
 * localStorage. Recall (combat, Study Hall) is what drives Combat mastery; the
 * gathering skills level from the click-and-gather loop.
 */

export type SkillId = 'woodcutting' | 'mining' | 'combat';

export interface SkillDef { id: SkillId; label: string; color: number; }
export const SKILL_DEFS: SkillDef[] = [
  { id: 'woodcutting', label: 'Woodcutting', color: 0x22c55e },
  { id: 'mining',      label: 'Mining',      color: 0x93c5fd },
  { id: 'combat',      label: 'Combat',      color: 0xf87171 },
];

export type SkillState = Record<SkillId, number>; // xp per skill

export const MAX_LEVEL = 20;

/** Cumulative XP needed to *reach* level L (quadratic curve; L20 ≈ 18,050 XP). */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * (level - 1);
}

/** Level (1..20) for a given total XP. */
export function levelForXp(xp: number): number {
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1);
}

/** Bar helper: current level + fraction toward the next. */
export function levelProgress(xp: number): { level: number; frac: number } {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) return { level, frac: 1 };
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, frac: Math.max(0, Math.min(1, (xp - cur) / (next - cur))) };
}

/** Extra materials per gather from Woodcutting/Mining level (+1 every 5 levels). */
export function gatherBonus(level: number): number {
  return Math.floor((level - 1) / 5);
}

/** Combat damage multiplier from Combat level (up to ~+76% at L20). */
export function combatDamageMult(level: number): number {
  return 1 + 0.04 * (level - 1);
}

function fresh(): SkillState {
  return { woodcutting: 0, mining: 0, combat: 0 };
}

export function loadSkills(): SkillState {
  try {
    const raw = localStorage.getItem('bv_skills');
    if (raw) {
      const s = JSON.parse(raw) as Partial<SkillState>;
      return { woodcutting: s.woodcutting ?? 0, mining: s.mining ?? 0, combat: s.combat ?? 0 };
    }
  } catch { /* ignore */ }
  return fresh();
}

export function saveSkills(s: SkillState): void {
  try { localStorage.setItem('bv_skills', JSON.stringify(s)); } catch { /* ignore */ }
}

/** Add XP; returns true if the skill leveled up (for a "Lv N!" toast). */
export function addSkillXp(s: SkillState, id: SkillId, xp: number): boolean {
  const before = levelForXp(s[id]);
  s[id] += xp;
  return levelForXp(s[id]) > before;
}
