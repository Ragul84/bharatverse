# Bharatverse Implementation Plan

Milestones and work packages. Each work package is one focused branch / PR with
its own tests. Read `state.md` for locked decisions and invariants before any WP.

The CI-equivalent merge bar for every WP: `npm test` + `npx tsc --noEmit` +
`npm run build` + `npm run build:server` green; determinism preserved; the
`src/sim/` import invariant held; every new player-visible string is a `t()` key
(English-only is legal per the contributor rule).

---

## Milestone 1 - Bharatverse looks and plays like Bharatverse on Phaser

Goal: the Phaser 2.5D isometric client renders the real-time server sim, with all
three zones re-skinned to Indian landmarks and the class / mob / item re-theme
finished. Combat stays as-is (existing real-time sim). Recall is NOT yet wired.

| WP | Title | Depends on | Notes |
|---|---|---|---|
| 1 | Phaser render parity (the spine) | none | Draw the sim, not rectangles. Isometric projection + sprite containers. Offline `Sim` and online `ClientWorld` both feed registry `world`. Longest pole. |
| 2 | Isometric art + landmark zones | 1 | Capital Plaza (Statue of Unity hub), Great Fort (Tanjore), Taj social hub. Tilesets + landmark sprites + props sampling `sim/world.ts`. |
| 3 | Class / mob / item re-theme completion | none (parallel) | Finish renames across `classes.ts`, `zone1-3.ts`, `skins.ts`, `entity_i18n.ts`. Verify every `MOB_SUBJECT_MAP` id exists. |
| 4 | Unify question systems (data only) | none (parallel) | Keep `questions.ts` `Question` (NCERT tier 1-6); delete `KnowledgeQuestion` shape. Replace `Math.random` in `pickQuestion` with `Rng`. Pick one currency. |
| 5 | Phaser HUD parity (`HUDScene`) | 1 | Player / target frames, action bar, minimap, bags / market / social entry points, themed. |
| 6 | Smoke + visual baseline + green build | 1-5 | Phaser browser smoke (`scripts/*.mjs`); prove bundle does not pull Three.js; tag demo build. |

WP3 and WP4 are data-only and parallel-safe with the Phaser engine work (WP1/2/5).

### Milestone 1 archive actions (one-time, do early)
- Move `src/render/` (Three.js) and the two HUD docs packets to a reference state;
  do NOT delete until Phaser reaches feature parity (they are the parity oracle).
- Treat `render-phaser/CombatScene.ts` and `QuizScene.ts` (turn-based,
  client-authoritative) as throwaway. Do not extend them. OPEN: keep only if an
  offline single-player practice mode is wanted (see state.md decision D4).

---

## Deferred milestones (after the M1 demo)

### M2 - Server-authoritative recall core
Question selection (`Rng`-seeded) and answer validation move into `src/sim/` +
`server/`. Client only displays the question and submits choice + timing; the
server computes damage multiplier, combo, XP, currency. Add `SimEvent` variants;
extend `IWorld` and implement in both `Sim` and `ClientWorld`. This is the
cheat-resistance and determinism fix and the real "knowledge = power".

### M3 - Leitner / spaced-repetition mastery
Per-player, per-subject mastery + review schedule persisted in the JSONB
character save (Postgres, additive / back-compatible). Wire
`getMasteryXpMultiplier` to real persisted mastery.

### M4 - Sandbox loops on existing systems
Critical gather nodes -> flashcard on resource crit (5x multiplier). Full-loot
wilderness + answer-streak shields wired to the existing PvP / loot-drop and the
daily-quest streak. Knowledge Runes as a craftable item class sold on the
existing World Market.

### M5 - Spectacle and social
Noon Arena daily global raid on the existing arena / boss / party framework.
Guild classrooms on the existing guild system (shared base, daily score-streak
levels, banners, portals).

### M6 - Polish and accessibility
Re-apply the relevant ideas from the archived HUD UX / a11y packet to the Phaser
client (themes, text-scale, reduced-motion, screen-reader support).

---

## Program-level definition of done

- One client (Phaser isometric) rendering the real-time server-authoritative sim;
  Three.js renderer retired.
- Active recall resolves SERVER-SIDE and deterministically; no client-trusted
  damage / currency. Mastery persisted and driving progression.
- Three Indian-landmark zones, re-themed classes / mobs / items, one question
  system, one currency.
- Full-loot PvP, marketplace (Knowledge Runes), guilds, and the Noon Arena live.
- All invariants in `state.md` hold, verified by gates not eyeball.
