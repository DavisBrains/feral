// Model providers for creature decisions and translations, tried in order:
// NEAR AI Cloud first, the local Qwen server as a labelled fallback, and the
// fixed policy (in policy.mjs) last. Each provider has a breaker so a billing,
// auth or outage error stops calls for a while instead of hammering the API.
// The NEAR AI key is read from the environment only. It is never logged,
// returned, or written to the journal.
import { readFileSync, existsSync } from 'node:fs';
import { SYSTEM, modelAdapter } from './policy.mjs';

export const NEAR_AI_BASE = 'https://cloud-api.near.ai/v1';
// Open weights, hosted by NEAR AI itself, structured outputs, no reasoning tokens, $0.15 in / $0.55 out per million tokens.
export const NEAR_AI_DEFAULT_MODEL = 'Qwen/Qwen3-VL-30B-A3B-Instruct';

/** Load KEY=VALUE lines into env without overriding what is already set. Returns the names loaded, never values. */
export function loadEnvFile(file, env = process.env) {
  if (!file || !existsSync(file)) return [];
  const names = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || env[m[1]]) continue;
    env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); names.push(m[1]);
  }
  return names;
}

/** Classify a failed HTTP response from an OpenAI compatible API. */
export function classify(status, body) {
  const e = body?.error ?? {}, text = `${e.type ?? ''} ${e.code ?? ''} ${e.message ?? ''}`.toLowerCase();
  if (status === 402 || /insufficient|credit|billing|quota|no_limit|spending|payment|balance/.test(text)) return 'billing';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  return 'other';
}
const COOLDOWN = { billing: 15 * 60e3, auth: 60 * 60e3, rate: 60e3, other: 60e3 };
const MAX_COOLDOWN = 2 * 60 * 60e3;

export class Breaker {
  constructor(now = () => Date.now()) { this.now = now; this.until = 0; this.kind = null; this.reason = null; this.strikes = {}; this.fails = 0; }
  open() { return this.now() < this.until; }
  trip(kind, reason, retryAfterS) {
    if (kind === 'other' && ++this.fails < 2) { this.reason = reason; return; } // one blip is not an outage
    this.strikes[kind] = (this.strikes[kind] ?? 0) + 1;
    const base = retryAfterS ? retryAfterS * 1000 : COOLDOWN[kind];
    const wait = Math.min(MAX_COOLDOWN, base * 2 ** (this.strikes[kind] - 1));
    this.until = this.now() + wait; this.kind = kind; this.reason = reason;
  }
  ok() { this.confirmed = true; this.until = 0; this.kind = null; this.reason = null; this.strikes = {}; this.fails = 0; }
  status() { return this.open() ? { kind: this.kind, reason: this.reason, retry_at: new Date(this.until).toISOString() } : null; }
  toJSON() { return { until: this.until, kind: this.kind, reason: this.reason, strikes: this.strikes, confirmed: !!this.confirmed }; }
  restore(j) { if (j && typeof j === 'object') { this.until = Number(j.until) || 0; this.kind = j.kind ?? null; this.reason = j.reason ?? null; this.strikes = j.strikes ?? {}; this.confirmed = !!j.confirmed; } return this; }
}

class ProviderError extends Error { constructor(kind, msg) { super(msg); this.kind = kind; } }

/** NEAR AI Cloud, OpenAI compatible chat completions with a JSON schema answer. */
// state: optional { load(), save(json) } so a billing block survives keeper restarts and is not re-probed early.
export function nearAiAdapter({ key, model = NEAR_AI_DEFAULT_MODEL, base = NEAR_AI_BASE, fetchImpl = fetch, now = () => Date.now(), timeoutMs = 30000, state = null } = {}) {
  if (!key) return null;
  const breaker = new Breaker(now).restore(state?.load?.());
  for (const m of ['trip', 'ok']) { const f = breaker[m].bind(breaker); breaker[m] = (...a) => { f(...a); try { state?.save?.(breaker.toJSON()); } catch { /* best effort */ } }; }
  const scrub = s => String(s ?? '').split(key).join('[key]').slice(0, 160);
  async function complete(messages, schema, maxTokens) {
    if (breaker.open()) throw new ProviderError(breaker.kind, `skipped, ${breaker.reason}`);
    const t0 = now();
    let r;
    try {
      r = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2, response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema } } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) { breaker.trip('other', scrub(`unreachable, ${e.name === 'TimeoutError' ? 'timed out' : e.message}`)); throw new ProviderError('other', breaker.reason); }
    let body = null; try { body = await r.json(); } catch { /* not json */ }
    if (!r.ok) {
      const kind = classify(r.status, body), msg = scrub(`${r.status} ${body?.error?.type ?? ''} ${body?.error?.message ?? ''}`.replace(/\s+/g, ' ').trim());
      breaker.trip(kind, kind === 'billing' ? `no credits (${msg})` : msg, Number(r.headers.get?.('retry-after')) || undefined);
      throw new ProviderError(kind, breaker.reason ?? msg);
    }
    let out;
    try { out = JSON.parse(body.choices[0].message.content); } catch { breaker.trip('other', 'answer was not valid JSON'); throw new ProviderError('other', 'answer was not valid JSON'); }
    breaker.ok();
    return { out, seconds: Math.round((now() - t0) / 100) / 10, model: body.model ?? model };
  }
  return {
    provider: 'near-ai', label: 'NEAR AI Cloud', model, url: base,
    status() { return { provider: 'near-ai', label: 'NEAR AI Cloud', model, ready: !breaker.open(), confirmed: !!breaker.confirmed, blocked: breaker.status() }; },
    async choose(observation, opts) {
      const list = opts.map((o, i) => `${i}. ${JSON.stringify(o)}`).join('\n');
      const user = `Your situation:\n${JSON.stringify(observation)}\n\nLegal actions:\n${list}\n\nPick one legal action by its number. The outcome is not known yet. In one short first person sentence under 20 words, say why you are choosing it. Do not claim any result.`;
      const schema = { type: 'object', additionalProperties: false, required: ['choice', 'reason'], properties: { choice: { type: 'integer', enum: opts.map((_, i) => i) }, reason: { type: 'string', maxLength: 160 } } };
      const { out, seconds, model: m } = await complete([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], schema, 80);
      if (!Number.isInteger(out.choice) || !opts[out.choice]) { breaker.trip('other', 'chose a number outside the list'); throw new ProviderError('other', 'chose a number outside the list'); }
      return { decision: opts[out.choice], reason: typeof out.reason === 'string' ? out.reason.trim() : null, seconds, model: m };
    },
    async translate(en) {
      const schema = { type: 'object', additionalProperties: false, required: ['es'], properties: { es: { type: 'string', maxLength: 140 } } };
      const { out, seconds, model: m } = await complete([{ role: 'system', content: 'Translate the English line into natural Spanish. Answer with the Spanish only.' }, { role: 'user', content: en }], schema, 60);
      return { es: out.es, seconds, model: m };
    },
  };
}

/** The local Qwen server (agents/arena_model.py), with a breaker so a stopped server is skipped quickly. */
export function localAdapter(url, fetchImpl = fetch, now = () => Date.now()) {
  const inner = modelAdapter(url, fetchImpl); if (!inner) return null;
  const breaker = new Breaker(now); let name = 'Qwen/Qwen2.5-1.5B-Instruct';
  const guard = fn => async (...a) => {
    if (breaker.open()) throw new ProviderError(breaker.kind, `skipped, ${breaker.reason}`);
    try { const r = await fn(...a); breaker.ok(); if (r?.model) name = r.model; return r; }
    catch (e) { breaker.trip('other', String(e.message).slice(0, 120)); breaker.trip('other', String(e.message).slice(0, 120)); throw new ProviderError('other', String(e.message).slice(0, 120)); }
  };
  return {
    provider: 'local-qwen', label: 'Local Qwen fallback', url,
    get model() { return name; },
    status() { return { provider: 'local-qwen', label: 'Local Qwen fallback', model: name, ready: !breaker.open(), confirmed: true, blocked: breaker.status() }; },
    async probe() { if (breaker.open()) return; try { const h = await inner.health(); if (h?.model) name = h.model; } catch (e) { breaker.trip('other', 'not running'); breaker.trip('other', 'not running'); } },
    choose: guard(inner.choose), translate: guard(inner.translate),
  };
}

/** Try providers in order. Each answer says which provider gave it and which were skipped and why. */
export function modelChain(providers) {
  const list = providers.filter(Boolean);
  if (!list.length) return null;
  const run = method => async (...args) => {
    const skipped = [];
    for (const p of list) {
      try { const r = await p[method](...args); return { ...r, provider: p.provider, provider_label: p.label, model: r.model ?? p.model, skipped }; }
      catch (e) { skipped.push({ provider: p.provider, label: p.label, kind: e.kind ?? 'other', reason: String(e.message).slice(0, 160) }); }
    }
    const err = new Error(skipped.map(s => `${s.label} ${s.reason}`).join('; ')); err.skipped = skipped; throw err;
  };
  return {
    providers: list, url: list.map(p => p.label).join(', '),
    choose: run('choose'), translate: run('translate'),
    /** No billable calls. Reports the first provider that would answer now. */
    async health() {
      for (const p of list) if (p.probe) await p.probe();
      const st = list.map(p => p.status());
      const active = st.find(s => s.ready);
      if (!active) { const e = new Error('no model provider ready'); e.providers = st; throw e; }
      return { ...active, providers: st };
    },
  };
}
