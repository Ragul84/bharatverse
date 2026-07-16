# BharatVerse — Master Plan (the universal learning MMO)

**The first-ever learning MMO — a game that helps *everyone* learn, together.**
A living 3D world of Indian monuments where you **play to learn**: the grind of
studying becomes the fun of an MMO. Rebased on the latest upstream World-of-ClaudeCraft
3D engine (desktop + mobile-web/PWA); we layer the learning game on upstream's mature
systems, not a new engine.

Design references: `kintara-adapted-design.md`, `gameplay-design.md`.

---

## 1. Vision & audience — universal (LOCKED)
**For everyone, not one exam.** A school kid, a UPSC/JEE aspirant, a curious adult, a
professional upskilling — all play the same world and learn what *they* want. The game
adapts to the learner, not the other way around.
- **Learning Goals** (universal, replaces "exam tracks"): pick what you want to grow —
  a school subject, a competitive exam, a skill, general knowledge, or just curiosity —
  and the game curates your questions, difficulty, revision cadence, and a readiness
  dashboard. Everything (mock tests, leaderboards, mastery) works for any goal.
- One promise: **anyone can learn anything here, and it's fun because you do it together.**

## 2. The one rule (non-negotiable)
Recall is the **power/multiplier and the destination — never a per-click toll.**
Learning is what makes you stronger; it is never friction on every action.

## 3. Quiz content — SOLVED (mindwhite / quizhub Redis)
We already own a large quiz corpus in **Redis (quizhub, under the mindwhite project)**,
so **we do not author questions.** Integration design:
- A server-side **Question Service** syncs the Redis quiz bank into a **normalized,
  versioned catalog** (topic → difficulty tier, answer keys + explanations), keyed so any
  Learning Goal can draw from it.
- The deterministic sim selects **`Rng`-seeded over a fixed catalog snapshot** (never
  calling Redis mid-tick — determinism + server-authority preserved).
- **Answer validation is server-side** (anti-cheat). Explanations feed post-quiz review
  (learning, not just scoring). Redis stays the source; each realm uses an immutable snapshot.
- **NEEDED to finish M0:** the quizhub Redis connection **or** the mindwhite/quizhub repo
  to read its schema (how categories/topics/difficulty are structured), so the sync +
  mapping is exact. Give me either and M0 slice 1 is unblocked.

## 4. Many ways to learn (active → passive, solo → social)
| Mode | What it is |
|---|---|
| **Recall combat** | answer to fight mobs; damage × answer-quality × mastery |
| **Skill nodes** | gather with an optional focus-quiz buff (2× yield) |
| **Study Hall + Library** | read books deeply + focused quiz sessions raising mastery |
| **Flashcards / Spaced repetition** | a Leitner deck that reschedules your weak topics (revision) |
| **Assessment Arena** | timed tests / mock exams as scheduled events; scored, ranked, analyzed |
| **Learning Theatre** | passive video playlists (concept explainers), 6am–9pm |
| **Quiz Duels (PvP)** | 1v1 "challenge others", faster-correct wins |
| **Co-op Boss Raids** | a group answers escalating questions to beat a boss (learn together) |
| **Guild Classrooms / Study Groups** | persistent social study bases; group streaks, peer teaching |
| **Monument Puzzle Stations** | mini-games at each landmark (maps, timelines, logic) |
| **Daily Challenges & Streaks** | the habit loop; badges + Gold |

## 5. The world — Indian monuments as lands & buildings (LOCKED)
One 3D world; regions themed on **real, secular Indian monuments** (inclusive):
- **Statue of Unity plaza** — spawn / hub / the Guru (Acharya) intro.
- **Nalanda Great Library** — Study Hall + the book Library (the historic university).
- **India Gate district** — social square, events, the **Assessment Arena**.
- **Hampi / Qutub Minar ruins** — exploration + Monument Puzzle Stations (mid tier).
- **Konark / Hawa Mahal / Victoria Memorial** — higher-tier challenge zones, elites, duels.

Buildings → functions: Library, Study Hall, Theatre, Assessment Arena, Guild Classroom,
Trading Post, Cosmetics Emporium, Chai Stall (heal). Re-theme upstream zones + buildings.

## 6. Characters — 6 unique personas (LOCKED) — each shapes HOW you learn + a co-op role
**Scholar** (reading/library) · **Strategist** (maths/logic) · **Explorer** (GK/geography/
puzzles) · **Orator** (language) · **Inventor** (science/tech) · **Mentor** (support: buffs
the group, earns by teaching — the social glue). Free base customization (Indian attire);
cosmetics visual-only, earned with Gold.

## 7. Social / play together (a first-class pillar, built early)
Guilds = **study groups**; **co-op boss raids**; **quiz duels**; shared Theatre; **group
assessments**; per-topic **leaderboards**; **mentorship** (high-mastery players earn
Gold/renown by helping juniors); universal chat. Server-authoritative throughout.

## 8. Progression
- **Subject Mastery** L1–20 per topic (~4 levels = a tier → +yield/+damage/unlocks).
- **Spaced-repetition schedule** per player, persisted (JSONB, additive).
- **Learning Goals** curate content + a progress/readiness dashboard (universal).
- **Gold** (one currency): earned by answering; sinks = mastery upgrades, cosmetics, pets.
- Badges + leaderboards + streaks for retention.

## 9. Build sequence — optimized for the full version (LOCKED)
Foundation first, then identity + place, then depth, then the social soul, then breadth.
Each milestone is one focused branch/PR, shippable, `npm run gate` green.

| M | Milestone | Why here |
|---|---|---|
| **M0** | **Question Service + deterministic recall core** — sync quizhub Redis → catalog → `Rng`-seeded selection + server validation; `IWorld` question/answer/result events in both worlds | the foundation of everything |
| **M1** | **Subject Mastery + spaced repetition** (persisted) | the progression engine |
| **M2** | **Monument world + hub buildings + the 6 personas** | it becomes BharatVerse; players get identity early |
| **M3** | **Study Hall + Library** (book reader) + **Flashcards** | core solo learning depth |
| **M4** | **Social layer** — universal chat, Guild Classrooms/study groups, Co-op Raids, Quiz Duels | "together" is the soul — build it early, not last |
| **M5** | **Assessment Arena** — timed tests/mocks, scoring, leaderboards, Learning-Goal dashboards | measurable growth for any goal |
| **M6** | **Learning Theatre + Monument Puzzle Stations** | passive learning + variety/fun |
| **M7** | **Economy, cosmetics, dailies, mobile polish, accessibility** | retention + ship quality |

## 10. Invariants every milestone holds
Server-authoritative + deterministic (`Rng`, no `Math.random`); `src/sim/` pure; new
data/actions go through an `IWorld` facet implemented in **both** `Sim` and `ClientWorld`;
every player string is a `t()` key; merge bar = `npm run gate` green + tests for sim/server.

## 11. Status of open items
1. Universal audience — **LOCKED** (not exam-specific; Learning Goals for everyone).
2. Monuments — **LOCKED** (set above).
3. Personas — **LOCKED** (the 6 above).
4. Sequencing — **LOCKED** (full-version order above; social elevated to M4).
5. **quizhub Redis — the one remaining input:** connection details **or** the
   mindwhite/quizhub repo/schema, so M0's sync + topic mapping is exact.

## First step (M0, slice 1)
Stand up the Question Service + an `Rng`-seeded `pickQuestion` in `src/sim/` over a
normalized question catalog, with a determinism unit test (same seed ⇒ same order) and
server-side answer validation. Pure sim + server; no art needed. Unblocked the moment I
have the quizhub schema/connection (or a sample export to model against).
