import { describe, expect, it } from 'vitest';
import { LEARNING_GOALS, learningGoalById } from '../src/sim/content/bharatverse_goals';
import { BHARATVERSE_HUB_NPCS, bvBuildingKindForNpc } from '../src/sim/content/bharatverse_hub';
import { LIBRARY_CHAPTERS } from '../src/sim/content/bharatverse_library';
import { NPCS } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import { buildHubBuildingView } from '../src/ui/hub_building_view';

describe('BharatVerse hub buildings (M2)', () => {
  it('registers all hub NPCs into the live NPC table', () => {
    for (const id of Object.keys(BHARATVERSE_HUB_NPCS)) {
      expect(NPCS[id], id).toBeDefined();
      expect(bvBuildingKindForNpc(id)).not.toBeNull();
    }
  });

  it('maps building kinds for client overlays', () => {
    expect(bvBuildingKindForNpc('bv_guru')).toBe('guru');
    expect(bvBuildingKindForNpc('bv_study_hall')).toBe('study_hall');
    expect(bvBuildingKindForNpc('marshal_redbrook')).toBeNull();
  });

  it('has learning goals and library chapters', () => {
    expect(LEARNING_GOALS.length).toBeGreaterThanOrEqual(3);
    expect(learningGoalById('ncert_6_8')?.subjects.length).toBeGreaterThan(0);
    expect(LIBRARY_CHAPTERS.length).toBeGreaterThanOrEqual(4);
  });

  it('builds hub views with readiness and goals', () => {
    const guru = buildHubBuildingView({
      kind: 'guru',
      goals: LEARNING_GOALS,
      activeGoalId: 'ncert_6_8',
    });
    expect(guru.goals?.length).toBe(LEARNING_GOALS.length);
    expect(guru.activeGoalId).toBe('ncert_6_8');

    const hall = buildHubBuildingView({
      kind: 'study_hall',
      mastery: new Map([['gk', 100]]),
      dueCount: 2,
    });
    expect(hall.readiness?.some((r) => r.subject === 'gk')).toBe(true);
    expect(hall.dueCount).toBe(2);
  });

  it('sets learning goal and starts Study Hall quiz on Sim', () => {
    const sim = new Sim({ seed: 9, playerClass: 'priest', autoEquip: true });
    expect(sim.learningGoalId).toBeNull();
    sim.setLearningGoal('ncert_6_8');
    expect(sim.learningGoalId).toBe('ncert_6_8');
    sim.setLearningGoal('nope');
    expect(sim.learningGoalId).toBe('ncert_6_8'); // invalid ignored
    sim.startStudyHallQuiz();
    expect(sim.recallPrompt).not.toBeNull();
    expect(sim.recallPrompt!.options.length).toBeGreaterThanOrEqual(2);
  });

  it('spawns hub NPCs near Unity City on a fresh world', () => {
    const sim = new Sim({ seed: 2, playerClass: 'warrior', autoEquip: true });
    const ids = new Set(
      [...sim.entities.values()].filter((e) => e.kind === 'npc').map((e) => e.templateId),
    );
    expect(ids.has('bv_guru')).toBe(true);
    expect(ids.has('bv_study_hall')).toBe(true);
    expect(ids.has('bv_library')).toBe(true);
  });
});
