import type { Question, Subject } from './content/questions';

export interface KnowledgeResult {
  correct: boolean;
  timeTakenMs: number;
  damageMultiplier: number;  // 0.0 = miss, 0.5 = slow, 1.0 = normal, 2.0 = fast, 3.0 = critical
  xpBonus: number;
  comboIncrement: number;
}

// Map mob IDs to subjects (BharatVerse mob → subject)
export const MOB_SUBJECT_MAP: Record<string, Subject> = {
  // Zone 1 — Gangapur Nagari (General Knowledge + History)
  gyaan_bhediya:      'current_affairs',
  vigyan_varah:       'science',
  jaal_makdi:         'maths',
  bharatiya_makara:   'geography',
  pariksha_pisach:    'current_affairs',
  bhool_bhoolaiya:    'history',
  adhura_chor:        'civics',
  mahavidya:          'current_affairs',   // full syllabus boss
  // Zone 2 — Vigyan Vana (Science + Biology + Chemistry)
  vana_rakshasa:      'biology',
  rasayan_pisach:     'chemistry',
  // Zone 3 — Gyan Shikhar (Physics + Math + Economics)
  ganan_asura:        'maths',
  bhautik_bhoot:      'physics',
  // Fallback for any unmapped mob
  default:            'current_affairs',
};

export function getMobSubject(mobId: string): Subject {
  return MOB_SUBJECT_MAP[mobId] ?? MOB_SUBJECT_MAP['default'];
}

export function calcKnowledgeResult(
  correct: boolean,
  timeTakenMs: number,
  comboCount: number,
  playerClass: string,
): KnowledgeResult {
  if (!correct) {
    return {
      correct: false,
      timeTakenMs,
      damageMultiplier: 0,
      xpBonus: 2,
      comboIncrement: -comboCount, // reset combo on wrong answer
    };
  }

  // Speed tiers (mirrors real exam time pressure)
  let mult = 1.0;
  if      (timeTakenMs < 3000)  mult = 3.0;  // Critical — answered instantly
  else if (timeTakenMs < 8000)  mult = 2.0;  // Fast
  else if (timeTakenMs < 15000) mult = 1.0;  // Normal
  else                          mult = 0.5;  // Slow (answered, but barely)

  // Combo multiplier (streaks reward discipline)
  const newCombo = comboCount + 1;
  if      (newCombo >= 10) mult *= 4; // Brahma Mode — ten in a row
  else if (newCombo >= 5)  mult *= 2; // Gyan Surge  — five in a row

  // Class subject affinity bonus
  const affinityBonus: Record<string, number> = {
    brahmarishi: 1.3, // Chanakya Scholar: knowledge bonus
    kshatriya:   1.5, // Subhash Warrior: speed and decisiveness
    vaishya:     0.9, // Arjuna Archer: focused target
    shilpi:      1.1, // Aryabhatta Mage: methodical science
    vaidya:      1.0, // Dhanvantari Healer: balanced healing
    shaman:      1.2, // Saraswati Bard: linguistic wisdom
  };
  mult *= affinityBonus[playerClass] ?? 1.0;

  const xpBonus = Math.round(15 * (timeTakenMs < 5000 ? 1.5 : 1));

  return {
    correct: true,
    timeTakenMs,
    damageMultiplier: mult,
    xpBonus,
    comboIncrement: 1,
  };
}

// When to trigger a knowledge check during combat.
// Returns true if this attack should spawn a question modal.
export function shouldTriggerQuestion(
  attackCount: number,     // nth attack this combat session (1-indexed)
  isBoss: boolean,
  mobSubject: string,
  _playerLastSubject: string,
): boolean {
  if (isBoss)           return true;  // Boss always requires knowledge check
  if (attackCount === 1) return true;  // First attack always triggers
  return attackCount % 3 === 0;        // Every 3rd attack thereafter
}

// Combo tier label for UI
export function getComboTierLabel(comboCount: number): string | null {
  if (comboCount >= 10) return 'BRAHMA MODE';
  if (comboCount >= 5)  return 'GYAN SURGE';
  if (comboCount >= 3)  return 'GYANI';
  return null;
}

// XP multiplier from subject mastery — called in quest XP calculation
export function getMasteryXpMultiplier(masteryScore: number): number {
  if (masteryScore >= 80) return 1.5;
  if (masteryScore >= 60) return 1.25;
  if (masteryScore >= 40) return 1.1;
  return 1.0;
}
