# Bharatverse Program

Source-of-truth packet for re-engineering the World of ClaudeCraft MMO fork in
this repo into Bharatverse, an educational sandbox MMO where active recall is the
combat / gathering / crafting input layer. ASCII only. No em dashes. No emojis.
Read this first, then descend.

- `implementation-plan.md` - milestones, work packages, ordering.
- `state.md` - locked decisions, invariants, reconciliation debt (the live ledger).
- `progress.md` - status of every work package (update at the end of each WP).

## One-paragraph goal

Keep the proven 80 percent of the existing MMO (deterministic `src/sim/` core,
authoritative `server/`, Postgres persistence, market / arena / guild / social,
i18n) and rebuild only what the vision needs: a Phaser 2.5D isometric client,
Indian-landmark zones, and a server-authoritative active-recall layer where a
student's mastery is literally their combat power, resource multiplier, and
crafting speed. The thesis: mastering the curriculum is the only way to dominate
leaderboards, craft the best gear, and win at the country's greatest monuments.

## Vision pillars and where they land

| Vision pillar | Foundation in repo | Work |
|---|---|---|
| Web engine, instant load | Vite + Phaser 4 | Build Phaser client (M1) |
| Authoritative server, anti-cheat | `server/` 20Hz, interest-scoped | Reuse; add recall validation (M2) |
| Open-world real-time combat | `src/sim/` deterministic core | Reuse; recall input layer (M2) |
| Active recall = power | `knowledge_combat.ts` (client-side stub) | Move server-side + Leitner (M2/M3) |
| Gathering / crafting | ground objects, items | Critical-node flashcards (M4) |
| Full-loot PvP + streak shields | PvP, loot, daily quests | Wire streak -> shield (M4) |
| Player-driven marketplace | World Market / auction house | Add Knowledge Runes (M4) |
| Guilds, daily global raids | social, arena, boss, party | Guild classrooms, Noon Arena (M5) |
| Indian landmarks | 3 zones already re-named | Isometric art + landmark scenes (M1) |

## Start here

Milestone 1, Work Package 1 (Phaser render parity). See `implementation-plan.md`.
Every visible re-theme depends on the Phaser client actually drawing the sim.
