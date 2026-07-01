# Bharatverse — Gameplay & Economy Design (Kintara-inspired, recall-powered)

The core insight from Kintara: it's a skilling + combat MMO where every action
earns Gold/XP, and Gold buys **visual-only cosmetics + pets** on a marketplace.
We adapt that loop so **active recall (answering questions) is the "energy"
behind every action** — the education *is* the gameplay, not a minigame bolted on.

## 1. One currency: Gold
- Collapse `MindCoins` / `copper` → **Gold** everywhere (sim, UI, combat rewards).
- Gold is purely for progression + cosmetics. No pay-to-win: cosmetics are visual only.

## 2. Skills (each capped, RuneScape-style, but recall-gated)
Every action pops a **question**; a correct answer succeeds at full power, wrong =
weak/partial, timeout = fail. Streaks = bonus (combo). Each skill has its own XP.
| Skill | Action | Recall gate |
|---|---|---|
| **Combat** | fight a mob (the quiz CombatScene we built) | subject/tier of the mob |
| **Woodcutting** | chop a tree node | quick question → wood + gold |
| **Mining** | mine a rock/ore node | quick question → ore + gold |
| **Study** (our twist) | answer at a library/desk | pure recall → gold + XP |
| *(later)* Fishing / Cooking | gather / craft nodes | recall-gated |

## 3. How Gold is earned (priority order, per the brief)
1. **Battles** (biggest) — win a quiz combat → Gold scaled by tier + streak.
2. **Gathering** — chop trees / mine rocks (recall-gated) → resources + Gold.
3. **Daily activities** — a daily-quest board: "Win 5 battles", "Chop 20 wood",
   "Answer 30 questions", "Log in" → chunky Gold + XP rewards, resets daily.

## 4. Cosmetic shop (a building in town)
- A **Cosmetics Emporium** building/NPC. Spend Gold on **visual-only** items:
  - **Hats / masks** (fun + collectible — doge hat, croc mask, meme hats, crowns).
  - **Outfits** (full costume overrides layered on the LPC character).
  - **Pets** (a small companion that follows you; some Gold-bought, some rare drops).
- Owned cosmetics are equippable from the Character/Wardrobe screen. Rarities
  (common → legendary) drive price + visual flair.

## 5. Character customization (free base) + cosmetics (earned)
- **Creator at char-select**: choose skin tone, hairstyle, hair color, base outfit
  colors — live LPC preview. This is the *free* baseline look.
- **Cosmetics** layer on top of / override the base (bought with Gold or dropped).
- Persisted per character (offline: localStorage; online: server character state).

## 6. Pets
- A follower sprite that trails the player (offset, simple bob). Bought in the shop
  or dropped from bosses. Cosmetic + tiny flavor (no combat power).

## 7. Worlds
- Reuse the three zones as themed skilling/battle regions (vale = starter woods +
  study grove; marsh = deeper mobs + mining; peaks = high-tier). Gathering nodes
  (trees/rocks) and a daily board live in/near each town.

## Build roadmap (incremental, each shippable + green)
1. **Gold unification** (MindCoins/copper → Gold) — data + HUD.
2. **Character customization creator** (LPC skin/hair/outfit picker + persist).
3. **Gathering skill**: interactable tree/rock nodes → recall question → wood/ore + Gold + XP; walk-up/click "Chop"/"Mine" action (LPC slash/thrust anim as the swing).
4. **Daily quest board** — an NPC/panel with 3-4 rotating dailies → Gold/XP.
5. **Cosmetic shop** — building + buy UI + wardrobe equip; a starter set of hats/outfits/pets.
6. **Combat → LPC** + **monster art** for mobs (visual polish track).

## Honest asset note
Kintara ships **custom** isometric art (funded crypto game). We use **free LPC +
Tiny Swords + Kenney**. With curation (LPC bodies + many cosmetic layers, quality
tilesets) we can look **cohesive and good**, but matching a funded game's bespoke
art 1:1 needs commissioned/paid art. Cosmetics (hats/masks/pets) are the place to
splurge on quality since they're the collectible hook.
