// BharatVerse Unity City hub buildings (M2): functional NPCs for learning
// venues. Pure content data; merged into ZONE1_NPCS via zone1 or data merge.
// See docs/bharatverse/world-plan.md sections 2 and 4.

import type { NpcDef } from '../types';

/** Building kinds the client opens as dedicated overlays (not quest dialogs). */
export type BvBuildingKind = 'guru' | 'study_hall' | 'library' | 'theatre' | 'assessment' | 'chai';

/** templateId -> building kind. */
export const BV_BUILDING_BY_NPC: Readonly<Record<string, BvBuildingKind>> = {
  bv_guru: 'guru',
  bv_study_hall: 'study_hall',
  bv_library: 'library',
  bv_theatre: 'theatre',
  bv_assessment: 'assessment',
  bv_chai: 'chai',
};

export function bvBuildingKindForNpc(templateId: string | undefined | null): BvBuildingKind | null {
  if (!templateId) return null;
  return BV_BUILDING_BY_NPC[templateId] ?? null;
}

/**
 * Hub building NPCs ringed around Unity City square (origin). Positions stay
 * inside TOWN_RADIUS (~26) and clear of the Merchant / Marshal cluster.
 */
export const BHARATVERSE_HUB_NPCS: Record<string, NpcDef> = {
  bv_guru: {
    id: 'bv_guru',
    name: 'Acharya Meera',
    title: 'The Guru',
    // North of the square, welcome approach
    pos: { x: -10, z: 14 },
    facing: Math.PI,
    color: 0xe67e22,
    questIds: [],
    greeting:
      'Welcome to Unity City, $N. Pick a Learning Goal with me, then grow stronger by answering well in the world.',
  },
  bv_study_hall: {
    id: 'bv_study_hall',
    name: 'Tutor Kabir',
    title: 'Study Hall',
    pos: { x: 16, z: 4 },
    facing: -Math.PI / 2,
    color: 0x2980b9,
    questIds: [],
    greeting:
      'The Study Hall is open. Sit a focused quiz: each correct answer raises your Subject Mastery.',
  },
  bv_library: {
    id: 'bv_library',
    name: 'Librarian Ananya',
    title: 'Nalanda Annex',
    pos: { x: -18, z: -4 },
    facing: Math.PI / 2,
    color: 0x8e44ad,
    questIds: [],
    greeting:
      'This annex of Nalanda holds chapter notes. Read deeply, then test yourself in the Study Hall.',
  },
  bv_theatre: {
    id: 'bv_theatre',
    name: 'Host Dev',
    title: 'Learning Theatre',
    pos: { x: 8, z: -18 },
    facing: 0.4,
    color: 0xc0392b,
    questIds: [],
    greeting:
      'Take a seat. The Theatre runs concept playlists through the day. Watch, rest, then return to the field.',
  },
  bv_assessment: {
    id: 'bv_assessment',
    name: 'Proctor Isha',
    title: 'Assessment Arena',
    pos: { x: -6, z: 18 },
    facing: Math.PI,
    color: 0x16a085,
    questIds: [],
    greeting:
      'Mock tests and ranked assessments land here. Check your Readiness from Subject Mastery before you enter.',
  },
  bv_chai: {
    id: 'bv_chai',
    name: 'Chaiwalla Ravi',
    title: 'Chai Stall',
    pos: { x: 12, z: 14 },
    facing: -2.4,
    color: 0xd35400,
    questIds: [],
    greeting: 'Sit a moment. Tea steadies the mind. Review, recover, then try again.',
  },
};

/** Monument-themed POI labels for the starter map (hub + land names). */
export const BHARATVERSE_HUB_POIS: ReadonlyArray<{
  x: number;
  z: number;
  label: string;
  id: string;
}> = [
  { x: -10, z: 14, label: 'Guru Circle', id: 'bv_guru_circle' },
  { x: 16, z: 4, label: 'Study Hall', id: 'bv_study_hall_poi' },
  { x: -18, z: -4, label: 'Nalanda Annex', id: 'bv_library_poi' },
  { x: 8, z: -18, label: 'Learning Theatre', id: 'bv_theatre_poi' },
  { x: -6, z: 18, label: 'Assessment Gate', id: 'bv_assessment_poi' },
];
