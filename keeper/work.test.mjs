import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { renderCard } from './work.mjs';
const input = { en: 'Fresh bread every morning.', es: 'Pan fresco cada mañana.', maker: 'moss', translator: 'echo', job: 's2-v1', season: 2, turn: 1, reward: 60, translationMode: 'Qwen2.5-1.5B-Instruct live' };
test('live cards are deterministic so the settled hash can be reproduced', () => {
  const a = renderCard(input), b = renderCard({ ...input });
  assert.equal(a.svg, b.svg); assert.equal(a.hash, b.hash);
  assert.equal(a.hash, createHash('sha256').update(a.svg).digest('hex'));
  assert.notEqual(renderCard({ ...input, es: 'Pan del día.' }).hash, a.hash);
});
test('live cards use the field case design and carry no active content', () => {
  const { svg } = renderCard(input);
  assert.match(svg, /PAID WORK · BILINGUAL CARD/); assert.match(svg, /Pan fresco cada mañana\./); assert.match(svg, /unreviewed/);
  assert.ok(!/<script|foreignObject|\son\w+=/i.test(svg));
  assert.match(renderCard({ ...input, es: null, translator: null }).svg, /SHORT CAPTION/);
  assert.match(renderCard({ ...input, en: '<b>&</b>' }).svg, /&lt;b&gt;&amp;&lt;\/b&gt;/);
});
test('the proof run card is untouched', () => {
  const proof = readFileSync(new URL('../app/public/live-work/card.svg', import.meta.url));
  const chain = JSON.parse(readFileSync(new URL('../app/public/chain.json', import.meta.url)));
  const want = JSON.stringify(chain).match(/[0-9a-f]{64}/g) ?? [];
  assert.ok(want.includes(createHash('sha256').update(proof).digest('hex')), 'proof card hash not found in chain.json');
});
