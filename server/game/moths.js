import {
  MOTH_INTERVAL, MOTH_EAT_TIME, MOTH_SPEED, MOTH_FLEE_SPEED, MOTH_TOUCH, FIRST_MOTH_AT, LANTERN_RADIUS,
} from './constants.js';
import { WORLD } from './world.js';
import { bloomed } from './beds.js';

const ARRIVE = 8;

export function burnLanterns(ns, dt) {
  for (const l of ns.lanterns) l.litFor = Math.max(0, l.litFor - dt);
}

export const inLight = (ns, x, y) => ns.lanterns.some((l) => l.litFor > 0 && Math.hypot(l.x - x, l.y - y) <= LANTERN_RADIUS);

function moveToward(m, x, y, speed, dt) {
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
  if (d <= speed * dt) { m.x = x; m.y = y; return true; }
  m.x += (dx / d) * speed * dt; m.y += (dy / d) * speed * dt;
  return false;
}

function edgePoint(rng) {
  const b = WORLD.bounds;
  switch (Math.floor(rng() * 4)) {
    case 0: return { x: b.left, y: b.top + rng() * (b.bottom - b.top) };
    case 1: return { x: b.right, y: b.top + rng() * (b.bottom - b.top) };
    case 2: return { x: b.left + rng() * (b.right - b.left), y: b.top };
    default: return { x: b.left + rng() * (b.right - b.left), y: b.bottom };
  }
}

function wanderPoint(rng) {
  const b = WORLD.bounds;
  return { x: b.left + 20 + rng() * (b.right - b.left - 40), y: b.top + 20 + rng() * (b.bottom - b.top - 40) };
}

function flee(m, events) {
  if (m.state === 'flee') return;
  m.state = 'flee';
  m.bed = null;
  events.push({ type: 'shoo', id: m.id });
}

// players: the gardeners (to scare moths). mothMul: phase multiplier for how often moths come.
export function stepMoths(ns, dt, rng, events, players, mothMul = 1) {
  const gap = (MOTH_INTERVAL[Math.min(4, Math.max(2, ns.playerCount))] || 30) / mothMul;
  if (ns.nextMothAt === undefined) ns.nextMothAt = FIRST_MOTH_AT;
  if (!ns.mothSeq) ns.mothSeq = 0;
  while (ns.time >= ns.nextMothAt - 1e-9) {
    ns.nextMothAt += gap;
    const p = edgePoint(rng);
    const m = { id: 'm' + (++ns.mothSeq), x: p.x, y: p.y, state: 'seek', bed: null, eatT: 0, wander: null };
    ns.moths.push(m);
    events.push({ type: 'moth', id: m.id });
  }

  const b = WORLD.bounds;
  for (const m of ns.moths) {
    if (m.state !== 'flee') {
      if (players.some((p) => Math.hypot(p.x - m.x, p.y - m.y) <= MOTH_TOUCH) || inLight(ns, m.x, m.y)) flee(m, events);
    }
    if (m.state === 'flee') {
      const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
      let dx = m.x - cx, dy = m.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      m.x += (dx / d) * MOTH_FLEE_SPEED * dt; m.y += (dy / d) * MOTH_FLEE_SPEED * dt;
      continue;
    }
    if (m.state === 'eat') {
      const bed = ns.beds.find((x) => x.id === m.bed);
      if (!bed || !bloomed(bed)) { m.state = 'seek'; m.bed = null; m.eatT = 0; continue; }
      m.eatT += dt;
      if (m.eatT >= MOTH_EAT_TIME - 1e-9) {
        bed.plant = null;
        events.push({ type: 'wilt', bed: bed.id });
        flee(m, events);
      }
      continue;
    }
    // seek
    const targets = ns.beds.filter((x) => x.open && bloomed(x) && !inLight(ns, x.x, x.y));
    if (targets.length) {
      const bed = targets.reduce((a, c) => (Math.hypot(c.x - m.x, c.y - m.y) < Math.hypot(a.x - m.x, a.y - m.y) ? c : a));
      if (Math.hypot(bed.x - m.x, bed.y - m.y) <= ARRIVE || moveToward(m, bed.x, bed.y, MOTH_SPEED, dt)) {
        m.state = 'eat'; m.bed = bed.id; m.eatT = 0;
      }
    } else {
      if (!m.wander || Math.hypot(m.wander.x - m.x, m.wander.y - m.y) < 2) m.wander = wanderPoint(rng);
      moveToward(m, m.wander.x, m.wander.y, MOTH_SPEED * 0.6, dt);
    }
  }
  ns.moths = ns.moths.filter((m) => m.x > -40 && m.x < WORLD.width + 40 && m.y > -40 && m.y < WORLD.height + 40);
}
