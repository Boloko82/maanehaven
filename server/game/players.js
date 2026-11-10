import { WALK_SPEED, REACH } from './constants.js';
import { WORLD } from './world.js';

export function makePlayer({ id, name, x, y }) {
  return { id, name, x, y, facing: { x: 0, y: 1 }, carry: null, hold: null, prevAct: false };
}

export function stepPlayer(p, keys, dt) {
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const len = Math.hypot(dx, dy);
  if (!len) return;
  dx /= len; dy /= len;
  p.facing = { x: dx, y: dy };
  const b = WORLD.bounds;
  p.x = Math.min(b.right, Math.max(b.left, p.x + dx * WALK_SPEED * dt));
  p.y = Math.min(b.bottom, Math.max(b.top, p.y + dy * WALK_SPEED * dt));
}

// things: [{ type, id, x, y, ... }]. Returns those within reach, nearest first.
export function targetsInReach(p, things) {
  return things
    .map((t, i) => ({ t, i, d: Math.hypot(t.x - p.x, t.y - p.y) }))
    .filter((e) => e.d <= REACH)
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((e) => e.t);
}
