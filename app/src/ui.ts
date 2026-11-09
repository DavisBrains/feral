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

// Plain words for the jargon. Shown in one tooltip box on hover, focus or tap (see installTips).
export const TIPS: Record<string, string> = {
  munch: 'MUNCH is the play coin of Feral. It has no real value. Creatures spend it to stay alive.',
  upkeep: 'Upkeep is the 10 MUNCH every living creature pays each turn. It is burned, so it is gone for good.',
  pouch: 'Your pouch is the MUNCH you get for one season. You spend it on meals, sponsors and jobs.',
  bid: 'A bid is the price a creature asks to do a job. The lowest fair bid wins the work.',
  settle: 'Settling is when the contract pays for finished work and charges upkeep, all on chain.',
  demand: 'The market pays for one kind of work each turn. Pinning a new notice changes what the creatures chase.',
  sponsor: 'Sponsoring gives a creature extra MUNCH from your pouch. Only the holder of its life NFT may do it.',
  lineage: 'A lineage is one family line, a founder plus every child born from it.',
  goal: 'Keep two family lines alive until the last turn of the season to win.',
  fixed: 'The creatures think with NEAR AI. When the AI can not answer in time, each creature uses its written rules as a backup, and the note says so.',
  qwen: 'A small open AI model on the keeper picks each move from the moves the contract allows.',
  nearai: 'A real AI model on NEAR AI Cloud thinks for each creature and picks one of the moves the contract allows. If it ever fails, the written rules step in as a backup.',
  proof: 'A replay of a real run that already happened on NEAR testnet. Nothing new is sent.',
  stone: 'A creature that cannot pay upkeep dies and becomes a fossil. The contract refuses anything it tries after that.',
};
/** Wrap a jargon word so it explains itself. `html` is trusted markup. */
export const tip = (html: string, key: keyof typeof TIPS | string, quiet = false) =>
  `<span class="f-term${quiet ? ' is-quiet' : ''}" tabindex="0" role="button" aria-describedby="tipdef-${key}" data-tip="${key}">${html}</span>`;
export function installTips() {
  if (document.getElementById('f-tipbox')) return;
  const defs = document.createElement('div'); defs.hidden = true;
  defs.innerHTML = Object.entries(TIPS).map(([k, t]) => `<span id="tipdef-${k}">${esc(t)}</span>`).join('');
  const box = document.createElement('div'); box.id = 'f-tipbox'; box.className = 'f-tipbox'; box.setAttribute('role', 'tooltip'); box.hidden = true;
  document.body.append(defs, box);
  let cur: HTMLElement | null = null, pinned = false;
  const show = (el: HTMLElement) => {
    cur = el; box.textContent = TIPS[el.dataset.tip!] ?? ''; box.hidden = false;
    const r = el.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight, m = 12;
    const x = Math.max(m, Math.min(innerWidth - bw - m, r.left + r.width / 2 - bw / 2));
    const above = r.top - bh - 10 > m;
    box.style.left = x + 'px'; box.style.top = (above ? r.top - bh - 10 : r.bottom + 10) + 'px';
    box.dataset.side = above ? 'top' : 'bottom';
  };
  const hide = () => { cur = null; pinned = false; box.hidden = true; };
  const termOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('.f-term') as HTMLElement | null;
  document.addEventListener('mouseover', e => { const el = termOf(e.target); if (el && !pinned) show(el); });
  document.addEventListener('mouseout', e => { const el = termOf(e.target); if (el && !pinned && !el.contains(e.relatedTarget as Node)) hide(); });
  document.addEventListener('focusin', e => { const el = termOf(e.target); if (el) show(el); });
  document.addEventListener('focusout', e => { if (termOf(e.target) && !pinned) hide(); });
  document.addEventListener('click', e => {
    const el = termOf(e.target);
    if (el) { e.stopPropagation(); if (cur === el && pinned) hide(); else { show(el); pinned = true; } return; }
    if (pinned) hide();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); else if ((e.key === 'Enter' || e.key === ' ') && termOf(e.target)) { e.preventDefault(); show(termOf(e.target)!); pinned = true; } });
  addEventListener('scroll', () => { if (cur && !pinned) hide(); else if (cur) show(cur); }, { passive: true });
}
