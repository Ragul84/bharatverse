// Static library chapter catalog for the Nalanda Annex reader (M2).
// Pure data; later replaced by mindwhite textbook corpus ingest.

export interface LibraryChapter {
  id: string;
  board: string;
  classLevel: string;
  subject: string;
  title: string;
  /** Short English excerpt (player-facing; i18n later if needed). */
  excerpt: string;
}

/** Filter chapters by board and/or subject (empty = all). Pure. */
export function filterLibraryChapters(
  chapters: readonly LibraryChapter[],
  opts: { board?: string | null; subject?: string | null },
): LibraryChapter[] {
  const board = opts.board?.trim().toLowerCase() || null;
  const subject = opts.subject?.trim().toLowerCase() || null;
  return chapters.filter((c) => {
    if (board && c.board.toLowerCase() !== board) return false;
    if (subject && c.subject.toLowerCase() !== subject) return false;
    return true;
  });
}

/** Distinct boards / subjects for filter chips. */
export function libraryFilterOptions(chapters: readonly LibraryChapter[]): {
  boards: string[];
  subjects: string[];
} {
  const boards = new Set<string>();
  const subjects = new Set<string>();
  for (const c of chapters) {
    boards.add(c.board);
    subjects.add(c.subject);
  }
  return {
    boards: [...boards].sort(),
    subjects: [...subjects].sort(),
  };
}

export const LIBRARY_CHAPTERS: readonly LibraryChapter[] = [
  {
    id: 'ncert_sci_6_food',
    board: 'NCERT',
    classLevel: 'Class 6',
    subject: 'Science',
    title: 'Food: Where Does It Come From?',
    excerpt:
      'All living things need food. Plants make their own food; animals depend on plants or other animals. Sources of food include plants (cereals, pulses, fruits) and animals (milk, eggs, meat).',
  },
  {
    id: 'ncert_math_6_numbers',
    board: 'NCERT',
    classLevel: 'Class 6',
    subject: 'Maths',
    title: 'Knowing Our Numbers',
    excerpt:
      'Large numbers are written using place value: ones, tens, hundreds, thousands. Comparing numbers starts from the left-most digit. Rounding helps estimate totals quickly.',
  },
  {
    id: 'ncert_hist_6_what',
    board: 'NCERT',
    classLevel: 'Class 6',
    subject: 'History',
    title: 'What, Where, How and When?',
    excerpt:
      'History studies the past through remains, inscriptions, and manuscripts. People lived along rivers like the Narmada and Ganga. Travel and trade linked distant places.',
  },
  {
    id: 'ncert_gk_const',
    board: 'NCERT',
    classLevel: 'Class 8',
    subject: 'Civics',
    title: 'The Indian Constitution',
    excerpt:
      'The Constitution is the supreme law of India. It lays out fundamental rights, directive principles, and the structure of government. Republic Day marks when it came into force.',
  },
  {
    id: 'samacheer_sci_7_heat',
    board: 'Samacheer',
    classLevel: 'Class 7',
    subject: 'Science',
    title: 'Heat and Temperature',
    excerpt:
      'Heat flows from hotter to colder objects. Temperature measures how hot or cold something is. Conduction, convection, and radiation are the main modes of heat transfer.',
  },
  {
    id: 'ncert_eng_6_sentence',
    board: 'NCERT',
    classLevel: 'Class 6',
    subject: 'English',
    title: 'Sentences and Order',
    excerpt:
      'A sentence expresses a complete thought. Word order in English is usually subject-verb-object. Questions reverse or add helpers; punctuation marks the end.',
  },
];
