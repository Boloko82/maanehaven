// Screens and app flow. Entry module loaded by index.html.
import * as net from './net.js';
import * as input from './input.js';
import * as render from './render.js';
import * as sound from './sound.js';
import { FLOWER_LOOK, MOON_NAMES, MOON_EFFECTS, PHASE_ORDER } from './flowers.js';

// Gardener colours, by join order (index in the room's player list).
export const COLOURS = ['#f2a07b', '#8bbcd9', '#d9c96b', '#a8d5b0'];
const NAME_KEY = 'maanehaven.name';
const SAVE_KEY = 'maanehaven.have';
const ERROR_MS = 4000;
const PENDING_MS = 8000;
const RESULTS_DELAY_MS = 2200;
const SNAP_KEEP = 14;

export const game = {
  you: null, room: null, state: null, result: null, countdownEnd: 0,
  canvas: document.getElementById('game'),
  countdownLeft() { return Math.max(0, Math.ceil((this.countdownEnd - performance.now()) / 1000)); },
};

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

let screen = null, inRoom = false, pending = false, everOpened = false, pendingTimer = null, leftCode = null;
let goUntil = 0, countdownRunning = false, resultsTimer = null, hudKey = '';

const snaps = [];
let snapSeq = 0;
function pushSnap(s, e) {
  snaps.push({ seq: ++snapSeq, at: performance.now(), s, e });
  if (snaps.length > SNAP_KEEP) snaps.shift();
}
const getSnaps = () => snaps;

function playerIndex(id) { return game.room ? game.room.players.findIndex((p) => p.id === id) : -1; }
function colourOf(id, fallback = 0) {
  const i = playerIndex(id);
  return COLOURS[(i >= 0 ? i : fallback) % COLOURS.length];
}

// ---------- the garden kept in this browser ----------

function loadGarden() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw || raw.length > 8000) return null; // a real garden is far smaller; ignore a corrupted one
    const g = JSON.parse(raw);
    return g && typeof g === 'object' && !Array.isArray(g) ? g : null;
  } catch { return null; }
}
function storeGarden(g) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch { /* storage blocked */ }
}
function describeHome() {
  const g = loadGarden();
  $('home-garden').textContent = g && Number.isInteger(g.nights) && g.nights > 0
    ? `Din have har haft ${g.nights} ${g.nights === 1 ? 'nat' : 'nætter'}. Opretter du et rum, fortsætter I i den.`
    : 'Opretter du et rum, starter I en ny have.';
}

// ---------- screens ----------

export function show(name) {
  screen = name;
  for (const s of ['home', 'lobby', 'game', 'results']) $(`screen-${s}`).hidden = s !== name;
  input.setEnabled(name === 'game');
  if (name === 'home') describeHome();
  if (name === 'game') {
    document.activeElement?.blur?.();
    if (!countdownRunning) { countdownRunning = true; requestAnimationFrame(countdownLoop); }
    if (!render.isRunning()) render.start(game.canvas, getSnaps, game.you, colourOf, () => input.getKeys());
  } else {
    render.stop();
  }
}

function flashError(node, message) {
  node.textContent = message;
  node.hidden = false;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => { node.hidden = true; }, ERROR_MS);
}
function clearError(node) { clearTimeout(node._timer); node.hidden = true; }
const isCreator = () => !!game.room && game.room.creatorId === game.you;

function resetRoom() {
  inRoom = false;
  setPending(false);
  game.room = null; game.state = null; game.result = null;
  snaps.length = 0;
  clearTimeout(resultsTimer); resultsTimer = null;
}

function leaveRoom() {
  net.send('leave');
  leftCode = game.room?.code || null;
  resetRoom();
  show('home');
}

// ---------- home ----------

const nameInput = $('name-input');
const codeInput = $('code-input');
try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch { /* storage blocked */ }
nameInput.addEventListener('input', () => {
  try { localStorage.setItem(NAME_KEY, nameInput.value); } catch { /* storage blocked */ }
});

function updateHomeButtons() {
  const off = net.getStatus() !== 'open' || pending;
  $('create-btn').disabled = off;
  $('join-btn').disabled = off;
}
function setPending(on) {
  pending = on;
  clearTimeout(pendingTimer);
  if (on) pendingTimer = setTimeout(() => { setPending(false); flashError($('home-error'), 'Serveren svarede ikke. Prøv igen.'); }, PENDING_MS);
  updateHomeButtons();
}
function request(t, data) {
  if (pending) return;
  clearError($('home-error'));
  if (!net.send(t, data)) { flashError($('home-error'), 'Ikke forbundet til serveren endnu.'); return; }
  setPending(true);
}

$('create-btn').addEventListener('click', () => request('create', { name: nameInput.value, garden: loadGarden() }));
function join() {
  const code = codeInput.value.trim();
  if (!code) { flashError($('home-error'), 'Skriv en rumkode først.'); codeInput.focus(); return; }
  if (code.toUpperCase().replace(/[^A-Z]/g, '') === leftCode) leftCode = null;
  request('join', { name: nameInput.value, code });
}
$('join-btn').addEventListener('click', join);
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

// ---------- lobby ----------

function fact(label, value) {
  const d = el('div');
  d.append(el('dt', null, label), el('dd', null, value));
  return d;
}

function renderLobby() {
  const room = game.room;
  const creator = isCreator();
  const g = room.garden;

  $('lobby-code').textContent = room.code;
  const notice = $('lobby-notice');
  notice.hidden = !room.notice;
  notice.textContent = room.notice || '';

  $('player-count').textContent = `${room.players.length} / 4`;
  const list = $('player-list');
  list.replaceChildren();
  room.players.forEach((p, i) => {
    const li = el('li', 'player');
    const dot = el('span', 'dot');
    dot.style.background = COLOURS[i % COLOURS.length];
    li.append(dot, el('span', 'player-name', p.name));
    if (p.id === game.you) li.append(el('span', 'tag tag-you', 'dig'));
    if (p.id === room.creatorId) li.append(el('span', 'tag', 'opretter'));
    list.append(li);
  });

  const moon = PHASE_ORDER[g.nights % PHASE_ORDER.length];
  $('garden-facts').replaceChildren(
    fact('Næste nat', `Nat ${g.nights + 1}`),
    fact('Månen', `${MOON_NAMES[moon]}: ${MOON_EFFECTS[moon]}`),
    fact('Månestøv', String(g.dust)),
    fact('Bede', `${g.beds} / 12`),
    fact('Lygter', `${g.lanterns} / 4`),
    fact('Vandkande', g.bigCan ? 'Stor (6 vandinger)' : 'Lille (3 vandinger)'),
    fact('Frø', g.seeds.map((s) => FLOWER_LOOK[s]?.name || s).join(', ')),
    fact('Planter i jorden', String(g.plants.length)),
  );

  const shop = $('shop');
  shop.replaceChildren();
  for (const item of room.shop || []) {
    const btn = el('button', 'shop-item');
    btn.type = 'button';
    btn.disabled = !creator || !item.ok;
    btn.append(el('span', 'shop-label', item.label));
    btn.append(el('span', 'shop-price', item.price == null ? item.reason : `${item.price} månestøv${item.ok ? '' : ' (for lidt støv)'}`));
    btn.addEventListener('click', () => net.send('buy', { item: item.item }));
    shop.append(btn);
  }
  $('shop-hint').textContent = creator ? '' : 'Den, der oprettede rummet, køber til haven.';

  const enough = room.players.length >= 2;
  const start = $('start-btn');
  start.hidden = !creator;
  start.disabled = !enough;
  start.textContent = `Start nat ${g.nights + 1}`;
  const host = room.players.find((p) => p.id === room.creatorId);
  $('wait-text').textContent = !enough ? 'Venter på flere havenisser. I skal være mindst 2.'
    : creator ? '' : `Venter på, at ${host ? host.name : 'opretteren'} starter…`;
}

$('start-btn').addEventListener('click', () => net.send('start'));
$('lobby-leave-btn').addEventListener('click', leaveRoom);

// ---------- game ----------

function renderHud(s) {
  const left = Math.max(0, Math.ceil((s.nightLength - s.time) / 60));
  const key = `${s.stats.wishes}|${s.stats.dust}|${left}|${s.moon}`;
  if (key === hudKey) return;
  hudKey = key;
  $('hud-info').replaceChildren(
    el('span', 'hud-item', MOON_NAMES[s.moon] || ''),
    el('span', 'hud-item', `Ønsker opfyldt: ${s.stats.wishes}`),
    el('span', 'hud-item', `Månestøv i nat: ${s.stats.dust}`),
    el('span', 'hud-item hud-soft', left > 1 ? `Cirka ${left} min til daggry` : 'Snart daggry'),
  );
}

const muteBtn = $('mute-btn');
function showMute(muted) { muteBtn.textContent = muted ? 'Lyd fra' : 'Lyd til'; muteBtn.setAttribute('aria-pressed', String(muted)); }
showMute(sound.isMuted());
sound.onMuteChange(showMute);
muteBtn.addEventListener('click', () => { sound.setMuted(!sound.isMuted()); muteBtn.blur(); });
window.addEventListener('keydown', (e) => {
  if (screen === 'game' && e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey) sound.setMuted(!sound.isMuted());
});

function countdownLoop() {
  const cd = $('countdown');
  if (screen !== 'game') { cd.hidden = true; countdownRunning = false; return; }
  let text = '';
  if (game.room?.phase === 'countdown') text = String(Math.max(1, game.countdownLeft()));
  else if (performance.now() < goUntil) text = 'Natten begynder';
  cd.hidden = !text;
  cd.style.fontSize = text.length > 2 ? 'clamp(2rem, 7vw, 4.5rem)' : '';
  if (cd.textContent !== text) cd.textContent = text;
  requestAnimationFrame(countdownLoop);
}
$('game-leave-btn').addEventListener('click', leaveRoom);

// ---------- results ----------

function renderResults() {
  const r = game.result;
  const creator = isCreator();
  if (r) {
    $('result-detail').textContent = `I opfyldte ${r.wishes} ${r.wishes === 1 ? 'ønske' : 'ønsker'}, afleverede ${r.flowers} ${r.flowers === 1 ? 'blomst' : 'blomster'} og fik ${r.dust} månestøv.`;
    $('result-total').textContent = `Haven har nu ${r.save?.dust ?? '?'} månestøv. Brug det i lobbyen.`;
  } else {
    $('result-detail').textContent = 'Natten er slut.';
    $('result-total').textContent = '';
  }
  $('again-btn').hidden = !creator;
  $('results-wait').textContent = creator ? '' : 'Venter på, at opretteren vælger…';
}
$('again-btn').addEventListener('click', () => net.send('again'));
$('back-lobby-btn').addEventListener('click', () => net.send('lobby'));
$('results-leave-btn').addEventListener('click', leaveRoom);

// ---------- server messages ----------

net.on('room', (msg) => {
  if (!inRoom && (!pending || msg.code === leftCode)) {
    if (!pending && msg.code !== leftCode) { net.send('leave'); leftCode = msg.code; }
    return;
  }
  const prevPhase = inRoom ? game.room?.phase : null;
  const prevNotice = inRoom ? game.room?.notice : null;
  inRoom = true;
  leftCode = null;
  setPending(false);
  game.room = msg;
  game.you = msg.you;

  if (msg.phase === 'countdown' && prevPhase !== 'countdown') {
    game.countdownEnd = performance.now() + msg.countdown * 1000;
    game.state = null; game.result = null;
    snaps.length = 0; hudKey = '';
    $('hud-info').replaceChildren();
  }
  if (msg.phase !== 'results') { clearTimeout(resultsTimer); resultsTimer = null; }
  if (msg.phase === 'playing' && prevPhase !== 'playing') {
    goUntil = performance.now() + 1200;
    net.send('keys', { keys: input.getKeys() });
  }
  if ((msg.phase === 'countdown' || msg.phase === 'playing') && msg.notice && msg.notice !== prevNotice) render.notify(msg.notice);

  if (msg.phase === 'lobby') { game.state = null; renderLobby(); show('lobby'); }
  else if (msg.phase === 'countdown' || msg.phase === 'playing') { if (screen !== 'game') show('game'); }
  else if (msg.phase === 'results') {
    if (screen === 'results') renderResults();
    else if (screen !== 'game') showResults();
    else if (!resultsTimer) resultsTimer = setTimeout(showResults, RESULTS_DELAY_MS);
  }
});

function showResults() { resultsTimer = null; renderResults(); show('results'); }

const validState = (s) => s && typeof s === 'object' && Array.isArray(s.players) && Array.isArray(s.beds) && Array.isArray(s.wishes);

net.on('state', (msg) => {
  if (!inRoom || !validState(msg.s)) return;
  game.state = msg.s;
  renderHud(msg.s);
  pushSnap(msg.s, Array.isArray(msg.e) ? msg.e : []);
});

net.on('result', (msg) => {
  if (!inRoom) return;
  game.result = msg;
  if (validState(msg.s)) { game.state = msg.s; pushSnap(msg.s, []); renderHud(msg.s); }
  if (msg.save && typeof msg.save === 'object') storeGarden(msg.save);
  if (screen === 'results') renderResults();
});

net.on('error', (msg) => {
  const message = typeof msg.message === 'string' ? msg.message : 'Noget gik galt.';
  if (pending || !inRoom) { setPending(false); flashError($('home-error'), message); }
  else if (screen === 'results') flashError($('results-error'), message);
  else flashError($('lobby-error'), message);
});

// ---------- connection ----------

const overlay = $('conn-overlay');
net.onStatus((status) => {
  updateHomeButtons();
  $('home-status').textContent = status === 'connecting' ? 'Forbinder…' : '';
  if (status === 'open') { everOpened = true; overlay.hidden = true; }
  else if (status === 'waking') {
    $('conn-text').textContent = 'Vækker serveren…';
    $('conn-spinner').hidden = false; $('conn-home-btn').hidden = true; overlay.hidden = false;
  } else if (status === 'lost') {
    resetRoom();
    input.setEnabled(false);
    $('conn-text').textContent = everOpened ? 'Forbindelsen til serveren blev afbrudt.' : 'Kunne ikke nå serveren. Prøv igen om lidt.';
    $('conn-spinner').hidden = true; $('conn-home-btn').hidden = false; overlay.hidden = false;
  }
});
$('conn-home-btn').addEventListener('click', () => { overlay.hidden = true; show('home'); net.connect(); });

input.start((keys) => net.send('keys', { keys }));
show('home');
net.connect();
