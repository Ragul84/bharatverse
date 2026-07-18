// Leitner-style spaced repetition for BharatVerse recall (game-design.md S4).
// Pure: no DOM, no Math.random/Date.now. The host passes nowMs (lockoutNowMs on
// the server, sim-clock offline) so due times stay host-authoritative.

/** Tunable Leitner intervals (milliseconds from now when a card becomes due). */
export const LEITNER = {
  /** Box 0 = new / failed; higher boxes are longer retention. */
  MAX_BOX: 5,
  /**
   * Interval AFTER a correct answer lands the card IN this box.
   * Index = box. Box 0 is "immediate retry" (due now) after a miss.
   */
  INTERVALS_MS: [
    0, // box 0: due immediately (failed / new miss)
    10 * 60 * 1000, // box 1: 10 min
    60 * 60 * 1000, // box 2: 1 hour
    6 * 60 * 60 * 1000, // box 3: 6 hours
    24 * 60 * 60 * 1000, // box 4: 1 day
    3 * 24 * 60 * 60 * 1000, // box 5: 3 days
  ] as readonly number[],
} as const;

/** One card in the player's review deck (keyed by question id). */
export interface RecallCard {
  /** Leitner box 0..MAX_BOX. */
  box: number;
  /** Host clock ms when the card is next due for review. */
  dueAtMs: number;
  /** Subject key (for mastery panel grouping). */
  subject: string;
}

export type RecallCardMap = Map<string, RecallCard>;

const clampBox = (b: number): number => {
  const n = Math.floor(b);
  if (n < 0) return 0;
  if (n > LEITNER.MAX_BOX) return LEITNER.MAX_BOX;
  return n;
};

/**
 * Schedule a card after an answer. Correct advances the box; wrong resets to 0.
 * Deterministic for a given (box, correct, nowMs).
 */
export function scheduleAfterAnswer(
  prev: RecallCard | null | undefined,
  subject: string,
  correct: boolean,
  nowMs: number,
): RecallCard {
  const nextBox = correct ? clampBox((prev?.box ?? 0) + 1) : 0;
  const interval = LEITNER.INTERVALS_MS[nextBox] ?? LEITNER.INTERVALS_MS[LEITNER.MAX_BOX];
  return {
    box: nextBox,
    dueAtMs: Math.max(0, nowMs) + interval,
    subject,
  };
}

/** True when the card should be offered in a review power-moment. */
export function isCardDue(card: RecallCard, nowMs: number): boolean {
  return card.dueAtMs <= nowMs;
}

/** All due question ids, stable-sorted by dueAt then id. */
export function dueCardIds(cards: RecallCardMap, nowMs: number): string[] {
  const due: { id: string; dueAtMs: number }[] = [];
  for (const [id, card] of cards) {
    if (isCardDue(card, nowMs)) due.push({ id, dueAtMs: card.dueAtMs });
  }
  due.sort((a, b) => a.dueAtMs - b.dueAtMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return due.map((d) => d.id);
}

/** Count of due cards (for HUD badge). */
export function dueCardCount(cards: RecallCardMap, nowMs: number): number {
  let n = 0;
  for (const card of cards.values()) if (isCardDue(card, nowMs)) n++;
  return n;
}

/** Serialize cards for JSONB character save (omitted when empty by caller). */
export function serializeRecallCards(cards: RecallCardMap): Record<string, RecallCard> {
  return Object.fromEntries(cards);
}

/** Load cards from a save blob (additive: missing/invalid rows skipped). */
export function loadRecallCards(raw: Record<string, unknown> | undefined | null): RecallCardMap {
  const out: RecallCardMap = new Map();
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw)) {
    if (!id || !v || typeof v !== 'object') continue;
    const row = v as Partial<RecallCard>;
    if (typeof row.box !== 'number' || typeof row.dueAtMs !== 'number') continue;
    const subject = typeof row.subject === 'string' && row.subject ? row.subject : 'gk';
    out.set(id, {
      box: clampBox(row.box),
      dueAtMs: Math.max(0, row.dueAtMs),
      subject,
    });
  }
  return out;
}
