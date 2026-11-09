import test from 'node:test'; import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import path from 'node:path';
import { Engine } from './engine.mjs';

const lives = [{ id: 'moss.x', life: { name: 'moss' } }, { id: 'ash.x', life: { name: 'ash' } }];
function make(season = { id: 3, status: 'live', turn: 1, demand: 1, closed: false, pending: '0' }) {
  const calls = [];
  const chain = { call: async (method, args) => { calls.push({ method, args }); return { ok: true, hash: 'H' + calls.length }; },
    snapshot: async () => ({ season, lives, economy: { season: season?.id ?? 0 } }) };
  const e = new Engine({ dataDir: mkdtempSync(path.join(tmpdir(), 'feral-')), model: null, chain, now: () => 0 });
  return { e, calls };
}
const status = async p => { try { await p; return 200; } catch (err) { return err.status; } };

test('visitor job reward must be 30 to 100 in steps of 10', async () => {
  const { e, calls } = make();
  for (const reward of [20, 35, 110, 'x', 1.5]) assert.equal(await status(e.visitor('v', { type: 'job', reward, line: 0, turns: 1 })), 400, String(reward));
  assert.equal(calls.length, 0);
  assert.equal(await status(e.visitor('v', { type: 'job', reward: 100, line: 0, turns: 3 })), 200);
  assert.deepEqual(calls[0].args, { job_id: 's3-v1', reward: '100', from_budget: true, expiry_turns: 3 });
});
test('visitor job open turns must be 1 to 3', async () => {
  const { e, calls } = make();
  for (const turns of [0, 4, 'two']) assert.equal(await status(e.visitor('v', { type: 'job', reward: 60, line: 0, turns })), 400);
  assert.equal(calls.length, 0);
});
test('sponsor amounts and feed targets are bounded', async () => {
  const { e, calls } = make();
  assert.equal(await status(e.visitor('v', { type: 'sponsor', actor: 'moss.x', amount: 1000 })), 400);
  assert.equal(await status(e.visitor('v', { type: 'feed', actor: 'evil.testnet' })), 400);
  assert.equal(await status(e.visitor('v', { type: 'demand', kind: 7 })), 400);
  assert.equal(calls.length, 0);
  assert.equal(await status(e.visitor('v', { type: 'sponsor', actor: 'moss.x', amount: 40 })), 200);
  assert.equal(calls[0].method, 'sponsor');
});
test('no visitor action without a live season', async () => {
  const { e, calls } = make(null);
  assert.equal(await status(e.visitor('v', { type: 'feed', actor: 'moss.x' })), 409);
  assert.equal(calls.length, 0);
});
test('one keeper action at a time', async () => {
  const { e } = make(); let release; e.chain.call = () => new Promise(r => { release = () => r({ ok: true, hash: 'H' }); });
  const first = e.visitor('v', { type: 'feed', actor: 'moss.x' });
  await new Promise(r => setTimeout(r, 5));
  assert.equal(await status(e.visitor('v', { type: 'feed', actor: 'ash.x' })), 409);
  release(); await first;
});
test('labels shown to visitors have no colons', async () => {
  const { e } = make();
  await e.visitor('v', { type: 'job', reward: 60, line: 0, turns: 2 });
  await e.visitor('v', { type: 'demand', kind: 0 });
  for (const l of e.log) assert.ok(!l.label.includes(':'), l.label);
});
