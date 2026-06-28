/**
 * Pure presentation logic for an in-world entity nameplate/overlay. No Phaser /
 * DOM imports, so the bar fractions, colors, and visibility rules are
 * unit-testable; entity_view.ts is the thin Phaser glue that applies them.
 */

import type { Entity } from '../sim/types';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Health bar fill fraction in [0,1]. */
export function hpFraction(e: Pick<Entity, 'hp' | 'maxHp'>): number {
  return clamp01(e.maxHp > 0 ? e.hp / e.maxHp : 0);
}

/** Resource (mana/rage/energy/...) fill fraction in [0,1]. */
export function resourceFraction(e: Pick<Entity, 'resource' | 'maxResource'>): number {
  return clamp01(e.maxResource > 0 ? e.resource / e.maxResource : 0);
}

/** True when the entity has a resource pool worth drawing a bar for. */
export function hasResourceBar(e: Pick<Entity, 'maxResource'>): boolean {
  return e.maxResource > 0;
}

/** Cast/channel progress in [0,1] (0 at start of cast, 1 at completion). */
export function castProgress(e: Pick<Entity, 'castTotal' | 'castRemaining'>): number {
  return e.castTotal > 0 ? clamp01(1 - e.castRemaining / e.castTotal) : 0;
}

/** Whether a cast bar should currently be shown. */
export function showCast(e: Pick<Entity, 'castingAbility' | 'castTotal' | 'dead'>): boolean {
  return !!e.castingAbility && e.castTotal > 0 && !e.dead;
}

/** Classic green/yellow/red health bar color by fill fraction. */
export function hpColor(frac: number): number {
  return frac > 0.5 ? 0x22c55e : frac > 0.25 ? 0xeab308 : 0xdc2626;
}

/** Resource bar color keyed by resource type (permissive; sane default). */
export function resourceColor(type: string | null): number {
  switch (type) {
    case 'rage': return 0xdc2626;   // red
    case 'energy': return 0xeab308; // yellow
    case 'focus': return 0xf97316;  // orange
    case 'mana': return 0x3b82f6;   // blue
    default: return 0x3b82f6;
  }
}

/** Body tint: dead is gray; otherwise player blue, friendly NPC green, hostile red. */
export function bodyColor(
  e: Pick<Entity, 'dead' | 'kind' | 'hostile'>,
  isPlayer: boolean,
): number {
  if (e.dead) return 0x4b5563;
  if (isPlayer) return 0x4f46e5;
  if (e.kind === 'npc') return 0x059669;
  return 0xdc2626;
}

/**
 * Nameplate label: entity name plus its level as a bare trailing number (no
 * translatable word, so this adds no i18n surface). Real localized nameplates
 * are a later milestone once t() is wired into the Phaser client.
 */
export function nameplateText(e: Pick<Entity, 'name' | 'level'>): string {
  const name = e.name || '';
  return e.level > 0 ? `${name}  ${e.level}` : name;
}
