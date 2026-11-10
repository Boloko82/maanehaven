import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DT, REACH } from '../server/game/constants.js';
import { WORLD } from '../server/game/world.js';
import { makePlayer, stepPlayer, targetsInReach } from '../server/game/players.js';

const keys = (k = {}) => ({ up: false, down: false, left: false, right: false, act: false, ...k });
const run = (p, k, ticks) => { for (let i = 0; i < ticks; i++) stepPlayer(p, keys(k), DT); };

test('diagonal walking is as fast as straight walking', () => {
  const a = makePlayer({ id: 'a', name: 'A', x: 480, y: 300 });
  const b = makePlayer({ id: 'b', name: 'B', x: 480, y: 300 });
  run(a, { right: true }, 10);
  run(b, { right: true, down: true }, 10);
  const da = Math.hypot(a.x - 480, a.y - 300), db = Math.hypot(b.x - 480, b.y - 300);
  assert.ok(da > 0 && Math.abs(da - db) < 1e-6);
  assert.ok(Math.abs(b.facing.x - b.facing.y) < 1e-9);
});

test('gardeners stay inside the garden bounds', () => {
  const p = makePlayer({ id: 'a', name: 'A', x: 480, y: 300 });
  run(p, { left: true, up: true }, 300);
  assert.equal(p.x, WORLD.bounds.left);
  assert.equal(p.y, WORLD.bounds.top);
  run(p, { right: true, down: true }, 400);
  assert.equal(p.x, WORLD.bounds.right);
  assert.equal(p.y, WORLD.bounds.bottom);
});

test('targetsInReach orders by distance and ignores things out of reach', () => {
  const p = makePlayer({ id: 'a', name: 'A', x: 100, y: 100 });
  const things = [
    { type: 'bed', id: 1, x: 130, y: 100 },
    { type: 'item', id: 'can', x: 110, y: 100 },
    { type: 'well', id: 'well', x: 100 + REACH + 1, y: 100 },
  ];
  assert.deepEqual(targetsInReach(p, things).map((t) => t.id), ['can', 1]);
});

test('stations are far enough apart to tell apart', () => {
  const spots = [
    ...WORLD.beds.map((b) => ['bed' + b.id, b]),
    ['well', WORLD.well], ['altar', WORLD.altar],
    ...WORLD.seedBoxes.map((s) => ['seed-' + s.type, s]),
    ...WORLD.lanterns.map((l) => ['lantern' + l.id, l]),
  ];
  assert.equal(WORLD.beds.length, 12);
  assert.equal(WORLD.seedBoxes.length, 5);
  assert.equal(WORLD.lanterns.length, 4);
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const d = Math.hypot(spots[i][1].x - spots[j][1].x, spots[i][1].y - spots[j][1].y);
      assert.ok(d >= REACH * 1.5, `${spots[i][0]} and ${spots[j][0]} are ${d.toFixed(0)} apart`);
    }
  }
  for (const [name, s] of spots) {
    assert.ok(s.x >= WORLD.bounds.left && s.x <= WORLD.bounds.right && s.y >= WORLD.bounds.top && s.y <= WORLD.bounds.bottom, name);
  }
});
