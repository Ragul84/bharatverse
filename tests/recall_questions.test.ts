import { describe, expect, it } from 'vitest';
import { Rng } from '../src/sim/rng';
import {
  evaluateQuizQuestion,
  inferQuestionType,
  normalizeQuizQuestion,
  type QuizQuestionEnvelope,
} from '../src/sim/recall/question_types';
import {
  buildQuestionBank,
  pickQuestion,
  pickQuestionSet,
  poolKeys,
  poolSize,
  shuffle,
  type RawQuestionEntry,
} from '../src/sim/recall/question_bank';

// A raw entry as it appears in the mindwhite/quizhub corpus (note `correct_answer` and
// `type`, the field-name drift the normalizer must absorb).
const rawMcq = {
  id: 'q1',
  question: 'Capital of India?',
  type: 'mcq',
  options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
  correct_answer: 1,
  explanation: 'New Delhi is the capital.',
  subject: 'polity',
};

describe('normalizeQuizQuestion', () => {
  it('absorbs corpus field drift (correct_answer -> answer_index, type -> question_type)', () => {
    const q = normalizeQuizQuestion(rawMcq);
    expect(q).not.toBeNull();
    expect(q!.answer_index).toBe(1);
    expect(q!.question_type).toBe('mcq');
    expect(q!.options).toEqual(['Mumbai', 'New Delhi', 'Kolkata', 'Chennai']);
    expect(q!.question).toBe('Capital of India?');
  });

  it('parses a raw JSON string entry (as stored in the Redis list)', () => {
    const q = normalizeQuizQuestion(JSON.stringify(rawMcq));
    expect(q?.answer_index).toBe(1);
  });

  it('returns null when there is no usable prompt', () => {
    expect(normalizeQuizQuestion({ options: ['a', 'b'] })).toBeNull();
    expect(normalizeQuizQuestion('not json')).toBeNull();
    expect(normalizeQuizQuestion(null)).toBeNull();
  });

  it('promotes a passage to the question when no prompt is present', () => {
    const q = normalizeQuizQuestion({ passage: 'Read this passage.' });
    expect(q?.question).toBe('Read this passage.');
    expect(q?.passage).toBe('Read this passage.');
  });
});

describe('inferQuestionType', () => {
  it('defaults to mcq', () => {
    expect(inferQuestionType({ question: 'x', options: ['a', 'b'] })).toBe('mcq');
  });
  it('detects true/false from the prompt', () => {
    expect(inferQuestionType({ question: 'True or false: the sky is blue.' })).toBe('true_false');
  });
  it('detects match / sequence / fill_blank from shape', () => {
    expect(inferQuestionType({ question: 'x', pairs: [{ left: 'a', right: 'b' }] })).toBe('match');
    expect(inferQuestionType({ question: 'x', sequence: ['1', '2'] })).toBe('sequence');
    expect(inferQuestionType({ question: 'x', blank_answer: 'delhi' })).toBe('fill_blank');
  });
});

describe('evaluateQuizQuestion (server-authoritative answer check)', () => {
  const mcq = normalizeQuizQuestion(rawMcq)!;

  it('scores an mcq correct only for the right index', () => {
    expect(evaluateQuizQuestion(mcq, { type: 'mcq', selectedIndex: 1 }).isCorrect).toBe(true);
    expect(evaluateQuizQuestion(mcq, { type: 'mcq', selectedIndex: 0 }).isCorrect).toBe(false);
  });

  it('reports the correct + selected labels', () => {
    const ev = evaluateQuizQuestion(mcq, { type: 'mcq', selectedIndex: 0 });
    expect(ev.correctLabel).toBe('New Delhi');
    expect(ev.selectedLabel).toBe('Mumbai');
  });

  it('fill_blank is case/space-insensitive', () => {
    const q: QuizQuestionEnvelope = { question: 'Capital?', question_type: 'fill_blank', blank_answer: 'New Delhi' };
    expect(evaluateQuizQuestion(q, { type: 'fill_blank', text: '  new   delhi ' }).isCorrect).toBe(true);
    expect(evaluateQuizQuestion(q, { type: 'fill_blank', text: 'mumbai' }).isCorrect).toBe(false);
  });

  it('match / sequence require the exact ordered key', () => {
    const match: QuizQuestionEnvelope = { question: 'Match', question_type: 'match', pairs: [{ left: 'a', right: 'b' }], answer_key: [0, 1, 2] };
    expect(evaluateQuizQuestion(match, { type: 'match', mapping: [0, 1, 2] }).isCorrect).toBe(true);
    expect(evaluateQuizQuestion(match, { type: 'match', mapping: [0, 2, 1] }).isCorrect).toBe(false);

    const seq: QuizQuestionEnvelope = { question: 'Order', question_type: 'sequence', sequence: ['x'], answer_key: [3, 1, 2, 4] };
    expect(evaluateQuizQuestion(seq, { type: 'sequence', order: [3, 1, 2, 4] }).isCorrect).toBe(true);
    expect(evaluateQuizQuestion(seq, { type: 'sequence', order: [1, 3, 2, 4] }).isCorrect).toBe(false);
  });
});

// --- the bank + deterministic selection (the M0 guarantee) --------------------
function makeBank() {
  const entries: RawQuestionEntry[] = [];
  for (let i = 0; i < 12; i++) {
    entries.push({
      poolKey: 'ncert:class6:maths',
      raw: { id: `m${i}`, question: `Maths Q${i}`, type: 'mcq', options: ['a', 'b'], correct_answer: i % 2 },
    });
  }
  for (let i = 0; i < 4; i++) {
    entries.push({ poolKey: 'ncert:class6:science', raw: { id: `s${i}`, question: `Science Q${i}`, options: ['a', 'b'], answer_index: 0 } });
  }
  entries.push({ poolKey: 'ncert:class6:maths', raw: { question: '', options: [] } }); // dropped (no prompt)
  return buildQuestionBank('test-v1', entries);
}

describe('buildQuestionBank', () => {
  it('groups valid entries by pool and drops unusable ones', () => {
    const bank = makeBank();
    expect(poolKeys(bank).sort()).toEqual(['ncert:class6:maths', 'ncert:class6:science']);
    expect(poolSize(bank, 'ncert:class6:maths')).toBe(12); // the empty entry was dropped
    expect(poolSize(bank, 'ncert:class6:science')).toBe(4);
    expect(poolSize(bank, 'nonexistent')).toBe(0);
  });
});

describe('deterministic selection (same seed => same questions)', () => {
  const bank = makeBank();

  it('pickQuestion is reproducible for a seed and null on an empty pool', () => {
    const a = Array.from({ length: 6 }, () => pickQuestion(new Rng(42), bank, 'ncert:class6:maths')!.id);
    // Fresh Rng(42) each time => identical single pick every call.
    expect(new Set(a).size).toBe(1);
    // A shared Rng advances, producing a reproducible sequence...
    const seq1 = (() => { const r = new Rng(7); return [pickQuestion(r, bank, 'ncert:class6:maths')!.id, pickQuestion(r, bank, 'ncert:class6:maths')!.id, pickQuestion(r, bank, 'ncert:class6:maths')!.id]; })();
    const seq2 = (() => { const r = new Rng(7); return [pickQuestion(r, bank, 'ncert:class6:maths')!.id, pickQuestion(r, bank, 'ncert:class6:maths')!.id, pickQuestion(r, bank, 'ncert:class6:maths')!.id]; })();
    expect(seq1).toEqual(seq2);
    expect(pickQuestion(new Rng(1), bank, 'empty')).toBeNull();
  });

  it('pickQuestionSet returns a distinct, capped, seed-stable set', () => {
    const set1 = pickQuestionSet(new Rng(99), bank, 'ncert:class6:maths', 5).map((q) => q.id);
    const set2 = pickQuestionSet(new Rng(99), bank, 'ncert:class6:maths', 5).map((q) => q.id);
    expect(set1).toEqual(set2); // same seed => identical set AND order
    expect(set1).toHaveLength(5);
    expect(new Set(set1).size).toBe(5); // no repeats

    // Count is capped at the pool size.
    expect(pickQuestionSet(new Rng(1), bank, 'ncert:class6:science', 99)).toHaveLength(4);
    expect(pickQuestionSet(new Rng(1), bank, 'empty', 5)).toEqual([]);
  });

  it('different seeds generally produce a different order', () => {
    const a = pickQuestionSet(new Rng(1), bank, 'ncert:class6:maths', 12).map((q) => q.id);
    const b = pickQuestionSet(new Rng(2), bank, 'ncert:class6:maths', 12).map((q) => q.id);
    expect(a).not.toEqual(b);
    // ...but both are permutations of the same 12 questions.
    expect(a.slice().sort()).toEqual(b.slice().sort());
  });
});

describe('shuffle', () => {
  it('is a seed-stable permutation (same multiset, reproducible)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(new Rng(5), arr);
    const s2 = shuffle(new Rng(5), arr);
    expect(s1).toEqual(s2);
    expect(s1.slice().sort()).toEqual(arr.slice().sort());
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input not mutated
  });
});
