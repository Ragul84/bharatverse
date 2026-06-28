/**
 * SimBridge - the seam between the fixed-step simulation loop and the
 * variable-rate Phaser render loop.
 *
 * Two jobs, both pure logic (NO Phaser / DOM imports, so it is unit-testable and
 * safe to run in Node):
 *
 *  1. Event relay. `src/sim/sim.ts` `tick()` returns a `SimEvent[]` each tick and
 *     the online `ClientWorld.drainEvents()` yields the same shape. The sim loop
 *     pushes those here; the renderer drains them once per render frame and turns
 *     them into floating combat text / death / loot visuals. Before this bridge
 *     existed the `main.ts` loop dropped every event on the floor.
 *
 *  2. Render interpolation clock. The sim advances in fixed `DT` steps but the
 *     screen refreshes at the monitor's rate. `alpha` is the fraction (0..1) of
 *     the way from the previous tick to the next, so the renderer can lerp each
 *     entity's `prevPos -> pos` and avoid 20Hz stutter.
 */

import { DT, type Entity, type SimEvent, type Vec3 } from '../sim/types';

const NO_EVENTS: SimEvent[] = [];

// Safety cap so a renderer that stops draining (e.g. a paused scene) cannot grow
// the queue without bound. Oldest events are dropped first; visuals are
// best-effort, so losing the tail of a long stall is acceptable.
const MAX_QUEUE = 1024;

export class SimBridge {
  private queue: SimEvent[] = [];

  /** Interpolation factor in [0,1] between the last two sim ticks. */
  alpha = 0;

  /**
   * Append a tick's events to the drain queue. Called by the sim loop after
   * every `tick()` (and after each online drain). Cheap no-op on an empty tick.
   */
  push(events: readonly SimEvent[]): void {
    for (let i = 0; i < events.length; i++) this.queue.push(events[i]);
    if (this.queue.length > MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }
  }

  /**
   * Set the render interpolation factor from the leftover fixed-step
   * accumulator (seconds not yet consumed by a tick). Clamped to [0,1] so a
   * frame that runs long never extrapolates past the next tick.
   */
  setAccumulator(simAccSeconds: number): void {
    const a = simAccSeconds / DT;
    this.alpha = a < 0 ? 0 : a > 1 ? 1 : a;
  }

  /**
   * Take every queued event, clearing the queue. Returns a shared empty array
   * (do not mutate) when there is nothing pending, to avoid per-frame garbage.
   */
  drain(): SimEvent[] {
    if (this.queue.length === 0) return NO_EVENTS;
    const out = this.queue;
    this.queue = [];
    return out;
  }
}

/**
 * Interpolated world-space position of an entity for the current render frame.
 * Lerps `prevPos -> pos` by `alpha`. Pure; allocates one small object.
 */
export function interpPos(e: Entity, alpha: number): Vec3 {
  const p = e.prevPos;
  const c = e.pos;
  return {
    x: p.x + (c.x - p.x) * alpha,
    y: p.y + (c.y - p.y) * alpha,
    z: p.z + (c.z - p.z) * alpha,
  };
}

/**
 * Interpolate a facing angle (radians) the short way around the circle, so a
 * wrap across +/-PI does not spin the sprite the long way.
 */
export function interpAngle(prev: number, cur: number, alpha: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (cur - prev) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  else if (d < -Math.PI) d += TWO_PI;
  return prev + d * alpha;
}
