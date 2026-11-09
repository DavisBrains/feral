// The creatures' actual work product: a caption card SVG, hashed for settlement.
import { createHash } from 'node:crypto';
export const sha = x => createHash('sha256').update(x).digest('hex');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function wrap(text, n = 34) { const out = []; let line = ''; for (const w of text.split(/\s+/)) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = ''; } line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
import { renderBilingual, renderShort } from './card.mjs';
// Deterministic. Same inputs give the same SVG, so the hash settled on chain can be reproduced.
export function renderCard({ en, es, maker, translator, job, season, turn, reward, translationMode }) {
  const M = maker[0].toUpperCase() + maker.slice(1), T = translator ? translator[0].toUpperCase() + translator.slice(1) : '';
  const note = es && translationMode !== 'supplied text' ? `Spanish by ${String(translationMode).replace(/ live$/, '').replace(/^.*\//, '')}, unreviewed. Test tokens only.` : 'Valueless test tokens on NEAR testnet.';
  const svg = es
    ? renderBilingual({ title: `Season ${season} turn ${turn}`, segments: [{ en, es }], job, credit: `${T} ${translationMode === 'supplied text' ? 'used supplied Spanish' : 'translated live'}. ${M} set the card.`, paid: String(reward ?? ''), note })
    : renderShort({ caption: en, job, credit: `${M} wrote it alone.`, paid: String(reward ?? ''), note });
  return { svg, hash: sha(svg) };
}
