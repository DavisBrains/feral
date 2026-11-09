import test from 'node:test'; import assert from 'node:assert/strict';
import { keepAwake } from './awake.mjs';
const fakeTimers = () => { const t = { fn: null, cleared: false, setInterval: (fn, ms) => { t.fn = fn; t.ms = ms; return 1; }, clearInterval: () => { t.cleared = true; } }; return t; };
test('keep awake pings only /healthz every ten minutes and stops after the end date', async () => {
  let now = Date.parse('2026-11-10T00:00:00Z'); const hits = []; const timers = fakeTimers();
  const id = keepAwake({ url: 'https://feral-keeper.onrender.com', until: '2026-11-26T00:00:00Z', now: () => now, timers, fetchImpl: async u => { hits.push(String(u)); return { ok: true }; } });
  assert.equal(id, 1); assert.equal(timers.ms, 10 * 60e3);
  timers.fn(); assert.deepEqual(hits, ['https://feral-keeper.onrender.com/healthz']);
  now = Date.parse('2026-11-26T00:00:01Z'); timers.fn(); assert.equal(hits.length, 1); assert.equal(timers.cleared, true);
});
test('keep awake stays off without a url or a future end date', () => {
  assert.equal(keepAwake({ url: '', until: '2099-01-01' }), null);
  assert.equal(keepAwake({ url: 'https://x', until: '' }), null);
  assert.equal(keepAwake({ url: 'https://x', until: '2000-01-01' }), null);
});
