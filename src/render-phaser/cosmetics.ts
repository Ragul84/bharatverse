/**
 * Cosmetic shop — spend Gold on visual-only hats and pets (kintara.gg model:
 * cosmetics never affect power). Hats layer into the LPC character composite;
 * pets are follower sprites. Ownership + equipped choices persist in
 * localStorage. This module is asset-path-free: it references texture keys and
 * the LPC_HATS catalog by index.
 */

import { LPC_HATS } from './lpc_composite';

/** A buyable hat, keyed by its index into LPC_HATS (1..N; 0 is "none"). */
export interface HatDef {
  hatIndex: number;
  price: number;
}
export const HAT_SHOP: HatDef[] = [
  { hatIndex: 1, price: 800 }, // Royal Crown
  { hatIndex: 2, price: 700 }, // Jeweled Tiara
  { hatIndex: 4, price: 500 }, // Scholar's Hat
  { hatIndex: 3, price: 350 }, // Top Hat
  { hatIndex: 5, price: 250 }, // Feather Cap
  { hatIndex: 6, price: 120 }, // Bandana
];

/** A buyable pet follower sprite. `cols`/`frameH` describe its walk sheet. */
export interface PetDef {
  id: string;
  key: string;
  label: string;
  price: number;
  cols: number;
  frameH: number;
}
export const PET_SHOP: PetDef[] = [
  { id: 'cat_orange', key: 'pet-cat_orange', label: 'Marmalade Cat', price: 450, cols: 3, frameH: 48 },
  { id: 'cat_black',  key: 'pet-cat_black',  label: 'Shadow Cat',    price: 450, cols: 3, frameH: 48 },
  { id: 'bird_blue',  key: 'pet-bird_blue',  label: 'Bluejay',       price: 300, cols: 3, frameH: 32 },
  { id: 'bird_red',   key: 'pet-bird_red',   label: 'Crimson Bird',  price: 300, cols: 3, frameH: 32 },
  { id: 'bird_white', key: 'pet-bird_white', label: 'Mynah',         price: 300, cols: 3, frameH: 32 },
];

export function hatLabel(hatIndex: number): string {
  return LPC_HATS[hatIndex]?.label ?? 'Hat';
}
export function petDef(id: string): PetDef | undefined {
  return PET_SHOP.find((p) => p.id === id);
}

export interface CosmeticState {
  ownedHats: Record<number, boolean>;
  ownedPets: Record<string, boolean>;
  equippedHat: number;   // index into LPC_HATS, 0 = none
  equippedPet: string;   // pet id, '' = none
}

function fresh(): CosmeticState {
  return { ownedHats: {}, ownedPets: {}, equippedHat: 0, equippedPet: '' };
}

export function loadCosmetics(): CosmeticState {
  try {
    const raw = localStorage.getItem('bv_cosmetics');
    if (raw) {
      const s = JSON.parse(raw) as Partial<CosmeticState>;
      return {
        ownedHats: s.ownedHats ?? {},
        ownedPets: s.ownedPets ?? {},
        equippedHat: s.equippedHat ?? 0,
        equippedPet: s.equippedPet ?? '',
      };
    }
  } catch { /* ignore */ }
  return fresh();
}

export function saveCosmetics(s: CosmeticState): void {
  try { localStorage.setItem('bv_cosmetics', JSON.stringify(s)); } catch { /* ignore */ }
}

export function ownsHat(s: CosmeticState, hatIndex: number): boolean {
  return !!s.ownedHats[hatIndex];
}
export function ownsPet(s: CosmeticState, id: string): boolean {
  return !!s.ownedPets[id];
}
