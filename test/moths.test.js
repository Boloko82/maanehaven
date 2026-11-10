import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DT, MOTH_EAT_TIME, FIRST_MOTH_AT } from '../server/game/constants.js';
import { WORLD } from '../server/game/world.js';
import { makePlayer } from '../server/game/players.js';
import { makeNightState, useAt } from '../server/game/beds.js';
import { stepMoths, burnLanterns } from '../server/game/moths.js';

function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const save = (o = {}) => ({ version: 1, nights: 0, dust: 0, beds: 6, lanterns: 2, bigCan: false, seeds: ['maaneklokke', 'natviol'], plants: [], ...o });
const far = [makePlayer({ id: 'x', name: 'X', x: 900, y: 500 })];
const run = (ns, secs, players = far, mul = 1, rng = seeded(1), ev = []) => {
  for (let i = 0; i < Math.round(secs / DT); i++) { stepMoths(ns, DT, rng, ev, players, mul); burnLanterns(ns, DT); ns.time += DT; }
  return ev;
};

test('moth spawn interval: 30, 24 and 20 s for 2, 3 and 4 players; 1.5x as many at nymåne', () => {
  for (const [n, gap] of [[2, 30], [3, 24], [4, 20]]) {
    const ns = makeNightState(save(), n);
    const ev = run(ns, FIRST_MOTH_AT + gap * 10 - 0.5);
    assert.equal(ev.filter((e) => e.type === 'moth').length, 10, `${n} players`);
  }
  const ns = makeNightState(save(), 2);
  const ev = run(ns, FIRST_MOTH_AT + 20 * 10 - 0.5, far, 1.5);
  assert.equal(ev.filter((e) => e.type === 'moth').length, 10);
});

function nightWithMothOn(bedId, opts = {}) {
  const ns = makeNightState(save({ plants: [{ bed: bedId, type: 'natviol', growth: 50 }], ...opts }), 2);
  const b = ns.beds.find((x) => x.id === bedId);
  ns.time = 0;
  ns.nextMothAt = 1e9;
  ns.moths.push({ id: 'm1', x: b.x, y: b.y, state: 'seek', bed: null, eatT: 0 });
  return { ns, b };
}

test('a moth on an unlit bloom wilts it after 15 s', () => {
  const { ns, b } = nightWithMothOn(6, { beds: 12 });
  const ev = run(ns, MOTH_EAT_TIME - 0.5);
  assert.ok(b.plant);
  run(ns, 1.5, far, 1, seeded(1), ev);
  assert.equal(b.plant, null);
  assert.equal(ev.filter((e) => e.type === 'wilt').length, 1);
});

test('a moth never eats a bloom inside a lit lantern light', () => {
  const { ns, b } = nightWithMothOn(0);
  ns.lanterns[0].litFor = 60; // lantern 0 is next to bed 0
  run(ns, 40);
  assert.ok(b.plant);
});

test('a gardener touching a moth scares it away', () => {
  const { ns, b } = nightWithMothOn(6, { beds: 12 });
  const p = makePlayer({ id: 'p', name: 'P', x: b.x, y: b.y });
  const ev = run(ns, 0.2, [p]);
  assert.ok(ev.some((e) => e.type === 'shoo'));
  run(ns, 20, far);
  assert.ok(b.plant);
  assert.equal(ns.moths.length, 0);
});

test('lighting a lantern takes 1 s; it burns out after 60 s', () => {
  const ns = makeNightState(save(), 2);
  const l = WORLD.lanterns[0];
  const p = makePlayer({ id: 'p', name: 'P', x: l.x, y: l.y });
  for (let i = 0; i < 29; i++) useAt(ns, p, i === 0, true, DT, []);
  assert.equal(ns.lanterns[0].litFor, 0);
  useAt(ns, p, false, true, DT, []);
  assert.equal(ns.lanterns[0].litFor, 60);
  for (let i = 0; i < Math.round(59.9 / DT); i++) burnLanterns(ns, DT);
  assert.ok(ns.lanterns[0].litFor > 0);
  for (let i = 0; i < 6; i++) burnLanterns(ns, DT);
  assert.equal(ns.lanterns[0].litFor, 0);
});

test('with no blooms, moths wander inside the garden and never get stuck', () => {
  const ns = makeNightState(save(), 4);
  run(ns, 180);
  assert.ok(ns.moths.length > 0);
  const b = WORLD.bounds;
  for (const m of ns.moths) assert.ok(m.x >= b.left - 1 && m.x <= b.right + 1 && m.y >= b.top - 1 && m.y <= b.bottom + 1);
  const before = ns.moths.map((m) => [m.x, m.y]);
  run(ns, 3);
  assert.ok(ns.moths.some((m, i) => before[i] && Math.hypot(m.x - before[i][0], m.y - before[i][1]) > 1));
});
