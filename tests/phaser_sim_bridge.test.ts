import { describe, it, expect } from 'vitest';
import { SimBridge, interpPos, interpAngle } from '../src/render-phaser/sim_bridge';
import { DT, type Entity, type SimEvent } from '../src/sim/types';

// Minimal SimEvent stand-ins; the bridge relays events opaquely and never
// inspects their shape, so a typed cast of the smallest valid variant is enough.
const ev = (amount: number): SimEvent => ({ type: 'xp', amount });

describe('SimBridge event relay', () => {
  it('accumulates pushed events and drains them in order', () => {
    const b = new SimBridge();
    b.push([ev(1), ev(2)]);
    b.push([ev(3)]);
    const out = b.drain();
    expect(out.map(e => (e as { amount: number }).amount)).toEqual([1, 2, 3]);
  });

  it('clears the queue after a drain', () => {
    const b = new SimBridge();
    b.push([ev(1)]);
    expect(b.drain()).toHaveLength(1);
    expect(b.drain()).toHaveLength(0);
  });

  it('returns an empty array when nothing is queued', () => {
    const b = new SimBridge();
    expect(b.drain()).toHaveLength(0);
  });

  it('an empty tick push is a no-op', () => {
    const b = new SimBridge();
    b.push([]);
    expect(b.drain()).toHaveLength(0);
  });

  it('caps the queue so a non-draining renderer cannot grow it without bound', () => {
    const b = new SimBridge();
    for (let i = 0; i < 2000; i++) b.push([ev(i)]);
    const out = b.drain();
    expect(out).toHaveLength(1024);
    // Oldest dropped first: the last event pushed must survive.
    expect((out[out.length - 1] as { amount: number }).amount).toBe(1999);
  });
});

describe('SimBridge render interpolation alpha', () => {
  it('maps a half-tick accumulator to 0.5', () => {
    const b = new SimBridge();
    b.setAccumulator(DT * 0.5);
    expect(b.alpha).toBeCloseTo(0.5, 6);
  });

  it('clamps a full/overflowing accumulator to 1', () => {
    const b = new SimBridge();
    b.setAccumulator(DT);
    expect(b.alpha).toBe(1);
    b.setAccumulator(DT * 3);
    expect(b.alpha).toBe(1);
  });

  it('clamps a negative accumulator to 0', () => {
    const b = new SimBridge();
    b.setAccumulator(-1);
    expect(b.alpha).toBe(0);
  });
});

describe('interpPos', () => {
  it('lerps prevPos -> pos by alpha', () => {
    const e = {
      prevPos: { x: 0, y: 0, z: 0 },
      pos: { x: 10, y: 4, z: -8 },
    } as Entity;
    expect(interpPos(e, 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(interpPos(e, 1)).toEqual({ x: 10, y: 4, z: -8 });
    expect(interpPos(e, 0.5)).toEqual({ x: 5, y: 2, z: -4 });
  });
});

describe('interpAngle', () => {
  it('interpolates a simple angle linearly', () => {
    expect(interpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 6);
  });

  it('takes the short way around a +/-PI wrap', () => {
    // From 170deg to -170deg is +20deg the short way (across 180), not -340.
    const prev = (170 * Math.PI) / 180;
    const cur = (-170 * Math.PI) / 180;
    const half = interpAngle(prev, cur, 0.5);
    // Halfway the short way lands at 180deg (== -180deg).
    expect(Math.abs(Math.abs(half) - Math.PI)).toBeCloseTo(0, 5);
  });
});
