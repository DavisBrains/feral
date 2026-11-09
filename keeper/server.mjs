// Feral keeper: serves the app and a small JSON API. Visitors never hold a key.
// Abuse limits: per IP rate limits, one action at a time, one pilot per season,
// on-chain visitor budget, a global season cap, and a gas floor check on the
// keeper's function-call key.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as near from './near.mjs';
import { Engine } from './engine.mjs';
import { modelAdapter, describe, LINES, KINDS, CHANGES, GOALS } from './policy.mjs';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const STATIC = path.resolve(process.env.FERAL_STATIC || new URL('../app/dist', import.meta.url).pathname);
const DATA = path.resolve(process.env.FERAL_DATA || new URL('./data', import.meta.url).pathname);
const ORIGIN = process.env.FERAL_ALLOW_ORIGIN || '';
const LEASE_MS = Number(process.env.FERAL_LEASE_MS || 15 * 60 * 1000);
const SEASONS_PER_HOUR = Number(process.env.FERAL_SEASONS_PER_HOUR || 6);
const MIN_ALLOWANCE = 20_000_000_000_000_000_000_000n; // 0.02 NEAR of gas left on the key
const model = modelAdapter(process.env.FERAL_MODEL_URL ?? 'http://127.0.0.1:11436');
const engine = new Engine({ dataDir: DATA, model });
const sha = s => createHash('sha256').update(s).digest('hex');

// ---------- limits ----------
const buckets = new Map();
function limited(key, perMin, burst) {
  const now = Date.now(); const b = buckets.get(key) ?? { t: now, n: burst };
  b.n = Math.min(burst, b.n + (now - b.t) / 60000 * perMin); b.t = now;
  buckets.set(key, b); if (b.n < 1) return true; b.n -= 1; return false;
}
const seasonStarts = [];
let modelState = { mode: model ? 'checking' : 'fixed-policy', model: null, checked: 0 };
async function checkModel() {
  if (!model) return modelState;
  if (Date.now() - modelState.checked < 20000) return modelState;
  try { const h = await model.health(); modelState = { mode: 'live-model', model: h.model, checked: Date.now() }; }
  catch { modelState = { mode: 'fixed-policy', model: null, checked: Date.now(), note: 'model endpoint unreachable, using the labelled fixed policy' }; }
  return modelState;
}
let keyCache = { at: 0, v: null };
async function keyHealth() {
  if (Date.now() - keyCache.at < 30000 && keyCache.v) return keyCache.v;
  try {
    const k = await near.accessKey(near.KEEPER, near.keeperPublicKey());
    const fc = k.permission?.FunctionCall;
    keyCache = { at: Date.now(), v: { public_key: near.keeperPublicKey(), receiver: fc?.receiver_id, methods: fc?.method_names, allowance_left: fc?.allowance ?? null, full_access: !fc } };
  } catch (e) { keyCache = { at: Date.now(), v: { error: String(e.message).slice(0, 120) } }; }
  return keyCache.v;
}
let snapCache = { at: 0, v: null };
async function chainState() {
  if (Date.now() - snapCache.at < 1500 && snapCache.v) return snapCache.v;
  snapCache = { at: Date.now(), v: await near.snapshot() }; return snapCache.v;
}

// ---------- http ----------
const json = (res, code, obj, extra = {}) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(), ...extra }); res.end(JSON.stringify(obj)); };
const cors = () => ORIGIN ? { 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'content-type,x-feral-visitor', 'access-control-allow-methods': 'GET,POST,OPTIONS' } : {};
const ipOf = req => (process.env.FERAL_TRUST_PROXY === '1' ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress;
function visitorOf(req) {
  const v = String(req.headers['x-feral-visitor'] ?? '');
  if (!/^[a-f0-9]{32,64}$/.test(v)) return null;
  return sha('feral-visitor:' + v);
}
async function body(req) {
  let n = 0, chunks = [];
  for await (const c of req) { n += c.length; if (n > 4096) throw Object.assign(new Error('body too large'), { status: 413 }); chunks.push(c); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}
function publicLog(season) {
  return engine.log.filter(e => e.season === season).slice(-160).map(({ visitor, ...e }) => e);
}
async function state(req) {
  const [chain, m, key] = await Promise.all([chainState(), checkModel(), keyHealth()]);
  const me = visitorOf(req), s = chain.season;
  const idle = Date.now() - engine.meta.lastActivity;
  const pilot = !!(s && me && s.pilot === me);
  const ended = !s || s.closed || ['won', 'lost', 'failed'].includes(s.status) || s.status.startsWith('abandoned');
  return {
    chain: { ...chain, lives: chain.lives.map(l => ({ ...l, plain: describe(l.life.genome) })) },
    contract: near.CONTRACT, keeper_account: near.KEEPER, explorer: near.explorerAccount(near.CONTRACT),
    you: { pilot, can_start: ended || pilot || idle > LEASE_MS, lease_left_ms: Math.max(0, LEASE_MS - idle) },
    busy: engine.busy, progress: engine.progress, model: m, key,
    lines: LINES, kinds: KINDS, changes: CHANGES, goals: GOALS,
    log: s ? publicLog(s.id) : [],
  };
}
async function api(req, res, url) {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
  if (url.pathname === '/api/state' && req.method === 'GET') {
    if (limited('s:' + ipOf(req), 240, 30)) return json(res, 429, { error: 'slow down' });
    return json(res, 200, await state(req));
  }
  const out = url.pathname.match(/^\/api\/out\/(s\d+-[a-z0-9-]+)\.svg$/);
  if (out && req.method === 'GET') {
    const f = path.join(DATA, 'out', out[1] + '.svg'); if (!existsSync(f)) return json(res, 404, { error: 'no output' });
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'", 'cache-control': 'public, max-age=86400', ...cors() }); return res.end(readFileSync(f));
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'not found' });
  const me = visitorOf(req);
  if (!me) return json(res, 400, { error: 'visitor id missing' });
  if (limited('p:' + ipOf(req), 20, 6) || limited('v:' + me, 20, 6)) return json(res, 429, { error: 'Too many actions. Wait a few seconds.', retry_after_s: 20 });
  const key = await keyHealth();
  if (key.error || key.full_access || (key.allowance_left && BigInt(key.allowance_left) < MIN_ALLOWANCE)) return json(res, 503, { error: 'The keeper key is out of testnet gas allowance. The terrarium is paused.' });
  const b = await body(req);
  const chain = await chainState(); const s = chain.season;
  if (url.pathname === '/api/season') {
    const st = await state(req);
    if (!st.you.can_start) return json(res, 403, { error: 'Another visitor holds this season. You can watch, or start a new one when it ends or sits idle.' });
    const hourAgo = Date.now() - 3600_000; while (seasonStarts.length && seasonStarts[0] < hourAgo) seasonStarts.shift();
    if (seasonStarts.length >= SEASONS_PER_HOUR) return json(res, 429, { error: 'Season limit reached for this hour. Watch the current one.' });
    seasonStarts.push(Date.now());
    const r = await engine.startSeason(me, { target: 8, budget: 120 });
    snapCache.at = 0; return json(res, r.ok ? 200 : 502, { entry: r });
  }
  if (!s || s.pilot !== me) return json(res, 403, { error: 'Only the visitor who started this season can act. Start your own when it ends.' });
  if (url.pathname === '/api/turn') { const r = await engine.turn(me); snapCache.at = 0; return json(res, 200, { entry: r }); }
  if (url.pathname === '/api/action') { const r = await engine.visitor(me, b); snapCache.at = 0; return json(res, r.ok ? 200 : 422, { entry: r }); }
  return json(res, 404, { error: 'not found' });
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
function serveStatic(req, res, url) {
  let f = path.join(STATIC, decodeURIComponent(url.pathname));
  if (!f.startsWith(STATIC)) { res.writeHead(403); return res.end(); }
  if (!existsSync(f) || statSync(f).isDirectory()) f = path.join(STATIC, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end('build the app first'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': f.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'x-content-type-options': 'nosniff' });
  res.end(readFileSync(f));
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try { if (url.pathname.startsWith('/api/')) return await api(req, res, url); serveStatic(req, res, url); }
  catch (e) { console.error(e); json(res, e.status ?? 500, { error: String(e.message).slice(0, 200) }); }
}).listen(PORT, HOST, () => console.log(`feral keeper on http://${HOST}:${PORT} · arena ${near.CONTRACT} · model ${model?.url ?? 'none (fixed policy)'}`));
