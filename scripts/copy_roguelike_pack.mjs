import fs from 'node:fs';
import path from 'node:path';

const sourceFile = 'C:\\Users\\ragul\\Downloads\\kenney_roguelike-rpg-pack\\Spritesheet\\roguelikeSheet_transparent.png';
const targetDir = 'public/assets/tilesets';
const targetFile = path.join(targetDir, 'roguelikeSheet_transparent.png');

// Ensure target directory exists
fs.mkdirSync(targetDir, { recursive: true });

if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✓ Successfully copied Roguelike Spritesheet to ${targetFile}`);
} else {
  console.error(`✗ Source file not found: ${sourceFile}`);
}
