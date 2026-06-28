# Bharatverse Progress

Update at the end of every work package. Status: not-started / in-progress /
blocked / complete.

## Milestone 1 - re-theme on Phaser

| WP | Title | Status | Branch | Notes |
|---|---|---|---|---|
| 1 | Phaser render parity (spine) | in-progress | feature/phaser-render-parity | audit done (`wp1-render-parity-audit.md`); Three.js path is dead code; Phaser is live |
| 2 | Isometric art + landmark zones | not-started | | needs WP1 |
| 3 | Class / mob / item re-theme completion | not-started | | parallel-safe; verify MOB_SUBJECT_MAP ids |
| 4 | Unify question systems (data only) | not-started | | parallel-safe; fix Math.random |
| 5 | Phaser HUD parity (HUDScene) | not-started | | needs WP1 |
| 6 | Smoke + visual baseline + green build | not-started | | demo tag |

Archive actions (one-time):
- [ ] Three.js `src/render/` + HUD docs packets marked reference-only (keep as parity oracle).
- [ ] Decision D4 resolved (keep or archive turn-based QuizScene / CombatScene).

## Deferred milestones

| M | Title | Status |
|---|---|---|
| 2 | Server-authoritative recall core | not-started |
| 3 | Leitner / spaced-repetition mastery | not-started |
| 4 | Sandbox loops (gather crit, streak shield, Knowledge Runes) | not-started |
| 5 | Spectacle and social (Noon Arena, guild classrooms) | not-started |
| 6 | Polish and accessibility | not-started |

## Open decisions to resolve (see state.md)

- [ ] D3 - confirm Phaser renders real-time server sim (no turn-based overlay).
- [ ] D4 - keep turn-based QuizScene as offline practice mode, or archive.
- [ ] D5 - canonical currency: MindCoins vs Gold.
- [ ] D6 - confirm canonical question model = `Question` (delete `KnowledgeQuestion`).

## Notes (filled after each WP)

- WP1 commit 1 (event bus + render interpolation) implemented + verified
  (tsc clean; `tests/phaser_sim_bridge.test.ts` 11/11). New `render-phaser/
  sim_bridge.ts`; `main.ts` sim loop now relays `SimEvent[]` (previously dropped)
  and feeds an interpolation accumulator; `WorldScene` lerps prevPos->pos and
  drains events to `Events.SIM_EVENTS`. NOTE: `src/render-phaser/` is entirely
  untracked in git (never committed); commit scope TBD with the user.
