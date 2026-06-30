import fs from 'node:fs';
import path from 'node:path';

const downloadsDir = 'C:\\Users\\ragul\\Downloads\\kenney_platformer-characters\\PNG';
const targetDir = 'public/assets/characters';

// Ensure target directory exists
fs.mkdirSync(targetDir, { recursive: true });

const mappings = {
  'cls-warrior': { stand: 'Player/Poses/player_stand.png', walk1: 'Player/Poses/player_walk1.png', walk2: 'Player/Poses/player_walk2.png', back: 'Player/Poses/player_back.png' },
  'cls-paladin': { stand: 'Soldier/Poses/soldier_stand.png', walk1: 'Soldier/Poses/soldier_walk1.png', walk2: 'Soldier/Poses/soldier_walk2.png', back: 'Soldier/Poses/soldier_back.png' },
  'cls-hunter': { stand: 'Adventurer/Poses/adventurer_stand.png', walk1: 'Adventurer/Poses/adventurer_walk1.png', walk2: 'Adventurer/Poses/adventurer_walk2.png', back: 'Adventurer/Poses/adventurer_back.png' },
  'cls-rogue': { stand: 'Adventurer/Poses/adventurer_idle.png', walk1: 'Adventurer/Poses/adventurer_walk1.png', walk2: 'Adventurer/Poses/adventurer_walk2.png', back: 'Adventurer/Poses/adventurer_back.png' },
  'cls-priest': { stand: 'Female/Poses/female_stand.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' },
  'cls-mage': { stand: 'Female/Poses/female_idle.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' },
  'cls-warlock': { stand: 'Zombie/Poses/zombie_stand.png', walk1: 'Zombie/Poses/zombie_walk1.png', walk2: 'Zombie/Poses/zombie_walk2.png', back: 'Zombie/Poses/zombie_back.png' },
  'cls-druid': { stand: 'Female/Poses/female_cheer1.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' },
  'cls-shaman': { stand: 'Player/Poses/player_cheer1.png', walk1: 'Player/Poses/player_walk1.png', walk2: 'Player/Poses/player_walk2.png', back: 'Player/Poses/player_back.png' },
  // Active BharatVerse classes
  'cls-kshatriya': { stand: 'Soldier/Poses/soldier_stand.png', walk1: 'Soldier/Poses/soldier_walk1.png', walk2: 'Soldier/Poses/soldier_walk2.png', back: 'Soldier/Poses/soldier_back.png' },
  'cls-brahmarishi': { stand: 'Female/Poses/female_stand.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' },
  'cls-vaishya': { stand: 'Adventurer/Poses/adventurer_stand.png', walk1: 'Adventurer/Poses/adventurer_walk1.png', walk2: 'Adventurer/Poses/adventurer_walk2.png', back: 'Adventurer/Poses/adventurer_back.png' },
  'cls-shilpi': { stand: 'Female/Poses/female_idle.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' },
  'cls-vaidya': { stand: 'Female/Poses/female_cheer1.png', walk1: 'Female/Poses/female_walk1.png', walk2: 'Female/Poses/female_walk2.png', back: 'Female/Poses/female_back.png' }
};

console.log('Copying platformer characters and walk frames from:', downloadsDir);
console.log('To:', targetDir);

let successCount = 0;
let totalCount = 0;

for (const [classKey, files] of Object.entries(mappings)) {
  for (const [poseType, relativePath] of Object.entries(files)) {
    totalCount++;
    const sourcePath = path.join(downloadsDir, relativePath);
    // stand pose is saved as classKey.png (e.g. cls-warrior.png), other poses are classKey-poseType.png (e.g. cls-warrior-walk1.png)
    const suffix = poseType === 'stand' ? '' : `-${poseType}`;
    const destinationPath = path.join(targetDir, `${classKey}${suffix}.png`);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`✓ Copied ${relativePath} -> ${classKey}${suffix}.png`);
      successCount++;
    } else {
      console.warn(`✗ Source not found: ${sourcePath}`);
    }
  }
}

console.log(`Done! Successfully copied ${successCount}/${totalCount} character sprites and poses.`);
