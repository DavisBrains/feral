// Feral keeper: serves the app and a small JSON API. Visitors never hold a key.
// Abuse limits: per IP rate limits, one action at a time, one pilot per season,
// on-chain visitor budget, a global season cap, and a gas floor check on the
// keeper's function-call key.
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as near from './near.mjs';
import { Engine } from './engine.mjs';
import { you as youOf, takeOver, helmOf, isEnded, TAKEOVER_MS } from './helm.mjs';
import { describe, LINES, KINDS, CHANGES, GOALS } from './policy.mjs';
import { keepAwake } from './awake.mjs';
import { loadEnvFile, nearAiAdapter, localAdapter, modelChain, localModelEnabled, NEAR_AI_CAP } from './models.mjs';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const STATIC = path.resolve(process.env.FERAL_STATIC || new URL('../app/dist', import.meta.url).pathname);
const DATA = path.resolve(process.env.FERAL_DATA || new URL('./data', import.meta.url).pathname);
const ORIGIN = process.env.FERAL_ALLOW_ORIGIN || '';
const SEASONS_PER_HOUR = Number(process.env.FERAL_SEASONS_PER_HOUR || 6);
const MIN_ALLOWANCE = 20_000_000_000_000_000_000_000n; // 0.02 NEAR of gas left on the key
// Model order: NEAR AI Cloud if a key is set, then local Qwen when
// FERAL_LOCAL_MODEL is set (Hugging Face Space free CPU turns this on), then the
// labelled fixed policy. The NEAR AI key comes from NEAR_AI_KEY, or the env file
// on this box. Never logged.
const jsonState = f => ({ load: () => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null, save: j => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(j)); } });
loadEnvFile(process.env.FERAL_NEAR_AI_ENV_FILE ?? '/home/box/.secrets/near-ai.env');
const model = modelChain([
  process.env.FERAL_NEAR_AI === '0' ? null : nearAiAdapter({ key: process.env.NEAR_AI_KEY, model: process.env.NEAR_AI_MODEL || undefined, cap: { perHour: Number(process.env.FERAL_NEAR_AI_PER_HOUR || NEAR_AI_CAP.perHour), perDay: Number(process.env.FERAL_NEAR_AI_PER_DAY || NEAR_AI_CAP.perDay) }, state: jsonState(path.join(DATA, 'near-ai-state.json')) }),
  localModelEnabled() ? localAdapter(process.env.FERAL_MODEL_URL || 'http://127.0.0.1:11436') : null,
]);
// Plain translation demand is on by default after the arena upgrade. Set FERAL_TRANSLATION_DEMAND=0 to hide it.
const TRANSLATION_DEMAND = process.env.FERAL_TRANSLATION_DEMAND !== '0';
// While paused the keeper only reads. Every write and turn is refused, so nothing moves on chain.
const PAUSED = /^(1|true|yes)$/i.test(String(process.env.FERAL_TURNS_PAUSED || ''));
const PAUSE_NOTE = 'The terrarium opens soon. You can watch it now, and play starts shortly.';
// A fresh host (Render wipes its disk) starts from the committed public journal so the
// turn log and model notes for the current season are not blank. Chain state stays the truth.
const SEED = new URL('./seed', import.meta.url).pathname;
if (!existsSync(path.join(DATA, 'journal.jsonl')) && existsSync(path.join(SEED, 'journal.jsonl')) && process.env.FERAL_SEED !== '0') {
  mkdirSync(path.join(DATA, 'out'), { recursive: true });
  for (const f of ['journal.jsonl', 'meta.json']) copyFileSync(path.join(SEED, f), path.join(DATA, f));
  for (const f of readdirSync(path.join(SEED, 'out'))) copyFileSync(path.join(SEED, 'out', f), path.join(DATA, 'out', f));
}
const engine = new Engine({ dataDir: DATA, model, translationDemand: TRANSLATION_DEMAND });
const sha = s => createHash('sha256').update(s).digest('hex');

// ---------- limits ----------
const buckets = new Map();
function limited(key, perMin, burst) {
  const now = Date.now(); const b = buckets.get(key) ?? { t: now, n: burst };
  b.n = Math.min(burst, b.n + (now - b.t) / 60000 * perMin); b.t = now;
  buckets.set(key, b); if (b.n < 1) return true; b.n -= 1; return false;
}
const seasonStarts = [];
let modelState = model ? { mode: 'checking', model: null, checked: 0 } : { mode: 'fixed-policy', model: null, provider: 'fixed-policy', label: 'Fixed rules backup', providers: [], checked: 0, note: 'no model is configured on this keeper, using the labelled fixed rules backup' };
async function checkModel() {
  if (!model) return modelState;
  if (Date.now() - modelState.checked < 20000) return modelState;
  try { const h = await model.health(); modelState = { mode: 'live-model', model: h.model, provider: h.provider, label: h.label, providers: h.providers, checked: Date.now() }; }
  catch (e) { modelState = { mode: 'fixed-policy', model: null, provider: 'fixed-policy', label: 'Fixed rules backup', providers: e.providers ?? [], checked: Date.now(), note: 'no model provider is ready, using the labelled fixed rules backup' }; }
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
// Box only operator path. When FERAL_OPERATOR_TOKEN is set (never on the public host),
// a loopback request with the matching x-feral-operator header acts for the season's
// pilot, so a recording browser can steer a season another local browser started.
const OPERATOR = process.env.FERAL_OPERATOR_TOKEN || '';
function isOperator(req) {
  if (!OPERATOR || OPERATOR.length < 32) return false;
  const a = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(a) || req.headers['x-forwarded-for']) return false;
  const h = String(req.headers['x-feral-operator'] ?? '');
  return h.length === OPERATOR.length && sha(h) === sha(OPERATOR);
}
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
  const s = chain.season, me = isOperator(req) && s ? helmOf(engine.meta, s) : visitorOf(req);
  return {
    chain: { ...chain, lives: chain.lives.map(l => ({ ...l, plain: describe(l.life.genome) })) },
    contract: near.CONTRACT, keeper_account: near.KEEPER, explorer: near.explorerAccount(near.CONTRACT),
    you: youOf(engine.meta, s, me, Date.now(), { paused: PAUSED }),
    paused: PAUSED, paused_note: PAUSED ? PAUSE_NOTE : null,
    busy: engine.busy, progress: engine.progress, takeover_ms: TAKEOVER_MS, model: m, key, translation_demand: TRANSLATION_DEMAND,
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
  if (PAUSED) return json(res, 423, { error: PAUSE_NOTE, paused: true });
  let me = visitorOf(req);
  if (isOperator(req)) { const s = (await chainState()).season; if (s) me = helmOf(engine.meta, s); }
  if (!me) return json(res, 400, { error: 'visitor id missing' });
  if (limited('p:' + ipOf(req), 20, 6) || limited('v:' + me, 20, 6)) return json(res, 429, { error: 'Too many actions. Wait a few seconds.', retry_after_s: 20 });
  const key = await keyHealth();
  if (key.error || key.full_access || (key.allowance_left && BigInt(key.allowance_left) < MIN_ALLOWANCE)) return json(res, 503, { error: 'The keeper key is out of testnet gas allowance. The terrarium is paused.' });
  const b = await body(req);
  const chain = await chainState(); const s = chain.season;
  if (url.pathname === '/api/takeover') {
    if (engine.busy) return json(res, 409, { error: 'The keeper is busy. Try again in a moment.' });
    const r = takeOver(engine.meta, s, me, Date.now());
    if (!r.ok) return json(res, 409, { error: r.error });
    engine.saveMeta();
    const entry = engine.record({ season: s.id, turn: s.turn, kind: 'visitor', label: 'A new visitor took over the season', visitor: me, ok: true });
    return json(res, 200, { entry: { ...entry, visitor: undefined } });
  }
  if (url.pathname === '/api/season') {
    const st = youOf(engine.meta, s, me, Date.now());
    if (!st.can_start) return json(res, 403, { error: isEnded(s) ? 'You can not start a season right now.' : 'This season is still live. Take it over when it is free, or watch it end.' });
    const hourAgo = Date.now() - 3600_000; while (seasonStarts.length && seasonStarts[0] < hourAgo) seasonStarts.shift();
    if (seasonStarts.length >= SEASONS_PER_HOUR) return json(res, 429, { error: 'Season limit reached for this hour. Watch the current one.' });
    seasonStarts.push(Date.now());
    const r = await engine.startSeason(me, { target: 8, budget: 120 });
    snapCache.at = 0; return json(res, r.ok ? 200 : 502, { entry: r });
  }
  if (!s || helmOf(engine.meta, s) !== me) return json(res, 403, { error: 'Only the visitor who holds this season can act. Take it over when it sits idle.' });
  // A turn can call the model once per creature, so turns get their own tighter limit per IP.
  if (url.pathname === '/api/turn' && limited('t:' + ipOf(req), 4, 3)) return json(res, 429, { error: 'Too many turns. Wait a few seconds.', retry_after_s: 20 });
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
// Keep awake through judging, see awake.mjs. The ping only hits /healthz.
if (process.env.FERAL_KEEP_AWAKE_URL) keepAwake({ url: process.env.FERAL_KEEP_AWAKE_URL, until: process.env.FERAL_KEEP_AWAKE_UNTIL, everyMs: Number(process.env.FERAL_KEEP_AWAKE_MS || 10 * 60e3), log: m => console.log(m) });
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    // Hosts probe this. No secrets, no chain calls.
    if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...cors() }); return res.end('ok'); }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    serveStatic(req, res, url);
  } catch (e) { console.error(e); json(res, e.status ?? 500, { error: String(e.message).slice(0, 200) }); }
}).listen(PORT, HOST, () => console.log(`feral keeper on http://${HOST}:${PORT} · arena ${near.CONTRACT} · models ${model?.url ?? 'none (fixed policy)'}${PAUSED ? ' · turns paused' : ''}${OPERATOR ? ' · operator path on' : ''}`));
