import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DT } from '../server/game/constants.js';
import { WORLD } from '../server/game/world.js';
import { makePlayer } from '../server/game/players.js';
import { makeNightState, useAt, stepBeds, bloomed, dropCarried } from '../server/game/beds.js';

const save = (o = {}) => ({ version: 1, nights: 0, dust: 0, beds: 6, lanterns: 2, bigCan: false, seeds: ['maaneklokke', 'natviol'], plants: [], ...o });
let n = 0;
const at = (x, y, carry = null) => { const p = makePlayer({ id: 'p' + (n++), name: 'P', x, y }); p.carry = carry; return p; };
const bed = (ns, id) => ns.beds.find((b) => b.id === id);
const B = (id) => WORLD.beds[id];
const hold = (ns, p, k, ev = []) => { for (let i = 0; i < k; i++) { useAt(ns, p, i === 0, true, DT, ev); ns.time += DT; } return ev; };
const press = (ns, p, ev = []) => { useAt(ns, p, true, true, DT, ev); useAt(ns, p, false, false, DT, ev); return ev; };
const grow = (ns, secs, mul = {}) => { for (let i = 0; i < Math.round(secs / DT); i++) stepBeds(ns.beds, DT, { growthMul: 1, drainMul: 1, ...mul }, []); };

test('six open beds, the rest closed, plants restored from the save', () => {
  const ns = makeNightState(save({ plants: [{ bed: 2, type: 'natviol', growth: 10 }] }), 2);
  assert.equal(ns.beds.filter((b) => b.open).length, 6);
  assert.deepEqual(bed(ns, 2).plant, { type: 'natviol', growth: 10 });
  assert.equal(bed(ns, 2).moisture, 0);
  assert.equal(ns.items.filter((i) => i.kind === 'can').length, 1);
});

test('taking a seed and planting it uses the seed', () => {
  const ns = makeNightState(save(), 2);
  const box = WORLD.seedBoxes[0];
  const p = at(box.x, box.y);
  press(ns, p);
  assert.deepEqual(p.carry, { kind: 'seed', type: 'maaneklokke' });
  p.x = B(0).x; p.y = B(0).y;
  press(ns, p);
  assert.equal(p.carry, null);
  assert.deepEqual(bed(ns, 0).plant, { type: 'maaneklokke', growth: 0 });
});

test('seed boxes for flowers you do not own give nothing', () => {
  const ns = makeNightState(save(), 2);
  const box = WORLD.seedBoxes.find((s) => s.type === 'soelvrose');
  const p = at(box.x, box.y);
  press(ns, p);
  assert.equal(p.carry, null);
});

test('closed beds cannot be planted', () => {
  const ns = makeNightState(save(), 2);
  const p = at(B(7).x, B(7).y, { kind: 'seed', type: 'natviol' });
  press(ns, p);
  assert.equal(bed(ns, 7).plant, null);
});

test('plants grow only while moist; moisture lasts 30 s (45 s when draining slower)', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'maaneklokke', growth: 0 }] }), 2);
  grow(ns, 40);
  assert.equal(bed(ns, 0).plant.growth, 0);
  bed(ns, 0).moisture = 100;
  grow(ns, 29.9); assert.ok(bed(ns, 0).moisture > 0);
  grow(ns, 0.2); assert.equal(bed(ns, 0).moisture, 0);
  bed(ns, 0).moisture = 100;
  grow(ns, 44.9, { drainMul: 1.5 }); assert.ok(bed(ns, 0).moisture > 0);
});

test('måneklokke blooms after 40 s of moisture', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'maaneklokke', growth: 0 }] }), 2);
  bed(ns, 0).moisture = 100; grow(ns, 25);
  bed(ns, 0).moisture = 100; grow(ns, 14.8);
  assert.equal(bloomed(bed(ns, 0)), false);
  grow(ns, 0.3);
  assert.equal(bloomed(bed(ns, 0)), true);
  assert.ok(bed(ns, 0).plant.growth <= 40);
});

test('watering takes 30 ticks and uses one water', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'natviol', growth: 0 }] }), 2);
  const p = at(B(0).x, B(0).y, { kind: 'can', water: 3 });
  hold(ns, p, 29); assert.equal(bed(ns, 0).moisture, 0);
  hold(ns, p, 1, []);
  // the hold restarted; do it in one go
  const q = at(B(0).x, B(0).y, { kind: 'can', water: 3 });
  const m = makeNightState(save({ plants: [{ bed: 0, type: 'natviol', growth: 0 }] }), 2);
  hold(m, q, 30);
  assert.equal(bed(m, 0).moisture, 100); assert.equal(q.carry.water, 2);
});

test('an empty can does not water; the well fills it to 3, or 6 with the big can', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'natviol', growth: 0 }] }), 2);
  const p = at(B(0).x, B(0).y, { kind: 'can', water: 0 });
  hold(ns, p, 60); assert.equal(bed(ns, 0).moisture, 0);
  p.x = WORLD.well.x; p.y = WORLD.well.y;
  hold(ns, p, 30); assert.equal(p.carry.water, 3);
  const big = makeNightState(save({ bigCan: true }), 2);
  const q = at(WORLD.well.x, WORLD.well.y, { kind: 'can', water: 0 });
  hold(big, q, 30); assert.equal(q.carry.water, 6);
});

test('the can can be picked up and dropped', () => {
  const ns = makeNightState(save(), 2);
  const can = ns.items.find((i) => i.kind === 'can');
  const p = at(can.x, can.y);
  press(ns, p);
  assert.equal(p.carry.kind, 'can');
  assert.equal(ns.items.length, 0);
  p.x = 700; p.y = 470;
  press(ns, p);
  assert.equal(p.carry, null);
  assert.equal(ns.items[0].x, 700);
});

test('harvest: one bloom gives one flower even with two players', () => {
  const ns = makeNightState(save({ plants: [{ bed: 1, type: 'natviol', growth: 50 }] }), 2);
  const a = at(B(1).x, B(1).y), b = at(B(1).x, B(1).y);
  useAt(ns, a, true, true, DT, []); useAt(ns, b, true, true, DT, []);
  assert.deepEqual(a.carry, { kind: 'flower', type: 'natviol' });
  assert.equal(b.carry, null);
  assert.equal(bed(ns, 1).plant, null);
});

test('twin lily: one press plants nothing; two presses within 1 s plant it and use both seeds', () => {
  const s = save({ seeds: ['maaneklokke', 'natviol', 'tvillingelilje'] });
  const ns = makeNightState(s, 2);
  const a = at(B(0).x, B(0).y, { kind: 'seed', type: 'tvillingelilje' });
  const b = at(B(0).x, B(0).y, { kind: 'seed', type: 'tvillingelilje' });
  press(ns, a);
  assert.equal(bed(ns, 0).plant, null); assert.ok(a.carry);
  ns.time += 29 * DT;
  press(ns, b);
  assert.deepEqual(bed(ns, 0).plant, { type: 'tvillingelilje', growth: 0 });
  assert.equal(a.carry, null); assert.equal(b.carry, null);
});

test('twin lily: presses more than 1 s apart plant nothing', () => {
  const ns = makeNightState(save({ seeds: ['maaneklokke', 'natviol', 'tvillingelilje'] }), 2);
  const a = at(B(0).x, B(0).y, { kind: 'seed', type: 'tvillingelilje' });
  const b = at(B(0).x, B(0).y, { kind: 'seed', type: 'tvillingelilje' });
  press(ns, a); ns.time += 31 * DT; press(ns, b);
  assert.equal(bed(ns, 0).plant, null);
  assert.ok(a.carry && b.carry);
});

test('twin lily: the same player pressing twice plants nothing', () => {
  const ns = makeNightState(save({ seeds: ['maaneklokke', 'natviol', 'tvillingelilje'] }), 2);
  const a = at(B(0).x, B(0).y, { kind: 'seed', type: 'tvillingelilje' });
  press(ns, a); ns.time += 5 * DT; press(ns, a);
  assert.equal(bed(ns, 0).plant, null);
});

test('dropCarried leaves the item where the player stood', () => {
  const ns = makeNightState(save(), 2);
  const p = at(500, 300, { kind: 'can', water: 2 });
  dropCarried(ns, p);
  const it = ns.items.find((i) => i.x === 500 && i.y === 300);
  assert.equal(it.kind, 'can'); assert.equal(it.water, 2);
  assert.equal(p.carry, null);
});

test('Space at a bed you cannot use does not drop what you carry', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'natviol', growth: 10 }] }), 2);
  const p = at(B(0).x, B(0).y, { kind: 'seed', type: 'maaneklokke' });
  press(ns, p);
  assert.deepEqual(p.carry, { kind: 'seed', type: 'maaneklokke' });
});

test('holding Space waters once; you must let go before watering again', () => {
  const ns = makeNightState(save({ plants: [{ bed: 0, type: 'natviol', growth: 0 }] }), 2);
  const p = at(B(0).x, B(0).y, { kind: 'can', water: 3 });
  hold(ns, p, 75);
  assert.equal(p.carry.water, 2);
  useAt(ns, p, false, false, DT, []);
  hold(ns, p, 30);
  assert.equal(p.carry.water, 1);
});
