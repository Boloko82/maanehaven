import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepPrediction } from '../public/predict.js';
import { LAYOUT } from '../public/layout.js';

const DT = 1 / 60;
const keys = (k = {}) => ({ up: false, down: false, left: false, right: false, act: false, ...k });

test('your gardener moves at once, at walking speed, before the server says so', () => {
  let me = { x: 400, y: 300 };
  for (let i = 0; i < 30; i++) me = stepPrediction(me, keys({ right: true }), DT, { x: 400, y: 300 });
  assert.ok(Math.abs(me.x - 490) < 1, `x=${me.x}`); // 180 per second for half a second
  assert.equal(me.y, 300);
});

test('diagonal speed matches straight speed and the garden edge stops you', () => {
  let me = { x: 400, y: 300 };
  for (let i = 0; i < 60; i++) me = stepPrediction(me, keys({ right: true, down: true }), DT, me);
  assert.ok(Math.abs(Math.hypot(me.x - 400, me.y - 300) - 180) < 1e-6);
  assert.ok(Math.abs((me.x - 400) - (me.y - 300)) < 1e-9);
  let edge = { x: LAYOUT.bounds.left + 5, y: 300 };
  edge = stepPrediction(edge, keys({ left: true }), 1, edge);
  assert.equal(edge.x, LAYOUT.bounds.left);
});

test('while walking, the server lagging a little behind does not pull you back', () => {
  let me = { x: 500, y: 300 };
  for (let i = 0; i < 30; i++) me = stepPrediction(me, keys({ right: true }), DT, { x: me.x - 40, y: 300 });
  assert.ok(Math.abs(me.x - 590) < 1, `x=${me.x}`);
});

test('when you stand still you glide to where the server has you', () => {
  let me = { x: 520, y: 300 };
  for (let i = 0; i < 30; i++) me = stepPrediction(me, keys(), DT, { x: 500, y: 310 });
  assert.ok(Math.hypot(me.x - 500, me.y - 310) < 1, `${me.x},${me.y}`);
});

test('a big disagreement while walking is corrected quickly', () => {
  let me = { x: 800, y: 300 };
  for (let i = 0; i < 30; i++) me = stepPrediction(me, keys({ right: true }), DT, { x: 400, y: 300 });
  assert.ok(me.x < 700, `x=${me.x}`);
});
