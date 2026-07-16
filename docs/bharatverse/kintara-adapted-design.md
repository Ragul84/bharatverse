# Bharatverse — Kintara-adapted design (educational MMO)

Kintara's loop reworked so it makes sense for an **educational** MMO where
**active recall is the power** (there are no axes — *your knowledge is the tool*).
This is the reference the client should converge on.

## CORE RULE: recall is a multiplier, never per-action friction (updated)
Gating every single tree-chop / rock-hit behind a question is exhausting and kills
flow. **Gathering is engaging click-and-gather** (click node → progress bar →
materials, kintara-style). **Recall lives where it's genuinely fun and meaningful:**
- **Combat** — quiz-powered attacks (a deliberate encounter, not spam).
- **Study Hall** — an opt-in focused quiz session that raises Subject Mastery tiers.
- **Daily challenges** — answer N questions for big Gold/badges.
- **Focus buff** — optionally answer one question to get a timed "focus" that
  multiplies the NEXT run of gathers (2× yield/XP for ~30s). Fully optional, never
  blocks a swing.
- **Theatre** — passive learning (auto-playing educational videos).
So knowledge is the **multiplier and destination**, not a toll on every click.

## Extra pillars requested (2026-07-02)
- **Universal chat** — a global channel everyone shares (kintara-style), always
  visible bottom-left. (Multiplayer → server; offline shows a local/system feed.)
- **Movie Theatre** — a cinema building with **limited seats**; sit to watch a big
  screen **auto-playing English-only educational YouTube videos, 6am–9pm**. The
  screen sits at an in-world angle (you can't read it fully) → a **Fullscreen**
  button takes over the screen for real viewing. A shared learning hangout.
- **Modern, professional layouts** — landing page, character select, and every
  HUD/panel redesigned to kintara.gg-level polish.

## The one reframe that drives everything
| Kintara | Bharatverse |
|---|---|
| Physical tools (axe/pickaxe/sword) | **Recall** — answer a question to swing/mine/hit |
| Upgrade a tool at the anvil → Lvl 2 = 2× yield | **Subject Mastery levels** → higher mastery = 2× yield / harder nodes / more damage |
| 5 skills (Combat, Woodcutting, Mining, Fishing, Cooking) | **5 subject-activities** (below) |
| Gold from gather+sell+PvP+dailies | Same, but earned by **answering correctly** |

So the progression dopamine kintara gets from *tool tiers*, we get from
**leveling a subject** — and it teaches while it rewards.

## Skills = subject-activities (each caps at Mastery L20, like kintara)
Each activity draws questions from a subject, and levels that **Subject Mastery**:

| Activity | Node/Action | Subject | Yields |
|---|---|---|---|
| **Woodcutting** | chop trees | Language / English | Wood |
| **Mining** | break rocks | Maths | Ore |
| **Fishing** | ponds (timing + Q) | Science | Fish |
| **Study** (was "Cooking/Craft") | Study Hall: combine materials | Mixed / GK | Insight (craft currency) |
| **Combat** | click mob → quiz | tier-scaled mixed | Gold + drops |

**Mastery matters (fixes today's dead XP):**
- L1→L20 per subject. Correct answers give Mastery XP.
- **Every ~4 levels = a tier.** Higher tier → **+yield** (L2 tools = 2× in kintara → here each tier +1 material), **unlocks higher-value nodes** (gated by mastery, like kintara's level-gated cave), and **+combat damage**.
- Wrong answers still let you act at reduced power (our existing 40%), just no Mastery XP.

## World = learning zones (kintara's realms, re-themed)
One coherent map, three bands (safe → practice → challenge), matching NCERT tiers:

1. **Vidya Nagar (town hub)** — safe. Spawn here. Buildings below. Easy tier-1 questions in the immediate fields.
2. **Practice Fields** (kintara's Whisperwood) — the main gather/grind belt: trees, rocks, ponds, tier 1–3 questions, low risk.
3. **Challenge Frontier** (kintara's Wilderness) — harder tier 4–6 questions, rare high-value nodes + elite mobs, optional **Quiz Duels** (PvP), and a small **risk on death** (drop a little Gold/materials). Mastery-gated entry.

## Town hub buildings (each maps to a kintara building, all functional)
| Kintara | Bharatverse building | Function |
|---|---|---|
| Plaza fountain (heal) | **Chai Stall / Wellspring** | stand near → restore HP ("review & recover") |
| Bank | **Library Locker** | store materials + cosmetics |
| Anvil / smithy | **Study Hall** | spend materials + Gold on a focused quiz session → **raise a Subject Mastery tier** (our "tool upgrade") |
| Marketplace | **Trading Post** ✅ (have) + player market later | sell Wood/Ore/Fish for Gold |
| Cosmetic shop | **Cosmetics Emporium** ✅ (have) | hats/pets, Gold, visual-only |
| Tutorial NPC | **Guru / Acharya** | first quest + teaches recall-gathering; hands you your "starter subjects" |

## The moment-to-moment loop (coherent, kintara-shaped)
1. Guru gives a starter quest → walk to the Practice Fields.
2. Click a tree/rock/pond/mob → **answer a question** → gather material / deal damage (power scales with your Mastery + answer quality).
3. Sell materials at the **Trading Post** for Gold; bank the rest at the **Library Locker**.
4. Spend materials + Gold at the **Study Hall** to raise a **Subject Mastery tier** → unlock better nodes / hit harder (our "tool upgrade").
5. Do **Daily Quests** (chop 8 = answer 8 Language Qs, mine 5, win 3 quiz-duels) for Gold/XP/badges.
6. Spend Gold in the **Cosmetics Emporium** (hats/pets) — pure vanity.
7. Progress to the **Challenge Frontier** for tier 4–6 questions, elites, Quiz Duels, and the best rewards (with a little risk).

## Economy (closed loop, clear sinks)
- **Gold in:** combat (most) · selling materials · dailies.
- **Materials in:** Woodcutting/Mining/Fishing (recall-gated).
- **Gold/material sinks:** Study Hall mastery upgrades · Cosmetics · pets · (later) player market.
- Higher Mastery → better nodes → more materials/Gold → more upgrades + cosmetics. Self-reinforcing.

## Combat (kintara melee → recall-combat)
- Click mob → quiz-combat (have). **Damage = base × answer-quality × Combat-Mastery tier.** Faster/correct = crit. Mobs scale by zone tier. **No armor** (kintara parity) — cosmetics never change damage (matches our shop promise).
- **Quiz Duels** (PvP): two players answer the same question; faster-correct deals damage. Frontier only.

## Build sequence (revised 2026-07-02, each shippable on its own)
1. **Gathering rework** — click node → progress-bar gather → materials + Mastery XP,
   **no per-swing quiz**. Foundational; makes the core loop feel like kintara. ← FIRST
2. **Mastery that matters** — that XP now levels up and boosts yield/damage; HUD skill readout.
3. **Movie Theatre** — cinema building, limited seats, angled screen auto-playing
   English educational YouTube videos 6am–9pm, Fullscreen button.
4. **Modern layouts** — redesign landing page + character select + HUD to kintara-grade polish.
5. **Universal chat** — global channel (server-backed online; local feed offline).
6. **Study Hall** (mastery upgrades / focus buff) + **Guru/Chai/Library** hub buildings.
7. **Fishing** + **zone tiers**; then **Quiz Duels (PvP)** + Frontier risk/reward.

## Non-negotiables (keep)
- Recall stays the core input (no literal tools/axes).
- Cosmetics visual-only. Gold is the one currency. Professional pan-India naming (no Sanskrit jargon).
- Sim stays deterministic/server-authoritative for online later.
