import WebSocket from 'ws';
const URL = process.argv[2];
const open = () => new Promise((res, rej) => { const w = new WebSocket(URL); w.msgs = []; w.on('message', d => { const m = JSON.parse(d); m.at = performance.now(); w.msgs.push(m); }); w.on('open', () => res(w)); w.on('error', rej); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const send = (w, o) => w.send(JSON.stringify(o));
const a = await open(), b = await open();
send(a, { t: 'create', name: 'A' }); await wait(800);
const code = a.msgs.find(m => m.t === 'room').code;
send(b, { t: 'join', name: 'B', code }); await wait(800);
send(a, { t: 'start' }); await wait(4500);
const id = a.msgs.filter(m => m.t === 'room').at(-1).you;
const xOf = m => m.s.players.find(p => p.id === id).x;
// state message spacing
const st = a.msgs.filter(m => m.t === 'state').slice(-40);
const gaps = st.slice(1).map((m, i) => m.at - st[i].at);
const lat = [];
for (let k = 0; k < 8; k++) {
  const dir = k % 2 ? 'left' : 'right';
  const x0 = xOf(a.msgs.filter(m => m.t === 'state').at(-1));
  const t0 = performance.now(); a.msgs.length = 0;
  send(a, { t: 'keys', keys: { [dir]: true } });
  while (true) { await wait(5); const m = a.msgs.find(m => m.t === 'state' && Math.abs(xOf(m) - x0) > 0.5); if (m) { lat.push(Math.round(m.at - t0)); break; } if (performance.now() - t0 > 3000) { lat.push(-1); break; } }
  await wait(300); send(a, { t: 'keys', keys: {} }); await wait(400);
}
const avg = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
console.log({ keyToStateMs: lat, avg: avg(lat), stateGapAvg: avg(gaps), stateGapMax: Math.round(Math.max(...gaps)) });
a.close(); b.close(); process.exit(0);
