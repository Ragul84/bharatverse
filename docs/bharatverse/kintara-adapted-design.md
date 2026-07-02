# Bharatverse — Kintara-adapted design (educational MMO)

Kintara's loop reworked so it makes sense for an **educational** MMO where
**active recall is the power** (there are no axes — *your knowledge is the tool*).
This is the reference the client should converge on.

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

## Build sequence (each shippable on its own)
1. **Mastery that matters** — make tracked Woodcutting/Mining/Combat XP level up and boost yield/damage + a HUD skill readout. *(Highest value; unlocks the whole progression feel; self-contained.)*
2. **Study Hall building** — spend materials+Gold to raise a mastery tier (our anvil). Gives materials a purpose beyond selling.
3. **Town hub polish** — Guru tutorial NPC + Chai Stall heal + Library Locker (bank). Makes Vidya Nagar read like Mainland.
4. **Fishing** (3rd gather skill) + **zone tiers** (Practice vs Frontier question difficulty).
5. **Quiz Duels** (PvP) + Frontier risk/reward.

## Non-negotiables (keep)
- Recall stays the core input (no literal tools/axes).
- Cosmetics visual-only. Gold is the one currency. Professional pan-India naming (no Sanskrit jargon).
- Sim stays deterministic/server-authoritative for online later.
