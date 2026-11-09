// Feral caption card, field case edition. Reference renderer for the app's card generator to port.
// Pure and deterministic. Same input gives the same SVG string, so output_sha256 stays reproducible.
// Inputs mirror agents/tools.mjs renderTranscript: { title, segments:[{en, es}] } plus optional meta.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const LIMITS = {
  bilingual: { title: 48, titleLine: 24, titleLines: 2, line: 44, linesPerLang: 3, segments: 4 },
  short: { caption: 64, captionLine: 16, captionLines: 4 },
  meta: { job: 24, credit: 56 },
};
export function wrap(text, max, maxLines) {
  const words = String(text).trim().split(/\s+/); const out = []; let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  // no widows. If the last line is one word and the line above has 3 or more, move one word down.
  if (out.length > 1 && !/\s/.test(out[out.length - 1])) { const prev = out[out.length - 2].split(' '); if (prev.length >= 3) { const mv = prev.pop(); const cand = mv + ' ' + out[out.length - 1]; if (cand.length <= max) { out[out.length - 2] = prev.join(' '); out[out.length - 1] = cand; } } }
  if (out.length > maxLines) { const keep = out.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1].replace(/\s*\S*$/, '') + '…'; return keep; }
  return out;
}
const C = { paper: '#E9E4D2', paper2: '#DCD5BE', ink: '#162018', ink2: '#3E4A3C', ink3: '#555F50', echo: '#1E5466', moss: '#3B5E1E', amber: '#B9722F', amberHi: '#F3BF88', amberLo: '#7E4613' };
const F = { d: "Fraunces, 'Iowan Old Style', Georgia, serif", t: "'Instrument Sans', system-ui, sans-serif", m: "'IBM Plex Mono', ui-monospace, monospace" };
function defs() {
  return `<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .09  0 0 0 0 .12  0 0 0 0 .09  0 0 0 .09 0"/></filter>`
    + `<filter id="blot" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .12  0 0 0 .10 -.03"/></filter>`
    + `<radialGradient id="wax" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${C.amberHi}"/><stop offset=".55" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.amberLo}"/></radialGradient>`
    + `<radialGradient id="seed" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#FAD9AE"/><stop offset="1" stop-color="#A9672A"/></radialGradient></defs>`;
}
function paper(w, h) {
  return `<rect width="${w}" height="${h}" fill="${C.paper}"/><rect width="${w}" height="${h}" filter="url(#blot)"/><rect width="${w}" height="${h}" filter="url(#grain)"/>`
    + `<rect x="36" y="36" width="${w - 72}" height="${h - 72}" fill="none" stroke="${C.ink}" stroke-opacity=".28" stroke-width="1.5"/>`
    + `<rect x="46" y="46" width="${w - 92}" height="${h - 92}" fill="none" stroke="${C.ink}" stroke-opacity=".12" stroke-width="1"/>`;
}
function seal(cx, cy, r) {
  const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rr = r * (1 + (i % 2 ? .045 : -.03) + (i % 5 === 0 ? .03 : 0)); pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr * 1.08).toFixed(1)}`); }
  const s = r * .42;
  return `<g transform="rotate(-8 ${cx} ${cy})"><polygon points="${pts.join(' ')}" fill="url(#wax)" stroke="${C.amberLo}" stroke-width="2" stroke-linejoin="round"/>`
    + `<ellipse cx="${cx}" cy="${cy}" rx="${r * .76}" ry="${r * .82}" fill="none" stroke="${C.amberLo}" stroke-opacity=".6" stroke-width="3"/>`
    + `<path d="M${cx},${cy - s * 1.35} C${cx + s},${cy - s * .6} ${cx + s},${cy + s * .7} ${cx},${cy + s * 1.35} C${cx - s},${cy + s * .7} ${cx - s},${cy - s * .6} ${cx},${cy - s * 1.35}Z" fill="url(#seed)" stroke="${C.amberLo}" stroke-width="2.5"/>`
    + `<path d="M${cx - r * .62},${cy + r * .38} C${cx - r * .3},${cy + r * .2} ${cx - r * .2},${cy + r * .62} ${cx},${cy + s * 1.3} C${cx + r * .2},${cy + r * .62} ${cx + r * .3},${cy + r * .2} ${cx + r * .62},${cy + r * .38}" fill="none" stroke="${C.amberLo}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M${cx + 2},${cy - s * .8} l-5,${s * .7} l6,${s * .5}" fill="none" stroke="${C.amberLo}" stroke-opacity=".7" stroke-width="2"/></g>`;
}
const root = (x, y, w) => `<path d="M${x},${y} C${x + w * .2},${y - 8} ${x + w * .35},${y + 9} ${x + w * .55},${y + 1} S${x + w * .85},${y - 7} ${x + w},${y + 2}" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/><path d="M${x + w * .55},${y + 1} c10,8 14,16 30,20 M${x + w * .3},${y + 2} c-4,10 -14,14 -26,15" fill="none" stroke="${C.ink}" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>`;
const sprig = (x, y) => `<g fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M${x},${y} c-6,-30 -2,-58 18,-84"/><path d="M${x - 1},${y - 30} c-18,-4 -30,-16 -32,-32 c16,2 28,14 32,32z"/><path d="M${x + 6},${y - 56} c14,-8 30,-8 40,2 c-12,10 -28,10 -40,-2z"/><path d="M${x + 18},${y - 84} c-2,-10 4,-18 12,-22"/><ellipse cx="${x + 2}" cy="${y + 8}" rx="9" ry="12"/><path d="M${x + 2},${y - 2} v18" stroke-opacity=".6"/></g>`;
function header(w, kicker, job) {
  return `<text x="84" y="118" font-family="${F.t}" font-weight="600" font-size="22" letter-spacing="3.5" fill="${C.ink3}">${esc(kicker.toUpperCase())}</text>`
    + (job ? `<text x="${w - 84}" y="118" text-anchor="end" font-family="${F.m}" font-size="21" fill="${C.ink3}">${esc(job.slice(0, LIMITS.meta.job))}</text>` : '');
}
function footer(w, h, meta) {
  let y = h - 150; let s = root(84, y - 40, w - 330);
  if (meta.credit) s += `<text x="84" y="${y + 6}" font-family="${F.d}" font-style="italic" font-size="30" fill="${C.ink2}">${esc(meta.credit.slice(0, LIMITS.meta.credit))}</text>`;
  if (meta.paid) s += `<text x="84" y="${y + 50}" font-family="${F.m}" font-weight="500" font-size="24" fill="${C.ink}">Paid ${esc(meta.paid)} MUNCH</text>`;
  s += `<text x="84" y="${h - 70}" font-family="${F.m}" font-size="19" fill="${C.ink3}">${esc(meta.note || 'Made from the supplied transcript with a trusted tool.')}</text>`;
  return s + seal(w - 170, h - 160, 74);
}
export function renderBilingual({ title, segments, job = '', credit = '', paid = '', note = '' }) {
  const L = LIMITS.bilingual, w = 1080;
  const tl = wrap(title, L.titleLine, L.titleLines);
  const segs = segments.slice(0, L.segments).map(s => ({ en: wrap(s.en, L.line, L.linesPerLang), es: wrap(s.es, L.line, L.linesPerLang) }));
  const TITLE_Y = 236, TITLE_LH = 82, LINE_LH = 50, PAIR_GAP = 34, LANG_GAP = 10;
  let y = TITLE_Y + (tl.length - 1) * TITLE_LH + 92; let body = '';
  segs.forEach((s, i) => {
    body += `<text x="84" y="${y}" font-family="${F.m}" font-weight="500" font-size="18" fill="${C.ink3}">EN</text>`;
    s.en.forEach((l, j) => { body += `<text x="150" y="${y + j * LINE_LH}" font-family="${F.d}" font-size="40" fill="${C.ink}">${esc(l)}</text>`; });
    y += s.en.length * LINE_LH + LANG_GAP;
    body += `<text x="84" y="${y}" font-family="${F.m}" font-weight="500" font-size="18" fill="${C.echo}">ES</text>`;
    s.es.forEach((l, j) => { body += `<text x="150" y="${y + j * LINE_LH}" font-family="${F.d}" font-style="italic" font-size="40" fill="${C.echo}">${esc(l)}</text>`; });
    y += s.es.length * LINE_LH;
    body += `<line x1="150" y1="${y - 14}" x2="${i < segs.length - 1 ? 300 : 150}" y2="${y - 14}" stroke="${C.ink}" stroke-opacity=".18" stroke-width="1.5" stroke-dasharray="2 6"/>`;
    y += PAIR_GAP;
  });
  const h = Math.max(1350, y + 300);
  const titleSvg = tl.map((l, i) => `<text x="84" y="${TITLE_Y + i * TITLE_LH}" font-family="${F.d}" font-weight="500" font-size="76" letter-spacing="-1" fill="${C.ink}">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${paper(w, h)}${header(w, 'Feral · paid work · bilingual card', job)}${sprig(w - 150, 300)}${titleSvg}${body}${footer(w, h, { credit, paid, note })}</svg>`;
}
export function renderShort({ caption, job = '', credit = '', paid = '', note = '' }) {
  const L = LIMITS.short, w = 1080, h = 1080;
  const cl = wrap(caption, L.captionLine, L.captionLines);
  const LH = 112, top = 250 + (L.captionLines - cl.length) * LH / 2 + 70;
  const cap = cl.map((l, i) => `<text x="84" y="${top + i * LH}" font-family="${F.d}" font-weight="480" font-size="104" letter-spacing="-1.5" fill="${C.ink}">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${paper(w, h)}${header(w, 'Feral · paid work · short caption', job)}${sprig(w - 150, 330)}<text x="84" y="${top - 118}" font-family="${F.d}" font-size="160" fill="${C.ink}" fill-opacity=".12">“</text>${cap}${footer(w, h, { credit, paid, note })}</svg>`;
}
// Slot templates with {{tokens}} for generators that prefer string fill over code.
export function template(kind) {
  if (kind === 'short') return renderShort({ caption: '{{caption_l1}} {{caption_l2}} {{caption_l3}}', job: '{{job_id}}', credit: '{{credit}}', paid: '{{paid}}', note: '{{note}}' });
  return renderBilingual({ title: '{{title_l1}} {{title_l2}}', segments: [{ en: '{{seg1_en_l1}} {{seg1_en_l2}}', es: '{{seg1_es_l1}} {{seg1_es_l2}}' }, { en: '{{seg2_en_l1}}', es: '{{seg2_es_l1}}' }, { en: '{{seg3_en_l1}}', es: '{{seg3_es_l1}}' }], job: '{{job_id}}', credit: '{{credit}}', paid: '{{paid}}', note: '{{note}}' });
}
