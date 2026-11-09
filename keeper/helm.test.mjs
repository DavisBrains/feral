import test from 'node:test';
import assert from 'node:assert/strict';
import { you, takeOver, helmOf } from './helm.mjs';
const S = { id: 2, status: 'live', pilot: 'A', turn: 5, target_turns: 8 };
const M = 10 * 60 * 1000;
test('the starter holds the season until it sits idle', () => {
  const meta = { lastActivity: 1000 };
  assert.equal(you(meta, S, 'A', 2000).pilot, true);
  const b = you(meta, S, 'B', 2000);
  assert.deepEqual([b.pilot, b.can_take, b.can_start], [false, false, false]);
  assert.ok(b.lease_left_ms > 0);
});
test('an idle season passes to the next visitor and stays on chain', () => {
  const meta = { lastActivity: 0 };
  const b = you(meta, S, 'B', M + 1);
  assert.equal(b.can_take, true); assert.equal(b.can_start, false);
  assert.equal(takeOver(meta, S, 'B', M + 1).ok, true);
  assert.equal(helmOf(meta, S), 'B');
  assert.equal(you(meta, S, 'B', M + 2).pilot, true);
  assert.equal(you(meta, S, 'A', M + 2).pilot, false);
  assert.equal(takeOver(meta, S, 'C', M + 2).ok, false, 'fresh helm is not idle');
});
test('a visitor can not wipe a live season, only take it over', () => {
  assert.equal(you({ lastActivity: 0 }, S, 'B', 10 * M).can_start, false);
  assert.equal(you({ lastActivity: 0 }, { ...S, status: 'won' }, 'B', 10).can_start, true);
});
test('helm from an older season is ignored', () => {
  const meta = { lastActivity: 0, helm: { season: 1, pilot: 'B' } };
  assert.equal(helmOf(meta, S), 'A');
});
test('paused keeper offers nothing', () => {
  const y = you({ lastActivity: 0 }, S, 'B', 10 * M, { paused: true });
  assert.deepEqual([y.can_take, y.can_start], [false, false]);
});
