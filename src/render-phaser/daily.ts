/**
 * Daily quests — the third Gold source (alongside battles + gathering). A small
 * fixed set of goals that reset each day; progress is bumped by gameplay events
 * and rewards are claimed from the HUD. State persists in localStorage.
 */

export interface DailyDef {
  id: string;
  label: string;
  type: 'chop' | 'battle' | 'answer';
  goal: number;
  gold: number;
  xp: number;
}

export const DAILY_DEFS: DailyDef[] = [
  { id: 'd_chop',   label: 'Chop 8 trees',        type: 'chop',   goal: 8,  gold: 40, xp: 60 },
  { id: 'd_battle', label: 'Win 3 battles',       type: 'battle', goal: 3,  gold: 60, xp: 80 },
  { id: 'd_answer', label: 'Answer 15 questions', type: 'answer', goal: 15, gold: 50, xp: 70 },
];

export interface DailyState {
  date: string;
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function freshDaily(): DailyState {
  return { date: todayKey(), progress: {}, claimed: {} };
}

export function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem('bv_daily');
    if (raw) {
      const s = JSON.parse(raw) as DailyState;
      if (s && s.date === todayKey()) return { date: s.date, progress: s.progress ?? {}, claimed: s.claimed ?? {} };
    }
  } catch { /* ignore */ }
  return freshDaily();
}

export function saveDaily(s: DailyState): void {
  try { localStorage.setItem('bv_daily', JSON.stringify(s)); } catch { /* ignore */ }
}

/** Increment progress for every daily matching `type` (capped at its goal). */
export function bumpDaily(s: DailyState, type: DailyDef['type'], n = 1): void {
  for (const d of DAILY_DEFS) {
    if (d.type === type) s.progress[d.id] = Math.min(d.goal, (s.progress[d.id] ?? 0) + n);
  }
}

export function isComplete(s: DailyState, d: DailyDef): boolean {
  return (s.progress[d.id] ?? 0) >= d.goal;
}
export function isClaimable(s: DailyState, d: DailyDef): boolean {
  return isComplete(s, d) && !s.claimed[d.id];
}
