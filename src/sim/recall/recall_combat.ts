// Recall combat power-moments: pure state + selection helpers.
// Questions fire as occasional power-moments (not per-swing tolls). Answer quality
// becomes a charge multiplier on the next outgoing hit(s). Selection uses a
// hash-based pick so the main sim Rng stream is never touched (determinism parity).
// See docs/bharatverse/game-design.md S3.

import { hash2 } from '../rng';
import { RECALL_POOL_ROTATION } from './fixture_bank';
import { poolFor, type QuestionBank } from './question_bank';
import type { QuizQuestionEnvelope, QuizQuestionResponse } from './question_types';
import { type RecallResolution, resolveRecall } from './recall_session';

/** Tunable combat-recall cadence (BharatVerse; adjust here, never inline). */
export const RECALL_COMBAT = {
  /** Min sim seconds between power-moments for one player. */
  COOLDOWN_S: 14,
  /** If unanswered, auto-resolve as wrong at this many sim seconds. */
  TIMEOUT_S: 18,
  /** How many outgoing hits consume the power charge after an answer. */
  CHARGE_HITS: 1,
  /** Default charge mult when none is armed. */
  BASE_MULT: 1,
} as const;

/** Server-only pending question (answer key stays here until resolve). */
export interface RecallPending {
  question: QuizQuestionEnvelope;
  poolKey: string;
  subject: string;
  /** Sim time when the question was offered. */
  startedAt: number;
  /** Sim time when unanswered auto-fails. */
  expiresAt: number;
}

/** Client-safe question (no answer key / explanation until after submit). */
export interface RecallClientPrompt {
  id: string;
  prompt: string;
  options: string[];
  subject: string;
  difficulty?: string;
  /** Sim-time deadline (for HUD countdown; client may also use wall clock). */
  expiresAt: number;
}

/** Last resolved outcome for HUD toast / feedback. */
export interface RecallClientResult {
  correct: boolean;
  powerMult: number;
  isCrit: boolean;
  masteryXpGain: number;
  combo: number;
  masteryTier: number;
  explanation?: string;
  prompt: string;
}

export function questionPromptText(q: QuizQuestionEnvelope): string {
  return (q.question_text || q.question || q.prompt || '').trim();
}

/** Strip answer material for the wire / HUD. */
export function toClientPrompt(pending: RecallPending): RecallClientPrompt {
  const q = pending.question;
  return {
    id: q.id ?? `${pending.poolKey}:${pending.startedAt}`,
    prompt: questionPromptText(q),
    options: Array.isArray(q.options) ? q.options.slice() : [],
    subject: pending.subject,
    difficulty: q.difficulty,
    expiresAt: pending.expiresAt,
  };
}

/**
 * Pick a question without drawing from the main sim Rng. Uses hash2 so combat
 * determinism traces stay byte-identical when recall offers fire.
 */
export function pickQuestionHashed(
  bank: QuestionBank,
  poolKey: string,
  worldSeed: number,
  saltA: number,
  saltB: number,
): QuizQuestionEnvelope | null {
  const pool = poolFor(bank, poolKey);
  if (pool.length === 0) return null;
  const u = hash2(saltA | 0, saltB | 0, worldSeed | 0);
  const idx = Math.min(pool.length - 1, Math.floor(u * pool.length));
  return pool[idx] ?? null;
}

/** Rotate pool by offer count so subjects cycle without rng. */
export function poolKeyForOffer(offerIndex: number): string {
  const i = Math.abs(Math.floor(offerIndex)) % RECALL_POOL_ROTATION.length;
  return RECALL_POOL_ROTATION[i];
}

export function subjectFromPoolKey(poolKey: string): string {
  const i = poolKey.indexOf(':');
  return i > 0 ? poolKey.slice(0, i) : poolKey;
}

export interface OfferRecallInput {
  bank: QuestionBank;
  worldSeed: number;
  now: number;
  /** Monotonic per-player offer counter (also salts the hash). */
  offerIndex: number;
  playerId: number;
  cooldownUntil: number;
  hasPending: boolean;
}

/** Decide whether to open a new power-moment and build the pending payload. */
export function tryBuildRecallOffer(input: OfferRecallInput): RecallPending | null {
  if (input.hasPending) return null;
  if (input.now < input.cooldownUntil) return null;
  const poolKey = poolKeyForOffer(input.offerIndex);
  const q = pickQuestionHashed(
    input.bank,
    poolKey,
    input.worldSeed,
    input.playerId,
    input.offerIndex * 9973 + Math.floor(input.now * 20),
  );
  if (!q) return null;
  return {
    question: q,
    poolKey,
    subject: subjectFromPoolKey(poolKey) || q.subject || 'gk',
    startedAt: input.now,
    expiresAt: input.now + RECALL_COMBAT.TIMEOUT_S,
  };
}

export interface AnswerRecallInput {
  pending: RecallPending;
  selectedIndex: number;
  timingMs: number;
  masteryXp: number;
  combo: number;
  now: number;
}

export interface AnswerRecallOutput {
  resolution: RecallResolution;
  result: RecallClientResult;
  /** Charge mult to arm on the player. */
  chargeMult: number;
  chargeHits: number;
  nextCombo: number;
  masteryXpGain: number;
  subject: string;
  /** Cooldown until the next offer. */
  cooldownUntil: number;
}

/** Resolve a submitted (or timed-out) answer into power + mastery + HUD result. */
export function answerRecallMoment(input: AnswerRecallInput): AnswerRecallOutput {
  const timedOut = input.now >= input.pending.expiresAt;
  const response: QuizQuestionResponse = {
    type: 'mcq',
    selectedIndex: timedOut ? -1 : input.selectedIndex,
  };
  const resolution = resolveRecall({
    question: input.pending.question,
    response,
    masteryXp: input.masteryXp,
    combo: input.combo,
    timingMs: timedOut ? RECALL_COMBAT.TIMEOUT_S * 1000 : Math.max(0, input.timingMs),
  });
  // Timed-out answers are always wrong (learning still shows the explanation).
  const correct = timedOut ? false : resolution.correct;
  const powerMult = timedOut ? 0.4 : resolution.powerMult;
  const nextCombo = correct ? resolution.nextCombo : 0;
  const masteryXpGain = correct ? resolution.masteryXpGain : 0;
  const isCrit = correct && resolution.isCrit;

  return {
    resolution: {
      ...resolution,
      correct,
      powerMult,
      isCrit,
      masteryXpGain,
      nextCombo,
    },
    result: {
      correct,
      powerMult,
      isCrit,
      masteryXpGain,
      combo: nextCombo,
      masteryTier: resolution.masteryTier,
      explanation: input.pending.question.explanation,
      prompt: questionPromptText(input.pending.question),
    },
    chargeMult: powerMult,
    chargeHits: RECALL_COMBAT.CHARGE_HITS,
    nextCombo,
    masteryXpGain,
    subject: input.pending.subject,
    cooldownUntil: input.now + RECALL_COMBAT.COOLDOWN_S,
  };
}

/** Apply an armed recall charge to an outgoing damage amount. Returns new amount + remaining hits. */
export function applyRecallCharge(
  amount: number,
  chargeMult: number,
  chargeHitsLeft: number,
): { amount: number; chargeHitsLeft: number; chargeMult: number; applied: boolean } {
  if (chargeHitsLeft <= 0 || chargeMult === RECALL_COMBAT.BASE_MULT || amount <= 0) {
    return { amount, chargeHitsLeft, chargeMult, applied: false };
  }
  const nextHits = chargeHitsLeft - 1;
  return {
    amount: Math.max(1, Math.round(amount * chargeMult)),
    chargeHitsLeft: nextHits,
    chargeMult: nextHits > 0 ? chargeMult : RECALL_COMBAT.BASE_MULT,
    applied: true,
  };
}
