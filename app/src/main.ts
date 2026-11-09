import './tokens.css';
import '../../design/phase3/html/components.css';
import './app.css';
import icons from '../../design/phase3/assets/icons/feral-icons.svg?raw';
import refusalStamp from '../../design/phase1/runtime/props/refusal_stamp.webp';
import cornerSvg from '../../design/phase3/assets/ui/paper_corner.svg';
import evidence from '../public/run.json';
import bundledChain from '../public/chain.json';
import cardSvg from '../public/live-work/card.svg?raw';
import { buildScene, withLiveFinal, flowSummary, art, type Key, type Scene } from './scene';
import { loadAtlas } from './atlas';
import { World, LAYOUTS, SCALE, type LayoutName } from './world';
import { createPixi, createCanvas2D, type Renderer } from './render';
import { readChain, txVerdict, reconciles, type ChainState } from './chain';
import { esc, ico, short, cap, nf, txLink, acctLink, moodWord, SEAL, COLOR, PORTRAIT, COIN } from './ui';
import { placeLabels, type Box, type Slot } from './labels';

declare const __OFFLINE__: boolean;
const sepoliaFiles = import.meta.glob('../../evidence/sepolia-tool-{purchase,plan}.json', { eager: true, import: 'default' }) as Record<string, any>;
const sepolia = Object.entries(sepoliaFiles).find(([k]) => k.endsWith('purchase.json'))?.[1] ?? Object.values(sepoliaFiles)[0] ?? null;
const OFFLINE = typeof __OFFLINE__ !== 'undefined' && __OFFLINE__;
const params = new URLSearchParams(location.search);
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const baseRun: any = evidence;
let run: any = baseRun;
let chain: ChainState = bundledChain as any;
let chainLive = false;
let index = run.events.length - 1;
let playing = false, playTimer: any;
let openDrawer: Key | null = null;
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceQuery.matches || params.get('motion') === 'reduce';
// The proof run card is evidence: its SHA-256 is on chain, so it is shown byte for byte.
const cardUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardSvg);
const proof = (label: string) => run.transactions.find((t: any) => t.label === label);
const verdict = (t: any) => txVerdict(chain?.txs?.find(x => x.hash === t.hash), t.state);
const sealed = (t: any) => !!t && ['verified', 'refusal-verified'].includes(verdict(t));
const near = (yocto: string) => (Number(BigInt(yocto) / 10n ** 18n) / 1e6).toFixed(Number(BigInt(yocto) % 10n ** 20n) ? 4 : 2);
const titleOf = (kind: string) => ({
  'deploy-controller': 'The controller went live', 'register-moss': 'Moss was registered', 'register-echo': 'Echo was registered', 'register-ash': 'Ash was registered',
  'create-old-job': 'A short caption job was posted', 'old-short-bid': 'Ash bid on the short job', 'demand-shock': 'The demand board changed to bilingual cards',
  'cancel-old-job': 'The old short job lost its market', 'death-tick': 'Ash ran dry and died', 'refused-post-death-spend': 'Ash tried to spend after death',
  'create-card-job': 'A bilingual card job was posted', 'paid-collaboration': 'Moss paid Echo to translate', 'parent-bid': 'Moss bid on the card job',
  'claim-card-job': 'Moss won the card job', 'paid-job': 'Moss was paid for the caption card', 'lineage-goal': 'Moss was told to breed',
  'funded-child-account-creation': 'Moss paid for Pip to be born', 'second-upkeep': 'Upkeep paid by three creatures', 'create-child-job': 'A job opened for the child',
  'child-first-bid': 'Pip placed its first bid', 'live-now': 'Read from testnet now',
} as Record<string, string>)[kind] ?? kind.replaceAll('-', ' ');
const ORDER: Key[] = ['moss', 'echo', 'pip', 'ash', 'pip2', 'pip3', 'pip4'];
const CHAPTERS: [string, string, string][] = [['Work', 'paid-job', 'work'], ['Death', 'death-tick', 'fossil'], ['Refusal', 'refused-post-death-spend', 'alert'], ['Birth', 'funded-child-account-creation', 'birth']];
const DECISION_EVENT: Record<string, string> = { 'old-demand': 'old-short-bid', extinct: 'refused-post-death-spend', 'buy-help': 'paid-collaboration', 'provider-quote': 'paid-collaboration', 'parent-bid': 'parent-bid', reproduce: 'funded-child-account-creation', 'child-bid': 'child-first-bid' };
let mode: 'live' | 'replay' = 'replay';
let play: { refresh(): void; render(): void; notes(): NoteData[] } | null = null;
export interface NoteData { key: string; who: string; act: string; why: string | null; whyKind: 'model' | 'seen' | 'translation' | 'policy'; src: string; dim: boolean }

const sprite = document.createElement('div'); sprite.innerHTML = icons; sprite.style.display = 'none'; sprite.setAttribute('aria-hidden', 'true'); document.body.prepend(sprite);
document.body.classList.add('page');
const app = $('#app');
app.innerHTML = `
<header class="bar"><div class="brand"><span class="word disp">Feral</span><span class="caps tag">on NEAR testnet</span></div><div class="modeslot" id="pl-mode">${OFFLINE ? '' : ''}</div><div class="f-status" id="source" aria-live="polite"></div></header>
<section class="hero"><div class="hero-copy"><span class="caps eyebrow">Build Beyond Boundaries</span><h1 class="disp hero-h">Feed them work<br><em class="ital">or watch them turn to stone.</em></h1><p class="lede"><span class="long">Small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. They take jobs to stay fed, pay for their children to be born, and when one runs dry it turns to stone for good.</span><span class="short">Small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. Run dry and they turn to stone for good.</span></p><div class="cta"><a class="f-link" href="#proof">${ico('replay', 'ico-s')}Or watch the real run, every receipt included</a></div></div><div class="hero-side" id="hero-side"></div></section>
<section class="world"><div class="f-stage" id="stage"><canvas id="world" aria-hidden="true"></canvas><svg class="f-leaders" id="leaders" aria-hidden="true"></svg><div class="labels" id="labels"></div><div class="stage-notes" id="stage-notes" aria-live="polite"></div><div class="flowtag" id="flowtag" aria-hidden="true"></div><div class="loading" id="loading">Loading the habitat</div></div>
 <div class="f-panel drawer" id="drawer" hidden></div><div class="mnotes" id="mnotes"></div></section>
<section class="block season" id="season"><header class="bh"><span class="caps">Your season</span><h2 class="disp">Keep them fed</h2><p id="season-lede">Start a live season to play. Every move is a NEAR testnet transaction.</p></header><div id="season-body"></div></section>
<section class="block" id="proof"><header class="bh"><span class="caps">The proof run</span><h2 class="disp">Watch the real run</h2><p>This is the recorded run on NEAR testnet from 9 Nov. Scrub it as much as you like. Nothing new is sent.</p></header>
 <div class="f-panel pr-player"><div class="f-play"><button class="f-btn f-playbtn" id="play" aria-label="Play the recorded run"></button><div class="f-track" id="track"><svg viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true"><path class="root" d="M0,28 C150,22 300,34 500,28 S850,22 1000,28"/><path class="done" id="track-done" d=""/></svg><svg viewBox="0 0 1000 56" preserveAspectRatio="none" id="track-seeds" aria-hidden="true" style="pointer-events:none"></svg><div id="track-flags"></div><img class="thumb" id="thumb" src="${COIN}" alt=""><input id="timeline" type="range" min="0" aria-label="Recorded run timeline"></div><div class="f-read" id="readout"></div></div>
 <div class="f-tabs" id="tabs">${CHAPTERS.map(([t, k, i]) => `<button class="f-tab" data-jump="${k}">${ico(i, 'ico-s')}${t} <span class="n">${run.events.findIndex((e: any) => e.kind === k) + 1}</span></button>`).join('')}<span class="grow"></span><button class="f-btn f-btn--ghost f-btn--s" id="motion" aria-pressed="false"></button><button class="f-btn f-btn--ghost f-btn--s" data-jump="final">${ico('replay', 'ico-s')}Back to the end</button></div>
 <div class="moment" id="moment"><span class="caps" id="m-status"></span><b id="m-title"></b><span class="mono" id="m-data"></span></div></div>
 <div class="rowD"><div class="f-paper f-ledger" id="ledger"></div><div class="f-paper f-mount"><span class="caps meta">Paid work</span><h3 class="disp mount-h">The card they made to earn</h3><div class="frame"><img class="card" src="${cardUrl}" alt="The bilingual caption card from the recorded testnet run">${['tl', 'tr', 'bl', 'br'].map(c => `<img class="corner ${c}" src="${cornerSvg}" alt="">`).join('')}</div><figcaption>Echo wrote the Spanish. Moss put the card together. The buyer paid ${proofReward()} MUNCH.</figcaption><div class="row"><a class="f-btn" href="${cardUrl}" download="feral-testnet-card.svg">${ico('copy', 'ico-s')}Save the card</a>${txLink(proof('paid-job')?.hash, undefined)}</div></div></div>
 <details class="f-panel alltx"><summary class="caps">All ${run.transactions.length} receipts from the proof run</summary><ul class="f-log" id="alltx"></ul></details>
 <div class="f-panel attacks" id="attacks"></div>
</section>
<footer class="pfoot mono">Feral · valueless test tokens on NEAR testnet · controlled demo creatures · no bridge and no profit · Build Beyond Boundaries</footer>
<nav class="f-dock" id="dock" aria-label="Actions"></nav>`;
function proofReward() { const j = (bundledChain as any)?.jobs?.['bilingual-v1']; return j?.reward ?? 90; }

const labels = $('#labels');
labels.innerHTML = ORDER.map(k => `<button class="f-spec" data-key="${k}" hidden><span class="nm"></span><span class="md"><i></i><span></span></span><span class="bal"></span></button>`).join('');

let scene: Scene;
let world: World | null = null;
let renderer: Renderer | null = null;
let layoutName: LayoutName = 'desktop';
const slotCache = new Map<string, Slot>();

// ---------- labels with leaders, clear of every creature ----------
function keepOut(k: Key, active: boolean, scale: number, pad: number): Box {
  const L = LAYOUTS[layoutName], [x, y] = world ? world.home(k) : (active ? L.homes[k] : L.fossil);
  const w = L.size * SCALE[art(k)] * scale;
  // phase 1 trim rects sit inside the 256 frame; critical and fossil poses are lower and wider
  const tall = active ? 0.78 : 0.5, wide = active ? 0.36 : 0.44;
  return { x: x * scale - w * wide - pad, y: y * scale - w * tall - pad, w: w * wide * 2 + pad * 2, h: w * (tall + 0.06) + pad * 2 };
}
function updateLabels() {
  if (!scene) return;
  const st = $('#stage'), W = st.clientWidth, H = st.clientHeight, L = LAYOUTS[layoutName], scale = W / L.w, compact = layoutName === 'mobile';
  const pad = compact ? 8 : 12;
  const items: { el: HTMLElement; k: Key; box: Box; active: boolean }[] = [];
  const newest = scene.creatures.filter(c => c.parent).at(-1)?.key;
  for (const el of labels.querySelectorAll<HTMLButtonElement>('.f-spec')) {
    const k = el.dataset.key as Key, c = scene.creatures.find(c => c.key === k);
    el.hidden = !c; if (!c) continue;
    const m = moodWord(c.balance, c.active, c.key === newest && c.active && (mode === 'live' || scene.born));
    el.className = `f-spec${compact ? ' f-spec--compact' : ''} ${m.cls}${openDrawer === k ? ' is-selected' : ''}`;
    el.style.setProperty('--c', c.active ? COLOR[art(k)] : 'var(--fossil)');
    el.querySelector('.nm')!.innerHTML = `${esc(c.name)}${compact ? '' : `<small>${esc(c.id.split('.')[0])}.${esc(c.id.split('.')[1] ?? '')}…</small>`}`;
    el.querySelector('.md span')!.textContent = m.word;
    el.querySelector('.bal')!.innerHTML = `<b>${c.balance}</b>${compact ? (c.active ? '' : ' frozen') : c.active ? ' MUNCH' : ' MUNCH frozen'}`;
    el.setAttribute('aria-label', `${c.name}, ${c.balance} MUNCH, ${m.word}. Open its proof.`);
    el.setAttribute('aria-expanded', String(openDrawer === k));
    items.push({ el, k, box: keepOut(k, c.active, scale, pad), active: c.active });
  }
  const notes = [...document.querySelectorAll<HTMLElement>('#stage-notes .f-note')].map(n => ({ x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }));
  const wants = items.map(i => ({ id: `${i.k}:${i.active}:${layoutName}:${Math.round(W)}`, key: i.k, box: i.box, w: i.el.offsetWidth, h: i.el.offsetHeight, active: i.active }));
  if (location.hash === '#label-fixture') (window as any).__labelFixture = { wants, W, H, notes, compact };
  const placed = placeLabels(wants, W, H, notes, compact, slotCache);
  let svg = '';
  for (const p of placed) {
    const it = items.find(i => i.k === p.key)!;
    it.el.style.left = p.x + 'px'; it.el.style.top = p.y + 'px';
    svg += `<path class="${it.active ? '' : 'dim'}" d="M${p.ax.toFixed(1)},${p.ay.toFixed(1)} C${p.c1x.toFixed(1)},${p.ay.toFixed(1)} ${p.c1x.toFixed(1)},${p.ty.toFixed(1)} ${p.tx.toFixed(1)},${p.ty.toFixed(1)}"/><circle class="tick" cx="${p.tx.toFixed(1)}" cy="${p.ty.toFixed(1)}" r="${compact ? 3.5 : 4.5}"/><circle class="dot" cx="${p.tx.toFixed(1)}" cy="${p.ty.toFixed(1)}" r="${compact ? 1.2 : 1.6}"/>`;
  }
  const lead = $('#leaders'); lead.setAttribute('viewBox', `0 0 ${W} ${H}`); lead.innerHTML = svg;
}

// ---------- decision notes (canopy on desktop, a strip on mobile) ----------
function recordedNotes(): NoteData[] {
  const seen = new Set(run.events.slice(0, index + 1).map((e: any) => e.kind));
  const out: NoteData[] = [];
  for (const [k, d] of Object.entries<any>(run.decisions ?? {})) {
    const ev = DECISION_EVENT[k]; if (!ev || !seen.has(ev)) continue;
    const o = d.observation, r = d.result, dec = r.decision, who = cap(o.actor.split('.')[0]);
    const job = o.jobs?.[0];
    const act = dec.action === 'bid' ? `Bid ${dec.price} on the ${job?.kind ?? ''} job` : dec.action === 'wait' ? 'Waited' : dec.action === 'collaborate' ? `Paid Echo ${dec.price ?? ''} to translate`.replace('  ', ' ') : dec.action === 'reproduce' ? 'Paid for a child' : cap(dec.action);
    const sawJob = job ? `a ${job.reward} MUNCH ${job.kind} job` : 'no open job';
    out.push({ key: o.actor.split('.')[0], who, act, why: `It saw ${sawJob} with ${o.balance} MUNCH in hand${o.active ? '' : ', already a fossil'}.`, whyKind: 'seen', src: `Recorded decision · ${String(r.model ?? r.mode).replace('Qwen/', '').replace('-Instruct', '')} · ${short(proof(ev)?.hash ?? '')}`, dim: !o.active });
  }
  return out;
}
function renderNotes() {
  const list = (mode === 'live' ? play?.notes() ?? [] : recordedNotes()).slice(-2);
  const note = (n: NoteData, i: number, stage: boolean) => `<div class="f-note${n.dim ? ' is-dim' : ''}${stage ? ` at-${i}` : ''}" style="--c:${n.dim ? 'var(--fossil)' : COLOR[art(n.key as Key)] ?? 'var(--bone-2)'};--rot:${i ? '.8' : '-1.2'}deg"><div class="who"><i></i>${esc(n.who)} chose</div><div class="act">${esc(n.act)}</div>${n.why ? `<div class="why${n.whyKind === 'seen' ? ' seen' : ''}">${esc(n.why)}</div>` : ''}<div class="src">${esc(n.src)}</div></div>`;
  const stageHtml = layoutName === 'desktop' ? list.map((n, i) => note(n, i, true)).join('') : '';
  const sn = $('#stage-notes'); if ((sn as any)._h !== stageHtml) { (sn as any)._h = stageHtml; sn.innerHTML = stageHtml; slotCache.clear(); }
  const mh = list.map((n, i) => note(n, i, false)).join(''); const mn = $('#mnotes'); if ((mn as any)._h !== mh) { (mn as any)._h = mh; mn.innerHTML = mh; }
}

// ---------- creature drawer ----------
function drawerHtml(k: Key) {
  const c = scene.creatures.find(c => c.key === k); if (!c) return '';
  const row = (t: string, v: string, copy = false) => `<div class="row"><dt>${t}</dt><dd><code>${esc(v)}</code>${copy ? `<button class="f-btn f-btn--ghost f-btn--s copy" data-copy="${esc(v)}" aria-label="Copy ${esc(t)}">${ico('copy', 'ico-s')}Copy</button>` : ''}</dd></div>`;
  const m = moodWord(c.balance, c.active);
  const head = `<div class="dh"><img src="${portrait(k, c.active)}" alt=""><div><span class="caps">${c.active ? m.word : 'Fossil'}</span><h3 class="disp">${esc(c.name)}</h3></div><button class="f-btn f-btn--ghost f-btn--icon close" aria-label="Close">${ico('close', 'ico-s')}</button></div>`;
  if (mode === 'live') {
    const l = (window as any).__feralLive?.lives?.find((x: any) => x.id === c.id);
    return `${head}<dl>${row('Account', c.id, true)}${row('MUNCH now', `${c.balance}${c.active ? '' : ' frozen'}`)}${row('Upkeep', '10 MUNCH every turn')}${l?.plain ? row('Strategy', l.plain) : ''}${row('Strategy hash', c.strategy, true)}${c.parent ? row('Parent', c.parent, true) : ''}${l?.holder ? row('Life NFT holder', l.holder) : ''}</dl><div class="links">${acctLink(c.id, 'Open the account')}</div>`;
  }
  const live = chain?.creatures?.find(x => x.id === c.id);
  const bid = (job: string) => chain?.bids?.[job]?.[c.id];
  const proofs: [string, string][] = ({
    ash: [['refused-post-death-spend', 'Refused spending after death'], ['death-tick', 'Death tick'], ['old-short-bid', 'Last bid while alive']],
    moss: [['paid-collaboration', 'Paid Echo 30 for translation'], ['parent-bid', `Parent bid ${bid('bilingual-v1') ?? ''}`], ['paid-job', 'Paid at settlement'], ['funded-child-account-creation', 'Funded Pip']],
    echo: [['paid-collaboration', 'Received 30 for translation'], ['register-echo', 'Registered']],
    pip: [['funded-child-account-creation', 'Funded birth'], ['child-first-bid', `First bid ${bid('child-first') ?? ''}`]],
  } as any)[k] ?? [];
  const birth = chain?.births?.[c.id];
  return `${head}${k === 'ash' && scene.refusalSeen ? `<p class="refusal"><img src="${refusalStamp}" alt="Spending refused">The contract refused Ash's spend with <code>Smart contract panicked: extinct</code>.</p>` : ''}
  <dl>${row('Account', c.id, true)}${row('MUNCH at this step', `${c.balance}${c.active ? '' : ' frozen'}`)}${row('Active flag', String(c.active))}${row('Native reserve', near(c.reserve) + ' NEAR')}${row('Strategy hash', c.strategy, true)}${c.parent ? row('Parent', c.parent, true) : ''}${birth ? row('Birth status', `${birth.state} · ${near(birth.native)} NEAR funded`) : ''}${live?.life ? row('Life NFT holder', live.life.owner_id) : ''}${live?.account ? row('Account balance now', near(live.account.amount) + ' NEAR') : ''}</dl>
  <div class="links">${acctLink(c.id, 'Open the account')}${proofs.map(([l, t]) => proof(l) ? txLink(proof(l).hash, t) + (sealed(proof(l)) ? ` <span class="ok">${ico('check', 'ico-s')}</span>` : '') : '').join('')}</div>`;
}
function portrait(k: Key, active: boolean) { const a = art(k); return !active && a === 'ash' ? PORTRAIT['ash-fossil'] : PORTRAIT[a]; }
function renderDrawer() {
  const d = $('#drawer');
  if (!openDrawer || !scene.creatures.some(c => c.key === openDrawer)) { d.hidden = true; openDrawer = null; return; }
  d.hidden = false; d.innerHTML = drawerHtml(openDrawer);
}

// ---------- live hand off ----------
function showLive(s: Scene, animate: boolean) {
  if (mode !== 'live') return;
  scene = s; world?.setScene(scene, animate);
  renderNotes(); updateLabels(); renderDrawer(); flowTag(animate);
}
function switchTo(m: 'live' | 'replay') {
  if (m === mode) return;
  stopPlay(); mode = m; document.body.dataset.view = m; openDrawer = null; slotCache.clear();
  if (m === 'replay') { update(false); play?.render(); } else { play?.refresh(); play?.render(); }
  renderHeroReplay();
}
let flowTimer: any;
function flowTag(animate: boolean) {
  const tag = $('#flowtag'); clearTimeout(flowTimer);
  if (animate && scene.flows.length && !reduced) { tag.textContent = flowSummary(scene.flows); tag.classList.add('on'); flowTimer = setTimeout(() => tag.classList.remove('on'), 2600); } else tag.classList.remove('on');
}

// ---------- the recorded run ----------
function eventDetail(s: Scene) {
  if (s.flows.length) return flowSummary(s.flows);
  if (s.kind === 'refused-post-death-spend') return 'Spend refused · contract panicked: extinct';
  if (s.kind === 'live-now') return `Read from the controller at block ${nf(chain.block_height)}`;
  return s.tx ? `Receipt ${short(s.tx)}` : 'Balances read from contract state';
}
function update(animate: boolean) {
  if (mode === 'live') return;
  scene = buildScene(run, index);
  const n = run.events.length, last = index === n - 1;
  $('#m-status').textContent = scene.kind === 'live-now' ? 'Live contract state' : scene.status === 'expected-failure' ? 'Refused on chain, as designed' : last && run.liveMatchesFinal ? 'Final state · matches testnet now' : 'Recorded testnet event';
  $('#m-title').innerHTML = scene.explorer ? `<a class="f-link" href="${esc(scene.explorer)}" target="_blank" rel="noopener noreferrer">${esc(titleOf(scene.kind))} ${ico('explorer', 'ico-s')}</a>` : esc(titleOf(scene.kind));
  $('#m-data').textContent = eventDetail(scene);
  const tl = $<HTMLInputElement>('#timeline'); tl.max = String(n - 1); tl.value = String(index);
  const pct = n > 1 ? index / (n - 1) : 1;
  $('#thumb').style.left = (pct * 100) + '%';
  $('#track-done').setAttribute('d', pct > 0 ? donePath(pct) : '');
  $('#track-seeds').innerHTML = run.events.map((e: any, i: number) => { const ch = CHAPTERS.some(c => c[1] === e.kind); return `<circle class="evt${i <= index ? ' past' : ''}${ch ? ' ch' : ''}" cx="${(i / (n - 1) * 1000).toFixed(1)}" cy="28" r="${ch ? 5 : 3.2}"/>`; }).join('');
  $('#track-flags').innerHTML = CHAPTERS.map(([t, k]) => { const i = run.events.findIndex((e: any) => e.kind === k); const at = i / (n - 1) * 100; const tf = k === 'death-tick' ? 'calc(-100% + 4px)' : k === 'refused-post-death-spend' ? '-4px' : '-50%'; return `<span class="flag${i === index ? ' on' : ''}" style="left:${at.toFixed(2)}%;transform:translateX(${tf})">${t}</span>`; }).join('');
  const turn = scene.economy.turn, turns = run.final?.economy?.turn ?? 2;
  $('#readout').innerHTML = `Step <b>${index + 1}</b> of ${n}<br>Turn <b>${turn}</b> of ${turns}`;
  for (const b of document.querySelectorAll<HTMLElement>('#tabs [data-jump]')) b.classList.toggle('is-active', b.dataset.jump === scene.kind);
  $('#play').innerHTML = ico(playing ? 'pause' : 'play'); $('#play').setAttribute('aria-label', playing ? 'Pause' : 'Play the recorded run');
  $('#motion').innerHTML = `${ico(reduced ? 'pause' : 'play', 'ico-s')}${reduced ? 'Motion off' : 'Motion on'}`; $('#motion').setAttribute('aria-pressed', String(reduced));
  renderNotes(); updateLabels(); renderDrawer(); renderHeroReplay(); renderDock();
  world?.setScene(scene, animate);
  flowTag(animate);
}
function donePath(p: number) { // the played part of the root line, cut at the thumb
  const x = p * 1000; return x <= 500 ? `M0,28 C${(150 * p * 2).toFixed(0)},${(28 - 6 * p * 2).toFixed(1)} ${(300 * p * 2).toFixed(0)},${(28 + 6 * p * 2).toFixed(1)} ${x.toFixed(0)},28` : `M0,28 C150,22 300,34 500,28 S${(500 + 350 * (p - .5) * 2).toFixed(0)},24 ${x.toFixed(0)},28`;
}
function renderHeroReplay() {
  if (mode !== 'replay') return;
  const e = scene?.economy; if (!e) return;
  const side = $('#hero-side');
  const html = `<div class="f-panel hero-goal hero-replay"><span class="caps c2">${ico('replay', 'ico-s')} Recorded proof run</span><h4>Two turns on NEAR testnet, ${run.transactions.length} receipts</h4><dl class="mini"><div><dt>Turn</dt><dd>${e.turn}</dd></div><div><dt>Still circulating</dt><dd>${nf(e.supply)}</dd></div><div><dt>Eaten to live</dt><dd class="burn">${nf(e.burned)}</dd></div><div><dt>In escrow</dt><dd>${nf(e.escrow + e.pending)}</dd></div></dl>${OFFLINE ? '' : `<hr class="f-rule"><div class="f-advance compact"><button class="f-press is-disabled" disabled><img src="${SEAL.amber}" alt=""></button><div><h4>Advance is off</h4><p>Switch to the live season to move time forward. Recorded runs only replay.</p></div></div>`}</div>`;
  if ((side as any)._h !== html) { (side as any)._h = html; side.innerHTML = html; }
}
function renderLedger() {
  const e = chain.economy as any, blk = nf(chain.block_height);
  const childBid = chain?.bids?.['child-first']?.['pip.ctrl.feral-039832.testnet'], parentBid = chain?.bids?.['bilingual-v1']?.['moss.feral-039832.testnet'];
  const pip = chain?.births?.['pip.ctrl.feral-039832.testnet'];
  const claim = (seal: string, title: string, line: string, labels: string[], extra = '', stamp = false) => {
    const ok = labels.every(l => sealed(proof(l)));
    return `<div class="f-claim${ok ? '' : ' is-pending'}"><div class="seal"><img src="${ok ? seal : SEAL.pending}" alt=""></div><div><h5>${esc(title)}${stamp && ok ? `<img class="stamp" src="${refusalStamp}" alt="Spending refused">` : ''}</h5><p>${esc(line)}</p><div class="ev">${labels.map(l => txLink(proof(l)?.hash)).join('')}${extra}</div></div><div class="state">${ok ? `${ico('check', 'ico-s')} Sealed on chain<span>block ${blk}</span>` : `Waiting for the chain<span>checking receipt</span>`}</div></div>`;
  };
  const supply = Number(e?.supply ?? 0), burned = Number(e?.burned ?? 0), seed = supply + burned;
  const paid = sepolia?.paid?.sepolia_tx;
  const sig = paid
    ? `<div class="f-sig is-done"><img src="${SEAL.cream}" alt=""><div><b>A NEAR account signed on Sepolia</b><p>${esc(cap(String(sepolia.paid.buyer ?? 'Moss').split('.')[0]))} bought ${esc(sepolia.paid.amount)} TOOL on Sepolia with a signature made on NEAR.</p><a class="f-link mono" href="https://sepolia.etherscan.io/tx/${esc(paid)}" target="_blank" rel="noopener noreferrer">${short(paid)} ${ico('explorer', 'ico-s')}</a></div><span class="tag">Done</span></div>`
    : `<div class="f-sig is-pending"><img src="${SEAL.pending}" alt=""><div><b>A NEAR account signs on Sepolia</b><p>The relayer address is ready. It is waiting for test ETH before it buys the tool.</p><span class="mono">relayer ${short(sepolia?.relayer?.address ?? '')} · v1.signer-prod.testnet</span></div><span class="tag">Waiting</span></div>`;
  $('#ledger').innerHTML = `<span class="caps meta">Proof ledger · ${run.transactions.length} testnet receipts</span><h3>Every scar has a receipt</h3>
  ${claim(SEAL.amber, 'The supply is finite and it burns', `${nf(seed)} MUNCH were made once. Upkeep has burned ${nf(burned)}. ${nf(supply)} are still out there.`, ['second-upkeep', 'death-tick'])}
  ${claim(SEAL.fossil, 'Ash died and its spending was refused', 'Ash could not pay upkeep on turn 1. Then it tried to spend and the contract said no.', ['death-tick', 'refused-post-death-spend'], '', true)}
  ${claim(SEAL.lilac, 'Pip has its own account and life NFT', `Moss paid 100 MUNCH for the birth. Pip lives at pip.ctrl.feral-039832.testnet${pip ? ` with ${near(pip.native)} NEAR` : ''}.`, ['funded-child-account-creation'], `<button class="f-link mono copy" data-copy="pip.ctrl.feral-039832.testnet">pip.ctrl.feral-039832.testnet ${ico('copy', 'ico-s')}</button>`)}
  ${claim(SEAL.moss, 'The child bid against its parent', `Pip offered ${childBid ?? '?'} for work that Moss bid ${parentBid ?? '?'} on. Same family, separate wallets.`, ['child-first-bid', 'parent-bid'])}
  ${sig}`;
}
const attackFiles = import.meta.glob('../../evidence/attacks.json', { eager: true, import: 'default' }) as Record<string, any>;
const attackLog: any = Object.values(attackFiles)[0];
function attackHref(a: any) { return a.explorer ?? (a.tx ? `https://testnet.nearblocks.io/txns/${a.tx}` : ''); }
function attackStage(a: any) {
  if (a.refused === null) return 'not run here';
  if (a.chain === 'sepolia') return 'reverted on Sepolia';
  return a.tx ? 'refused on chain' : 'rejected before it ran';
}
function renderAttacks() {
  const el = $('#attacks'); if (!el) return;
  if (!attackLog?.attacks?.length) { el.hidden = true; return; }
  const list = attackLog.attacks as any[];
  const held = list.filter(a => a.refused === true).length;
  el.innerHTML = `<header class="ah"><span class="caps">Attacks</span><h3 class="disp">We tried to break it</h3><p>${held} of ${list.length} attempts were refused by the chain itself. ${list.some(a => a.refused === null) ? 'One was not run on testnet and is covered by unit tests instead.' : ''}</p></header><ul class="f-log">${list.map(a => `<li class="${a.refused ? 'is-refused' : ''}"><span class="tn">${ico(a.refused ? 'fossil' : 'replay', 'ico-s')}</span><span class="what">${esc(a.title)}<small>${esc(a.attempt)}</small><small class="mono">${esc(a.reason ?? '')}</small>${a.used_nonce_on_chain ? '<small>The voucher had expired by then, so the contract stopped at its first check. Its replay guard also reads nonce 0 as used.</small>' : ''}</span><span class="amt">${esc(attackStage(a))}</span>${a.tx ? `<a class="h" href="${esc(attackHref(a))}" target="_blank" rel="noopener noreferrer">${short(a.tx)} ${ico('explorer', 'ico-s')}</a>` : '<span class="h mono">no tx</span>'}</li>`).join('')}</ul>`;
}
function renderAllTx() {
  $('#alltx').innerHTML = run.transactions.map((t: any) => `<li class="${t.state === 'expected-failure' ? 'is-refused' : ''}"><span class="tn">${sealed(t) ? ico('check', 'ico-s') : '·'}</span>${ico(t.state === 'expected-failure' ? 'fossil' : 'check')}<span class="what">${esc(titleOf(t.label))}<small class="mono">${esc(t.hash)}</small></span><span class="amt">${t.state === 'expected-failure' ? 'refused' : ''}</span><a class="h" href="${esc(t.explorer)}" target="_blank" rel="noopener noreferrer">${short(t.hash)} ${ico('explorer', 'ico-s')}</a></li>`).join('');
}
function renderSource(state: 'checking' | 'live' | 'bundled' | 'failed') {
  const v = run.transactions.filter((t: any) => sealed(t)).length, n = run.transactions.length;
  const dot = state === 'live' ? '<span class="f-live"></span>' : `<span class="f-live ${state === 'failed' ? 'is-error' : 'is-amber'}"></span>`;
  const txt = state === 'checking' ? `Reading the chain<span class="sep"></span><b>${v} of ${n}</b> checked so far`
    : `<b class="lg">${state === 'live' ? 'Live testnet' : OFFLINE ? 'Offline file' : 'Bundled read'}</b><span class="sep lg"></span>Block <b>${nf(chain.block_height)}</b><span class="sep"></span><b>${v} of ${n}</b><span class="lg">&nbsp;check out</span>`;
  $('#source').innerHTML = `${dot}${txt}${OFFLINE || state === 'checking' || state === 'live' ? '' : ` <button class="f-link reread" id="reread">Try live</button>`}`;
  const b = document.querySelector('#reread') as HTMLButtonElement | null; if (b) b.onclick = () => goLive();
}
async function goLive() {
  if (OFFLINE || params.get('live') === 'off') { renderSource('bundled'); return; }
  renderSource('checking');
  try {
    const next = await readChain(fetch.bind(window) as any, run.controller, baseRun.transactions);
    if (!reconciles(next.economy, next.creatures)) throw new Error('live state does not reconcile');
    next.txs = next.txs.map(t => t.final === 'unknown' ? { ...(chain.txs.find(b => b.hash === t.hash) ?? t), from: 'bundled' } as any : t);
    chain = next; chainLive = true;
    const atFinal = index === run.events.length - 1;
    run = withLiveFinal(baseRun, chain);
    if (atFinal) index = run.events.length - 1;
    renderSource('live'); renderAllTx(); renderLedger(); update(false);
  } catch (e) { console.warn('live read failed, keeping the bundled chain read', e); renderSource('failed'); }
}

// ---------- mobile dock ----------
function renderDock() {
  const d = $('#dock');
  let html: string;
  if (mode === 'live' && play) return; // play.ts owns the live dock
  html = `${CHAPTERS.slice(0, 2).map(([t, k, i]) => `<button class="it${scene?.kind === k ? ' is-on' : ''}" data-jump="${k}">${ico(i)}${t}</button>`).join('')}<div class="mid"><button class="f-btn f-playbtn" data-dock="play" aria-label="${playing ? 'Pause' : 'Replay the run'}">${ico(playing ? 'pause' : 'play')}</button><span>Replay</span></div>${CHAPTERS.slice(2).map(([t, k, i]) => `<button class="it${scene?.kind === k ? ' is-on' : ''}" data-jump="${k}">${ico(i)}${t}</button>`).join('')}`;
  if ((d as any)._h !== html) { (d as any)._h = html; d.innerHTML = html; }
}

// ---------- controls ----------
function step(dir: number, animate = true) { const n = Math.max(0, Math.min(run.events.length - 1, index + dir)); if (n === index) return false; index = n; update(animate && dir === 1); return true; }
function stopPlay() { if (!playing) return; playing = false; clearInterval(playTimer); }
function togglePlay() {
  if (mode !== 'replay') switchTo('replay');
  if (playing) { stopPlay(); update(false); return; }
  playing = true; if (index === run.events.length - 1) { index = 0; update(false); }
  playTimer = setInterval(() => { if (!step(1)) { stopPlay(); update(false); } }, reduced ? 1400 : 2300);
  update(false);
}
function jump(k: string) {
  if (mode !== 'replay') switchTo('replay');
  stopPlay(); const i = k === 'final' ? run.events.length - 1 : run.events.findIndex((e: any) => e.kind === k);
  if (k !== 'final' && i > 0) { index = i - 1; update(false); step(1); } else { index = i; update(false); }
}
$('#play').onclick = togglePlay;
$<HTMLInputElement>('#timeline').oninput = ev => { if (mode !== 'replay') switchTo('replay'); stopPlay(); index = Number((ev.target as HTMLInputElement).value); update(false); };
document.addEventListener('click', ev => {
  const t = ev.target as HTMLElement;
  const j = t.closest<HTMLElement>('[data-jump]'); if (j && (j.closest('#tabs') || j.closest('#dock'))) { jump(j.dataset.jump!); return; }
  if (t.closest('[data-dock="play"]')) { togglePlay(); return; }
  const c = t.closest<HTMLButtonElement>('.copy'); if (c?.dataset.copy) { navigator.clipboard?.writeText(c.dataset.copy).then(() => { c.dataset.done = '1'; }, () => {}); return; }
  if (t.closest('#drawer .close')) { openDrawer = null; updateLabels(); renderDrawer(); return; }
  const lab = t.closest<HTMLButtonElement>('#labels .f-spec');
  if (lab) { const k = lab.dataset.key as Key; openDrawer = openDrawer === k ? null : k; updateLabels(); renderDrawer(); if (openDrawer) $('#drawer').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); }
});
$('#motion').onclick = () => { reduced = !reduced; if (world) world.reduced = reduced; update(false); };
reduceQuery.addEventListener?.('change', e => { reduced = e.matches; if (world) world.reduced = reduced; update(false); });
document.addEventListener('keydown', e => {
  const tag = (e.target as HTMLElement).tagName; if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'Escape' && openDrawer) { openDrawer = null; updateLabels(); renderDrawer(); return; }
  if (mode !== 'replay') return;
  if (e.key === 'ArrowRight') { stopPlay(); step(1); } else if (e.key === 'ArrowLeft') { stopPlay(); step(-1); }
  else if (e.key === ' ' && (e.target as HTMLElement).closest('#proof')) { e.preventDefault(); togglePlay(); }
  else if (/^[1-4]$/.test(e.key)) jump(CHAPTERS[Number(e.key) - 1][1]); else if (e.key === 'End') jump('final');
});

if (params.get('frame') === 'start') index = 0;
const frameKind = params.get('frame'); if (frameKind && frameKind !== 'start' && frameKind !== 'final') { const i = run.events.findIndex((e: any) => e.kind === frameKind); if (i >= 0) index = i; }
document.body.dataset.view = 'replay';
renderAllTx(); renderAttacks(); renderLedger(); renderSource('bundled'); update(false);
if (OFFLINE) { $('#pl-mode').innerHTML = `<div class="f-mode"><button aria-pressed="true">${ico('replay')}Recorded proof run</button></div>`; $('#season').remove(); }
// Live play exists only in the web build. The offline file has no keeper.
if (!OFFLINE) {
  const api = params.get('keeper') ?? (import.meta as any).env?.VITE_KEEPER_URL ?? '';
  const wantLive = params.get('mode') !== 'replay';
  import('./play').then(({ startPlay }) => {
    play = startPlay({ show: showLive, mode: () => mode, switchTo, reduced: () => reduced, relabel: () => { renderNotes(); updateLabels(); } }, api);
    if (wantLive) switchTo('live'); else play.render();
  });
}

// ---------- habitat renderer ----------
const stage = $('#stage'), canvas = $<HTMLCanvasElement>('#world');
function chooseLayout(): LayoutName { return stage.clientWidth < 640 ? 'mobile' : 'desktop'; }
function fit() {
  const name = chooseLayout();
  if (name !== layoutName) { layoutName = name; stage.dataset.layout = name; slotCache.clear(); renderNotes(); }
  world?.setLayout(name);
  const L = LAYOUTS[name], cssW = stage.clientWidth, cssH = cssW * L.h / L.w;
  const mobile = matchMedia('(max-width: 767px)').matches;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer?.resize(cssW, cssH, dpr);
  if (world && renderer) renderer.draw(world);
  updateLabels();
}
(async () => {
  try {
    const atlas = await loadAtlas();
    const mobile = matchMedia('(max-width: 767px)').matches;
    world = new World(atlas, mobile ? 96 : 180); world.reduced = reduced;
    layoutName = chooseLayout(); stage.dataset.layout = layoutName; world.setLayout(layoutName); world.setScene(scene, false);
    const force = params.get('renderer');
    try { if (force === 'canvas') throw new Error('canvas forced'); renderer = await createPixi(canvas, world); }
    catch (e) { console.info('PixiJS unavailable, using Canvas2D', e); const fresh = canvas.cloneNode() as HTMLCanvasElement; canvas.replaceWith(fresh); renderer = createCanvas2D(fresh, world); }
    stage.dataset.renderer = renderer.kind;
    $('#loading').remove();
    renderNotes(); fit();
    new ResizeObserver(() => fit()).observe(stage);
    let lastT = performance.now(), raf = 0;
    const frame = (t: number) => { raf = requestAnimationFrame(frame); const dt = (t - lastT) / 1000; lastT = t; world!.update(dt); renderer!.draw(world!); };
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { lastT = performance.now(); raf = requestAnimationFrame(frame); } });
    (window as any).__feral = { world, renderer: renderer.kind, atlas: atlas.phase2, get scene() { return scene; }, get chainLive() { return chainLive; }, get mode() { return mode; } };
  } catch (e) { console.error(e); $('#loading').textContent = 'The habitat art failed to load. Balances and proofs are unaffected.'; }
})();
goLive();
