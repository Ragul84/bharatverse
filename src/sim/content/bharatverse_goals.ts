// Learning Goals catalog (M2): universal goals the Guru can set.
// Pure data. First locked goal family: NCERT + Samacheer foundation.

export interface LearningGoalDef {
  id: string;
  /** English label (catalog; HUD uses t() keys when available). */
  label: string;
  /** Short English blurb. */
  blurb: string;
  /** Subject affinities for Study Hall question pools. */
  subjects: readonly string[];
}

export const LEARNING_GOALS: readonly LearningGoalDef[] = [
  {
    id: 'ncert_6_8',
    label: 'NCERT Class 6-8 Foundation',
    blurb: 'Core school subjects that also feed many government exams.',
    subjects: ['gk', 'science', 'maths', 'history'],
  },
  {
    id: 'ncert_9_12',
    label: 'NCERT Class 9-12',
    blurb: 'Higher secondary foundations across science, maths, and social studies.',
    subjects: ['science', 'maths', 'history', 'gk'],
  },
  {
    id: 'samacheer_6_12',
    label: 'Samacheer 6-12',
    blurb: 'Tamil Nadu state syllabus path, paired with NCERT-style practice.',
    subjects: ['science', 'maths', 'gk', 'history'],
  },
  {
    id: 'gk_daily',
    label: 'General Knowledge Daily',
    blurb: 'Light daily GK and current-affairs style recall for everyone.',
    subjects: ['gk', 'history'],
  },
];

export function learningGoalById(id: string | null | undefined): LearningGoalDef | null {
  if (!id) return null;
  return LEARNING_GOALS.find((g) => g.id === id) ?? null;
}
