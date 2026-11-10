import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGarden, sanitizeGarden, buy, shopFor } from '../server/game/garden.js';

test('a new garden: 6 beds, 2 lanterns, small can, two starter seeds, no dust', () => {
  assert.deepEqual(newGarden(), { version: 1, nights: 0, dust: 0, beds: 6, lanterns: 2, bigCan: false, seeds: ['maaneklokke', 'natviol'], plants: [] });
});

test('garbage becomes a new garden', () => {
  for (const raw of [null, undefined, 5, 'have', [], [1, 2], true]) assert.deepEqual(sanitizeGarden(raw), newGarden(), String(raw));
});

test('numbers are cleaned and clamped', () => {
  const g = sanitizeGarden({ nights: '7', dust: 1e309, beds: 99, lanterns: -3, bigCan: 'yes' });
  assert.equal(g.nights, 0); assert.equal(g.dust, 0);
  assert.equal(g.beds, 12); assert.equal(g.lanterns, 2); assert.equal(g.bigCan, false);
  const h = sanitizeGarden({ nights: 4.7, dust: -5, beds: 8.9, lanterns: 3, bigCan: true });
  assert.equal(h.nights, 4); assert.equal(h.dust, 0); assert.equal(h.beds, 8); assert.equal(h.lanterns, 3); assert.equal(h.bigCan, true);
  assert.equal(sanitizeGarden({ dust: 1e12 }).dust, 1000000);
});

test('seeds: unknown ones dropped, starters always present, no duplicates, fixed order', () => {
  const g = sanitizeGarden({ seeds: ['roser', 'stjernetidsel', 'stjernetidsel', '__proto__', 5, 'soelvrose'] });
  assert.deepEqual(g.seeds, ['maaneklokke', 'natviol', 'soelvrose', 'stjernetidsel']);
  assert.deepEqual(sanitizeGarden({ seeds: 'all' }).seeds, ['maaneklokke', 'natviol']);
});

test('plants: only on open beds, of owned types, one per bed, growth clamped', () => {
  const g = sanitizeGarden({
    beds: 6, seeds: ['soelvrose'],
    plants: [
      { bed: 0, type: 'natviol', growth: 20 },
      { bed: 0, type: 'maaneklokke', growth: 5 },      // duplicate bed
      { bed: 11, type: 'natviol', growth: 1 },          // closed bed
      { bed: 2, type: 'stjernetidsel', growth: 1 },     // not owned
      { bed: 3, type: 'soelvrose', growth: 999 },       // clamped to 80
      { bed: 4, type: 'natviol', growth: -4 },          // clamped to 0
      { bed: '5', type: 'natviol', growth: 1 },         // bed must be a number
      { bed: 1.5, type: 'natviol', growth: 1 },
      null, 'x', ['bed', 1],
      { bed: 5, type: 'natviol', growth: NaN },
    ],
  });
  assert.deepEqual(g.plants, [
    { bed: 0, type: 'natviol', growth: 20 },
    { bed: 3, type: 'soelvrose', growth: 80 },
    { bed: 4, type: 'natviol', growth: 0 },
    { bed: 5, type: 'natviol', growth: 0 },
  ]);
  assert.deepEqual(sanitizeGarden({ plants: { bed: 1 } }).plants, []);
});

test('a valid save survives unchanged', () => {
  const s = { version: 1, nights: 3, dust: 40, beds: 8, lanterns: 3, bigCan: true, seeds: ['maaneklokke', 'natviol', 'tvillingelilje'], plants: [{ bed: 7, type: 'tvillingelilje', growth: 30 }] };
  assert.deepEqual(sanitizeGarden(JSON.parse(JSON.stringify(s))), s);
});

test('prices and maximums', () => {
  let g = { ...newGarden(), dust: 1000 };
  const spent = [];
  for (let i = 0; i < 6; i++) { const before = g.dust; g = buy(g, 'bed').garden; spent.push(before - g.dust); }
  assert.deepEqual(spent, [12, 16, 20, 24, 28, 32]);
  assert.equal(g.beds, 12);
  assert.equal(buy(g, 'bed').error, 'Haven har allerede alle 12 bede');
  for (const [item, price] of [['soelvrose', 20], ['stjernetidsel', 32], ['tvillingelilje', 48]]) {
    const before = g.dust; g = buy(g, item).garden; assert.equal(before - g.dust, price);
    assert.ok(g.seeds.includes(item));
    assert.equal(buy(g, item).error, 'I har allerede de frø');
  }
  for (let i = 0; i < 2; i++) { const before = g.dust; g = buy(g, 'lantern').garden; assert.equal(before - g.dust, 24); }
  assert.equal(g.lanterns, 4);
  assert.equal(buy(g, 'lantern').error, 'Haven har allerede alle 4 lygter');
  const before = g.dust; g = buy(g, 'bigCan').garden; assert.equal(before - g.dust, 30);
  assert.equal(buy(g, 'bigCan').error, 'I har allerede den store vandkande');
});

test('not enough dust or an unknown item changes nothing', () => {
  const g = { ...newGarden(), dust: 9 };
  assert.equal(buy(g, 'soelvrose').error, 'Ikke nok månestøv');
  assert.equal(g.dust, 9); assert.deepEqual(g.seeds, ['maaneklokke', 'natviol']);
  for (const bad of ['roser', '__proto__', 'constructor', 5, null, ['bed']]) assert.equal(buy(g, bad).error, 'Det kan man ikke købe');
});

test('shopFor lists every item with price and whether it can be bought', () => {
  const list = shopFor({ ...newGarden(), dust: 12 });
  assert.deepEqual(list.map((x) => x.item), ['bed', 'soelvrose', 'stjernetidsel', 'tvillingelilje', 'lantern', 'bigCan']);
  const bed = list.find((x) => x.item === 'bed');
  assert.equal(bed.price, 12); assert.equal(bed.ok, true);
  const tw = list.find((x) => x.item === 'tvillingelilje');
  assert.equal(tw.ok, false); assert.equal(tw.reason, 'Ikke nok månestøv');
  assert.ok(list.every((x) => typeof x.label === 'string' && x.label.length > 0));
});
