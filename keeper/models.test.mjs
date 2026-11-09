import test from 'node:test'; import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import path from 'node:path';
import { nearAiAdapter, localAdapter, modelChain, classify, loadEnvFile, localModelEnabled } from './models.mjs';
import { decide, translate } from './policy.mjs';

const KEY = 'sk-test-SECRET-123';
const res = (status, body, headers = {}) => ({ ok: status < 300, status, headers: { get: k => headers[k.toLowerCase()] ?? null }, json: async () => body, text: async () => JSON.stringify(body) });
const answer = obj => res(200, { model: 'Qwen/Qwen3-VL-30B-A3B-Instruct', choices: [{ message: { content: JSON.stringify(obj) } }] });
const NO_CREDIT = res(402, { error: { message: 'No spending limit configured. Please contact support to set up credits.', type: 'no_limit_configured', param: null, code: null } });
const opts = [{ action: 'wait' }, { action: 'bid', job: 'j1', price: 60 }];

test('the real NEAR AI no credit error is classified as billing', () => {
  assert.equal(classify(402, { error: { type: 'no_limit_configured' } }), 'billing');
  assert.equal(classify(400, { error: { message: 'Insufficient credits' } }), 'billing');
  assert.equal(classify(429, {}), 'rate'); assert.equal(classify(401, {}), 'auth'); assert.equal(classify(500, {}), 'other');
});
test('NEAR AI answers with a legal option, its reason, and the bearer key only in the header', async () => {
  let sent;
  const ai = nearAiAdapter({ key: KEY, fetchImpl: async (url, init) => { sent = { url, init }; return answer({ choice: 1, reason: 'It pays my upkeep.' }); } });
  const r = await ai.choose({ you: 'moss' }, opts);
  assert.deepEqual(r.decision, opts[1]); assert.equal(r.reason, 'It pays my upkeep.');
  assert.equal(sent.url, 'https://cloud-api.near.ai/v1/chat/completions');
  assert.equal(sent.init.headers.authorization, `Bearer ${KEY}`); assert.ok(!sent.init.body.includes(KEY));
  assert.deepEqual(JSON.parse(sent.init.body).response_format.json_schema.schema.properties.choice.enum, [0, 1]);
});
test('no credits trips the breaker so later calls do not hit the API', async () => {
  let calls = 0, t = 0;
  const ai = nearAiAdapter({ key: KEY, now: () => t, fetchImpl: async () => { calls++; return NO_CREDIT; } });
  await assert.rejects(ai.choose({}, opts), e => e.kind === 'billing' && !e.message.includes(KEY));
  for (let i = 0; i < 5; i++) await assert.rejects(ai.choose({}, opts));
  await assert.rejects(ai.translate('Hi.'));
  assert.equal(calls, 1);
  assert.equal(ai.status().ready, false); assert.equal(ai.status().blocked.kind, 'billing');
  t += 15 * 60e3 + 1; await assert.rejects(ai.choose({}, opts)); assert.equal(calls, 2); // one retry after the cooldown
  t += 15 * 60e3 + 1; await assert.rejects(ai.choose({}, opts)); assert.equal(calls, 2); // and the cooldown doubles
});
test('the key never appears in errors even if the API echoes it', async () => {
  const ai = nearAiAdapter({ key: KEY, fetchImpl: async () => res(401, { error: { message: `bad key ${KEY}` } }) });
  await assert.rejects(ai.choose({}, opts), e => !e.message.includes(KEY) && e.message.includes('[key]'));
});
test('an out of range choice is refused, not trusted', async () => {
  const ai = nearAiAdapter({ key: KEY, fetchImpl: async () => answer({ choice: 7, reason: 'x' }) });
  await assert.rejects(ai.choose({}, opts));
});
test('chain falls back to local Qwen and says why, then to the fixed policy', async () => {
  const ai = nearAiAdapter({ key: KEY, fetchImpl: async () => NO_CREDIT });
  let localUp = true;
  const local = localAdapter('http://local', async (url) => {
    if (!localUp) throw new Error('connect ECONNREFUSED');
    if (url.endsWith('/choose')) return res(200, { decision: opts[1], model: 'Qwen/Qwen2.5-1.5B-Instruct', seconds: 1.2, reason: 'Food first.' });
    if (url.endsWith('/translate')) return res(200, { es: 'Hola.', model: 'Qwen/Qwen2.5-1.5B-Instruct', seconds: 1 });
    return res(200, { model: 'Qwen/Qwen2.5-1.5B-Instruct' });
  });
  const chain = modelChain([ai, local]);
  const life = { id: 'moss.x', balance: '100', life: { name: 'moss', active: true, goal: 0, pending: false, genome: { job: 1, price: 4, floor: 4 } } };
  const snap = { season: { turn: 1, demand: 1, demand_version: 1, target_turns: 8 }, lives: [life], jobs: [{ id: 'j1', kind: 1, state: 'open', demand_version: 1, expiry_turn: 3, reward: '60', bids: [] }] };
  const d = await decide(life, snap, chain);
  assert.equal(d.mode, 'live-model'); assert.equal(d.provider, 'local-qwen'); assert.equal(d.provider_label, 'Local Qwen fallback');
  assert.equal(d.skipped[0].provider, 'near-ai'); assert.match(d.skipped[0].reason, /no credits/);
  const t = await translate('Hello.', chain); assert.equal(t.provider, 'local-qwen'); assert.equal(t.es, 'Hola.');
  localUp = false;
  const d2 = await decide(life, snap, chain);
  assert.equal(d2.mode, 'fixed-policy'); assert.equal(d2.provider_label, 'Fixed policy'); assert.equal(d2.skipped.length, 2);
  await assert.rejects(chain.health(), e => e.providers.length === 2);
});
test('env file loads names without overriding and without exposing values', () => {
  const f = path.join(mkdtempSync(path.join(tmpdir(), 'env-')), 'x.env'); writeFileSync(f, `NEAR_AI_KEY="${KEY}"\nOTHER=1\n`);
  const env = { OTHER: 'keep' };
  assert.deepEqual(loadEnvFile(f, env), ['NEAR_AI_KEY']); assert.equal(env.NEAR_AI_KEY, KEY); assert.equal(env.OTHER, 'keep');
  assert.deepEqual(loadEnvFile('/no/such/file', env), []);
});

test('a billing block is saved and restored so a restart does not call again', async () => {
  let saved = null, calls = 0, t = 1000;
  const state = { load: () => saved, save: j => { saved = j; } };
  const a = nearAiAdapter({ key: KEY, now: () => t, state, fetchImpl: async () => { calls++; return NO_CREDIT; } });
  await assert.rejects(a.choose({}, opts)); assert.equal(saved.kind, 'billing'); assert.ok(!JSON.stringify(saved).includes(KEY));
  const b = nearAiAdapter({ key: KEY, now: () => t, state, fetchImpl: async () => { calls++; return NO_CREDIT; } });
  await assert.rejects(b.choose({}, opts)); assert.equal(calls, 1); assert.equal(b.status().ready, false);
});

test('local Qwen stays off unless FERAL_LOCAL_MODEL is set', () => {
  assert.equal(localModelEnabled({}), false);
  assert.equal(localModelEnabled({ FERAL_LOCAL_MODEL: '' }), false);
  assert.equal(localModelEnabled({ FERAL_LOCAL_MODEL: '0' }), false);
  assert.equal(localModelEnabled({ FERAL_LOCAL_MODEL: '1' }), true);
  assert.equal(localModelEnabled({ FERAL_LOCAL_MODEL: 'true' }), true);
});
