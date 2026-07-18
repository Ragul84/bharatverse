// Pure view model for the recall power-moment panel (BharatVerse learning combat).
// DOM-free; unit-tested. The painter in recall_prompt.ts consumes this structure.

import type { RecallClientPrompt, RecallClientResult } from '../world_api';

export interface RecallPromptView {
  open: boolean;
  prompt: string;
  options: string[];
  subject: string;
  difficulty: string;
  /** 0..1 remaining time fraction for a countdown bar (1 = just opened). */
  timeFrac: number;
  combo: number;
  lastResult: {
    correct: boolean;
    powerMult: number;
    isCrit: boolean;
    explanation: string;
  } | null;
}

export interface RecallPromptViewInput {
  prompt: RecallClientPrompt | null;
  lastResult: RecallClientResult | null;
  combo: number;
  /** Current sim time (seconds). */
  now: number;
}

/**
 * Build the HUD view for the active power-moment (or a short result flash when
 * the prompt has just closed). Pure: no DOM, no wall clock.
 */
export function buildRecallPromptView(input: RecallPromptViewInput): RecallPromptView {
  const p = input.prompt;
  if (p) {
    // RECALL_COMBAT.TIMEOUT_S is 18; keep pure core free of the combat module import.
    const remaining = Math.max(0, p.expiresAt - input.now);
    const timeFrac = Math.min(1, remaining / 18);
    return {
      open: true,
      prompt: p.prompt,
      options: p.options.slice(),
      subject: p.subject,
      difficulty: p.difficulty ?? '',
      timeFrac,
      combo: input.combo,
      lastResult: null,
    };
  }
  const last = input.lastResult;
  if (last) {
    return {
      open: false,
      prompt: last.prompt,
      options: [],
      subject: '',
      difficulty: '',
      timeFrac: 0,
      combo: input.combo,
      lastResult: {
        correct: last.correct,
        powerMult: last.powerMult,
        isCrit: last.isCrit,
        explanation: last.explanation ?? '',
      },
    };
  }
  return {
    open: false,
    prompt: '',
    options: [],
    subject: '',
    difficulty: '',
    timeFrac: 0,
    combo: input.combo,
    lastResult: null,
  };
}
