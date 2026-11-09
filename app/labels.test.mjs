import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { placeLabels } from './src/labels.ts';
// Real label inputs captured from the running page (stage size, creature keep out boxes, label sizes, notes).
const fixtures = JSON.parse(readFileSync(new URL('./label-fixtures.json', import.meta.url)));
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [name, f] of Object.entries(fixtures)) {
  test(`${name} labels stay inside the stage and clear creatures, notes and each other`, () => {
    const placed = placeLabels(f.wants, f.W, f.H, f.notes, f.compact, new Map());
    assert.equal(placed.length, f.wants.length);
    const rect = p => { const w = f.wants.find(i => i.key === p.key); return { x: p.x, y: p.y, w: w.w, h: w.h }; };
    for (const p of placed) {
      const r = rect(p);
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= f.W && r.y + r.h <= f.H, `${p.key} outside the stage`);
      for (const it of f.wants) assert.ok(!overlap(r, it.box), `${p.key} covers ${it.key}`);
      for (const n of f.notes) assert.ok(!overlap(r, n), `${p.key} covers a note`);
      for (const q of placed) if (q !== p) assert.ok(!overlap(r, rect(q)), `${p.key} hits ${q.key}`);
    }
  });
}
test('placement is stable between frames', () => {
  for (const f of Object.values(fixtures)) {
    const cache = new Map();
    const a = placeLabels(f.wants, f.W, f.H, f.notes, f.compact, cache), b = placeLabels(f.wants, f.W, f.H, f.notes, f.compact, cache);
    assert.deepEqual(a, b);
  }
});
test('a blocked slot moves the label instead of covering the block', () => {
  const f = fixtures['desktop-live'];
  const first = placeLabels(f.wants, f.W, f.H, f.notes, f.compact, new Map());
  const w = f.wants.find(i => i.key === first[0].key);
  const block = { x: first[0].x, y: first[0].y, w: w.w, h: w.h };
  const again = placeLabels(f.wants, f.W, f.H, [...f.notes, block], f.compact, new Map()).find(p => p.key === first[0].key);
  assert.ok(!overlap({ x: again.x, y: again.y, w: w.w, h: w.h }, block));
});
