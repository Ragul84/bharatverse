// Study Hall multi-question session helpers (M3). Pure, host-agnostic.

/** Tunable Study Hall session size. */
export const STUDY_SESSION = {
  /** Default number of questions in a focused Study Hall run. */
  DEFAULT_COUNT: 5,
  /** Hard cap so a session cannot run forever. */
  MAX_COUNT: 10,
} as const;

/** Clamp a requested session length to a safe range. */
export function clampStudyCount(count: number | undefined): number {
  const n = Math.floor(count ?? STUDY_SESSION.DEFAULT_COUNT);
  if (n < 1) return 1;
  if (n > STUDY_SESSION.MAX_COUNT) return STUDY_SESSION.MAX_COUNT;
  return n;
}

/**
 * After finishing one question, how many remain in the session (not including
 * the one just answered). Zero means the session is complete.
 */
export function remainingAfterAnswer(remainingIncludingCurrent: number): number {
  return Math.max(0, Math.floor(remainingIncludingCurrent) - 1);
}

export interface FlashcardDueView {
  id: string;
  prompt: string;
  subject: string;
  box: number;
}

/** Build a flashcard front from bank lookup; skip ids missing from the bank. */
export function buildFlashcardDueList(
  dueIds: readonly string[],
  cards: ReadonlyMap<string, { subject: string; box: number }>,
  lookup: (id: string) => { prompt: string; subject?: string } | null,
): FlashcardDueView[] {
  const out: FlashcardDueView[] = [];
  for (const id of dueIds) {
    const q = lookup(id);
    if (!q) continue;
    const card = cards.get(id);
    out.push({
      id,
      prompt: q.prompt,
      subject: card?.subject || q.subject || 'gk',
      box: card?.box ?? 0,
    });
  }
  return out;
}
