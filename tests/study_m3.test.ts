import { describe, expect, it } from 'vitest';
import {
  filterLibraryChapters,
  LIBRARY_CHAPTERS,
  libraryFilterOptions,
} from '../src/sim/content/bharatverse_library';
import {
  buildFlashcardDueList,
  clampStudyCount,
  remainingAfterAnswer,
  STUDY_SESSION,
} from '../src/sim/recall/study_session';
import { Sim } from '../src/sim/sim';
import { buildFlashcardsPanelView } from '../src/ui/flashcards_view';

describe('Study Hall session helpers', () => {
  it('clamps session length', () => {
    expect(clampStudyCount(0)).toBe(1);
    expect(clampStudyCount(99)).toBe(STUDY_SESSION.MAX_COUNT);
    expect(clampStudyCount(undefined)).toBe(STUDY_SESSION.DEFAULT_COUNT);
  });

  it('decrements remaining after each answer', () => {
    expect(remainingAfterAnswer(5)).toBe(4);
    expect(remainingAfterAnswer(1)).toBe(0);
  });
});

describe('library filters', () => {
  it('filters by board and subject', () => {
    const ncert = filterLibraryChapters(LIBRARY_CHAPTERS, { board: 'NCERT' });
    expect(ncert.every((c) => c.board === 'NCERT')).toBe(true);
    const science = filterLibraryChapters(LIBRARY_CHAPTERS, { subject: 'Science' });
    expect(science.every((c) => c.subject === 'Science')).toBe(true);
    const opts = libraryFilterOptions(LIBRARY_CHAPTERS);
    expect(opts.boards.length).toBeGreaterThan(0);
    expect(opts.subjects.length).toBeGreaterThan(0);
  });
});

describe('flashcard list builder', () => {
  it('looks up fronts for due ids', () => {
    const list = buildFlashcardDueList(
      ['a', 'missing'],
      new Map([['a', { subject: 'gk', box: 2 }]]),
      (id) => (id === 'a' ? { prompt: 'What?', subject: 'gk' } : null),
    );
    expect(list).toEqual([{ id: 'a', prompt: 'What?', subject: 'gk', box: 2 }]);
  });

  it('builds panel view', () => {
    const v = buildFlashcardsPanelView({
      due: [{ id: '1', prompt: 'Q', subject: 'maths', box: 1 }],
      studyRemaining: 3,
    });
    expect(v.dueCount).toBe(1);
    expect(v.studyRemaining).toBe(3);
    expect(v.empty).toBe(false);
  });
});

describe('M3 Study Hall multi-quiz on Sim', () => {
  it('opens a session of multiple questions in sequence', () => {
    const sim = new Sim({ seed: 5, playerClass: 'mage', autoEquip: true });
    sim.startStudyHallQuiz();
    expect(sim.recallPrompt).not.toBeNull();
    expect(sim.studySessionRemaining).toBe(STUDY_SESSION.DEFAULT_COUNT - 1);

    const meta = (sim as any).players.get(sim.player.id);
    let answered = 0;
    while (meta.recallPending && answered < 20) {
      const idx = meta.recallPending.question.answer_index ?? 0;
      sim.answerRecall(idx, 500);
      answered++;
    }
    expect(answered).toBe(STUDY_SESSION.DEFAULT_COUNT);
    expect(sim.studySessionRemaining).toBe(0);
    expect(meta.recallMastery.size).toBeGreaterThan(0);
  });
});
