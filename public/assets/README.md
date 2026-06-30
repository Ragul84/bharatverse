# Bharatverse real-art drop-in (Kenney CC0 target)

The Phaser client tries to load real PNG art from this folder at boot. **Anything
missing is silently skipped** and the procedural (code-generated) sprite is used
instead, so the game runs with zero, some, or all of these present. Add files
incrementally; no code change is needed.

All recommended art is **Kenney CC0** (https://kenney.nl/assets) — no attribution
required, commercial-safe. Good packs to mine:
- Characters: "Toon Characters", "Roguelike Characters", "Tiny Dungeon".
- Environment/props: "Nature Pack", "Tiny Town", "Isometric" packs.
- Icons (later, for abilities/items): https://game-icons.net (CC-BY — list in CREDITS.md).

## File convention

### Characters -> `public/assets/characters/<archetype>.png`
One upright PNG per archetype (feet at the bottom). Filenames:

BharatVerse classes:
  cls-kshatriya.png  cls-brahmarishi.png  cls-vaishya.png  cls-shilpi.png  cls-vaidya.png
Classic classes:
  cls-warrior.png  cls-paladin.png  cls-hunter.png  cls-rogue.png  cls-priest.png
  cls-shaman.png  cls-mage.png  cls-warlock.png  cls-druid.png
Non-players:
  npc.png  mob.png  object.png

Any height works; the client normalizes each sprite to a common on-screen height
and anchors it at the feet.

### Props -> `public/assets/props/<name>.png`
  tree.png   tree2.png   rock.png
(feet/base at the bottom of the image)

## Notes
- Keys/paths are defined in `src/render-phaser/bv_assets.ts`; the drop-in list is
  `optionalAssets()`.
- The renderer runs in HD mode (`pixelArt:false`), so vector/HD Kenney art stays
  crisp; if you switch to a pixel-art pack, flip `pixelArt` back on in
  `src/render-phaser/index.ts`.
- 404s for not-yet-added files are expected and harmless (you may see them in the
  browser console until you add the file).
- Animated/directional spritesheets are a later upgrade: `bv_assets.ts` can grow a
  spritesheet/atlas asset type and `EntityView` can switch from Image to Sprite +
  animations keyed off `entity.facing`.
