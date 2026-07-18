# BharatVerse - Complete World & Player Plan

The single source of truth for the world, everything a player can do, what we ADD, and
(critically) what we CUT from upstream to make the game light and smooth on every device,
mobile included. Companion: `game-design.md` (systems), `implementation-plan.md` (build
order), `quizhub-integration.md` (quiz data).

---

## 0. Honest current state (2026-07-18)
- DONE: re-fork on latest upstream; full rebrand (text/SEO/app id); crypto UI removed;
  zones/mobs/quests renamed to clean-English BharatVerse names; the recall ENGINE built +
  tested in code (question bank, answer check, power, mastery, session) + persisted state.
- NOT done (all still upstream): the 3D world visuals, monuments, the buildings (Study
  Hall/Library/Theatre/Arena), the 6 personas, and recall is NOT wired into the UI yet.
- Net: logging in today is ~95% the upstream game with Indian names. Everything below is
  the plan to change that.

## 1. Vision (one line)
The first-ever universal learning MMO: a light, fast, mobile-first 3D world of Indian
monuments where anyone learns anything, together, and learning IS the gameplay.

## 2. The world map - the lands and what is in each
One continuous world, four bands, safe -> challenge. (Upstream ships 3 zones; the 4th
"land" is a special district inside the map.)

| Land | Monument theme | Question tier | What is there |
|---|---|---|---|
| **Unity City** (hub) | Statue of Unity plaza | easy (tier 1) | Spawn, the Guru (intro), ALL town buildings, safe practice fields |
| **Whisperwood / Unity Vale** | garden groves | easy-medium (1-3) | Gather nodes, easy mobs, the main practice belt |
| **Emerald Backwaters** | Ajanta-style caverns + wetlands | medium (3-4) | Mid mobs/nodes, deeper mastery-gated areas |
| **Summit Frontier** | Hampi/Konark ruins + peaks | hard (4-6) | Elite mobs, Quiz Duels (PvP), best rewards, light death risk |
| **Nalanda district** (special) | Nalanda Great Library | any | The Library + Assessment Arena hub |

## 3. EVERYTHING a player can do (the complete activity list)
### Learn (solo)
- **Recall combat** - approach a mob, a question fires as a "power moment", answer -> your
  hit's damage scales with correctness + speed + your Subject Mastery + combo.
- **Gather** (wood/ore/etc.) - click a node; optionally answer 1 question for a 2x "focus"
  buff on the next run. Never blocks a swing.
- **Study Hall** - spend materials + Gold on a focused quiz session -> raise a Subject
  Mastery tier (the core "upgrade").
- **Library (Nalanda)** - read real textbook chapters (your mindwhite corpus); deep learning.
- **Flashcards / spaced repetition** - a review deck that resurfaces your weak topics.
- **Learning Theatre** - sit and watch curated educational videos (a shared hangout).
### Learn (together)
- **Quiz Duels** (PvP) - 1v1, same question, faster-correct wins.
- **Co-op Boss Raids** (light) - a group answers escalating questions to beat a boss.
- **Guild Classrooms** - join a study group; shared goals, group streaks, peer teaching.
- **Assessment Arena** - timed tests / mock exams; scored, ranked on leaderboards.
- **Mentorship** - high-mastery players earn Gold/renown by helping juniors.
- **Universal chat** - global + guild + whisper.
### Progress & rewards
- **Subject Mastery** L1-20 per subject (drives power, unlocks better nodes/mobs).
- **Learning Goals** - pick a goal (NCERT class, an exam, a skill); the game curates content.
- **Gold** (one currency) - earn by answering; spend on mastery upgrades + cosmetics + pets.
- **Daily challenges + streaks + badges** - the habit loop.
- **Cosmetics** - outfits (Indian attire), hats, pets - visual only, never power.
### Explore
- Walk/run the 3D world, discover the monuments, **Monument Puzzle Stations** (map/timeline
  mini-games), leaderboards, your readiness dashboard.

## 4. Town buildings (each functional; built by reskinning upstream + new DOM overlays)
| Building | Function | Basis |
|---|---|---|
| **Guru / Acharya** | onboarding, first Learning Goal, teaches the loop | upstream NPC + quest |
| **Study Hall** | focused quiz -> raise a Mastery tier | new building + quiz UI |
| **Nalanda Library** | read textbook chapters (mindwhite corpus) | new building + book-reader overlay |
| **Learning Theatre** | seats + big screen, curated YouTube playlist | new building + video overlay |
| **Assessment Arena** | timed mocks, scoring, leaderboards | new + upstream arena bones |
| **Guild Classroom** | study-group base | upstream guild, reskinned |
| **Trading Post** | sell materials for Gold | upstream market/vendor |
| **Cosmetics Emporium** | buy outfits/pets (Gold, visual) | upstream cosmetics |
| **Chai Stall** | stand near -> heal ("review & recover") | upstream heal spot |
| **Library Locker** | store materials/cosmetics | upstream bank |

## 5. Characters - 6 personas as full classes (reskin upstream's 9)
Scholar=Priest - Strategist=Mage - Explorer=Hunter - Orator=Paladin - Inventor=Warlock -
Mentor=Druid. Each = a subject affinity + a co-op role. (Warrior/Rogue/Shaman held.)
Free Indian-attire customization; cosmetics earned with Gold.

## 6. THE TRIM LIST - cut upstream weight for a light, smooth, mobile-first game
Upstream is a full desktop MMO with lots of content BharatVerse does not need. Cutting it
shrinks the download, the CPU/GPU cost, and the code surface - directly making mobile
smooth. Proposed:

**Remove / disable (off-theme or heavy):**
- The **Nythraxis raid** + heroic dungeons + world bosses (huge, complex endgame combat).
- **Delves** (The Drowned Litany etc.) + the lockpick minigame.
- **PvP modes we do not use**: ranked Arena, Fiesta, Vale Cup boarball, Protect Yumi,
  Frostreach Frontier honor/$WOC stakes. (Keep only simple **Quiz Duels**.)
- **Crypto/wallet backend** (holder tiers, Solana linking) - UI already hidden; remove the
  server routes + sim `holderTier` next.
- **Desktop/Steam** shell (Electron) + the **Discord bot** + native Capacitor extras we do
  not ship - trims build + deps.
- Heavy **cosmetic asset packs** / GLB models for removed content - drop from `public/`.
- Some **professions** (enchanting/salvage) if not part of the loop.

**Keep + reskin (the core loop):**
- Zones/world/terrain, movement, camera, mobile touch controls, the quality-tier/LOD/PWA
  system (already mobile-ready), combat (-> recall), gathering (-> recall focus), quests
  (-> learning quests), guilds (-> study groups), market, bank, chat, cosmetics, the HUD.

Every cut is: remove the content data + its render/UI + its tests, keep the build green.
Net effect: smaller bundle, fewer draw calls, less code = smoother on low-end Android.

## 7. Performance / mobile plan
- Upstream already ships **device-aware quality tiers** (weak GPUs default to LOW), **LOD**,
  a **PWA manifest**, and **touch controls** - so the base is mobile-capable.
- Add: a **service worker** (offline shell/caching), asset-budget trimming (from the trim
  list), and a measured **FPS target on a mid Android** we hold the line on.

## 8. Build order (revised - trim first so we build on a light base)
1. **M-Trim** - cut the unwanted upstream content (Section 6). Lighter base, faster iteration.
2. **M0 recall wiring** - finish plugging the recall engine into combat + HUD (make learning
   real and visible). [engine done; wiring in progress]
3. **M1 mastery + spaced repetition** (persisted; HUD skills panel).
4. **M2 the world** - re-theme zones + build the **monuments** + the **town buildings**.
5. **M3 Study Hall + Library** (textbook reader) + Flashcards.
6. **M4 social** - study-group guilds, co-op raids, Quiz Duels, chat.
7. **M5 Assessment Arena** (mocks + leaderboards).
8. **M6 Theatre + puzzle stations**; **M7 personas + cosmetics + polish + service worker**.

## 9. Done vs to-do (honest)
| Area | State |
|---|---|
| Re-fork, backup, rebrand, crypto UI removal, zone names | DONE |
| Recall ENGINE (code) + persisted state | DONE |
| Recall wired into combat/HUD | **DONE (M0 combat power-moments + HUD panel)** |
| Mastery panel + spaced repetition | **DONE (M1)** |
| Trim upstream weight | **IN PROGRESS (M-Trim slice 1 shipped)** |
| Monuments + buildings (Study Hall/Library/Theatre/Arena) | **DONE (M2 hub shells + NPCs)** |
| 6 personas | NOT STARTED |
| Live quiz sync + textbook ingest | BLOCKED on Upstash creds |
| Logo art | BLOCKED on user file |
| Service worker / final mobile polish | NOT STARTED |

### M-Trim slice 1 (2026-07-18) - what landed
- `src/sim/bharatverse_features.ts` - pure feature flags; cut systems default OFF
- Surface trim hides arena / delves / vale cup / wallet / Claudium chrome
- Wallet permanently `WALLET_ENABLED = false`; world-boss auto-schedule disabled
- Player-facing brand de-fork: `bharatverse.game`, logo, no upstream socials
- Mobile-first graphics: touch devices auto-default at most MEDIUM (unknown -> LOW)
- Remaining: hard-delete dead content modules + assets, gate delves/heroic/nythraxis in sim entry

## 10. Open decisions for you
1. **Approve the trim list** (Section 6) - anything you want to KEEP that I marked for cut?
2. **Sequence**: do M-Trim (lighten) first, or M0 recall wiring (visible learning) first?
3. Provide when ready: Upstash Redis URL+token, and your logo file.
