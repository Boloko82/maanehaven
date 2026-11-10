// All tuning values for Månehaven. Units: world units (960x540), seconds.
import { LAYOUT } from '../../public/layout.js';
export const DT = 1 / 30;
export const NIGHT_LENGTH = 720;            // 12 minutes (spec)

// Gardeners
export const WALK_SPEED = LAYOUT.walkSpeed;
export const REACH = 40;                    // how close to a bed, box, well, lantern, altar or item you must be

// Flowers (spec): grow = seconds of growth while moist; value = dust
export const FLOWERS = Object.freeze({
  maaneklokke: { grow: 40, value: 1, name: 'Måneklokke' },
  natviol: { grow: 50, value: 1, name: 'Natviol' },
  soelvrose: { grow: 80, value: 2, name: 'Sølvrose' },
  stjernetidsel: { grow: 100, value: 3, name: 'Stjernetidsel' },
  tvillingelilje: { grow: 90, value: 4, name: 'Tvillingelilje', twin: true },
});
export const FLOWER_ORDER = ['maaneklokke', 'natviol', 'soelvrose', 'stjernetidsel', 'tvillingelilje'];
export const STARTER_SEEDS = ['maaneklokke', 'natviol'];

// Beds, water and the can (spec)
export const START_BEDS = 6;
export const MAX_BEDS = 12;
export const MOISTURE_DRAIN_TIME = 30;      // seconds from 100 to 0
export const WATER_TIME = 1;
export const FILL_TIME = 1;
export const CAN_SMALL = 3;
export const CAN_BIG = 6;
export const TWIN_WINDOW = 1;               // seconds between the two twin presses

// Lanterns (spec)
export const START_LANTERNS = 2;
export const MAX_LANTERNS = 4;
export const LIGHT_TIME = 1;
export const LANTERN_BURN = 60;
export const LANTERN_RADIUS = 140;

// Moths (spec intervals; speeds are tuning)
export const MOTH_INTERVAL = { 2: 30, 3: 24, 4: 20 };
export const MOTH_EAT_TIME = 15;
export const MOTH_SPEED = 55;
export const MOTH_FLEE_SPEED = 160;
export const MOTH_TOUCH = 30;               // a gardener this close scares a moth away
export const FIRST_MOTH_AT = 40;

// Wishes (spec)
export const WISHES_AT_ONCE = { 2: 2, 3: 3, 4: 3 };
export const WISH_SIZE = { 2: [2, 4], 3: [2, 4], 4: [3, 5] };
export const WISH_BONUS = 3;
export const NEXT_WISH_DELAY = 5;
export const WISH_LIFETIME = 240;          // a wish nobody fulfils fades after 4 minutes

// Moon phases (spec): one per night, in this order
export const PHASES = ['nymaane', 'tiltagende', 'fuldmaane', 'aftagende'];
export const PHASE_EFFECTS = Object.freeze({
  nymaane: { mothMul: 1.5, growthMul: 1, drainMul: 1 },
  tiltagende: { mothMul: 1, growthMul: 1, drainMul: 1 },
  fuldmaane: { mothMul: 1, growthMul: 1.3, drainMul: 1 },
  aftagende: { mothMul: 1, growthMul: 1, drainMul: 1.5 },
});

// Shop (spec prices)
export const BED_PRICES = [12, 16, 20, 24, 28, 32];   // beds 7-12 (spec prices doubled after simulation)
export const SEED_PRICES = { soelvrose: 20, stjernetidsel: 32, tvillingelilje: 48 };
export const LANTERN_PRICE = 24;
export const BIG_CAN_PRICE = 30;
