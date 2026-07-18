// IWorldRecall: active-recall power-moments (BharatVerse learning combat).
// Facet is string-free and host-free: types only from sim/recall, no DOM/t().

import type { RecallClientPrompt, RecallClientResult } from '../sim/recall/recall_combat';

export type { RecallClientPrompt, RecallClientResult };

export interface IWorldRecall {
  /** Live power-moment question for the local player, or null when idle. */
  readonly recallPrompt: RecallClientPrompt | null;
  /** Consecutive-correct combo for the local player. */
  readonly recallCombo: number;
  /** Last resolved outcome (for HUD feedback); null before first answer. */
  readonly recallLastResult: RecallClientResult | null;
  /**
   * Submit an MCQ choice for the active power-moment.
   * `timingMs` is client-measured time from show to submit (server clamps / may
   * recompute from sim timeout). No-op when no prompt is active.
   */
  answerRecall(selectedIndex: number, timingMs: number): void;
}
