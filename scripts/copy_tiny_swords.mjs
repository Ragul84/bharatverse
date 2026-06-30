/**
 * copy_tiny_swords.mjs
 * Copies Tiny Swords (Free Pack) assets into public/assets/ for use in the game.
 * Run with: node scripts/copy_tiny_swords.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:\\Users\\ragul\\Downloads\\Tiny Swords (Free Pack)\\Tiny Swords (Free Pack)';
const PUBLIC = 'public/assets/tiny-swords';

fs.mkdirSync(`${PUBLIC}/terrain`, { recursive: true });
fs.mkdirSync(`${PUBLIC}/units`, { recursive: true });
fs.mkdirSync(`${PUBLIC}/decorations`, { recursive: true });
fs.mkdirSync(`${PUBLIC}/buildings`, { recursive: true });

let ok = 0, fail = 0;
function cp(src, dst) {
  const s = path.join(SRC, src);
  const d = path.join(PUBLIC, dst);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
    console.log(`  OK  ${dst}`);
    ok++;
  } else {
    console.warn(`  !!  NOT FOUND: ${src}`);
    fail++;
  }
}

// --- Terrain tilesets ---
cp('Terrain/Tileset/Tilemap_color1.png', 'terrain/tilemap_grass.png');
cp('Terrain/Tileset/Tilemap_color2.png', 'terrain/tilemap_grass2.png');
cp('Terrain/Tileset/Tilemap_color3.png', 'terrain/tilemap_grass3.png');
cp('Terrain/Tileset/Tilemap_color4.png', 'terrain/tilemap_dirt.png');
cp('Terrain/Tileset/Tilemap_color5.png', 'terrain/tilemap_sand.png');
cp('Terrain/Tileset/Water Background color.png', 'terrain/water_bg.png');
cp('Terrain/Tileset/Water Foam.png', 'terrain/water_foam.png');
cp('Terrain/Tileset/Shadow.png', 'terrain/shadow.png');

// --- Decorations ---
cp('Terrain/Decorations/Bushes/Bushe1.png', 'decorations/bush1.png');
cp('Terrain/Decorations/Bushes/Bushe2.png', 'decorations/bush2.png');
cp('Terrain/Decorations/Bushes/Bushe3.png', 'decorations/bush3.png');
cp('Terrain/Decorations/Bushes/Bushe4.png', 'decorations/bush4.png');
cp('Terrain/Decorations/Rocks/Rock1.png', 'decorations/rock1.png');
cp('Terrain/Decorations/Rocks/Rock2.png', 'decorations/rock2.png');
cp('Terrain/Decorations/Rocks/Rock3.png', 'decorations/rock3.png');
cp('Terrain/Decorations/Rocks/Rock4.png', 'decorations/rock4.png');

// --- Blue (friendly / player) units ---
cp('Units/Blue Units/Warrior/Warrior_Idle.png',   'units/blue_warrior_idle.png');
cp('Units/Blue Units/Warrior/Warrior_Run.png',    'units/blue_warrior_run.png');
cp('Units/Blue Units/Warrior/Warrior_Attack1.png','units/blue_warrior_attack.png');
cp('Units/Blue Units/Archer/Archer_Idle.png',     'units/blue_archer_idle.png');
cp('Units/Blue Units/Archer/Archer_Run.png',      'units/blue_archer_run.png');
cp('Units/Blue Units/Monk/Monk_Idle.png',         'units/blue_monk_idle.png');
cp('Units/Blue Units/Monk/Monk_Run.png',          'units/blue_monk_run.png');
cp('Units/Blue Units/Lancer/Lancer_Idle.png',     'units/blue_lancer_idle.png');
cp('Units/Blue Units/Lancer/Lancer_Run.png',      'units/blue_lancer_run.png');
cp('Units/Blue Units/Pawn/Pawn_Idle.png',         'units/blue_pawn_idle.png');
cp('Units/Blue Units/Pawn/Pawn_Run.png',          'units/blue_pawn_run.png');

// --- Red (hostile / mob) units ---
cp('Units/Red Units/Warrior/Warrior_Idle.png',    'units/red_warrior_idle.png');
cp('Units/Red Units/Warrior/Warrior_Run.png',     'units/red_warrior_run.png');
cp('Units/Red Units/Warrior/Warrior_Attack1.png', 'units/red_warrior_attack.png');
cp('Units/Red Units/Archer/Archer_Idle.png',      'units/red_archer_idle.png');
cp('Units/Red Units/Archer/Archer_Run.png',       'units/red_archer_run.png');
cp('Units/Red Units/Pawn/Pawn_Idle.png',          'units/red_pawn_idle.png');
cp('Units/Red Units/Pawn/Pawn_Run.png',           'units/red_pawn_run.png');
cp('Units/Red Units/Lancer/Lancer_Idle.png',      'units/red_lancer_idle.png');
cp('Units/Red Units/Lancer/Lancer_Run.png',       'units/red_lancer_run.png');

// --- Buildings ---
cp('Buildings/Blue Buildings/Castle.png',         'buildings/castle.png');
cp('Buildings/Blue Buildings/House1.png',         'buildings/house1.png');
cp('Buildings/Blue Buildings/House2.png',         'buildings/house2.png');
cp('Buildings/Blue Buildings/House3.png',         'buildings/house3.png');
cp('Buildings/Blue Buildings/Barracks.png',       'buildings/barracks.png');
cp('Buildings/Blue Buildings/Tower.png',          'buildings/tower.png');
cp('Buildings/Blue Buildings/Monastery.png',      'buildings/monastery.png');

console.log(`\nDone: ${ok} copied, ${fail} missing.`);
