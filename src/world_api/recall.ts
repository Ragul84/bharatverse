// IWorldRecall: active-recall power-moments + mastery / review (BharatVerse).
// Facet is string-free and host-free: types only from sim/recall, no DOM/t().

import type { RecallClientPrompt, RecallClientResult } from '../sim/recall/recall_combat';

export type { RecallClientPrompt, RecallClientResult };

/** One subject row for the mastery skills panel. */
export interface MasterySubjectView {
  subject: string;
  totalXp: number;
  level: number;
  tier: number;
  progress: number;
}

export interface IWorldRecall {
  /** Live power-moment question for the local player, or null when idle. */
  readonly recallPrompt: RecallClientPrompt | null;
  /** Consecutive-correct combo for the local player. */
  readonly recallCombo: number;
  /** Last resolved outcome (for HUD feedback); null before first answer. */
  readonly recallLastResult: RecallClientResult | null;
  /** Subject Mastery XP map (subject key -> total XP). */
  readonly masteryBySubject: ReadonlyMap<string, number>;
  /** How many Leitner cards are due for review right now. */
  readonly reviewDueCount: number;
  /**
   * Submit an MCQ choice for the active power-moment.
   * `timingMs` is client-measured time from show to submit (server clamps / may
   * recompute from sim timeout). No-op when no prompt is active.
   */
  answerRecall(selectedIndex: number, timingMs: number): void;
  /**
   * Start a review power-moment from the earliest due Leitner card.
   * No-op if a prompt is already open or nothing is due.
   */
  startRecallReview(): void;
  /** Active Learning Goal id (Guru), or null if unset. */
  readonly learningGoalId: string | null;
  /** Set Learning Goal (Guru); null clears. */
  setLearningGoal(goalId: string | null): void;
  /**
   * Study Hall: open a focused quiz power-moment (ignores combat cooldown).
   * No-op if a prompt is already open.
   */
  startStudyHallQuiz(): void;
}
