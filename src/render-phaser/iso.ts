/**
 * Isometric projection - the 2.5D camera math for the Phaser client.
 *
 * Pure functions, no Phaser / DOM imports, so they are unit-testable and the
 * renderer and any tooling share one definition of "where does a world point
 * land on screen".
 *
 * World space is the sim's: a flat ground plane in (x, z) yards centered on the
 * origin (the sim world spans [-WORLD_SIZE/2, WORLD_SIZE/2] on each axis), with
 * `y` as height above the ground. Screen space is a classic 2:1 dimetric
 * projection: one world axis goes down-right, the other down-left, and world
 * height lifts a point straight up the screen.
 */

// Pixels per world yard along each screen axis. The 2:1 ratio (X is twice Y) is
// what gives the canonical isometric-tile look.
export const ISO_PPY_X = 6;
export const ISO_PPY_Y = 3;
// How far up the screen one yard of world height (pos.y) lifts a point.
export const ISO_HEIGHT_PPY = 5;

export interface IsoPoint {
  sx: number;
  sy: number;
}

/**
 * Project a world point to screen space (before any camera origin offset).
 * Outputs can be negative; callers add a world origin (see `isoWorldBounds`) so
 * the whole world maps into positive camera coordinates.
 */
export function worldToIso(x: number, z: number, y = 0): IsoPoint {
  return {
    sx: (x - z) * ISO_PPY_X,
    sy: (x + z) * ISO_PPY_Y - y * ISO_HEIGHT_PPY,
  };
}

/**
 * Painter's-order depth for a ground entity. Larger (x + z) is nearer the
 * camera (further down-screen) and must draw on top, so depth increases with
 * (x + z). Height is intentionally excluded: a jumping entity should not sort
 * behind the ground it is over.
 */
export function isoDepth(x: number, z: number): number {
  return x + z;
}

export interface IsoBounds {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Camera bounds and the origin offset for a square world of the given full
 * width (yards). `(x - z)` and `(x + z)` each range over [-worldSize, worldSize],
 * so the projected world is a diamond `2*worldSize*PPY` wide and tall. `margin`
 * (px) pads the top/bottom for world height lift and sprite extents.
 */
export function isoWorldBounds(worldSize: number, margin = 400): IsoBounds {
  const halfW = worldSize * ISO_PPY_X;
  const halfH = worldSize * ISO_PPY_Y;
  return {
    originX: halfW,
    originY: halfH + margin,
    width: halfW * 2,
    height: halfH * 2 + margin * 2,
  };
}

/**
 * Camera bounds + origin offset for a rectangular world spanning [minX,maxX] x
 * [minZ,maxZ] yards (the sim world is a north-running strip, not a square). The
 * origin offset maps the projected corners into positive camera space; `margin`
 * (px) pads the top/bottom for world height lift and sprite extents.
 */
export function isoWorldBoundsRect(
  minX: number, maxX: number, minZ: number, maxZ: number, margin = 400,
): IsoBounds {
  // sx = (x - z) * PPY_X is extremal at (minX,maxZ) and (maxX,minZ).
  const sxMin = (minX - maxZ) * ISO_PPY_X;
  const sxMax = (maxX - minZ) * ISO_PPY_X;
  // sy = (x + z) * PPY_Y is extremal at (minX,minZ) and (maxX,maxZ).
  const syMin = (minX + minZ) * ISO_PPY_Y;
  const syMax = (maxX + maxZ) * ISO_PPY_Y;
  return {
    originX: -sxMin,
    originY: -syMin + margin,
    width: sxMax - sxMin,
    height: (syMax - syMin) + margin * 2,
  };
}
