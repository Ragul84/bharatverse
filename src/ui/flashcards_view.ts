// Pure view model for the Flashcards / review deck panel (M3).

export interface FlashcardRowView {
  id: string;
  prompt: string;
  subject: string;
  box: number;
}

export interface FlashcardsPanelView {
  due: FlashcardRowView[];
  dueCount: number;
  empty: boolean;
  /** In-session: questions left after the current one (Study Hall multi-quiz). */
  studyRemaining: number;
}

export function buildFlashcardsPanelView(input: {
  due: readonly FlashcardRowView[];
  studyRemaining?: number;
}): FlashcardsPanelView {
  const due = input.due.map((d) => ({
    id: d.id,
    prompt: d.prompt,
    subject: d.subject,
    box: Math.max(0, Math.floor(d.box)),
  }));
  return {
    due,
    dueCount: due.length,
    empty: due.length === 0,
    studyRemaining: Math.max(0, Math.floor(input.studyRemaining ?? 0)),
  };
}
