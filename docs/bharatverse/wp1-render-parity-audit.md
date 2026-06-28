# WP1 Audit - Phaser Render Parity

What the Phaser client must read from `IWorld` / `Entity` to match the Three.js
renderer (the parity oracle), and the architectural gaps to close. Findings from
reading `world_api.ts`, `sim/types.ts` `Entity`, `main.ts` wiring, and
`render-phaser/`.

## Live-path finding (important)

The Three.js renderer is ALREADY dead code. `main.ts` returns at ~:676
(`renderer = null; hud = null; return;`) BEFORE the `new Renderer(...)` /
`new Hud(...)` / `new KnowledgeModal(...)` block at ~:685-708, so all of that is
unreachable. The LIVE client is Phaser:

- `createPhaserGame()` at :629; `world` put in `registry`.
- `simFrame` loop (:643): offline ticks `offlineSim.tick()` at fixed `DT`; online
  calls `online.flushInput()` + `online.drainEvents()`. Then writes four scalar
  registry values (hp, maxHp, xp, mindcoins).
- Consequence: the recall `KnowledgeModal` is currently NOT running (it lives in
  the dead block). Recall is effectively disabled in the live build.

## Current Phaser read surface (WorldScene)

Reads: `player.pos`, `entities`, `playerId`, `moveInput`, `cfg.playerClass`,
`copper`, `xp`; per entity `pos`, `hp`, `maxHp`, `dead`, `kind`, `name`, `level`,
`inCombat`. Renders entities as colored rectangles; flat top-down
(`x,z -> x,y`, SCALE 5px/yd); placeholder grid for roads.

## Parity gaps (what Three.js used that Phaser does not yet)

1. EVENT PIPELINE (highest priority). `offlineSim.tick()` returns `SimEvent[]` and
   `online.drainEvents()` yields events; the `simFrame` loop DROPS them. Floating
   combat text (`damage`/`heal`/`crit`), `death`, `loot`, `xp`, `levelup`,
   `learnAbility` all need to reach the scenes. No event consumer exists in the
   Phaser path. Must add a bus from the sim/online loop into Phaser scenes.
2. RENDER INTERPOLATION. Entities carry `prevPos`/`prevFacing` for exactly this;
   Phaser snaps to `pos` each frame -> 20Hz stutter. Render must lerp prev->cur by
   the sim accumulator alpha, decoupled from the tick.
3. ISOMETRIC PROJECTION. `simToPhaser` is flat top-down, not the 2.5D isometric
   the vision and the renderer config (`pixelArt`) imply. Replace with a real
   iso projection (and depth-sort by world y/z).
4. TERRAIN FROM SIM. The placeholder grid must be replaced by sampling the SAME
   functions the renderer used: `sim/world.ts` `groundHeight`/`terrainHeight`/
   `WATER_LEVEL`/`generateDecorations`, and `sim/data.ts` `zoneAt`/`ROADS`/`PROPS`.
   Keeping these identical to the sim is an invariant (renderer samples the same fns).
5. SPRITES + APPEARANCE. Rectangles -> sprites driven by `kind`, `templateId`,
   `skinCatalog`/`skin`, `color`, `scale`, `facing`.
6. ENTITY OVERLAYS. HP bar (have), resource bar (`resource`/`maxResource`),
   cast bar (`castingAbility`/`castRemaining`/`castTotal`/`channeling`), auras
   (`auras[]`), nameplates, target ring, threat/combo indicators, overhead emotes
   (`overheadEmoteId`/`overheadEmoteUntil`).
7. TARGETING. `targetEntity`/`tabTarget`/`targetNearestFriendly` not wired; no
   target selection or target frame in Phaser yet.

## Architectural gaps to close in WP1 (the spine)

- A. Event bus: route `SimEvent[]` (offline tick return + online drain) into a
  scene-facing emitter; scenes subscribe for FCT / death / loot / level visuals.
- B. Render interpolation layer: a single place computing alpha = simAcc/DT and
  lerping `prevPos`->`pos` (and facing) for every drawn entity.
- C. Iso projection module: world (x,z) + height -> screen, with depth sort.
- D. Terrain/world draw sampling `sim/world.ts` + `sim/data.ts` (NOT a fake grid).
- E. Sprite-container component per entity (body + hp/resource/cast/nameplate),
  created/destroyed by the existing entity diff in `syncEntities`.

Art assets (real isometric tilesets, landmark sprites) are WP2, not WP1. WP1
proves the SPINE with placeholder-but-correct sprites and a faithful world draw.

## Out of scope for WP1 (later WPs / milestones)

- Turn-based `CombatScene`/`QuizScene` (archive per D3/D4; do not extend).
- Recall wiring (M2, server-authoritative).
- Full HUD windows (WP5 `HUDScene`).
- Landmark art (WP2).

## Suggested WP1 commit order

1. Event bus A + interpolation B (no visual change yet; plumbing + tests).
2. Iso projection C + depth sort (entities move to iso; still rectangles).
3. Terrain/world draw D from sim fns.
4. Sprite-container E with hp/resource/cast/nameplate overlays.
5. Targeting wire + target ring.
6. Phaser browser smoke; confirm bundle excludes dead Three.js path where feasible.
