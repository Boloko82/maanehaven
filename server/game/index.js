import { DT, NIGHT_LENGTH, PHASES, PHASE_EFFECTS, WISHES_AT_ONCE, NEXT_WISH_DELAY, WISH_LIFETIME } from './constants.js';
import { WORLD } from './world.js';
import { makePlayer, stepPlayer } from './players.js';
import { makeNightState, useAt, stepBeds, bloomed, dropCarried } from './beds.js';
import { stepMoths, burnLanterns } from './moths.js';
import { makeWish, deliver } from './wishes.js';

// save must already be sanitised (see garden.js).
export function createNight({ save, players, rng = Math.random }) {
  const n = players.length;
  const ns = makeNightState(save, n);
  const moon = PHASES[save.nights % PHASES.length];
  const fx = PHASE_EFFECTS[moon];
  const keepers = players.map((p, i) => makePlayer({ id: p.id, name: p.name, x: WORLD.spawn[i % 4].x, y: WORLD.spawn[i % 4].y }));
  const stats = { wishes: 0, flowers: 0, dust: 0 };
  let events = [];
  let wishSeq = 0;
  const wishSlots = WISHES_AT_ONCE[Math.min(4, Math.max(2, n))];
  ns.wishes = [];
  ns.wishDue = [];          // times when new wishes appear
  const newWish = () => ({ ...makeWish(ns.seeds, n, rng, 'w' + (++wishSeq)), bornAt: ns.time });
  for (let i = 0; i < wishSlots; i++) ns.wishes.push(newWish());

  ns.deliver = (type, ev) => {
    const r = deliver(ns.wishes, type);
    stats.flowers++;
    stats.dust += r.dust;
    if (r.completed) { stats.wishes++; ns.wishDue.push(ns.time + NEXT_WISH_DELAY); ev.push({ type: 'wish', id: r.wishId, dust: r.dust }); }
    else if (r.wishId) ev.push({ type: 'deliver', id: r.wishId, flower: type });
    else ev.push({ type: 'gift', flower: type, dust: r.dust });
  };

  const game = {
    ns, players: keepers, phase: 'playing',

    step(inputs = {}) {
      if (game.phase !== 'playing') return;
      for (const p of keepers) {
        const k = inputs[p.id] || {};
        stepPlayer(p, k, DT);
        const act = !!k.act;
        useAt(ns, p, act && !p.prevAct, act, DT, events);
        p.prevAct = act;
      }
      stepBeds(ns.beds, DT, fx, events);
      stepMoths(ns, DT, rng, events, keepers, fx.mothMul);
      burnLanterns(ns, DT);
      for (const w of [...ns.wishes]) {
        if (ns.time - w.bornAt >= WISH_LIFETIME) { ns.wishes.splice(ns.wishes.indexOf(w), 1); ns.wishDue.push(ns.time + NEXT_WISH_DELAY); events.push({ type: 'wishGone', id: w.id }); }
      }
      ns.wishDue.sort((a, b) => a - b);
      while (ns.wishDue.length && ns.wishDue[0] <= ns.time) { ns.wishDue.shift(); ns.wishes.push(newWish()); events.push({ type: 'newWish' }); }
      for (const [bedId, pend] of Object.entries(ns.pendingTwin)) if (ns.time - pend.at > 1.5) delete ns.pendingTwin[bedId];
      ns.time += DT;
      if (ns.time >= NIGHT_LENGTH - 1e-9) { game.phase = 'dawn'; events.push({ type: 'dawn' }); }
    },

    getState() {
      return {
        phase: game.phase, moon, time: ns.time, nightLength: NIGHT_LENGTH,
        players: keepers.map((p) => ({
          id: p.id, name: p.name, x: p.x, y: p.y, facing: { ...p.facing },
          carry: p.carry ? { ...p.carry } : null,
          hold: p.hold ? { target: p.hold.target, ticks: p.hold.ticks, need: p.hold.need } : null,
        })),
        beds: ns.beds.map((b) => ({ id: b.id, open: b.open, plant: b.plant ? { ...b.plant } : null, moisture: b.moisture, bloomed: bloomed(b) })),
        items: ns.items.map((i) => ({ ...i })),
        lanterns: ns.lanterns.map((l) => ({ id: l.id, litFor: l.litFor })),
        moths: ns.moths.map((m) => ({ id: m.id, x: m.x, y: m.y, state: m.state })),
        wishes: ns.wishes.map((w) => ({ id: w.id, need: { ...w.need }, have: { ...w.have } })),
        stats: { ...stats },
        dustTotal: save.dust + stats.dust,
        canCapacity: ns.canCapacity,
        seeds: [...ns.seeds],
      };
    },

    drainEvents() { const e = events; events = []; return e; },
    isOver() { return game.phase !== 'playing'; },

    getSave() {
      return {
        version: 1,
        nights: save.nights + 1,
        dust: save.dust + stats.dust,
        beds: save.beds, lanterns: save.lanterns, bigCan: save.bigCan,
        seeds: [...save.seeds],
        plants: ns.beds.filter((b) => b.open && b.plant).map((b) => ({ bed: b.id, type: b.plant.type, growth: b.plant.growth })),
      };
    },

    getResult() { return { wishes: stats.wishes, flowers: stats.flowers, dust: stats.dust, save: game.getSave() }; },

    removePlayer(id) {
      const i = keepers.findIndex((p) => p.id === id);
      if (i < 0) return;
      dropCarried(ns, keepers[i]);
      for (const [bedId, pend] of Object.entries(ns.pendingTwin)) if (pend.player === keepers[i]) delete ns.pendingTwin[bedId];
      keepers.splice(i, 1);
    },
  };
  return game;
}
