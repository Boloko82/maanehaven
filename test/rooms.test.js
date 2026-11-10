import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../server/rooms.js';
import { newGarden } from '../server/game/garden.js';

function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const P = (id, name = id) => ({ id, name });
function roomWith(n, garden) {
  const rm = new RoomManager({ rng: seeded(3) });
  const room = rm.createRoom(P('a', 'Ann'), garden);
  for (let i = 1; i < n; i++) rm.joinRoom(room.code, P('abcd'[i], ['Ann', 'Bo', 'Carl', 'Dita'][i]));
  return { rm, room };
}
const startAndRun = (rm, room) => { assert.deepEqual(rm.startMatch('a'), { ok: true }); for (let i = 0; i < 90; i++) rm.tick(); assert.equal(room.phase, 'playing'); };
const endNight = (rm, room) => { room.game.ns.time = 720; rm.tick(); };

test('creating a room with a corrupted garden gives a valid one', () => {
  for (const g of [undefined, 'x', { dust: 'lots', beds: 400, seeds: ['roser'], plants: [{ bed: 50 }] }]) {
    const { room } = roomWith(1, g);
    assert.equal(room.garden.beds, typeof g === 'object' ? 12 : 6); // too many beds are clamped to the maximum
    assert.equal(room.garden.dust, 0);
    assert.deepEqual(room.garden.seeds, ['maaneklokke', 'natviol']);
    assert.deepEqual(room.garden.plants, []);
  }
  const { room } = roomWith(1, { ...newGarden(), dust: 30, beds: 8 });
  assert.equal(room.garden.dust, 30); assert.equal(room.garden.beds, 8);
});

test('buy: creator only, in the lobby only, with enough dust; nothing changes otherwise', () => {
  const { rm, room } = roomWith(2, { ...newGarden(), dust: 24 });
  assert.equal(rm.buy('b', 'bed').error, 'Kun den, der oprettede rummet, kan gøre det');
  assert.equal(rm.buy('a', 'soelvrose').error, undefined);
  assert.equal(room.garden.dust, 4);
  assert.equal(rm.buy('a', 'bed').error, 'Ikke nok månestøv');
  assert.equal(rm.buy('a', '__proto__').error, 'Det kan man ikke købe');
  startAndRun(rm, room);
  assert.equal(rm.buy('a', 'bed').error, 'Natten er allerede i gang');
  assert.equal(room.garden.dust, 4);
});

test('start needs 2 players and the creator', () => {
  const { rm } = roomWith(1);
  assert.equal(rm.startMatch('a').error, 'I skal være mindst 2 spillere');
  const r = roomWith(2);
  assert.ok(r.rm.startMatch('b').error);
  assert.deepEqual(r.rm.startMatch('a'), { ok: true });
});

test('keys reach the game during a night', () => {
  const { rm, room } = roomWith(2);
  startAndRun(rm, room);
  const x0 = room.game.getState().players[0].x;
  rm.setKeys('a', { right: true, junk: 1 });
  for (let i = 0; i < 10; i++) rm.tick();
  assert.ok(room.game.getState().players[0].x > x0);
});

test('a player leaving mid-night: the night goes on with a notice and their item on the ground', () => {
  const { rm, room } = roomWith(3);
  startAndRun(rm, room);
  room.game.ns.items = [];
  const c = room.game.players.find((p) => p.id === 'c'); c.carry = { kind: 'can', water: 1 };
  rm.leave('c');
  assert.equal(room.phase, 'playing');
  assert.equal(room.notice, 'Carl forlod natten');
  assert.equal(room.game.ns.items.length, 1);
});

test('dawn updates the room garden; again starts a new night with it', () => {
  const { rm, room } = roomWith(2, { ...newGarden(), nights: 1 });
  startAndRun(rm, room);
  room.game.ns.beds[0].plant = { type: 'natviol', growth: 9 };
  endNight(rm, room);
  assert.equal(room.phase, 'results');
  assert.equal(room.garden.nights, 2);
  assert.deepEqual(room.garden.plants, [{ bed: 0, type: 'natviol', growth: 9 }]);
  assert.ok(rm.again('b').error);
  assert.deepEqual(rm.again('a'), { ok: true });
  assert.equal(room.phase, 'countdown');
  assert.equal(room.game.getState().moon, 'fuldmaane');
  assert.deepEqual(room.game.getState().beds[0].plant, { type: 'natviol', growth: 9 });
});

test('back to lobby from results by anyone; repeated clicks are fine', () => {
  const { rm, room } = roomWith(2);
  startAndRun(rm, room); endNight(rm, room);
  assert.deepEqual(rm.backToLobby('b'), { ok: true });
  assert.equal(room.phase, 'lobby');
  assert.deepEqual(rm.backToLobby('a'), { ok: true });
});

test('Danish join errors', () => {
  const { rm, room } = roomWith(4);
  assert.equal(rm.joinRoom('QQQQ', P('z')).error, 'Der er intet rum med den kode');
  assert.equal(rm.joinRoom(room.code, P('z')).error, 'Rummet er fuldt');
  const r2 = roomWith(2); r2.rm.startMatch('a');
  assert.equal(r2.rm.joinRoom(r2.room.code, P('z')).error, 'Rummet er i gang med en nat');
});
