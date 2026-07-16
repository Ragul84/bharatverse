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
- **Combat model = real-time MMO + quiz power-moments (LOCKED).** You move and fight in
  real-time on upstream's existing combat (we keep it, don't rebuild). **Questions surface
  as power-moments**, not per-swing tolls: charging a special/finisher, a boss-phase
  gate, a gather crit, a duel volley. Answer well → a big, satisfying power spike. This
  keeps it feeling like a real MMO with learning woven through, and reuses the upstream
  combat/ability engine.
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

**Locked monument mapping:** Hub = **Statue of Unity** plaza · Practice groves =
**Lodhi / Hanging Gardens** · Caverns = **Ajanta–Ellora** rock-cut caves · Frontier =
**Hampi ruins + Konark** · plus special hubs **Nalanda Great Library** and **India Gate**
(Assessment Arena). Qutub Minar / Hawa Mahal / Charminar / Gateway of India = later
districts. All secular, iconic, visually distinct.

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

## 7. Characters — 6 personas as FULL RPG classes (LOCKED)
Each persona is a **full class** — unique abilities, a **talent/skill tree**, and a
distinct combat + co-op role — built by **re-theming upstream's existing 9-class + talent
system** (we map/rename, not rebuild) into the 6 learning identities. Each also has a
**subject affinity** (faster Mastery / bonus power in its lane) so your class reinforces
how you learn. Quiz power-moments (§3) charge each class's signature abilities.
| Persona | Affinity | Base upstream class | Combat identity | Co-op role |
|---|---|---|---|---|
| **Scholar** | Humanities/Reading | **Priest** | insight/light caster | healer / sustain |
| **Strategist** | Maths/Logic | **Mage** | precise burst caster | ranged DPS / crit |
| **Explorer** | GK/Geography | **Hunter** | ranger + companion | utility / scout |
| **Orator** | Language | **Paladin** | aura/buff leader | support |
| **Inventor** | Science/Tech | **Warlock** | summons gadgets, DoT/AoE | control |
| **Mentor** | Teaching (any) | **Druid** | shapeshifting, adaptable | flex healer / leader |

The remaining upstream classes (**Warrior, Rogue, Shaman**) are held as candidate future
personas or alternate specs. Each persona keeps its base class's abilities + talent tree
(re-themed names), and quiz power-moments charge its signature abilities. *(Proposed
mapping — confirm/adjust.)*
Free base customization (skin/hair/attire, Indian options); cosmetics earned with Gold,
visual-only. **Next design step:** map each of upstream's 9 classes/talent trees → the 6
personas (which to keep/merge/rename, and each signature power + affinity).

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
- No pay-to-win; cosmetics never touch power.
- **Monetization = free + cosmetics-only (LOCKED).** Fully free to learn; revenue only
  from visual cosmetics/pets. Most inclusive, fairest, best reach in India.
- **Online model = online-only (LOCKED)**, like kintara: always-connected shared world,
  server-authoritative (matches upstream). No offline/solo mode.

## 11. Retention & onboarding
- **Onboarding:** Guru intro → pick a Learning Goal → guided first fight/gather/answer →
  first mastery-up → hub tour. Short, playable, teaches by doing.
- **Retention:** daily challenges, streak shields (answer-streak protects your streak),
  spaced-repetition due-cards nudge, badges, seasonal leaderboards, the Readiness dashboard.

## 12. Content (see `quizhub-integration.md`)
Questions ingested from the mindwhite/quizhub Upstash Redis into a versioned server
catalog; deterministic `Rng` selection; server-side validation via the ported
`evaluateQuizQuestion`; explanations feed post-answer review.
**Library books:** ingest mindwhite's already-extracted **textbook corpus** — 1,211
NCERT + Samacheer chapters (`data/textbook-release-corpus` + the `textbookSourceIndex`
metadata, the same corpus powering mindwhite's textbook-aware AI chat) — into the Book
Reader (by board/class/subject/chapter). No authoring; matches the NCERT+Samacheer goal.

## 13. Tech invariants (from root CLAUDE.md)
Server-authoritative + deterministic (`Rng`, no `Math.random`/`Date.now`); `src/sim/`
pure; new data/actions via an `IWorld` facet in **both** `Sim` + `ClientWorld`; every
player string a `t()` key; mobile-web/PWA first; merge bar = `npm run gate` green.

## 14. Design decisions — ALL LOCKED (2026-07-16), design CLOSED
- Universal audience · Indian-monument world · **online-only** · **free + cosmetics-only**.
- **Combat = real-time MMO + quiz power-moments** (keep upstream combat).
- **6 personas as full RPG classes** — mapping locked (§7): Scholar=Priest, Strategist=Mage,
  Explorer=Hunter, Orator=Paladin, Inventor=Warlock, Mentor=Druid.
- **Monuments/lands locked** (§5): Statue of Unity hub · Lodhi/Hanging-Gardens groves ·
  Ajanta–Ellora caverns · Hampi + Konark frontier · Nalanda Library · India Gate arena.
- **PvP death risk = light**: drop a small % of carried Gold + unbanked materials only;
  never Mastery/XP/levels; respawn at Chai Stall.
- **First Learning Goal = NCERT + Samacheer (6–12)** — school curriculum that also forms
  the foundation for most government exams; the wider exam Goals layer on after.
- **Quiz content** = mindwhite/quizhub Upstash Redis (`quizhub-integration.md`).
- **Library book content** = mindwhite's already-extracted **textbook corpus** (1,211
  NCERT+Samacheer chapters: `data/textbook-release-corpus` + `textbook-source-index.ts`,
  the same corpus behind mindwhite's textbook-aware AI chat) — ingested, not authored.

Design is complete. Build begins at **M0** (`implementation-plan.md`) when the go-ahead is given.
