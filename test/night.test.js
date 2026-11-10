import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DT, FLOWERS, NIGHT_LENGTH } from '../server/game/constants.js';
import { WORLD } from '../server/game/world.js';
import { makeWish, deliver } from '../server/game/wishes.js';
import { createNight } from '../server/game/index.js';

function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const save = (o = {}) => ({ version: 1, nights: 1, dust: 5, beds: 6, lanterns: 2, bigCan: false, seeds: ['maaneklokke', 'natviol'], plants: [], ...o });
const players = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i }));
const count = (w) => Object.values(w.need).reduce((a, b) => a + b, 0);

test('wishes: 2 at once for 2 players, 3 for 3 and 4', () => {
  for (const [n, k] of [[2, 2], [3, 3], [4, 3]]) {
    const g = createNight({ save: save(), players: players(n), rng: seeded(n) });
    assert.equal(g.getState().wishes.length, k);
  }
});

test('wish sizes 2-4 (3-5 at 4 players) using only owned seeds; twin lily only when owned', () => {
  const r = seeded(4);
  for (let i = 0; i < 200; i++) {
    const w = makeWish(['maaneklokke', 'natviol'], 2, r, 'w');
    assert.ok(count(w) >= 2 && count(w) <= 4);
    assert.ok(Object.keys(w.need).every((t) => t === 'maaneklokke' || t === 'natviol'));
    const w4 = makeWish(['maaneklokke', 'natviol', 'soelvrose'], 4, r, 'w');
    assert.ok(count(w4) >= 3 && count(w4) <= 5);
  }
  let twins = 0;
  for (let i = 0; i < 200; i++) if (makeWish(['maaneklokke', 'natviol', 'tvillingelilje'], 2, r, 'w').need.tvillingelilje) twins++;
  assert.ok(twins > 0);
});

test('delivering completes a wish for its value + 3; an unwanted flower is a gift', () => {
  const wishes = [{ id: 'a', need: { natviol: 1, maaneklokke: 1 }, have: {} }];
  assert.deepEqual(deliver(wishes, 'natviol'), { wishId: 'a', completed: false, dust: 0 });
  assert.deepEqual(deliver(wishes, 'soelvrose'), { wishId: null, completed: false, dust: FLOWERS.soelvrose.value });
  assert.deepEqual(deliver(wishes, 'maaneklokke'), { wishId: 'a', completed: true, dust: 1 + 1 + 3 });
  assert.equal(wishes.length, 0);
});

test('two deliveries for the last slot: completed once, the second is a gift', () => {
  const wishes = [{ id: 'a', need: { natviol: 1 }, have: {} }];
  const r1 = deliver(wishes, 'natviol'), r2 = deliver(wishes, 'natviol');
  assert.equal(r1.completed, true); assert.equal(r2.wishId, null); assert.equal(r2.dust, 1);
});

function carryTo(g, id, flower) {
  const p = g.players.find((q) => q.id === id);
  p.carry = { kind: 'flower', type: flower };
  p.x = WORLD.altar.x; p.y = WORLD.altar.y;
}

test('delivering at the altar through the game: wish done, next wish 5 s later', () => {
  const g = createNight({ save: save(), players: players(2), rng: seeded(7) });
  const w = g.getState().wishes[0];
  for (const [type, k] of Object.entries(w.need)) {
    for (let i = 0; i < k; i++) { carryTo(g, 'p0', type); g.step({ p0: { act: true } }); g.step({ p0: {} }); }
  }
  const s = g.getState();
  assert.equal(s.stats.wishes, 1);
  assert.equal(s.wishes.length, 1);
  assert.ok(s.stats.dust >= 2 + 3);
  for (let i = 0; i < Math.round(5.1 / DT); i++) g.step({});
  assert.equal(g.getState().wishes.length, 2);
});

test('the night ends at 12 minutes', () => {
  const g = createNight({ save: save(), players: players(2), rng: seeded(8) });
  for (let i = 0; i < Math.round(NIGHT_LENGTH / DT) - 1; i++) g.step({});
  assert.equal(g.isOver(), false);
  g.step({}); g.step({});
  assert.equal(g.isOver(), true);
  assert.equal(g.getState().phase, 'dawn');
});

test('moon phase follows the night number; fuldmåne grows 30 % faster', () => {
  const phases = [0, 1, 2, 3, 4].map((k) => createNight({ save: save({ nights: k }), players: players(2), rng: seeded(1) }).getState().moon);
  assert.deepEqual(phases, ['nymaane', 'tiltagende', 'fuldmaane', 'aftagende', 'nymaane']);
  const grown = (nights) => {
    const g = createNight({ save: save({ nights, plants: [{ bed: 0, type: 'stjernetidsel', growth: 0 }] }), players: players(2), rng: seeded(1) });
    g.ns.beds[0].moisture = 100;
    for (let i = 0; i < Math.round(10 / DT); i++) g.step({});
    return g.ns.beds[0].plant.growth;
  };
  assert.ok(Math.abs(grown(2) / grown(1) - 1.3) < 0.02);
});

test('the save after the night keeps unharvested plants, adds dust and counts the night', () => {
  const g = createNight({ save: save({ plants: [{ bed: 3, type: 'natviol', growth: 12 }] }), players: players(2), rng: seeded(9) });
  carryTo(g, 'p1', 'soelvrose'); g.step({ p1: { act: true } }); // a gift worth 2
  g.ns.time = NIGHT_LENGTH; g.step({});
  const r = g.getResult();
  assert.equal(r.save.nights, 2);
  assert.equal(r.save.dust, 5 + 2);
  assert.equal(r.dust, 2);
  assert.deepEqual(r.save.plants, [{ bed: 3, type: 'natviol', growth: 12 }]);
  assert.equal(r.flowers, 1);
});

test('removePlayer drops the can where they stood and the night goes on', () => {
  const g = createNight({ save: save(), players: players(2), rng: seeded(10) });
  const p = g.players.find((q) => q.id === 'p1');
  g.ns.items = []; p.carry = { kind: 'can', water: 2 }; p.x = 500; p.y = 300;
  g.removePlayer('p1');
  assert.equal(g.getState().players.length, 1);
  assert.deepEqual(g.ns.items.map((i) => [i.kind, i.water, i.x, i.y]), [['can', 2, 500, 300]]);
  g.step({}); assert.equal(g.isOver(), false);
});

test('same seed and inputs give the same state; state is JSON-safe', () => {
  const run = () => {
    const g = createNight({ save: save({ nights: 3 }), players: players(3), rng: seeded(11) });
    for (let i = 0; i < 2400; i++) g.step({ p0: { right: i % 90 < 45, left: i % 90 >= 45, act: i % 11 === 0 } });
    return JSON.stringify(g.getState());
  };
  const a = run();
  assert.equal(a, run());
  const s = JSON.parse(a);
  for (const k of ['phase', 'moon', 'time', 'nightLength', 'players', 'beds', 'items', 'lanterns', 'moths', 'wishes', 'stats']) assert.ok(k in s, k);
});

test('a wish nobody fulfils fades after 4 minutes and a new one arrives 5 s later', () => {
  const g = createNight({ save: save(), players: players(2), rng: seeded(12) });
  const first = g.getState().wishes.map((w) => w.id);
  for (let i = 0; i < Math.round(239 / DT); i++) g.step({});
  assert.deepEqual(g.getState().wishes.map((w) => w.id), first);
  for (let i = 0; i < Math.round(2 / DT); i++) g.step({});
  assert.equal(g.getState().wishes.length, 0);
  assert.ok(g.drainEvents().some((e) => e.type === 'wishGone'));
  for (let i = 0; i < Math.round(5 / DT); i++) g.step({});
  assert.equal(g.getState().wishes.length, 2);
  assert.ok(g.getState().wishes.every((w) => !first.includes(w.id)));
});
