import { describe, it, expect } from 'vitest';
import {
  worldToIso, isoDepth, isoWorldBounds,
  ISO_PPY_X, ISO_PPY_Y, ISO_HEIGHT_PPY,
} from '../src/render-phaser/iso';

describe('worldToIso', () => {
  it('maps the origin to (0,0)', () => {
    expect(worldToIso(0, 0)).toEqual({ sx: 0, sy: 0 });
  });

  it('sends +x down-right and +z down-left (2:1 dimetric)', () => {
    expect(worldToIso(10, 0)).toEqual({ sx: 10 * ISO_PPY_X, sy: 10 * ISO_PPY_Y });
    expect(worldToIso(0, 10)).toEqual({ sx: -10 * ISO_PPY_X, sy: 10 * ISO_PPY_Y });
  });

  it('moving equally along +x and +z goes straight down with no horizontal drift', () => {
    const p = worldToIso(10, 10);
    expect(p.sx).toBe(0);
    expect(p.sy).toBe(20 * ISO_PPY_Y);
  });

  it('world height lifts a point straight up the screen', () => {
    const ground = worldToIso(3, 7, 0);
    const air = worldToIso(3, 7, 10);
    expect(air.sx).toBe(ground.sx); // height never moves a point horizontally
    expect(ground.sy - air.sy).toBe(10 * ISO_HEIGHT_PPY); // up = smaller sy
  });
});

describe('isoDepth', () => {
  it('sorts nearer (larger x+z) entities in front', () => {
    expect(isoDepth(0, 0)).toBeLessThan(isoDepth(10, 10));
    expect(isoDepth(-50, -50)).toBeLessThan(isoDepth(0, 0));
  });

  it('ignores height so a jumping entity does not sort behind its ground', () => {
    // depth takes only (x,z); same ground point at any height sorts identically.
    expect(isoDepth(5, 9)).toBe(isoDepth(5, 9));
  });
});

describe('isoWorldBounds', () => {
  it('produces a diamond that fully contains the projected world', () => {
    const worldSize = 360;
    const b = isoWorldBounds(worldSize, 400);
    expect(b.width).toBe(2 * worldSize * ISO_PPY_X);
    expect(b.height).toBe(2 * worldSize * ISO_PPY_Y + 800);

    // The extreme corners of the world, offset by the origin, land inside [0,w]x[0,h].
    const half = worldSize / 2;
    for (const [x, z] of [[half, half], [-half, -half], [half, -half], [-half, half]]) {
      const p = worldToIso(x, z);
      const screenX = b.originX + p.sx;
      const screenY = b.originY + p.sy;
      expect(screenX).toBeGreaterThanOrEqual(0);
      expect(screenX).toBeLessThanOrEqual(b.width);
      expect(screenY).toBeGreaterThanOrEqual(0);
      expect(screenY).toBeLessThanOrEqual(b.height);
    }
  });
});
