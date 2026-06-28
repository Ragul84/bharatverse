# Bharatverse State (live ledger)

Locked facts, decisions, invariants, and reconciliation debt. Update when a
decision is made or a debt item is cleared.

## Locked decisions

- D1 (2026-06-28): Renderer = Phaser 2.5D isometric (`src/render-phaser/`). The
  Three.js `src/render/` and the two HUD docs packets are archived as parity
  reference only.
- D2 (2026-06-28): First milestone = full re-theme first (M1). Recall / Leitner
  deferred to M2 / M3.
- D3 (2026-06-28, recommended, confirm): Phaser renders the real-time
  server-authoritative sim. No turn-based combat overlay in the MMO.
- D4 (OPEN): Whether to keep `render-phaser/QuizScene.ts` + `CombatScene.ts` as a
  separate OFFLINE single-player practice mode, or archive them entirely. Default
  if unanswered: archive.
- D5 (OPEN): Canonical currency name - MindCoins vs Gold. Code currently has both.
- D6 (proposed): Canonical question model = `sim/content/questions.ts` `Question`
  (NCERT tier 1-6, source attribution). Delete the `KnowledgeQuestion` shape.

## Invariants (inherited from root CLAUDE.md, restated for this program)

- `src/sim/` stays pure: no DOM / Three / Phaser; no imports from
  render / ui / game / net. Phaser is a client renderer, same rule as Three.js.
- Determinism: all randomness through `Rng`. The recall layer's question pick and
  result MUST be `Rng`-seeded and server-resolved. `Math.random` /
  `Date.now` / `performance.now` are banned in sim logic.
- Server authority: damage, loot, currency, mastery resolve server-side. The
  client submits a recall choice + timing; it never computes its own multiplier.
- Presentation talks only to `IWorld`. New recall data / actions extend `IWorld`
  first, then implement in both `Sim` and `ClientWorld`.
- i18n: every player-visible string is a `t()` key; English-only PRs are legal.

## Reconciliation debt (two-of-everything to delete, not just add)

- Two renderers: Three.js `src/render/` vs Phaser `src/render-phaser/`. Retire
  Three.js once Phaser hits parity.
- Two question shapes: `KnowledgeQuestion` (`sim/knowledge_combat.ts`) vs
  `Question` (`sim/content/questions.ts`). Unify on `Question` (D6).
- Two currencies: MindCoins vs Gold (D5).
- Determinism break: `pickQuestion` in `questions.ts` uses `Math.random`. Must be
  `Rng`-seeded before it is used in sim / server.
- Authority break: `src/main.ts` resolves recall result client-side
  (`calcKnowledgeResult` in browser). Move server-side in M2.
- Turn-based dead end: `render-phaser/CombatScene.ts` + `QuizScene.ts` are
  client-authoritative turn-based; do not extend (D3 / D4).

## Key files (current state)

- `src/sim/knowledge_combat.ts` - recall math (combo tiers, speed mult, affinity).
  Pure logic, fine to keep; consumer location is the problem, not this file.
- `src/sim/content/questions.ts` - canonical question types + bank (has the
  `Math.random` bug).
- `src/ui/knowledge_modal.ts` - current recall modal (Three.js-era UI).
- `server/questions.ts` - question API endpoint + DB queries.
- `public/data/questions_sample.json` - seed question data.
- `src/render-phaser/` - Phaser client skeleton (rectangles, top-down, turn-based).
- `src/render/` - complete Three.js renderer (the parity oracle, to retire).
