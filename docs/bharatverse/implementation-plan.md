# BharatVerse — Master Plan (educational MMO)

**India's first educational MMO.** A living 3D world of Indian monuments where you
**play to learn — together.** The grind of studying becomes the fun of an MMO.
Rebased on the latest upstream World-of-ClaudeCraft 3D engine (desktop + mobile-web/PWA);
we layer the education game on upstream's mature systems, not a new engine.

Design references: `kintara-adapted-design.md`, `gameplay-design.md`.

---

## 1. Vision & audience (one platform, two audiences)
- **School students (K–12, NCERT)** — master subjects through play.
- **Exam aspirants** — gamified, social prep for **UPSC / SSC / banking / JEE / NEET /
  GATE / CAT / state exams**: mock tests, spaced-repetition revision, leaderboards,
  streaks. *This is the "very very useful" wedge — turn lonely exam grind into a
  social game.*

One world serves both via **Exam Tracks** (pick a goal → the game curates your
subjects, difficulty, mock cadence, and a progress dashboard).

## 2. The one rule (non-negotiable)
Recall is the **power/multiplier and the destination — never a per-click toll.**
Studying is what makes you stronger; it is never friction on every action.

## 3. Quiz content — SOLVED (mindwhite / quizhub Redis)
We already own a large quiz corpus in **Redis (quizhub, under the mindwhite project)**,
so **we do not author questions.** Architecture:
- A server-side **Question Service** syncs the Redis quiz bank into a **normalized,
  versioned catalog** (subject → exam → topic → difficulty tier, with answer keys +
  explanations).
- The deterministic sim selects questions **`Rng`-seeded over a fixed catalog snapshot**
  (never calling Redis mid-tick — determinism + server-authority preserved).
- **Answer validation is server-side** (anti-cheat). Redis stays the source of truth;
  each realm/session consumes an immutable synced snapshot.
- Explanations feed the Study Hall / post-quiz review (learning, not just scoring).

> OPEN: connection details for the quizhub Redis (host/schema/how categories map to
> our subjects + exams). Fill in and M0 slice-1 is unblocked.

## 4. Many ways to learn (active → passive, solo → social)
| Mode | What it is | Audience fit |
|---|---|---|
| **Recall combat** | answer to fight mobs; damage × answer-quality × mastery | daily practice |
| **Skill nodes** | gather with an optional focus-quiz buff (2× yield) | light practice |
| **Study Hall + Library** | read books deeply + focused quiz sessions raising mastery | depth |
| **Flashcards / Spaced repetition** | a Leitner deck that reschedules your weak topics | **revision (aspirants)** |
| **Mock Test Arena** | timed full-length mock exams as scheduled events; scored, ranked, analyzed | **aspirants** |
| **Learning Theatre** | passive video playlists (concept explainers), 6am–9pm | rest/absorb |
| **Quiz Duels (PvP)** | 1v1 "challenge others", faster-correct wins | competitive |
| **Co-op Boss Raids** | a group answers escalating questions to beat a boss | **learn together** |
| **Guild Classrooms / Study Groups** | persistent social study bases; group streaks, peer teaching | **together** |
| **Monument Puzzle Stations** | mini-games at each landmark (maps, timelines, logic) | fun/variety |
| **Daily Challenges & Streaks** | the habit loop; badges + Gold | retention |

## 5. The world — Indian monuments as lands & buildings
One 3D world; regions themed on **real, secular Indian monuments** (inclusive — avoid
active religious sites). Each building has a real learning function.

Candidate lands (hub → practice → challenge → endgame):
- **Statue of Unity plaza** — spawn / hub / the Guru (Acharya) intro.
- **Nalanda Great Library** — Study Hall + the book Library (Nalanda = the historic
  university; perfect, secular, iconic).
- **India Gate district** — social square, events, the **Mock Test Arena**.
- **Hampi / Qutub Minar ruins** — exploration + Monument Puzzle Stations, mid tier.
- **Konark / Hawa Mahal / Victoria Memorial** — higher-tier challenge zones, elites, duels.

Buildings → functions: Library, Study Hall, Theatre, Mock-Test Arena, Guild Classroom,
Trading Post, Cosmetics Emporium, Chai Stall (heal). Built by re-theming upstream zones
+ buildings, not from scratch.

## 6. Characters — unique personas (each shapes HOW you learn + a group role)
Not WoW classes — learning-flavored archetypes with a signature power and a co-op role:
- **Scholar** — reading/library bonus (deep learners)
- **Strategist** — maths/logic bonus
- **Explorer** — GK / geography / puzzle bonus
- **Orator** — language bonus
- **Inventor** — science / tech bonus
- **Mentor** — support: buffs the group, earns by teaching (the social glue)
Free base customization (Indian attire options); cosmetics visual-only, earned with Gold.

## 7. Social / play together
Guilds = **study groups**; co-op boss raids; quiz duels; shared Theatre; **group mock
tests**; per-subject/per-exam **leaderboards**; **mentorship** (high-mastery players earn
Gold/renown by helping juniors); universal chat. Server-authoritative throughout.

## 8. Progression
- **Subject Mastery** L1–20 per subject/topic (~4 levels = a tier → +yield/+damage/unlocks).
- **Spaced-repetition schedule** per player, persisted (JSONB, additive).
- **Exam Tracks** — a chosen goal curates content + a progress/readiness dashboard.
- **Gold** (one currency): earned by answering; sinks = mastery upgrades, cosmetics, pets.
- Badges + leaderboards + streaks for retention.

## 9. Build sequence (rebased on upstream 3D / mobile-web — each shippable + `npm run gate` green)
| M | Milestone | Why here |
|---|---|---|
| **M0** | **Question Service + deterministic recall core** — sync quizhub Redis → normalized catalog → `Rng`-seeded selection + server-side validation; `IWorld` question/answer/result events in `Sim` + `ClientWorld` | foundation of everything |
| **M1** | **Subject Mastery + spaced repetition** (persisted) | the progression engine |
| **M2** | **Monument world** — re-theme the lands + hub buildings | makes it BharatVerse |
| **M3** | **Study Hall + Library** (book reader) + **Flashcards** | depth + revision |
| **M4** | **Mock Test Arena** (timed exams, scoring, leaderboards) | the aspirant killer-feature |
| **M5** | **Learning Theatre** (video playlists) | passive learning |
| **M6** | **Social** — Guild Classrooms, Co-op Raids, Quiz Duels | play together |
| **M7** | **Personas + cosmetics**, dailies, monument puzzles, mobile polish | fun + retention |

## 10. Invariants every milestone holds
Server-authoritative + deterministic (`Rng`, no `Math.random`); `src/sim/` pure;
new data/actions go through an `IWorld` facet implemented in **both** worlds; every
player string is a `t()` key; merge bar = `npm run gate` green + tests for sim/server.

## 11. Open questions to lock before M0
1. **quizhub Redis** — connection + how its categories map to our subjects/exams/tiers.
2. **Primary exam(s)** for the first Exam Track (e.g., start with SSC/UPSC GK, or Class-10 NCERT?).
3. **Monument list** — confirm the secular-landmark set for the lands.
4. **Persona set** — keep the 6 above, or adjust names/powers.
5. **Sequencing** — is M4 Mock Test Arena early enough for the aspirant wedge, or pull it before the Theatre?
