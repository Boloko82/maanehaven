import {
  FLOWERS, MOISTURE_DRAIN_TIME, WATER_TIME, FILL_TIME, CAN_SMALL, CAN_BIG, TWIN_WINDOW,
  LIGHT_TIME, LANTERN_BURN,
} from './constants.js';
import { WORLD } from './world.js';
import { targetsInReach } from './players.js';

// Everything the rules need about the garden during one night.
export function makeNightState(save, playerCount) {
  const plants = new Map(save.plants.map((p) => [p.bed, p]));
  return {
    time: 0,
    playerCount,
    seeds: [...save.seeds],
    canCapacity: save.bigCan ? CAN_BIG : CAN_SMALL,
    beds: WORLD.beds.map((b) => ({
      id: b.id, x: b.x, y: b.y, open: b.id < save.beds,
      plant: plants.has(b.id) && b.id < save.beds ? { type: plants.get(b.id).type, growth: plants.get(b.id).growth } : null,
      moisture: 0,
    })),
    items: [{ id: 'can', kind: 'can', water: 0, x: WORLD.well.x + 48, y: WORLD.well.y }],
    nextItem: 1,
    lanterns: WORLD.lanterns.filter((l) => l.id < save.lanterns).map((l) => ({ id: l.id, x: l.x, y: l.y, litFor: 0 })),
    moths: [],
    pendingTwin: {},          // bedId -> { player, at }
    deliver: null,            // set by the night: (type, events) => void
  };
}

export const bloomed = (bed) => !!bed.plant && bed.plant.growth >= FLOWERS[bed.plant.type].grow;

function things(ns) {
  const list = [];
  for (const it of ns.items) list.push({ type: 'item', id: it.id, x: it.x, y: it.y });
  for (const b of ns.beds) if (b.open) list.push({ type: 'bed', id: b.id, x: b.x, y: b.y });
  list.push({ type: 'well', id: 'well', x: WORLD.well.x, y: WORLD.well.y });
  for (const s of WORLD.seedBoxes) if (ns.seeds.includes(s.type)) list.push({ type: 'seeds', id: s.type, x: s.x, y: s.y });
  for (const l of ns.lanterns) list.push({ type: 'lantern', id: l.id, x: l.x, y: l.y });
  list.push({ type: 'altar', id: 'altar', x: WORLD.altar.x, y: WORLD.altar.y });
  return list;
}

// What Space does at this target: { press: fn } for a tap, { key, time, done: fn } for a hold, or null.
function actionFor(ns, p, tg) {
  const c = p.carry;
  switch (tg.type) {
    case 'item':
      return c ? null : { press: (ev) => {
        const i = ns.items.findIndex((it) => it.id === tg.id);
        const it = ns.items.splice(i, 1)[0];
        p.carry = it.kind === 'can' ? { kind: 'can', water: it.water } : { kind: it.kind, type: it.type };
        ev.push({ type: 'pickup', id: p.id });
      } };
    case 'seeds':
      return c ? null : { press: (ev) => { p.carry = { kind: 'seed', type: tg.id }; ev.push({ type: 'pickup', id: p.id }); } };
    case 'bed': {
      const bed = ns.beds.find((b) => b.id === tg.id);
      if (c?.kind === 'seed' && !bed.plant) {
        if (FLOWERS[c.type].twin) return { press: (ev) => twinPress(ns, p, bed, ev) };
        return { press: (ev) => { bed.plant = { type: c.type, growth: 0 }; p.carry = null; ev.push({ type: 'plant', bed: bed.id }); } };
      }
      if (c?.kind === 'can' && c.water > 0 && bed.plant) {
        return { key: 'water:' + bed.id, time: WATER_TIME, done: (ev) => { bed.moisture = 100; c.water -= 1; ev.push({ type: 'water', bed: bed.id }); } };
      }
      if (!c && bloomed(bed)) {
        return { press: (ev) => { p.carry = { kind: 'flower', type: bed.plant.type }; bed.plant = null; ev.push({ type: 'harvest', bed: bed.id }); } };
      }
      return null;
    }
    case 'well':
      if (c?.kind !== 'can' || c.water >= ns.canCapacity) return null;
      return { key: 'well', time: FILL_TIME, done: (ev) => { c.water = ns.canCapacity; ev.push({ type: 'fill' }); } };
    case 'lantern': {
      const l = ns.lanterns.find((x) => x.id === tg.id);
      if (l.litFor > LANTERN_BURN - 5) return null; // already freshly lit
      return { key: 'lantern:' + l.id, time: LIGHT_TIME, done: (ev) => { l.litFor = LANTERN_BURN; ev.push({ type: 'light', lantern: l.id }); } };
    }
    case 'altar':
      if (c?.kind !== 'flower' || !ns.deliver) return null;
      return { press: (ev) => { const type = c.type; p.carry = null; ns.deliver(type, ev, p); } };
    default:
      return null;
  }
}

function twinPress(ns, p, bed, ev) {
  const pending = ns.pendingTwin[bed.id];
  if (pending && pending.player !== p && ns.time - pending.at <= TWIN_WINDOW + 1e-9
      && pending.player.carry?.kind === 'seed' && pending.player.carry.type === 'tvillingelilje' && !bed.plant) {
    bed.plant = { type: 'tvillingelilje', growth: 0 };
    pending.player.carry = null;
    p.carry = null;
    delete ns.pendingTwin[bed.id];
    ev.push({ type: 'plant', bed: bed.id, twin: true });
    return;
  }
  ns.pendingTwin[bed.id] = { player: p, at: ns.time };
  ev.push({ type: 'twinWait', bed: bed.id, id: p.id });
}

function dropAt(ns, p, ev) {
  const it = { id: 'i' + (ns.nextItem++), kind: p.carry.kind, x: p.x, y: p.y };
  if (p.carry.kind === 'can') { it.id = 'can'; it.water = p.carry.water; } else it.type = p.carry.type;
  ns.items.push(it);
  p.carry = null;
  ev?.push({ type: 'drop', id: p.id });
}

// pressed: Space went down this tick; held: Space is down this tick.
export function useAt(ns, p, pressed, held, dt, events) {
  const all = targetsInReach(p, things(ns));
  let target = null, act = null;
  for (const tg of all) { const a = actionFor(ns, p, tg); if (a) { target = tg; act = a; break; } }

  if (pressed) {
    if (act?.press) { p.hold = null; act.press(events); return; }
    if (!act && p.carry && (!all.length || all[0].type === 'item')) { p.hold = null; dropAt(ns, p, events); return; }
  }
  if (!held) p.holdLatch = false;
  // After a hold finishes, Space must be let go before the next hold starts (one watering per hold).
  if (!held || !act || act.press || p.holdLatch) { p.hold = null; return; }
  const need = Math.round(act.time / dt);
  if (p.hold?.target !== act.key) p.hold = { target: act.key, ticks: 0, need };
  p.hold.ticks++;
  if (p.hold.ticks >= need) { act.done(events); p.hold = null; p.holdLatch = true; }
}

export function stepBeds(beds, dt, { growthMul = 1, drainMul = 1 } = {}, events = []) {
  const drain = 100 / (MOISTURE_DRAIN_TIME * drainMul);
  for (const b of beds) {
    if (!b.open) continue;
    if (b.plant && b.moisture > 0) {
      const full = FLOWERS[b.plant.type].grow;
      const was = b.plant.growth;
      b.plant.growth = Math.min(full, was + dt * growthMul);
      if (was < full && b.plant.growth >= full) events.push({ type: 'bloom', bed: b.id });
    }
    b.moisture = Math.max(0, b.moisture - drain * dt);
  }
}

export function dropCarried(ns, p) {
  p.hold = null;
  if (p.carry) dropAt(ns, p, null);
}
