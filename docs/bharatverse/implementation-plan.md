# BharatVerse — Implementation Plan (rebased on upstream 3D, 2026-07-16)

India's first educational MMO. **Active recall is the power** — your knowledge is
the tool. This plan supersedes the old Phaser-era plan: the project was re-forked
onto the **latest upstream World-of-ClaudeCraft (Three.js 3D, mobile-web/PWA)**
base, so the whole "make Phaser draw the sim" milestone is gone. We now **layer the
educational game on top of upstream's mature systems** instead of rebuilding an engine.

Design reference (read before a WP): `kintara-adapted-design.md`, `gameplay-design.md`.

## The one rule (non-negotiable)
Recall is a **multiplier and a destination, never a per-click toll.** Gathering is
fun click-and-gather; recall lives where it's meaningful — combat, Study Hall,
daily challenges, an optional focus buff, and the passive Theatre. Knowledge is
what makes you stronger; it is never friction on every swing.

## The 5 pillars you asked for
1. **4 lands** — one map, four bands: **Vidya Nagar** (safe town hub) → **Whisperwood**
   (woodcutting/language) → **Ironstone Caverns** (mining/maths) → **Wilderness
   Frontier** (elite mobs, tier 4–6 questions, Quiz Duels, small death risk).
2. **Recall-combat + Subject Mastery** — click a mob → answer → damage = base ×
   answer-quality × mastery tier. Master a subject (L1–20) instead of upgrading a tool.
3. **Study Hall + Library** — a big building: a **Book Reader** (scaled-up
   `books.json`, many books/chapters, themes, ToC) for reading, plus focused **quiz
   sessions** that raise a Subject Mastery tier (the "tool upgrade").
4. **Learning Theatre** — a cinema building, limited seats, an angled in-world screen
   auto-playing an **English educational YouTube playlist (6am–9pm)**, with a
   Fullscreen button. A shared passive-learning hangout.
5. **Challenge others** — **Quiz Duels** (PvP): two players get the same question,
   faster-correct deals damage. Frontier-gated.

## Foundation shift: what changed vs the old plan
- OLD Milestone 1 = "Phaser render parity" → **DELETED.** Upstream already renders a
  polished 3D world on desktop + mobile. We keep that renderer.
- The educational systems (recall, mastery, theatre, study hall, duels) are the real
  work now, and they attach to upstream seams, not a new engine.

## What upstream already gives us (build ON these, don't rebuild)
| Pillar / need | Upstream system to extend |
|---|---|
| The 4 lands | `src/sim/content/` zones + `sim/world.ts` terrain — re-theme, don't recreate |
| Recall combat | the deterministic combat in `src/sim/` (hit tables, damage) — add a question-gated multiplier |
| Subject Mastery | the professions/skill-level + JSONB character-save pattern — add per-subject mastery |
| Gathering | upstream **professions** (gathering nodes) already exist — reskin + add optional focus buff |
| Study Hall / Library | HUD window pattern (`src/ui/*_window.ts`) + a DOM Book Reader overlay |
| Theatre | a world building/interactable + a DOM YouTube overlay |
| Quiz Duels | upstream **PvP / frontier** (`prd/frontier-pvp-honor.md`) — add duel resolution |
| Dailies, guilds, market, cosmetics | upstream quests, guilds, world market, achievements — reskin |
| Mobile | Capacitor + touch controls + PWA (already shipped) |

## Architecture rules every WP holds (from root CLAUDE.md)
- **Server-authoritative + deterministic.** Question selection is `Rng`-seeded in
  `src/sim/`; the server computes damage/yield/XP/Gold. The client only shows the
  question and submits choice + timing. No client-trusted outcomes (anti-cheat).
- **`IWorld` is the only seam.** New feature → add to a `src/world_api/<domain>.ts`
  facet, implement in **both** `Sim` and `ClientWorld`, update the parity test.
- **`src/sim/` stays pure** (no DOM/Three, no `Math.random`/`Date.now`).
- **i18n:** every player string is a `t()` key (English-only PRs legal).
- **Merge bar per WP:** `npm run gate` green (tests + tsc + all builds + i18n + malware),
  determinism preserved, tests added for sim/server changes.

## Milestones (each is one focused branch/PR, shippable, green)

### M0 — Recall core (the engine of everything) ← FIRST
Server-authoritative, deterministic question → outcome. `Rng`-seeded `pickQuestion`
in `src/sim/`; server validates the answer and computes the damage/yield multiplier;
new `SimEvent` variants; extend `IWorld` (question shown / answer submitted / result)
and implement in `Sim` + `ClientWorld`. Question bank as data-as-code in
`src/sim/content/` (NCERT tiers 1–6). **Nothing else can be trusted until this exists.**

### M1 — Subject Mastery progression
Per-player, per-subject mastery (L1–20, ~4 levels = a tier) persisted **additively**
in the JSONB character save. Correct answers grant Mastery XP; tier raises yield +
damage + unlocks higher nodes. HUD skills readout. Wire the combat/gather multiplier
to real persisted mastery.

### M2 — The 4 lands (world re-theme)
Re-theme upstream zones into Vidya Nagar / Whisperwood / Ironstone / Wilderness
Frontier: names, mobs, nodes, question-tier bands, mastery-gated Frontier entry +
small death risk. Data-as-code in `src/sim/content/`; keep terrain/parity.

### M3 — Study Hall + Library
The Study Hall building: (a) **Book Reader** DOM overlay from a scaled-up
`public/data/books.json` (many books, chapters, categories, reading themes, ToC —
grow the current 5 to a real library); (b) focused **quiz session** that spends
materials + Gold to raise a Subject Mastery tier. Plus the hub buildings
(Guru/Acharya intro NPC, Chai Stall heal, Library Locker bank, Trading Post).

### M4 — Learning Theatre
Cinema building, limited seats, angled in-world screen, DOM overlay auto-playing an
**English educational YouTube playlist (6am–9pm sim-clock gate)**, Fullscreen button.
Curate real video IDs (replace placeholders). Shared seating shows real players.

### M5 — Challenge others (Quiz Duels, PvP)
On the upstream PvP/frontier layer: two players get the same `Rng`-seeded question;
faster-correct deals damage; server-authoritative resolution; wager/badge rewards;
Frontier-gated.

### M6 — Live-world social + polish
Universal chat (upstream chat, reskinned), daily challenges (upstream quests/streaks),
Cosmetics Emporium (upstream cosmetics/achievements, visual-only, Gold), mobile HUD
pass, accessibility. Then the economy sinks close the loop (Study Hall + cosmetics).

## Definition of done (program)
One 3D client (desktop + mobile-web/PWA) rendering the server-authoritative sim;
recall resolves server-side and deterministically; mastery persisted and driving
progression; the 4 lands, Study Hall + Library, Theatre, and Quiz Duels all live;
Gold is the one currency; professional pan-India naming; all gates green.

## Recommended first step
**M0, slice 1: the question bank + `Rng`-seeded `pickQuestion` in `src/sim/`, with a
unit test proving determinism (same seed ⇒ same question order).** It's pure sim,
needs no art or server wiring, and it's the foundation every other pillar stands on.
