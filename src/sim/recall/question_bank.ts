// The recall question bank: an immutable, versioned catalog of normalized questions
// grouped into pools (one pool per subject/topic/difficulty key), plus deterministic,
// `Rng`-seeded selection.
//
// This is the sim-side face of the synced quizhub corpus (docs/bharatverse/
// quizhub-integration.md): a background job LRANGEs each `quiz:subject:*` list from
// Upstash Redis, normalizes each entry, and hands the results to `buildQuestionBank` to
// produce a fixed snapshot. The sim then selects `Rng`-seeded over that snapshot and NEVER
// touches Redis mid-tick, so "same seed => same question order" holds (determinism +
// server-authority). Purity: only imports the sim `Rng` and the sibling question types.

import { Rng } from '../rng';
import { normalizeQuizQuestion, type QuizQuestionEnvelope } from './question_types';

/** A raw corpus entry paired with the pool it belongs to (subject/topic/difficulty key). */
export interface RawQuestionEntry {
  poolKey: string;
  raw: unknown;
}

/** An immutable snapshot of the corpus: poolKey -> normalized questions. */
export interface QuestionBank {
  readonly version: string;
  readonly pools: ReadonlyMap<string, readonly QuizQuestionEnvelope[]>;
}

/**
 * Build a bank from raw entries. Entries that fail to normalize (no usable prompt) are
 * dropped. Pool order preserves first-seen insertion order of valid entries, so a given
 * input list always yields a byte-identical bank (determinism starts at build time).
 */
export function buildQuestionBank(version: string, entries: readonly RawQuestionEntry[]): QuestionBank {
  const pools = new Map<string, QuizQuestionEnvelope[]>();
  for (const entry of entries) {
    const normalized = normalizeQuizQuestion(entry.raw);
    if (!normalized) continue;
    let pool = pools.get(entry.poolKey);
    if (!pool) {
      pool = [];
      pools.set(entry.poolKey, pool);
    }
    pool.push(normalized);
  }
  return { version, pools };
}

/** The questions in a pool (empty array if the pool is absent). */
export function poolFor(bank: QuestionBank, poolKey: string): readonly QuizQuestionEnvelope[] {
  return bank.pools.get(poolKey) ?? [];
}

/** Number of questions in a pool (the LLEN analogue). */
export function poolSize(bank: QuestionBank, poolKey: string): number {
  return poolFor(bank, poolKey).length;
}

/** Every pool key present in the bank, in insertion order. */
export function poolKeys(bank: QuestionBank): string[] {
  return [...bank.pools.keys()];
}

/**
 * Deterministically pick one question from a pool. Returns null if the pool is empty.
 * Draws exactly one value from `rng`, so the same seed + call order yields the same pick.
 */
export function pickQuestion(rng: Rng, bank: QuestionBank, poolKey: string): QuizQuestionEnvelope | null {
  const pool = poolFor(bank, poolKey);
  if (pool.length === 0) return null;
  return pool[rng.int(0, pool.length - 1)];
}

/**
 * Deterministically pick up to `count` DISTINCT questions from a pool (an ordered, seeded
 * quiz set - the "give me 15 questions for this match/session" case). Uses a Fisher-Yates
 * shuffle driven entirely by `rng`, so the same seed reproduces the exact set and order.
 * Never mutates the bank.
 */
export function pickQuestionSet(
  rng: Rng,
  bank: QuestionBank,
  poolKey: string,
  count: number,
): QuizQuestionEnvelope[] {
  const pool = poolFor(bank, poolKey);
  const n = Math.min(count, pool.length);
  if (n <= 0) return [];
  const shuffled = shuffle(rng, pool);
  return shuffled.slice(0, n);
}

/**
 * A pure Fisher-Yates shuffle over a copy of `arr`, driven by `rng`. Deterministic for a
 * given seed + call order. Exported for reuse (e.g. shuffling answer options).
 */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
