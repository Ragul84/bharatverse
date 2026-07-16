// Recall question types + normalization + server-safe evaluation.
//
// This is the deterministic, host-agnostic heart of the BharatVerse recall system:
// the shape of a quiz question, a normalizer that turns the varied raw shapes from the
// mindwhite/quizhub corpus (see docs/bharatverse/quizhub-integration.md) into one clean
// envelope, and a pure evaluator that decides correctness for every question type.
//
// PURITY: no DOM, no `Math.random`/`Date.now`, no imports outside `src/sim`. Ported from
// the mindwhite app's `utils/quizQuestionTypes.ts` so BharatVerse consumes the same corpus
// with identical answer-checking (the evaluator runs SERVER-SIDE for anti-cheat; the
// client never receives the answer key until after it submits).

export type QuizQuestionType =
  | 'mcq'
  | 'multi_statement'
  | 'assertion_reason'
  | 'match'
  | 'sequence'
  | 'fill_blank'
  | 'true_false'
  | 'short_answer'
  | 'passage';

export interface QuizQuestionPair {
  left: string;
  right: string;
}

export interface QuizQuestionItem {
  id?: string;
  text: string;
}

export interface QuizQuestionMedia {
  type: 'image' | 'diagram' | 'map';
  uri: string;
  caption?: string;
}

/** The normalized question shape - a superset covering every corpus question type. */
export interface QuizQuestionEnvelope {
  id?: string;
  question?: string;
  question_text?: string;
  prompt?: string;
  question_type?: QuizQuestionType;
  options?: string[];
  answer_index?: number;
  answer_key?: Array<number | string>;
  explanation?: string;
  difficulty?: string;
  statements?: string[];
  pairs?: QuizQuestionPair[];
  items?: QuizQuestionItem[];
  sequence?: string[];
  blank_answer?: string;
  answer_text?: string;
  passage?: string;
  media?: QuizQuestionMedia;
  source?: string;
  source_tier?: string;
  source_type?: string;
  lesson_id?: string;
  chapter?: string;
  subject?: string;
  class?: string;
  exam_types?: string[];
}

/** A player's answer to a question. The server pairs it with the stored question. */
export type QuizQuestionResponse =
  | { type: 'mcq'; selectedIndex: number }
  | { type: 'true_false'; selectedIndex: number }
  | { type: 'fill_blank'; text: string }
  | { type: 'match'; mapping: Array<number | string> }
  | { type: 'sequence'; order: Array<number | string> };

export interface QuizEvaluation {
  isCorrect: boolean;
  selectedLabel?: string;
  correctLabel?: string;
  responseSummary?: string;
  answerSummary?: string;
  selectedIndex?: number;
  correctIndex?: number;
}

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Resolve the question type, inferring from present fields when not explicit. */
export function inferQuestionType(question: QuizQuestionEnvelope): QuizQuestionType {
  if (question.question_type) return question.question_type;
  if (Array.isArray(question.pairs) && question.pairs.length > 0) return 'match';
  if (Array.isArray(question.sequence) && question.sequence.length > 0) return 'sequence';
  if (Array.isArray(question.items) && question.items.length > 0) return 'sequence';
  if (question.blank_answer || question.answer_text) return 'fill_blank';
  if (Array.isArray(question.statements) && question.statements.length > 0) return 'multi_statement';
  const prompt = normalizeText(question.question || question.question_text || question.prompt);
  if (prompt.includes('true or false')) return 'true_false';
  return 'mcq';
}

/**
 * Turn a raw corpus entry (string JSON or object) into a clean envelope, or null if it
 * has no usable prompt. Tolerates the field-name drift in the source data
 * (`correct_answer` vs `answer_index`, `type` vs `question_type`, ...).
 */
export function normalizeQuizQuestion(raw: unknown): QuizQuestionEnvelope | null {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;

    const question = p.question_text || p.question || p.prompt;
    const passage = p.passage;
    const options = toArray<unknown>(p.options)
      .filter((option) => option !== undefined && option !== null)
      .map(String);
    const answerIndex =
      typeof p.correct_answer === 'number'
        ? p.correct_answer
        : typeof p.answer_index === 'number'
          ? p.answer_index
          : undefined;

    const normalized: QuizQuestionEnvelope = {
      id: p.id ? String(p.id) : undefined,
      question: question ? String(question) : passage ? String(passage) : '',
      question_text: p.question_text ? String(p.question_text) : undefined,
      prompt: p.prompt ? String(p.prompt) : undefined,
      question_type: (p.question_type || p.type) as QuizQuestionType | undefined,
      options: options.length > 0 ? options : undefined,
      answer_index: answerIndex,
      answer_key: Array.isArray(p.answer_key) ? (p.answer_key as Array<number | string>) : undefined,
      explanation: p.explanation ? String(p.explanation) : undefined,
      difficulty: p.difficulty ? String(p.difficulty) : undefined,
      statements: Array.isArray(p.statements) ? p.statements.map(String) : undefined,
      pairs: Array.isArray(p.pairs)
        ? (p.pairs as Array<Record<string, unknown>>)
            .map((pair) => ({
              left: String(pair?.left ?? pair?.question ?? pair?.term ?? ''),
              right: String(pair?.right ?? pair?.match ?? pair?.answer ?? ''),
            }))
            .filter((pair) => pair.left && pair.right)
        : undefined,
      items: Array.isArray(p.items)
        ? (p.items as Array<Record<string, unknown>>)
            .map((item) => ({
              id: item?.id ? String(item.id) : undefined,
              text: String(item?.text ?? item?.label ?? item ?? ''),
            }))
            .filter((item) => item.text)
        : undefined,
      sequence: Array.isArray(p.sequence) ? p.sequence.map(String) : undefined,
      blank_answer: p.blank_answer ? String(p.blank_answer) : undefined,
      answer_text: p.answer_text ? String(p.answer_text) : undefined,
      passage: passage ? String(passage) : undefined,
      media:
        p.media && typeof p.media === 'object'
          ? {
              type: (p.media as Record<string, unknown>).type as QuizQuestionMedia['type'],
              uri: String((p.media as Record<string, unknown>).uri ?? ''),
              caption: (p.media as Record<string, unknown>).caption
                ? String((p.media as Record<string, unknown>).caption)
                : undefined,
            }
          : undefined,
      source: p.source ? String(p.source) : undefined,
      source_tier: p.source_tier ? String(p.source_tier) : undefined,
      source_type: p.source_type ? String(p.source_type) : undefined,
      lesson_id: p.lesson_id ? String(p.lesson_id) : undefined,
      chapter: p.chapter ? String(p.chapter) : undefined,
      subject: p.subject ? String(p.subject) : undefined,
      class: p.class ? String(p.class) : undefined,
      exam_types: Array.isArray(p.exam_types) ? p.exam_types.map(String) : undefined,
    };

    normalized.question_type = normalized.question_type || inferQuestionType(normalized);
    if (!normalized.question && normalized.passage) {
      normalized.question = normalized.passage;
    }
    if (!normalized.question) return null;
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Decide correctness for a response. Pure and deterministic - this is the
 * server-authoritative answer check (anti-cheat). Mirrors the mindwhite evaluator.
 */
export function evaluateQuizQuestion(
  question: QuizQuestionEnvelope,
  response: QuizQuestionResponse,
): QuizEvaluation {
  const type = inferQuestionType(question);

  if (type === 'fill_blank') {
    const correct = normalizeText(question.blank_answer || question.answer_text);
    const selected = normalizeText(response.type === 'fill_blank' ? response.text : '');
    return {
      isCorrect: !!correct && correct === selected,
      selectedLabel: response.type === 'fill_blank' ? response.text : '',
      correctLabel: question.blank_answer || question.answer_text || '',
      responseSummary: response.type === 'fill_blank' ? response.text : '',
      answerSummary: question.blank_answer || question.answer_text || '',
    };
  }

  if (type === 'match') {
    const expected = toArray<number | string>(question.answer_key).map((item) => String(item));
    const selected = response.type === 'match' ? response.mapping.map((item) => String(item)) : [];
    const isCorrect =
      expected.length > 0 &&
      expected.length === selected.length &&
      expected.every((item, idx) => item === selected[idx]);
    return { isCorrect, responseSummary: selected.join(', '), answerSummary: expected.join(', ') };
  }

  if (type === 'sequence') {
    const expected = toArray<number | string>(
      question.answer_key?.length ? question.answer_key : question.sequence,
    ).map((item) => String(item));
    const selected = response.type === 'sequence' ? response.order.map((item) => String(item)) : [];
    const isCorrect =
      expected.length > 0 &&
      expected.length === selected.length &&
      expected.every((item, idx) => item === selected[idx]);
    return { isCorrect, responseSummary: selected.join(' > '), answerSummary: expected.join(' > ') };
  }

  // mcq / true_false / multi_statement / assertion_reason / passage all resolve to a
  // single correct option index.
  const selectedIndex =
    response.type === 'mcq' || response.type === 'true_false' ? response.selectedIndex : -1;
  const correctIndex =
    typeof question.answer_index === 'number'
      ? question.answer_index
      : Array.isArray(question.answer_key) &&
          question.answer_key.length > 0 &&
          typeof question.answer_key[0] === 'number'
        ? Number(question.answer_key[0])
        : 0;
  const options = question.options || [];
  return {
    isCorrect: selectedIndex === correctIndex,
    selectedIndex,
    correctIndex,
    selectedLabel: selectedIndex >= 0 ? options[selectedIndex] : undefined,
    correctLabel: options[correctIndex],
    responseSummary: selectedIndex >= 0 ? options[selectedIndex] : '',
    answerSummary: options[correctIndex] || '',
  };
}
