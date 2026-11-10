// Moves your own gardener on screen the moment you press a key, instead of waiting
// for the server's answer (which can take a few hundred milliseconds online).
// Movement here has no obstacles, only the garden edge, so the guess matches the server;
// small differences are smoothed out when you stand still, big ones at once.
import { LAYOUT } from './layout.js';

const BIG_ERROR = 90;     // world units; beyond this, pull towards the server even while walking
const SETTLE_RATE = 10;   // how fast you glide to the server's position when standing still
const CORRECT_RATE = 6;   // how fast a big error is corrected while walking

export function stepPrediction(me, keys, dt, server) {
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const len = Math.hypot(dx, dy);
  let x = me.x, y = me.y;
  const b = LAYOUT.bounds;
  if (len) {
    dx /= len; dy /= len;
    x = Math.min(b.right, Math.max(b.left, x + dx * LAYOUT.walkSpeed * dt));
    y = Math.min(b.bottom, Math.max(b.top, y + dy * LAYOUT.walkSpeed * dt));
  }
  const err = Math.hypot(server.x - x, server.y - y);
  const rate = !len ? SETTLE_RATE : err > BIG_ERROR ? CORRECT_RATE : 0;
  if (rate) {
    const k = Math.min(1, dt * rate);
    x += (server.x - x) * k;
    y += (server.y - y) * k;
    if (!len && Math.hypot(server.x - x, server.y - y) < 0.5) { x = server.x; y = server.y; }
  }
  return { x, y };
}
