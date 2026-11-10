import {
  FLOWERS, FLOWER_ORDER, STARTER_SEEDS, START_BEDS, MAX_BEDS, START_LANTERNS, MAX_LANTERNS,
  BED_PRICES, SEED_PRICES, LANTERN_PRICE, BIG_CAN_PRICE,
} from './constants.js';

const MAX_COUNT = 1000000;

export function newGarden() {
  return { version: 1, nights: 0, dust: 0, beds: START_BEDS, lanterns: START_LANTERNS, bigCan: false, seeds: [...STARTER_SEEDS], plants: [] };
}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const int = (x, lo, hi, dflt) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.floor(x))) : dflt);

// Turns whatever a browser sent into a valid garden. Never throws.
export function sanitizeGarden(raw) {
  if (!isObj(raw)) return newGarden();
  const g = newGarden();
  g.nights = int(raw.nights, 0, MAX_COUNT, 0);
  g.dust = int(raw.dust, 0, MAX_COUNT, 0);
  g.beds = int(raw.beds, START_BEDS, MAX_BEDS, START_BEDS);
  g.lanterns = int(raw.lanterns, START_LANTERNS, MAX_LANTERNS, START_LANTERNS);
  g.bigCan = raw.bigCan === true;
  const owned = new Set(STARTER_SEEDS);
  if (Array.isArray(raw.seeds)) for (const s of raw.seeds) if (typeof s === 'string' && Object.hasOwn(FLOWERS, s)) owned.add(s);
  g.seeds = FLOWER_ORDER.filter((t) => owned.has(t));
  const used = new Set();
  if (Array.isArray(raw.plants)) {
    for (const p of raw.plants) {
      if (!isObj(p)) continue;
      const { bed, type } = p;
      if (typeof bed !== 'number' || !Number.isInteger(bed) || bed < 0 || bed >= g.beds || used.has(bed)) continue;
      if (typeof type !== 'string' || !owned.has(type)) continue;
      const growth = typeof p.growth === 'number' && Number.isFinite(p.growth) ? Math.min(FLOWERS[type].grow, Math.max(0, p.growth)) : 0;
      used.add(bed);
      g.plants.push({ bed, type, growth });
    }
  }
  return g;
}

const LABELS = {
  bed: 'Nyt bed',
  soelvrose: 'Sølvrose-frø',
  stjernetidsel: 'Stjernetidsel-frø',
  tvillingelilje: 'Tvillingelilje-frø',
  lantern: 'Ekstra lygte',
  bigCan: 'Stor vandkande',
};
const ITEMS = Object.keys(LABELS);

// price, or an error when it can't be bought at all (already have it / maximum reached).
function priceOf(g, item) {
  switch (item) {
    case 'bed': return g.beds >= MAX_BEDS ? { error: `Haven har allerede alle ${MAX_BEDS} bede` } : { price: BED_PRICES[g.beds - START_BEDS] };
    case 'soelvrose': case 'stjernetidsel': case 'tvillingelilje':
      return g.seeds.includes(item) ? { error: 'I har allerede de frø' } : { price: SEED_PRICES[item] };
    case 'lantern': return g.lanterns >= MAX_LANTERNS ? { error: `Haven har allerede alle ${MAX_LANTERNS} lygter` } : { price: LANTERN_PRICE };
    case 'bigCan': return g.bigCan ? { error: 'I har allerede den store vandkande' } : { price: BIG_CAN_PRICE };
    default: return { error: 'Det kan man ikke købe' };
  }
}

export function buy(garden, item) {
  if (typeof item !== 'string' || !ITEMS.includes(item)) return { error: 'Det kan man ikke købe' };
  const p = priceOf(garden, item);
  if (p.error) return p;
  if (garden.dust < p.price) return { error: 'Ikke nok månestøv' };
  const g = { ...garden, seeds: [...garden.seeds], plants: garden.plants.map((x) => ({ ...x })), dust: garden.dust - p.price };
  if (item === 'bed') g.beds++;
  else if (item === 'lantern') g.lanterns++;
  else if (item === 'bigCan') g.bigCan = true;
  else g.seeds = FLOWER_ORDER.filter((t) => t === item || g.seeds.includes(t));
  return { garden: g };
}

export function shopFor(garden) {
  return ITEMS.map((item) => {
    const p = priceOf(garden, item);
    if (p.error) return { item, label: LABELS[item], price: null, ok: false, reason: p.error };
    const ok = garden.dust >= p.price;
    return { item, label: LABELS[item], price: p.price, ok, reason: ok ? '' : 'Ikke nok månestøv' };
  });
}
