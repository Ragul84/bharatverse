/**
 * Gathered-resource inventory (Wood, Ore). Gathering deposits resources here;
 * the Trading Post sells them for Gold — closing the kintara-style gather→sell
 * loop. Persists in localStorage.
 */

export type ResourceId = 'wood' | 'ore';

export interface ResourceDef {
  id: ResourceId;
  label: string;
  price: number;   // Gold per unit when sold
  color: number;   // swatch colour in the market UI
}

export const RESOURCE_DEFS: ResourceDef[] = [
  { id: 'wood', label: 'Wood', price: 5, color: 0xa16207 },
  { id: 'ore',  label: 'Ore',  price: 8, color: 0x94a3b8 },
];

export interface ResourceState {
  wood: number;
  ore: number;
}

function fresh(): ResourceState {
  return { wood: 0, ore: 0 };
}

export function loadResources(): ResourceState {
  try {
    const raw = localStorage.getItem('bv_resources');
    if (raw) {
      const s = JSON.parse(raw) as Partial<ResourceState>;
      return { wood: s.wood ?? 0, ore: s.ore ?? 0 };
    }
  } catch { /* ignore */ }
  return fresh();
}

export function saveResources(s: ResourceState): void {
  try { localStorage.setItem('bv_resources', JSON.stringify(s)); } catch { /* ignore */ }
}

export function addResource(s: ResourceState, kind: ResourceId, n: number): void {
  s[kind] = Math.max(0, s[kind] + n);
}
