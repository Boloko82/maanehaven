// Draws the garden in a soft watercolour style. The still background is painted once per
// resize onto its own canvas; everything that moves is drawn on top each frame.
import { LAYOUT } from './layout.js';
import { FLOWER_LOOK } from './flowers.js';
import * as sound from './sound.js';
import { stepPrediction } from './predict.js';

const W = LAYOUT.width, H = LAYOUT.height;
const DELAY = 150;
const SNAP_DIST = 120;
const TOAST_MS = 2800;
const GROW = { maaneklokke: 40, natviol: 50, soelvrose: 80, stjernetidsel: 100, tvillingelilje: 90 };
const LANTERN_RADIUS = 140;
const INK = '#17141f';

let canvas = null, ctx = null, bg = null, raf = 0, ro = null;
let getSnaps = () => [], youId = null, colourOf = () => '#f2a07b';
let lastSeq = 0, toasts = [];
let getKeys = () => ({}), pred = null, lastFrame = 0;
let view = { sc: 1, ox: 0, oy: 0, d: 1 };

export function isRunning() { return !!raf; }
export function notify(text) { toast(text, performance.now()); }

export function start(c, snapsFn, you, colourFn, keysFn = () => ({})) {
  canvas = c; ctx = c.getContext('2d');
  getSnaps = snapsFn; youId = you; colourOf = colourFn; getKeys = keysFn;
  lastSeq = 0; toasts = []; pred = null; lastFrame = 0;
  ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  raf = requestAnimationFrame(frame);
}

export function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  ro?.disconnect(); ro = null;
}

function resize() {
  const r = canvas.getBoundingClientRect();
  const d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(r.width * d));
  canvas.height = Math.max(1, Math.round(r.height * d));
  const sc = Math.min(canvas.width / W, canvas.height / H);
  view = { sc, ox: (canvas.width - W * sc) / 2, oy: (canvas.height - H * sc) / 2, d };
  paintBackground();
}

// ---------- seeded randomness so the painting looks the same every time ----------
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function blob(g, r, cx, cy, rad, colour, alpha) {
  g.globalAlpha = alpha;
  g.fillStyle = colour;
  g.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad * (0.7 + r() * 0.5);
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
  }
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
}

function paintBackground() {
  bg = document.createElement('canvas');
  bg.width = canvas.width; bg.height = canvas.height;
  const g = bg.getContext('2d');
  g.fillStyle = '#131026';
  g.fillRect(0, 0, bg.width, bg.height);
  g.save();
  g.translate(view.ox, view.oy);
  g.scale(view.sc, view.sc);
  g.beginPath(); g.rect(0, 0, W, H); g.clip();
  const r = rng(7);
  // sky
  const sky = g.createLinearGradient(0, 0, 0, LAYOUT.bounds.top);
  sky.addColorStop(0, '#1b1838'); sky.addColorStop(1, '#2d2754');
  g.fillStyle = sky; g.fillRect(0, 0, W, LAYOUT.bounds.top);
  for (let i = 0; i < 14; i++) blob(g, r, r() * W, r() * LAYOUT.bounds.top, 40 + r() * 60, ['#4a3d78', '#3d5a8a', '#5b4a9b'][i % 3], 0.12);
  g.fillStyle = '#fff6d6';
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * W, r() * (LAYOUT.bounds.top - 10), 1.6, 1.6); }
  g.globalAlpha = 1;
  // ground
  g.fillStyle = '#233a31';
  g.fillRect(0, LAYOUT.bounds.top - 10, W, H);
  for (let i = 0; i < 40; i++) blob(g, r, r() * W, LAYOUT.bounds.top + r() * (H - LAYOUT.bounds.top), 40 + r() * 90, ['#2f4a3a', '#3b5a3f', '#28403a', '#344f45'][i % 4], 0.35);
  // soft edge between sky and ground
  g.globalAlpha = 0.5; g.fillStyle = '#1f2f2a';
  g.beginPath(); g.moveTo(0, LAYOUT.bounds.top);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, LAYOUT.bounds.top - 8 + Math.sin(x * 0.03) * 6);
  g.lineTo(W, LAYOUT.bounds.top + 10); g.lineTo(0, LAYOUT.bounds.top + 10); g.closePath(); g.fill();
  g.globalAlpha = 1;
  // paths
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    blob(g, r, 120 + t * 700, 320 + Math.sin(t * 6) * 18, 34, '#5a5a4a', 0.18);
  }
  for (let i = 0; i < 10; i++) blob(g, r, 150 + i * 6, 180 + i * 30, 26, '#5a5a4a', 0.15);
  // well
  const w = LAYOUT.well;
  g.fillStyle = '#6c6880'; g.beginPath(); g.ellipse(w.x, w.y, 30, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b2a3a'; g.beginPath(); g.ellipse(w.x, w.y, 18, 12, 0, 0, Math.PI * 2); g.fill();
  inkEllipse(g, w.x, w.y, 30, 22);
  // seed shed shelf
  g.fillStyle = '#4a3a2e'; g.globalAlpha = 0.85;
  g.fillRect(52, 140, 56, 300); g.globalAlpha = 1;
  inkRect(g, 52, 140, 56, 300);
  // altar
  const a = LAYOUT.altar;
  g.fillStyle = '#8e88a8'; g.beginPath(); g.ellipse(a.x, a.y + 14, 40, 16, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b3aec8'; g.fillRect(a.x - 18, a.y - 26, 36, 40);
  inkRect(g, a.x - 18, a.y - 26, 36, 40);
  g.fillStyle = '#f3e3a6'; g.beginPath(); g.arc(a.x, a.y - 30, 10, 0, Math.PI * 2); g.fill();
  inkCircle(g, a.x, a.y - 30, 10);
  g.restore();
}

function inkCircle(g, x, y, r) { g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 0.4; g.beginPath(); g.arc(x + 1, y + 0.5, r, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
function inkEllipse(g, x, y, rx, ry) { g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke(); }
function inkRect(g, x, y, w, h) { g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, y, w, h); }

// ---------- timeline ----------

const lerp = (a, b, k) => a + (b - a) * k;
function blendList(A, B, k) {
  const m = new Map(A.map((x) => [x.id, x]));
  return B.map((x) => {
    const q = m.get(x.id);
    if (!q || Math.hypot(x.x - q.x, x.y - q.y) > SNAP_DIST) return x;
    return { ...x, x: lerp(q.x, x.x, k), y: lerp(q.y, x.y, k) };
  });
}
function blend(A, B, k) {
  if (A === B || k <= 0) return A;
  return { ...B, players: blendList(A.players, B.players, k), moths: blendList(A.moths, B.moths, k), time: lerp(A.time, B.time, k) };
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const snaps = getSnaps();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bg) ctx.drawImage(bg, 0, 0);
  if (!snaps.length) return;
  const rt = now - DELAY;
  let ai = -1;
  for (let i = 0; i < snaps.length; i++) if (snaps[i].at <= rt) ai = i;
  const A = snaps[Math.max(0, ai)], B = snaps[Math.min(snaps.length - 1, ai + 1)];
  const k = ai < 0 || A === B ? 0 : Math.min(1, (rt - A.at) / Math.max(1, B.at - A.at));
  // a copy, so drawing never changes the stored server states
  const s = { ...blend(A.s, B.s, k) };
  predictMe(s, snaps[snaps.length - 1].s, now);
  if (snaps[0].seq > lastSeq + snaps.length) lastSeq = snaps[0].seq - 1;
  for (const sn of snaps) if (sn.seq > lastSeq && sn.at <= rt) { lastSeq = sn.seq; sn.e.forEach((e) => onEvent(e, now)); }

  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.sc, view.sc);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const t = now / 1000;
  drawMoon(s);
  drawSeedBoxes(s);
  drawLanternGlow(s, t);
  for (const b of s.beds) drawBed(b, t);
  for (const l of s.lanterns) drawLantern(l, t);
  for (const it of s.items) drawItem({ ...it, capacity: s.canCapacity }, it.x, it.y);
  for (const m of s.moths) drawMoth(m, t);
  for (const p of s.players) drawGardener(p, t, s.canCapacity);
  if (s.phase === 'dawn') { ctx.fillStyle = 'rgba(255,200,150,0.18)'; ctx.fillRect(0, 0, W, H); }
  drawWishes(s);
  ctx.restore();
  drawText(s, now);
}

// Your own gardener is drawn where your keys put it right now (see predict.js);
// everyone else is drawn slightly in the past, blended between server states.
function predictMe(s, newest, now) {
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  const server = newest.players.find((p) => p.id === youId);
  const i = s.players.findIndex((p) => p.id === youId);
  if (!server || i < 0 || s.phase !== 'playing') { pred = null; return; }
  if (!pred) pred = { x: server.x, y: server.y };
  const keys = getKeys();
  pred = stepPrediction(pred, keys, dt, server);
  const fx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), fy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const facing = fx || fy ? { x: fx / Math.hypot(fx, fy), y: fy / Math.hypot(fx, fy) } : s.players[i].facing;
  s.players = s.players.map((p, j) => (j === i ? { ...p, x: pred.x, y: pred.y, facing } : p));
}

// ---------- events ----------

function toast(text, now) {
  toasts = toasts.filter((x) => x.text !== text);
  toasts.push({ text, until: now + TOAST_MS });
  if (toasts.length > 3) toasts.shift();
}

function onEvent(e, now) {
  switch (e.type) {
    case 'wish': toast(`Ønske opfyldt! +${e.dust} månestøv`, now); break;
    case 'gift': toast(`En gave til månen: +${e.dust} månestøv`, now); break;
    case 'wilt': toast('En natsværmer fik en blomst til at visne', now); break;
    case 'newWish': toast('Månen har et nyt ønske', now); break;
    case 'wishGone': toast('Månen glemte et ønske', now); break;
    case 'twinWait': if (e.id === youId) toast('Tvillingelilje: en anden nisse skal plante her samtidig!', now); break;
    default: break;
  }
  sound.play(e.type);
}

// ---------- drawing ----------

function drawMoon(s) {
  const f = Math.min(1, s.time / s.nightLength);
  const end = Math.max(300, W - 20 - wishesWidth(3) - 50);
  const x = 60 + f * (end - 60), y = 70 - Math.sin(f * Math.PI) * 30;
  const glow = ctx.createRadialGradient(x, y, 8, x, y, 70);
  glow.addColorStop(0, 'rgba(255,244,214,0.35)'); glow.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 70, y - 70, 140, 140);
  ctx.fillStyle = '#f3ecd2';
  ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
  // shadow for the phase
  ctx.fillStyle = '#211d40';
  const shade = { nymaane: 22, tiltagende: 12, fuldmaane: 0, aftagende: -12 }[s.moon] ?? 0;
  if (shade) { ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x - shade, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  inkCircle(ctx, x, y, 24);
}

function drawSeedBoxes(s) {
  for (const box of LAYOUT.seedBoxes) {
    const look = FLOWER_LOOK[box.type];
    const have = s.seeds ? s.seeds.includes(box.type) : true;
    ctx.globalAlpha = have ? 1 : 0.3;
    ctx.fillStyle = '#7a5c40'; ctx.fillRect(box.x - 20, box.y - 14, 40, 28);
    ctx.fillStyle = look.petal; ctx.beginPath(); ctx.arc(box.x, box.y, 8, 0, Math.PI * 2); ctx.fill();
    inkRect(ctx, box.x - 20, box.y - 14, 40, 28);
    ctx.globalAlpha = 1;
  }
}

function drawLanternGlow(s, t) {
  for (const l of s.lanterns) {
    if (l.litFor <= 0) continue;
    const pos = LAYOUT.lanterns[l.id];
    const strength = Math.min(1, l.litFor / 10) * (0.9 + 0.1 * Math.sin(t * 7 + l.id));
    const g = ctx.createRadialGradient(pos.x, pos.y, 6, pos.x, pos.y, LANTERN_RADIUS);
    g.addColorStop(0, `rgba(255,214,120,${0.42 * strength})`);
    g.addColorStop(0.7, `rgba(255,214,120,${0.12 * strength})`);
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, LANTERN_RADIUS, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLantern(l, t) {
  const pos = LAYOUT.lanterns[l.id];
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pos.x, pos.y + 4); ctx.lineTo(pos.x, pos.y + 26); ctx.stroke();
  ctx.fillStyle = l.litFor > 0 ? '#ffd57a' : '#4a4660';
  ctx.beginPath(); ctx.ellipse(pos.x, pos.y - 4, 8, 11, 0, 0, Math.PI * 2); ctx.fill();
  inkEllipse(ctx, pos.x, pos.y - 4, 8, 11);
  if (l.litFor > 0 && l.litFor < 10 && Math.sin(t * 12) > 0) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(pos.x, pos.y - 4, 4, 0, Math.PI * 2); ctx.fill(); }
}

function drawBed(b, t) {
  const pos = LAYOUT.beds[b.id];
  if (!b.open) {
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(243,236,210,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 44, 30, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  const wet = b.moisture / 100;
  ctx.fillStyle = `rgb(${Math.round(92 - 40 * wet)},${Math.round(70 - 28 * wet)},${Math.round(56 - 18 * wet)})`;
  ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
  inkEllipse(ctx, pos.x, pos.y, 44, 30);
  if (!b.plant) return;
  const look = FLOWER_LOOK[b.plant.type];
  const f = b.plant.growth / (GROW[b.plant.type] || 60);
  const sway = Math.sin(t * 1.4 + b.id) * 2;
  if (f < 0.2) {
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2); ctx.fill();
  } else {
    const h = 10 + Math.min(1, f) * 22;
    ctx.strokeStyle = '#6fa863'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y + 6); ctx.quadraticCurveTo(pos.x + sway, pos.y - h / 2, pos.x + sway, pos.y - h); ctx.stroke();
    ctx.fillStyle = '#7fbf6f';
    ctx.beginPath(); ctx.ellipse(pos.x - 7, pos.y - 2, 7, 3, -0.5, 0, Math.PI * 2); ctx.ellipse(pos.x + 7, pos.y - 4, 7, 3, 0.5, 0, Math.PI * 2); ctx.fill();
    const fx = pos.x + sway, fy = pos.y - h;
    if (b.bloomed) {
      drawFlower(fx, fy, look, b.plant.type === 'tvillingelilje' ? 1 : 1.1);
      if (b.plant.type === 'tvillingelilje') drawFlower(fx + 14, fy + 6, look, 0.8);
    } else if (f >= 0.6) {
      ctx.globalAlpha = 0.8; ctx.fillStyle = look.petal;
      ctx.beginPath(); ctx.ellipse(fx, fy, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      inkEllipse(ctx, fx, fy, 4, 6);
    }
  }
  if (!b.bloomed && b.moisture <= 0 && Math.sin(t * 4 + b.id) > -0.2) {
    // needs water: a small droplet above the bed
    ctx.fillStyle = '#9fd3ff';
    ctx.beginPath(); ctx.moveTo(pos.x + 30, pos.y - 34); ctx.quadraticCurveTo(pos.x + 37, pos.y - 24, pos.x + 30, pos.y - 20); ctx.quadraticCurveTo(pos.x + 23, pos.y - 24, pos.x + 30, pos.y - 34); ctx.fill();
  }
}

function drawFlower(x, y, look, size) {
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = look.petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 7 * size, y + Math.sin(a) * 7 * size, 6 * size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = look.centre;
  ctx.beginPath(); ctx.arc(x, y, 3.5 * size, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
}

function drawItem(it, x, y) {
  if (it.kind === 'can') {
    ctx.fillStyle = '#7fa7c9'; ctx.fillRect(x - 10, y - 9, 20, 16);
    ctx.fillStyle = '#9fd3ff';
    const cap = it.capacity || 3;
    const lvl = Math.max(0, Math.min(1, (it.water ?? 0) / cap));
    ctx.fillRect(x - 9, y + 6 - 14 * lvl, 18, 14 * lvl);
    inkRect(ctx, x - 10, y - 9, 20, 16);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y - 4); ctx.lineTo(x + 18, y - 10); ctx.stroke();
  } else if (it.kind === 'seed') {
    ctx.fillStyle = '#c9a77a'; ctx.beginPath(); ctx.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    inkEllipse(ctx, x, y, 8, 10);
    ctx.fillStyle = FLOWER_LOOK[it.type]?.petal || '#fff'; ctx.beginPath(); ctx.arc(x, y + 2, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (it.kind === 'flower') {
    ctx.strokeStyle = '#6fa863'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y); ctx.stroke();
    drawFlower(x, y - 2, FLOWER_LOOK[it.type] || FLOWER_LOOK.natviol, 0.8);
  }
}

function drawMoth(m, t) {
  const flap = 0.4 + 0.6 * Math.abs(Math.sin(t * 16 + m.x * 0.1));
  ctx.fillStyle = m.state === 'eat' ? 'rgba(255,220,230,0.95)' : 'rgba(235,228,210,0.9)';
  ctx.beginPath();
  ctx.ellipse(m.x - 6, m.y, 7, 5 * flap, -0.4, 0, Math.PI * 2);
  ctx.ellipse(m.x + 6, m.y, 7, 5 * flap, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(m.x - 1, m.y - 5, 2, 10);
}

function drawGardener(p, t, cap) {
  const colour = colourOf(p.id);
  const bob = Math.abs(Math.sin(t * 6 + p.x * 0.05)) * 2;
  const x = p.x, y = p.y - bob;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  inkCircle(ctx, x, y, 16);
  const fx = p.facing?.x || 0, fy = p.facing?.y || 1;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x - 5 + fx * 4, y - 3 + fy * 3, 2.2, 0, Math.PI * 2); ctx.arc(x + 5 + fx * 4, y - 3 + fy * 3, 2.2, 0, Math.PI * 2); ctx.fill();
  if (p.carry) drawItem({ ...p.carry, capacity: cap }, x, y - 30);
  if (p.hold) {
    const frac = p.hold.need ? p.hold.ticks / p.hold.need : 1;
    ctx.strokeStyle = '#f3e3a6'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac)); ctx.stroke();
  }
  if (p.id === youId) {
    ctx.fillStyle = '#f3e3a6';
    ctx.beginPath(); ctx.moveTo(x - 6, y - 50); ctx.lineTo(x + 6, y - 50); ctx.lineTo(x, y - 43); ctx.closePath(); ctx.fill();
  }
}

const CARD_W = 196, CARD_GAP = 10;
const wishesWidth = (n) => n * CARD_W + Math.max(0, n - 1) * CARD_GAP;

function drawWishes(s) {
  const total = wishesWidth(s.wishes.length);
  let x = W - 20 - total;
  for (const w of s.wishes) {
    ctx.fillStyle = 'rgba(244,239,228,0.92)';
    const rows = Object.keys(w.need).length;
    const cardH = 16 + rows * 21;
    ctx.fillRect(x, 8, CARD_W, cardH);
    inkRect(ctx, x, 8, CARD_W, cardH);
    let iy = 26;
    for (const [type, need] of Object.entries(w.need)) {
      const have = w.have[type] || 0;
      drawFlower(x + 22, iy, FLOWER_LOOK[type], 0.7);
      ctx.fillStyle = have >= need ? '#3f7a3f' : INK;
      ctx.font = '600 14px system-ui, "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${have} / ${need}  ${FLOWER_LOOK[type].name}`, x + 40, iy);
      iy += 21;
    }
    x += CARD_W + CARD_GAP;
  }
}

// ---------- text on top, at screen resolution ----------

function drawText(s, now) {
  const sc = view.sc;
  const px = (x) => view.ox + x * sc, py = (y) => view.oy + y * sc;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(Math.max(11, sc * 13))}px system-ui, "Segoe UI", sans-serif`;
  for (const p of s.players) {
    ctx.lineWidth = Math.max(3, sc * 3); ctx.strokeStyle = 'rgba(19,16,38,0.85)';
    ctx.strokeText(p.name, px(p.x), py(p.y + 34));
    ctx.fillStyle = p.id === youId ? '#f3e3a6' : '#f4efe4';
    ctx.fillText(p.name, px(p.x), py(p.y + 34));
  }
  toasts = toasts.filter((x) => x.until > now);
  ctx.font = `700 ${Math.round(Math.max(14, sc * 18))}px Georgia, "Palatino Linotype", serif`;
  toasts.forEach((x, i) => {
    ctx.globalAlpha = Math.min(1, (x.until - now) / 400);
    const y = py(160 + i * 26);
    ctx.lineWidth = Math.max(3, sc * 4); ctx.strokeStyle = 'rgba(19,16,38,0.9)';
    ctx.strokeText(x.text, px(480), y);
    ctx.fillStyle = '#f3e3a6'; ctx.fillText(x.text, px(480), y);
    ctx.globalAlpha = 1;
  });
  if (s.phase === 'dawn') {
    ctx.font = `700 ${Math.round(Math.max(28, sc * 60))}px Georgia, "Palatino Linotype", serif`;
    ctx.lineWidth = Math.max(4, sc * 6); ctx.strokeStyle = '#131026';
    ctx.strokeText('Daggry', px(480), py(300));
    ctx.fillStyle = '#ffd9a8'; ctx.fillText('Daggry', px(480), py(300));
  }
}
