// Recall session: the pure, server-authoritative resolution of ONE recall attempt. This is
// the capstone that composes the recall system - it takes the stored question, the player's
// submitted answer, and their Subject Mastery + combo, and produces the full outcome the
// sim applies to a combat hit / gather yield: correctness, the power multiplier, the Mastery
// XP to grant, the next combo, and the explanation to show (learning happens on a miss too).
//
// The sim/combat layer calls `resolveRecall` when a player submits an answer; the question's
// answer key never leaves the server until after this runs (anti-cheat). Question SELECTION
// is `pickQuestion` (question_bank.ts). PURITY: no DOM/rng/clock; deterministic; sim-only.

import { evaluateQuizQuestion, type QuizQuestionEnvelope, type QuizQuestionResponse } from './question_types';
import { evaluateRecallPower } from './recall_power';
import { masteryLevelFromXp, masteryTierFromLevel } from './subject_mastery';

/** Tunable Mastery-XP rewards for a recall (BharatVerse mechanic; adjust here, never inline). */
export const RECALL_SESSION = {
  /** Base Mastery XP for a correct answer. */
  XP_PER_CORRECT: 15,
  /** Extra XP when the correct answer also crits (fast). */
  CRIT_XP_BONUS: 5,
  /** XP scales with the question's difficulty. */
  DIFFICULTY_MULT: { easy: 1, medium: 1.5, hard: 2 } as Record<string, number>,
} as const;

export interface RecallParams {
  /** The stored question (with its answer key), server-side only. */
  question: QuizQuestionEnvelope;
  /** What the player submitted. */
  response: QuizQuestionResponse;
  /** The player's current accumulated Mastery XP for this question's subject. */
  masteryXp: number;
  /** The player's current consecutive-correct combo (before this answer). */
  combo: number;
  /** Milliseconds taken to answer (question shown -> submit). */
  timingMs: number;
}

export interface RecallResolution {
  correct: boolean;
  /** Multiplier for the combat hit / gather yield. */
  powerMult: number;
  isCrit: boolean;
  /** Mastery XP to add for this subject (0 on a miss). */
  masteryXpGain: number;
  /** The combo to store after this answer. */
  nextCombo: number;
  /** The mastery tier used for the power calc (for HUD readout). */
  masteryTier: number;
  /** Shown to the player after answering - teaches on a miss too (may be undefined). */
  explanation?: string;
}

function difficultyMult(difficulty: string | undefined): number {
  if (!difficulty) return 1;
  return RECALL_SESSION.DIFFICULTY_MULT[difficulty] ?? 1;
}

/**
 * Resolve a submitted answer into the full recall outcome. Server-authoritative: it runs the
 * answer check and the power/XP math here, so the client only ever sends its choice + timing.
 */
export function resolveRecall(params: RecallParams): RecallResolution {
  const evaluation = evaluateQuizQuestion(params.question, params.response);
  const correct = evaluation.isCorrect;

  const masteryTier = masteryTierFromLevel(masteryLevelFromXp(params.masteryXp));
  const power = evaluateRecallPower({
    correct,
    timingMs: params.timingMs,
    masteryTier,
    combo: params.combo,
  });

  const masteryXpGain = power.grantsMasteryXp
    ? Math.round(
        (RECALL_SESSION.XP_PER_CORRECT + (power.isCrit ? RECALL_SESSION.CRIT_XP_BONUS : 0)) *
          difficultyMult(params.question.difficulty),
      )
    : 0;

  return {
    correct,
    powerMult: power.powerMult,
    isCrit: power.isCrit,
    masteryXpGain,
    nextCombo: power.nextCombo,
    masteryTier,
    explanation: params.question.explanation,
  };
}
