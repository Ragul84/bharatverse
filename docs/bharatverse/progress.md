# Bharatverse Progress

Update at the end of every work package. Status: not-started / in-progress /
blocked / complete.

## Milestone 1 - re-theme on Phaser

| WP | Title | Status | Branch | Notes |
|---|---|---|---|---|
| 1 | Phaser render parity (spine) | in-progress | feature/phaser-render-parity | spine commits 1-5 done (bus+interp, iso, terrain, entity views, targeting); `vite build` green. Remaining: live-browser smoke + dead-Three.js bundle trim |
| 2 | Isometric art + landmark zones | in-progress | feature/phaser-render-parity | procedural pass: decorations (trees/rocks, occluding) + per-hub landmarks (obelisk/dome/gopuram). Real tileset/sprite art still TODO |
| 3 | Class / mob / item re-theme completion | not-started | | parallel-safe; verify MOB_SUBJECT_MAP ids |
| 4 | Unify question systems (data only) | not-started | | parallel-safe; fix Math.random |
| 5 | Phaser HUD parity (HUDScene) | not-started | | needs WP1 |
| 6 | Smoke + visual baseline + green build | not-started | | demo tag |

Archive actions (one-time):
- [ ] Three.js `src/render/` + HUD docs packets marked reference-only (keep as parity oracle).
- [ ] Decision D4 resolved (keep or archive turn-based QuizScene / CombatScene).

## Deferred milestones

| M | Title | Status |
|---|---|---|
| 2 | Server-authoritative recall core | not-started |
| 3 | Leitner / spaced-repetition mastery | not-started |
| 4 | Sandbox loops (gather crit, streak shield, Knowledge Runes) | not-started |
| 5 | Spectacle and social (Noon Arena, guild classrooms) | not-started |
| 6 | Polish and accessibility | not-started |

## Open decisions to resolve (see state.md)

- [ ] D3 - confirm Phaser renders real-time server sim (no turn-based overlay).
- [ ] D4 - keep turn-based QuizScene as offline practice mode, or archive.
- [ ] D5 - canonical currency: MindCoins vs Gold.
- [ ] D6 - confirm canonical question model = `Question` (delete `KnowledgeQuestion`).

## Notes (filled after each WP)

- WP1 commit 1 (event bus + render interpolation) implemented + verified
  (tsc clean; `tests/phaser_sim_bridge.test.ts` 11/11). New `render-phaser/
  sim_bridge.ts`; `main.ts` sim loop now relays `SimEvent[]` (previously dropped)
  and feeds an interpolation accumulator; `WorldScene` lerps prevPos->pos and
  drains events to `Events.SIM_EVENTS`. Committed a9da186 (render-phaser brought
  under version control with main.ts Phaser wiring).
- WP1 commit 2 (isometric projection + depth sort): new `render-phaser/iso.ts`
  (pure 2:1 dimetric projection + painter's-order depth + camera bounds, tested
  `tests/phaser_iso.test.ts` 7/7). `WorldScene` now projects world (x,z,y) to iso
  screen space, depth-sorts entities by (x+z), feet-origin sprites, and draws an
  iso ground-diamond placeholder (real terrain is WP2/commit 3). tsc clean.
- WP1 commit 3 (terrain from sim heightfield): `WorldScene.drawTerrain` bakes the
  ground from `sim/world.ts` (`terrainHeight`/`WATER_LEVEL`/`zoneBiomeAt`/
  `roadDistance`) so it matches the sim exactly. Iso tiles lifted to sampled
  height, biome-tinted + height-shaded, water plane, road tint. Added
  `isoWorldBoundsRect` for the real north-strip extents (x[-180,180] z[-180,900])
  -- corrects commit 2's square camera bounds. tsc clean; iso tests 8/8. NOTE:
  occluding props/decorations (`generateDecorations`) deferred to WP2 art.
- WP1 commit 4 (entity sprite-containers): new `entity_view.ts` (Phaser glue) +
  `entity_view_logic.ts` (pure, tested). Each entity (and the player) is now an
  `EntityView` container: body marker + nameplate (name+level) + HP bar +
  resource bar + cast bar (shown while `castingAbility` set). `WorldScene`
  simplified to create/update/destroy views. Body shapes still placeholder (real
  sprites WP2). tsc clean; 28 phaser tests pass (incl. 9 new logic tests).
- WP1 commit 5 (targeting + target ring): click an entity to target
  (`world.targetEntity(id)` via `EntityView.setInteractiveTarget`), Tab cycles
  (`world.tabTarget`), and a gold iso ring tracks the player's current target
  (`player.targetId`). `vite build` succeeds (Phaser client bundles; ~5MB incl.
  both three+phaser -- dead-Three.js trim is a later optimization). Spine done;
  live-browser smoke pending a running dev server (QA pass).
- WP2 first pass (procedural art): occluding decorations (trees/rocks placed from
  the sim's `generateDecorations`, depth-sorted billboards from generated
  textures) + a themed procedural landmark at each zone hub (Statue-of-Unity
  obelisk in Vidya Nagar/vale, Taj-style dome in Shastra Gram/marsh, Tanjore
  gopuram in Takshashila/peaks) with hub-name labels. New tested
  `decoration_style.ts`. tsc + `vite build` green.
- WP2 sprites: replaced placeholder rectangles with procedural per-archetype
  character sprites. New `character_archetype.ts` (pure, tested: entity ->
  archetype key + palette for 9 classic + 5 BharatVerse classes, npc/mob/object)
  and `character_sprites.ts` (bakes a humanoid texture per palette + a node
  texture for objects via Graphics). `EntityView` now renders the sprite Image
  (feet-anchored, scaled by entity.scale, dead-tinted), overlays repositioned
  above the taller sprite. tsc + vite build green; 14 char/entity tests pass.
  NEXT: directional facing frames, real tileset ground, building interiors.
- WP2 real-art pipeline scaffold: new pure `bv_assets.ts` (tested,
  `tests/phaser_bv_assets.test.ts` 7/7) defines the optional Kenney-CC0 asset
  keys/urls (`assets/characters/<archetype>.png`, `assets/props/<name>.png`) and
  the resolve-real-else-procedural rule (`resolveCharacterTexture`/
  `resolveDecoTexture`, `isRealArtKey`). `BootScene` preloads every
  `optionalAssets()` entry with a `loaderror` no-op so missing files silently fall
  back to procedural; `EntityView` + `WorldScene.drawDecorations` now resolve real
  art when present (tint only applied to procedural). Renderer switched to HD
  (`pixelArt:false`, `antialias:true`). Drop-in guide: `public/assets/README.md`.
  Zero art files needed to run; add PNGs incrementally. tsc + vite build green.
- WP2 offline movement: with the fixed iso camera, arrow/WASD now move the
  character screen-intuitively (up = toward top of screen, etc.) at full speed in
  any of 8 directions, and clicking empty ground walks the player there
  (click-to-move with a cyan destination marker; a key press cancels it). New pure
  `isoToWorld` inverse projection in `iso.ts` (round-trip tested). Steering writes
  `player.facing` + `forward` and is gated to offline (`world.realm===''`) where
  `world.player` is the live sim entity; online keeps the server-authoritative
  facing-relative WASD mapping. Other players are hidden offline for a solo feel
  (`syncEntities` skips `kind==='player'`). tsc + vite build green; iso 10/10,
  45 phaser tests pass.
