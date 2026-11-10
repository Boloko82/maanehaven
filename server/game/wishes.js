import { FLOWERS, WISH_SIZE, WISH_BONUS } from './constants.js';

export function makeWish(seeds, playerCount, rng, id) {
  const [lo, hi] = WISH_SIZE[Math.min(4, Math.max(2, playerCount))];
  const size = lo + Math.floor(rng() * (hi - lo + 1));
  const need = {};
  for (let i = 0; i < size; i++) {
    const type = seeds[Math.floor(rng() * seeds.length)];
    need[type] = (need[type] || 0) + 1;
  }
  return { id, need, have: {} };
}

const wishValue = (w) => Object.entries(w.need).reduce((sum, [t, k]) => sum + FLOWERS[t].value * k, 0);

// Counts the flower toward the first wish that still needs that type.
// Returns { wishId, completed, dust }; a flower no wish needs is a gift worth its value.
export function deliver(wishes, type) {
  const w = wishes.find((x) => (x.have[type] || 0) < (x.need[type] || 0));
  if (!w) return { wishId: null, completed: false, dust: FLOWERS[type].value };
  w.have[type] = (w.have[type] || 0) + 1;
  const done = Object.entries(w.need).every(([t, k]) => (w.have[t] || 0) >= k);
  if (!done) return { wishId: w.id, completed: false, dust: 0 };
  wishes.splice(wishes.indexOf(w), 1);
  return { wishId: w.id, completed: true, dust: wishValue(w) + WISH_BONUS };
}
