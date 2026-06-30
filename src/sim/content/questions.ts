/**
 * Question type definitions for BharatVerse MindGains system.
 *
 * These types are used by:
 *  - QuizScene (render and validate answers)
 *  - CombatScene (pick subject-appropriate questions)
 *  - server/questions.ts (API endpoint and DB queries)
 *  - public/data/questions_sample.json (static seed data)
 *
 * No DOM/browser imports - safe for use in sim/ and server contexts.
 */

import { Rng } from '../rng';

export type Subject =
  | 'maths'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'geography'
  | 'civics'
  | 'science'   // combined science (Class 6-8 before split)
  | 'english'
  | 'current_affairs';

/** Difficulty tier 1-6 matching NCERT levels and competitive exams. */
export type QuestionTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Question {
  /** Unique string ID (e.g. "maths_t1_001") */
  id: string;

  subject: Subject;

  /** 1 (easiest, Class 6) to 6 (hardest, UPSC/JEE Advanced) */
  tier: QuestionTier;

  /** NCERT class (6-12), or null for competitive exam questions */
  ncert_class: number | null;

  question: string;

  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };

  /** 'a' | 'b' | 'c' | 'd' */
  correct: 'a' | 'b' | 'c' | 'd';

  /** Short explanation shown after answering */
  explanation: string;

  /** Time limit in seconds (default 8) */
  time_limit_seconds: number;

  /** MindCoins awarded on correct answer */
  mindcoins_reward: number;

  /** Source attribution */
  source: 'ncert' | 'upsc' | 'jee' | 'neet' | 'ssc' | 'custom';
}

/** Question bank grouped by subject for quick lookup */
export interface QuestionBank {
  questions: Question[];
}

/**
 * Pick a question from the bank, preferring questions that match the given
 * subject and tier range; falls back to any question if no match is found.
 *
 * Determinism: this module lives in the sim core, so selection MUST go through
 * `Rng` (never `Math.random`). The authoritative caller (server / offline Sim)
 * passes its own seeded `Rng`, so the same world state always picks the same
 * question — required for replay, the RL env, and server authority over recall.
 */
export function pickQuestion(
  bank: Question[],
  subject: Subject,
  tierMin: QuestionTier,
  tierMax: QuestionTier,
  rng: Rng,
): Question {
  const filtered = bank.filter(
    q => q.subject === subject && q.tier >= tierMin && q.tier <= tierMax,
  );
  const pool = filtered.length > 0 ? filtered : bank;
  return rng.pick(pool);
}
