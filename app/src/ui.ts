// Shared field case markup helpers. Class names follow design/phase3 (f- prefix).
import sealAmber from './assets/seals/seal_amber_96.webp';
import sealMoss from './assets/seals/seal_moss_96.webp';
import sealFossil from './assets/seals/seal_fossil_96.webp';
import sealLilac from './assets/seals/seal_lilac_96.webp';
import sealCream from './assets/seals/seal_cream_96.webp';
import sealPending from './assets/seals/seal_pending_blind_96.webp';
import coin from '../../design/phase1/runtime/props/munch_seed_coin_front.webp';
import mossImg from '../../design/phase1/runtime/creatures/moss/moss_front_128.webp?url';
import echoImg from '../../design/phase1/runtime/creatures/echo/echo_front_128.webp?url';
import ashImg from '../../design/phase1/runtime/creatures/ash/ash_front_128.webp?url';
import pipImg from '../../design/phase1/runtime/creatures/pip/pip_front_128.webp?url';
import ashFossilImg from '../../design/phase1/runtime/creatures/ash/ash_fossil_128.webp?url';

export const SEAL = { amber: sealAmber, moss: sealMoss, fossil: sealFossil, lilac: sealLilac, cream: sealCream, pending: sealPending };
export const COIN = coin;
export const PORTRAIT: Record<string, string> = { moss: mossImg, echo: echoImg, ash: ashImg, pip: pipImg, 'ash-fossil': ashFossilImg };
export const COLOR: Record<string, string> = { moss: 'var(--moss)', echo: 'var(--echo)', ash: 'var(--ash)', pip: 'var(--pip)' };
export const esc = (s: unknown) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const ico = (n: string, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const short = (h: string) => (h && h.length > 12 ? `${h.slice(0, 4)}…${h.slice(-4)}` : h ?? '');
export const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
export const nf = (n: number | string) => Number(n).toLocaleString('en-US');
export const TX = (h: string) => `https://testnet.nearblocks.io/txns/${h}`;
export const ACCT = (a: string) => `https://testnet.nearblocks.io/address/${a}`;
export const txLink = (h: string | null | undefined, text?: string, cls = 'f-link mono') => h ? `<a class="${cls}" href="${esc(TX(h))}" title="${esc(h)}" target="_blank" rel="noopener noreferrer">${esc(text ?? short(h))} ${ico('explorer', 'ico-s')}</a>` : '';
export const acctLink = (a: string, text?: string) => `<a class="f-link mono" href="${esc(ACCT(a))}" target="_blank" rel="noopener noreferrer">${esc(text ?? a)} ${ico('explorer', 'ico-s')}</a>`;
/** Contract mood bands from the UI spec. */
export function moodWord(balance: number, active: boolean, newborn = false): { word: string; cls: string } {
  if (!active) return { word: 'Fossil', cls: 'is-fossil' };
  if (newborn) return { word: 'Newborn', cls: '' };
  if (balance >= 180) return { word: 'Thriving', cls: '' };
  if (balance >= 60) return { word: 'Steady', cls: '' };
  if (balance >= 20) return { word: 'Hungry', cls: 'is-hungry' };
  return { word: 'Starving', cls: 'is-critical' };
}
/** The season goal vine: one leaf per survived turn, nodes for turns to come. */
export function lane(name: string, color: string, held: number, total: number, alive: boolean, endedTurn: number | null) {
  const W = 200, step = W / total, pts = Math.max(0, Math.min(total, held));
  let vine = 'M0,14'; for (let i = 1; i <= pts; i++) vine += ` Q${((i - .5) * step).toFixed(1)},${i % 2 ? 20 : 8} ${(i * step).toFixed(1)},14`;
  const leaves = Array.from({ length: pts }, (_, i) => `<path class="leaf" d="M${((i + 1) * step - 2).toFixed(1)},14 c-2,-8 4,-12 9,-12 c0,6 -4,11 -9,12z"/>`).join('');
  const nodes = Array.from({ length: total - pts }, (_, i) => `<circle class="node" cx="${((pts + i + 1) * step).toFixed(1)}" cy="14" r="3.5"/>`).join('');
  const stone = alive ? '' : `<g transform="translate(${Math.max(0, pts * step - 11).toFixed(1)},3)"><circle cx="11" cy="11" r="12" fill="var(--forest)" stroke="var(--fossil)"/><use href="#i-fossil" x="2" y="2" width="18" height="18" stroke="#C3C6BB" fill="none"/></g>`;
  return `<div class="f-lane" style="--c:${color}"><span class="who"><i></i>${esc(name)} line</span><svg viewBox="-4 -4 208 36" aria-hidden="true"><path class="vine" d="${vine}"/><path class="rest" d="M${(pts * step).toFixed(1)},14 L${W},14"/>${leaves}${nodes}${stone}</svg><span class="st">${alive ? `${held} of ${total}` : `ended t${endedTurn}`}</span></div>`;
}
