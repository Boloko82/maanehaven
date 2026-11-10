# Månehaven Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calm, Danish-language browser co-op garden game for 2–4 online players whose garden persists between nights.

**Architecture:** Same shape as Stormvagt (`../Stormvagt`): one Node.js program serves the page and runs the authoritative game over WebSocket; browsers send key states and draw interpolated state. Rules are pure modules. Rooms, server, net and input code are copied from Stormvagt and adapted. The garden save travels: creator's browser → server on room creation → server sanitises → night → updated save in the result → every participant's browser.

**Tech Stack:** Node.js 20+ (ES modules), `ws`, `node:test`, plain browser JavaScript, Canvas 2D, Web Audio. No build step.

**Spec:** `docs/superpowers/specs/2026-11-10-maanehaven-design.md` (Danish; the authority).

## Global Constraints

- Project folder `C:\Users\tomal\Documents\Jette\Projects\Månehaven`. Reference (read only): `..\Stormvagt`.
- Only runtime dependency `ws`; no asset files; art and sound generated in code and original; all player-facing text Danish.
- 2–4 players, start needs 2; rooms hold 4; 4-letter codes.
- Controls: WASD/arrows move freely in 2D; Space picks up, plants, harvests, delivers, drops; held Space waters, fills the can, lights a lantern. One carried item: `{kind:'seed', type}`, `{kind:'can', water}`, `{kind:'flower', type}`.
- World 960×540; layout shared in `public/layout.js`, re-exported by the server.
- Server ticks at 30 Hz with catch-up (Stormvagt's loop), state ~20 Hz, client interpolation ~150 ms.
- Spec values verbatim: night 720 s; flowers måneklokke 40 s/1, natviol 50 s/1, sølvrose 80 s/2, stjernetidsel 100 s/3, tvillingelilje 90 s/4 (grow seconds while moist / dust); start seeds måneklokke + natviol; 6 beds, max 12; moisture 0–100, watering (1 s hold) sets 100 and uses one water, drains to 0 in 30 s; growth only while moist; can 3 waters (big 6), filled by 1 s hold at the well; twin lily needs two players pressing at the same empty bed within 1 s; moths 1 per 30 s (2p), 24 s (3p), 20 s (4p), eat a bloom after 15 s, flee from a lit lantern's light or a touching player; lantern lights by 1 s hold, lasts 60 s, radius 140; 2 lanterns at start, max 4; wishes 2 at a time (2p) or 3 (3–4p), size 2–4 (3–5 at 4p), complete = sum of values + 3, next wish after 5 s, unwanted delivery = gift worth the flower's value; phases cycle nymåne (+50 % moths), tiltagende (none), fuldmåne (+30 % growth), aftagende (moisture lasts 50 % longer); prices: beds 7–12 cost 6, 8, 10, 12, 14, 16; sølvrose 10, stjernetidsel 16, tvillingelilje 24; lantern 3 and 4 cost 12 each; big can 15.
- Save shape: `{ version: 1, nights, dust, beds, lanterns, bigCan, seeds: [types], plants: [{ bed, type, growth }] }`, stored in `localStorage` key `maanehaven.have`.
- No git: no commit steps.

## Review Focus

1. A hostile or corrupted save from the browser (wrong types, huge numbers, unknown flowers, plants on beds that don't exist, duplicate beds): sanitised to a valid garden, never crashes the server or lets a night start broken.
2. A player leaving mid-night with the only watering can or a flower: the item lands where they stood and stays usable.
3. Two players harvesting, watering or delivering at once: each bloom, water and wish slot is used once.
4. Moths when no bloom exists, or every bloom is lit: they wander and never get stuck; they never eat a flower inside a lit lantern's light.
5. Shop abuse: buying beyond the maximum, without enough dust, by a non-creator, or during a night: refused, nothing changes.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `.gitignore`, `render.yaml`, `README.md`, `start-spil.bat` | Setup, deploy, Danish instructions |
| `public/layout.js` | World size, bed, well, seed box, lantern, altar positions |
| `server/game/constants.js` | Every tuning number and the flower table |
| `server/game/world.js` | Re-export of the layout |
| `server/game/players.js` | 2D movement, reach |
| `server/game/garden.js` | New garden, sanitise save, shop |
| `server/game/beds.js` | Beds, planting, twin planting, moisture, growth, harvest, can, well |
| `server/game/moths.js` | Moth spawning, steering, eating, fleeing; lanterns |
| `server/game/wishes.js` | Wish generation, delivery, dust |
| `server/game/index.js` | `createNight` and `getSave` |
| `server/rooms.js`, `server/index.js` | Rooms with garden and shop; server |
| `public/*` | Screens, shop, save storage, renderer, sound |
| `test/*.test.js` | Tests |

---

### Task 1: Setup, layout and players

**Files:** Create `package.json` (name `maanehaven`), `.gitignore`, `public/layout.js`, `server/game/world.js`, `server/game/constants.js`, `server/game/players.js`. Test `test/players.test.js`.

**Interfaces — Produces:**
- `LAYOUT = { width: 960, height: 540, bounds:{left,top,right,bottom}, beds:[{id:0..11, x, y}], well:{x,y}, seedBoxes:[{type, x, y}] (5, in type order), lanterns:[{id:0..3, x, y}], altar:{x,y}, spawn:[{x,y}]×4 }`.
- `FLOWERS = { maaneklokke:{grow:40, value:1}, natviol:{grow:50,value:1}, soelvrose:{grow:80,value:2}, stjernetidsel:{grow:100,value:3}, tvillingelilje:{grow:90,value:4,twin:true} }`, `FLOWER_ORDER` in that order.
- `makePlayer({id,name,x,y}) -> {id,name,x,y,facing:{x,y},carry:null,hold:null,prevAct:false}`; `stepPlayer(p, keys, dt)` (diagonals normalised, clamped to bounds); `targetsInReach(p, things) -> [{type,id,...}]` nearest first within `REACH`.

- [ ] **Step 1: Failing tests:** diagonal speed equals straight speed; clamped at bounds; targetsInReach orders by distance and excludes beyond `REACH`; the 12 beds, well, 5 seed boxes, 4 lanterns and altar are at least `REACH * 1.5` apart.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 2: Beds, can and well

**Files:** Create `server/game/beds.js`. Test `test/beds.test.js`.

**Interfaces — Produces:** `makeBeds(save) -> [{id, open, plant: null|{type, growth}, moisture}]` (`open` for ids < save.beds; plants from the save); `stepBeds(beds, dt, {growthMul, drainMul}, events)`; `bloomed(bed)`; can is an item `{id:'can', kind:'can', water, x, y}` or carried; `useAt(world, p, target, pressed, held, dt, events, now)` handles seed boxes (press: take a seed of that type), plant (press with seed at empty open bed), twin plant (press with tvillingelilje seed: registers `pendingTwin[bed]={playerId, at}`; a second player's press within 1 s plants and consumes both seeds), water (hold 1 s with can water > 0 at an open bed with a plant → moisture 100, water − 1), fill (hold 1 s at the well → water = capacity), harvest (press with empty hands at a bloomed bed → carry flower, bed empty), pick up / drop items (press).

- [ ] **Step 1: Failing tests** with spec values: planting consumes the seed; a plant grows only while moist; måneklokke blooms after 40 s of moisture (re-watered every 30 s) and not after 40 s dry; moisture hits 0 after 30 s (45 s with drainMul 1.5); watering takes 30 ticks and uses one water; can capacity 3 (6 big); a single twin press plants nothing and keeps the seed; two twin presses within 30 ticks plant and consume both; 31+ ticks apart plants nothing; two players harvesting one bloom: one flower; closed beds (id ≥ save.beds) can't be planted; drop and pick-up of the can.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 3: Moths and lanterns

**Files:** Create `server/game/moths.js`. Test `test/moths.test.js`.

**Interfaces — Produces:** `makeLanterns(count)` → `[{id, litFor: 0}]`; lantern lighting is a held-Space action at a lantern (1 s → `litFor = 60`) wired through `useAt`'s target types; `stepMoths(state, dt, rng, events)` spawns at the configured interval scaled by players and phase, steers to the nearest bloom outside any lit lantern's radius 140 (else wanders inside bounds), sits for 15 s then wilts the bloom (bed empty, event `wilt`), flees off-screen when a player is within `MOTH_TOUCH` or it is inside a lit lantern's light (event `shoo`).

- [ ] **Step 1: Failing tests:** spawn interval 30/24/20 s for 2/3/4 players and ×1/1.5 for nymåne; a moth on an unlit bloom wilts it after 15 s; a moth whose bloom lies in a lit lantern's light never eats it; a player touching a moth makes it flee; lanterns burn out after 60 s; with no blooms moths wander and stay inside bounds for 2 minutes.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 4: Wishes, the night and the save

**Files:** Create `server/game/wishes.js`, `server/game/index.js`. Test `test/night.test.js`.

**Interfaces — Produces:** `makeWish(seeds, playerCount, rng) -> {id, need:{type:count}, have:{type:count}}`; `deliver(wishes, type) -> {wishId|null, completed:boolean, dust}`; `createNight({ save, players, rng }) -> game` with `step(inputs)`, `getState()`, `drainEvents()`, `isOver()` (time ≥ 720), `getResult() -> {wishes, flowers, dust, save}`, `removePlayer(id)`. `phase` from `save.nights % 4` → `['nymaane','tiltagende','fuldmaane','aftagende']`. The result's `save` has `nights + 1`, `dust + earned`, plants from beds with their growth (no moisture).

- [ ] **Step 1: Failing tests:** 2 wishes at 2p, 3 at 3–4p; sizes 2–4 (3–5 at 4p) only of owned seeds; tvillingelilje only when owned; delivering completes a wish and gives sum + 3, the next wish after 5 s; an unwanted flower gives its value as a gift; two deliveries for the last slot complete it once and the second becomes a gift; night ends at 720 s; fuldmåne grows 30 % faster; the save after the night keeps unharvested plants and adds dust; `removePlayer` drops the carried can where they stood; same seed and inputs give the same state; `getState()` is JSON-safe.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 5: Garden save and shop

**Files:** Create `server/game/garden.js`. Test `test/garden.test.js`.

**Interfaces — Produces:** `newGarden()`; `sanitizeGarden(raw) -> garden` (never throws; garbage → newGarden; clamps numbers to ranges; keeps only known seeds with the two starters always present; drops plants on closed or duplicate beds or of unknown/unowned types; growth clamped to [0, grow]); `SHOP` item list with Danish labels; `buy(garden, item) -> {garden} | {error}` with prices from the spec and Danish errors ("Ikke nok månestøv", "Haven har allerede det største antal").

- [ ] **Step 1: Failing tests:** each Review Focus 1 case (strings for numbers, 1e309, negative dust, unknown seed "roser", plant on bed 11 with 6 beds, duplicate bed ids, `__proto__` keys, arrays, null); every shop item's price and maximum; insufficient dust refused without change.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 6: Rooms and server

**Files:** Create `server/rooms.js` (adapt Stormvagt's), `server/index.js` (copy Stormvagt's, adapt messages). Tests `test/rooms.test.js`, `test/server.test.js` (adapt).

**Interfaces:** `createRoom(player, rawGarden)`; `buy(playerId, item)` (creator, lobby only); `startMatch`; `again(playerId)` (creator, from results: new night with the updated garden); `backToLobby`; `leave` (mid-night: `removePlayer`, notice "`<navn>` forlod natten"). Room keeps `garden`; on night end `room.garden = result.save`. Protocol: `create{name, garden}`, `join`, `buy{item}`, `start`, `again`, `lobby`, `keys`, `leave`; `room` messages include `garden` and `shop`; `result` includes `save`.

- [ ] **Step 1: Failing tests:** creating with a corrupted garden gives a valid one; buy rules (Review Focus 5); start needs 2; a leave mid-night keeps the night; the night end updates `room.garden` and `again` starts a night with it; Danish errors; server flow, keys move a gardener, malformed messages, static files, health, game time keeps pace with the clock.
- [ ] **Step 2–4:** fail, implement, pass.

### Task 7: Screens, shop and save storage

**Files:** Create `public/index.html`, `style.css`, `net.js`, `input.js` (copies), `ui.js` (adapt Stormvagt's). Danish copy throughout.

- [ ] **Step 1:** Home, lobby (code, players, "Jeres have": dust, beds, seeds, lanterns, can; shop buttons with prices, disabled with a reason when unaffordable or maxed, enabled only for the creator; "Sådan spiller I"; Start), results (wishes, flowers, dust, "Ny nat" for the creator, "Tilbage til lobbyen"), in-game notice toasts, waking/lost overlays.
- [ ] **Step 2:** Save storage: read `maanehaven.have` (try/catch; garbage → nothing sent, server makes a new garden) and send it with `create`; on `result` store `save`.
- [ ] **Step 3: Verify in the in-app browser** with two tabs: create, join, buy refused with too little dust, start, leave notice, corrupted save still starts a garden.

### Task 8: Watercolour renderer and sound

**Files:** Create `public/render.js`, `public/sound.js`.

- [ ] **Step 1:** Fit 960×540 to the canvas, smooth scaling, 150 ms interpolation, pre-rendered watercolour background (night washes, ground, paths, well, shed, altar) redrawn only on resize.
- [ ] **Step 2:** Beds with soil darkening by moisture, plants per stage and type in distinct colours, blooms; gardeners as round ink-outlined figures in four colours carrying their item; the can's water level; lanterns with glow and burn-down; moths fluttering; the moon crossing the sky with its phase; wish cards at the top with flower icons and counts; hold-progress ring; name tags and Danish toasts.
- [ ] **Step 3:** Soft sounds: plant, water, fill, harvest, deliver, wish complete, moth arrives, shoo, wilt, lantern, dawn; mute (M) remembered.
- [ ] **Step 4: Verify** in the in-app browser with two tabs: screenshots of a night with blooms, moths and a lit lantern; no console errors.

### Task 9: Instructions, playthrough and tuning

**Files:** Create `README.md`, `start-spil.bat`, `render.yaml` (service `maanehaven`). Modify `constants.js`.

- [ ] **Step 1:** Bots in the controller's scratchpad (not the project): a simulator against the rules and a network runner against the real server.
- [ ] **Step 2:** Simulate several consecutive nights at 2, 3 and 4 players with the save carried over; tune so a typical night completes 3–6 wishes, gives enough dust to buy something most nights, and moths wilt some but not most blooms. Record the numbers.
- [ ] **Step 3:** At least one night per player count through the real server; one night seen in the browser with screenshots.
- [ ] **Step 4:** `npm test` passes; nothing left running; report honestly.
