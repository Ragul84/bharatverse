# BharatVerse — Game Design Document (GDD)

The authoritative design for the universal learning MMO. Companion docs:
`implementation-plan.md` (build sequence), `quizhub-integration.md` (quiz content),
`kintara-adapted-design.md` + `gameplay-design.md` (earlier reference).

> Status: living design. Sections marked **[OPEN]** need a decision. Everything else is
> the current locked design.

---

## 1. Pillars (the promise)
1. **Play to learn** — learning IS the gameplay; it's never a toll on top of a game.
2. **For everyone** — school kids, exam aspirants, curious adults; any Learning Goal.
3. **Together** — social by default: guilds-as-study-groups, co-op, duels, mentorship.
4. **India, modern & secular** — a 3D world of Indian monuments; clean, inclusive theming.
5. **Real content** — questions come from the mindwhite/quizhub bank (no filler).

## 2. The core loop (moment-to-moment)
1. Pick / continue a **Learning Goal** (e.g. "Class 10 Science", "UPSC Polity", "brush up GK").
2. Enter a **land** matching your level; act on the world — fight a mob, gather a node,
   join a raid — which triggers a **question**.
3. **Answer** → power scales with correctness + speed × your **Subject Mastery** tier.
4. Earn **Gold, materials, Mastery XP**; the answer's **explanation** teaches you.
5. Spend at the **Study Hall** (raise a Mastery tier), **Trading Post** (Gold), **Cosmetics**.
6. **Together:** chat, group up, duel, raid, climb **leaderboards**, help juniors as a **Mentor**.
7. **Habit:** daily challenges + streaks + spaced-repetition reviews pull you back.

## 3. The recall system (the heart)
- **Question flow:** the server picks an `Rng`-seeded question for the activity's
  subject+difficulty, sends it **without the answer key**, the client shows it, the player
  responds with `{choice/response, timingMs}`, the **server validates** (ported
  `evaluateQuizQuestion`) and returns correctness + the explanation.
- **Answer quality → power** (a multiplier, not pass/fail):
  - Correct + fast → **crit** (max damage/yield + Mastery XP + combo).
  - Correct → full power + Mastery XP.
  - Wrong → **reduced power (~40%), no Mastery XP** — you still act, never hard-blocked
    (keeps flow; wrong answers show the explanation so you learn).
- **Combo/streak:** consecutive corrects build a combo multiplier (resets on wrong);
  drives the "in the zone" feel and streak rewards.
- **Question types:** start `mcq`/`true_false`; expand to `multi_statement`, `match`,
  `sequence`, `assertion_reason`, `fill_blank`, `passage` (all already in the corpus).
- **Determinism + anti-cheat:** selection is seeded in `src/sim/`; validation + answer
  keys live server-side only.

## 4. Progression — Subject Mastery + Learning Goals
- **Subject Mastery** per subject (History, Maths, Science, Polity, English, …): **L1–20**,
  correct answers grant Mastery XP, **~4 levels = a tier**. Higher tier → **+yield,
  +damage, unlocks higher-value nodes/mobs** (this replaces "tool upgrades").
- **Spaced repetition (Leitner):** every answered question schedules a review; weak topics
  resurface sooner. A **Review** activity (and daily nudge) clears due cards. This is the
  retention + real-learning engine, persisted per player (JSONB, additive).
- **Learning Goals:** pick a goal → the game curates which subjects/topics/difficulty you
  see, sets a review cadence, and shows a **Readiness dashboard** (mastery %, weak areas,
  mock scores, streak). Universal: works for a class, an exam, or a freeform goal.
- **Levels & power:** an overall character level (for world gating/HP) rises with total
  Mastery XP; cosmetics never affect power (fair).

## 5. The world — 4 lands (one continuous 3D map)
Bands from safe → challenge, gating by Mastery + difficulty tier:
1. **Vidya Nagar (Statue of Unity plaza)** — safe hub. Spawn, Guru/Acharya onboarding,
   all core buildings, tier-1 (easy) questions in the surrounding fields.
2. **Whisperwood (learning groves)** — the main practice belt: gather nodes + easy/medium
   mobs, tiers 1–3, low risk. *(Language/English-flavored, but any Goal draws here.)*
3. **Ironstone Caverns** — mid tier: harder nodes/mobs, medium difficulty, mastery-gated
   deeper caves. *(Maths/logic-flavored.)*
4. **Wilderness Frontier (Konark/Hampi ruins)** — endgame: hard (tier 4–6) questions,
   elite mobs, **Quiz Duels (PvP)**, rare high-value nodes, and a **small death risk**
   (drop a little Gold/materials). Mastery-gated entry.

Additional landmark hubs interspersed: **Nalanda Great Library**, **India Gate district**
(events/Assessment Arena). Monuments are secular and iconic. **[OPEN]** final monument
list + which land each maps to.

## 6. Buildings & features (each functional)
| Building | Function |
|---|---|
| **Guru / Acharya** (NPC) | onboarding; sets first Learning Goal; teaches the loop |
| **Study Hall** | spend materials + Gold on a focused quiz session → **raise a Mastery tier** (the core upgrade) |
| **Nalanda Library** | the **Book Reader** — read books/chapters (scaled-up `books.json`), themes, ToC; deep learning + lore |
| **Learning Theatre** | limited seats, angled screen auto-playing an English educational **YouTube playlist (6am–9pm)**, Fullscreen button; a shared hangout |
| **Assessment Arena** (India Gate) | scheduled **timed tests / mock exams**; scored, ranked, analyzed; feeds the Readiness dashboard |
| **Guild Classroom** | a study group's persistent base: shared goals, group streaks, peer teaching, co-op raid staging |
| **Trading Post** | sell materials (Wood/Ore/…) for Gold |
| **Cosmetics Emporium** | hats, outfits (Indian attire), pets — visual-only, Gold |
| **Chai Stall / Wellspring** | stand near → restore HP ("review & recover") |
| **Library Locker (Bank)** | store materials + cosmetics |

## 7. Characters — 6 personas (LOCKED set; details **[OPEN]**)
Each shapes **how you learn best** (a subject affinity → faster Mastery / bonus power in
that lane) and a **co-op role**:
| Persona | Affinity | Co-op role |
|---|---|---|
| **Scholar** | Reading/Humanities | sustain — bonus from Library/reading |
| **Strategist** | Maths/Logic | burst — combo/crit specialist |
| **Explorer** | GK/Geography | utility — puzzle/exploration bonuses |
| **Orator** | Language | support — buffs allies' answer window |
| **Inventor** | Science/Tech | control — gadgets/AoE in raids |
| **Mentor** | Any (teaching) | healer/leader — buffs the group, earns by helping juniors |
Free base customization (skin/hair/attire, Indian options); cosmetics earned with Gold,
visual-only. **[OPEN]** exact per-persona numbers/abilities.

## 8. The many ways to learn (each a distinct activity)
- **Recall combat** — the daily driver.
- **Gathering (skill nodes)** — click-and-gather + optional **focus buff** (answer 1 Q →
  2× yield for ~30s); never blocks a swing.
- **Study Hall sessions** — deliberate mastery grind.
- **Flashcards / spaced repetition** — the review loop.
- **Assessment Arena** — timed mocks; solo or group.
- **Learning Theatre** — passive video.
- **Quiz Duels (PvP)** — 1v1 challenge; same question, faster-correct wins.
- **Co-op Boss Raids** — a group answers escalating questions to beat a boss; roles matter.
- **Monument Puzzle Stations** — map/timeline/logic mini-games per landmark.
- **Daily Challenges** — "answer 8 History, win 3 duels" → Gold/badges.

## 9. Social — the "together" pillar
- **Guilds = study groups:** shared Classroom, group goals + streaks, roster, ranks.
- **Co-op raids** and **group mock tests** (compete/collaborate).
- **Quiz Duels** and **leaderboards** (per subject / per Learning Goal / per realm / friends).
- **Mentorship:** high-Mastery players earn **Gold/renown** by helping juniors (Mentor
  persona leans in) — turns experts into teachers.
- **Universal chat** (global + guild + whisper); server-authoritative, moderated.

## 10. Economy (one currency: Gold)
- **In:** answering (combat most), selling materials, dailies, mentorship, duels/mocks.
- **Sinks:** Study Hall mastery upgrades · Cosmetics · pets · (later) player market.
- **Materials:** from gathering (recall-gated); consumed by Study Hall upgrades.
- Self-reinforcing: more Mastery → better nodes/mobs → more Gold/materials → more upgrades.
- No pay-to-win; cosmetics never touch power. **[OPEN]** monetization model (later).

## 11. Retention & onboarding
- **Onboarding:** Guru intro → pick a Learning Goal → guided first fight/gather/answer →
  first mastery-up → hub tour. Short, playable, teaches by doing.
- **Retention:** daily challenges, streak shields (answer-streak protects your streak),
  spaced-repetition due-cards nudge, badges, seasonal leaderboards, the Readiness dashboard.

## 12. Content (see `quizhub-integration.md`)
Questions ingested from the mindwhite/quizhub Upstash Redis into a versioned server
catalog; deterministic `Rng` selection; server-side validation via the ported
`evaluateQuizQuestion`; explanations feed post-answer review. Books for the Library are a
scaled-up `public/data/books.json` (**[OPEN]** source/volume of books).

## 13. Tech invariants (from root CLAUDE.md)
Server-authoritative + deterministic (`Rng`, no `Math.random`/`Date.now`); `src/sim/`
pure; new data/actions via an `IWorld` facet in **both** `Sim` + `ClientWorld`; every
player string a `t()` key; mobile-web/PWA first; merge bar = `npm run gate` green.

## 14. Open design decisions (to close the design)
1. **[OPEN]** Final **monument list** + land mapping (§5).
2. **[OPEN]** **Persona** numbers/abilities (§7) — is the 6-role split right?
3. **[OPEN]** **Combat feel** — turn-based question-per-attack, or real-time with periodic
   quiz "power moments"? (affects how recall-combat plays).
4. **[OPEN]** **PvP death risk** amount in the Frontier (§5) — how punishing?
5. **[OPEN]** **Books** — where the Library's book content comes from + how many.
6. **[OPEN]** **Monetization** (§10) — free / cosmetics-only / premium Learning Goals?
7. **[OPEN]** **Offline/solo** — is there a single-player mode, or online-only like kintara?
