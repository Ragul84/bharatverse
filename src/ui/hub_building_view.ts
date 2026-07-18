// Pure view models for BharatVerse hub building overlays (M2).

import type { LearningGoalDef } from '../sim/content/bharatverse_goals';
import type { BvBuildingKind } from '../sim/content/bharatverse_hub';
import type { LibraryChapter } from '../sim/content/bharatverse_library';
import { masteryProgress } from '../sim/recall/subject_mastery';

export interface HubBuildingView {
  kind: BvBuildingKind;
  titleKey: string;
  bodyKey: string;
  /** Optional structured payload for the painter. */
  goals?: LearningGoalDef[];
  activeGoalId?: string | null;
  chapters?: LibraryChapter[];
  selectedChapterId?: string | null;
  readiness?: { subject: string; level: number; tier: number; progress: number }[];
  dueCount?: number;
  playlist?: { title: string; note: string }[];
}

export function buildHubBuildingView(input: {
  kind: BvBuildingKind;
  goals?: readonly LearningGoalDef[];
  activeGoalId?: string | null;
  chapters?: readonly LibraryChapter[];
  selectedChapterId?: string | null;
  mastery?: ReadonlyMap<string, number> | Record<string, number>;
  dueCount?: number;
}): HubBuildingView {
  const base: HubBuildingView = {
    kind: input.kind,
    titleKey: `hudChrome.hub.${input.kind}.title`,
    bodyKey: `hudChrome.hub.${input.kind}.body`,
  };
  if (input.kind === 'guru') {
    base.goals = [...(input.goals ?? [])];
    base.activeGoalId = input.activeGoalId ?? null;
  }
  if (input.kind === 'library') {
    base.chapters = [...(input.chapters ?? [])];
    base.selectedChapterId = input.selectedChapterId ?? base.chapters[0]?.id ?? null;
  }
  if (input.kind === 'study_hall' || input.kind === 'assessment') {
    const map =
      input.mastery instanceof Map ? input.mastery : new Map(Object.entries(input.mastery ?? {}));
    const subjects = ['gk', 'science', 'maths', 'history'];
    base.readiness = subjects.map((subject) => {
      const xp = map.get(subject) ?? 0;
      const p = masteryProgress(xp);
      return { subject, level: p.level, tier: p.tier, progress: p.progress };
    });
    base.dueCount = input.dueCount ?? 0;
  }
  if (input.kind === 'theatre') {
    base.playlist = [
      { title: 'How Photosynthesis Works', note: 'Science · 8 min' },
      { title: 'Place Value Made Easy', note: 'Maths · 6 min' },
      { title: 'The Making of the Constitution', note: 'Civics · 10 min' },
    ];
  }
  return base;
}
