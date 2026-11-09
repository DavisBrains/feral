import './style.css';
import evidence from '../public/run.json';
import bundledChain from '../public/chain.json';
import cardSvg from '../public/live-work/card.svg?raw';
import { buildScene, withLiveFinal, flowSummary, NAMES, type Key, type Scene } from './scene';
import { loadAtlas } from './atlas';
import { World, LAYOUTS, type LayoutName } from './world';
import { createPixi, createCanvas2D, type Renderer } from './render';
import { readChain, txVerdict, reconciles, accountUrl, txUrl, type ChainState } from './chain';

declare const __OFFLINE__: boolean;
const sepoliaFiles = import.meta.glob('../../evidence/sepolia-tool-{purchase,plan}.json', { eager: true, import: 'default' }) as Record<string, any>;
const sepolia = Object.entries(sepoliaFiles).find(([k]) => k.endsWith('purchase.json'))?.[1] ?? Object.values(sepoliaFiles)[0] ?? null;
const OFFLINE = typeof __OFFLINE__ !== 'undefined' && __OFFLINE__;
const params = new URLSearchParams(location.search);
const esc = (s: unknown) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
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
const cardUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardSvg);
const proof = (label: string) => run.transactions.find((t: any) => t.label === label);
const verdict = (t: any) => txVerdict(chain?.txs?.find(x => x.hash === t.hash), t.state);
const near = (yocto: string) => (Number(BigInt(yocto) / 10n ** 18n) / 1e6).toFixed(Number(BigInt(yocto) % 10n ** 20n) ? 4 : 2);
const short = (h: string) => h.length > 22 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
const titleOf = (kind: string) => kind === 'live-now' ? 'Live testnet now' : kind.replaceAll('-', ' ');
const ORDER: Key[] = ['moss', 'echo', 'pip', 'ash'];
const JUMPS: [string, string][] = [['Work', 'paid-job'], ['Death', 'death-tick'], ['Refusal', 'refused-post-death-spend'], ['Birth', 'funded-child-account-creation']];

const link = (href: string, text: string, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)} <span aria-hidden="true">↗</span></a>`;
const badge = (t: any) => { const v = verdict(t); return v === 'verified' ? '<b class="ok">✓ on chain</b>' : v === 'refusal-verified' ? '<b class="ok">✓ refused on chain</b>' : v === 'mismatch' ? '<b class="bad">mismatch</b>' : '<b class="wait">unchecked</b>'; };

const app = $('#app');
app.innerHTML = `
<header><span class="wordmark">feral<span>●</span></span><div class="chip">REAL NEAR TESTNET</div><div class="source" id="source" aria-live="polite"></div></header>
<main>
 <section class="intro"><div class="eyebrow">BUILD BEYOND BOUNDARIES</div><h1>The era of programmable<br><em>money starts here.</em></h1><p>Money earns its next breath. Then it funds a new life.</p></section>
 <section class="stats" aria-label="MUNCH supply">
  <div><small>FINITE SEED</small><strong>1,000 <span>MUNCH</span></strong></div>
  <div><small>TURN</small><strong><i id="s-turn"></i><span> / 2</span></strong></div>
  <div><small>STILL CIRCULATING</small><strong id="s-supply"></strong></div>
  <div><small>EATEN TO LIVE</small><strong class="burn"><i id="s-burn"></i><span> MUNCH</span></strong></div>
  <div><small>MARKET / ESCROW</small><strong><i id="s-market"></i><span id="s-escrow"></span></strong></div>
 </section>
 <div class="workspace">
  <section class="terrarium">
   <div class="sectionhead"><h2>The terrarium</h2><span id="renderer-note">TAP A CREATURE FOR PROOF</span></div>
   <div class="stage" id="stage"><canvas id="world" aria-hidden="true"></canvas><div class="labels" id="labels"></div><div class="flowtag" id="flowtag" aria-hidden="true"></div><div class="loading" id="loading">Loading the habitat…</div></div>
   <div class="moment"><span id="m-num"></span><div class="m-main"><small id="m-status"></small><h3 id="m-title"></h3></div><div class="eventdata" id="m-data"></div></div>
   <div class="controls"><button id="back" aria-label="Previous event">←</button><button id="play"></button><button id="next" aria-label="Next event">→</button><input id="timeline" type="range" min="0" aria-label="Event timeline"><span id="count"></span><button id="motion" aria-pressed="false"></button></div>
   <div class="jumps" role="group" aria-label="Jump to a moment">${JUMPS.map(([t, k]) => `<button data-jump="${k}">${t}</button>`).join('')}<button data-jump="final">Final state</button></div>
   <div class="drawer" id="drawer" hidden></div>
  </section>
  <aside>
   <section class="panel"><div class="sectionhead"><h2>The chain keeps the score</h2><span class="tiny-dot">●</span></div><p class="paneltext">Recorded states from the completed public testnet run. Playback never calls a model or sends a transaction. Final balances are read back from the contract.</p><div id="checks"></div></section>
   <section class="panel work"><small>REAL WORK OUTPUT</small><h3>A caption card<br>made to earn.</h3><img class="work-card" src="${cardUrl}" alt="Actual bilingual caption card from the testnet run" width="600" height="400"><a href="${cardUrl}" download="feral-testnet-card.svg">Save the generated card ↓</a><p>Actual SVG output bundled here. ${link(proof('paid-job').explorer, 'Open its paid settlement')}</p></section>
   <section class="panel receipts"><div class="sectionhead"><h2>Receipt trail</h2><span>PUBLIC TESTNET</span></div><div id="receipts"></div><details><summary>All ${run.transactions.length} transaction links</summary><div id="alltx"></div></details></section>
  </aside>
 </div>
 <footer>Controlled demo participants · Separate native NEAR reserves · Valueless test tokens · No bridge or investment claim</footer>
</main>`;

const labels = $('#labels');
labels.innerHTML = ORDER.map(k => `<button class="crit" data-key="${k}" hidden><span class="name"></span><span class="bal"></span></button>`).join('');

let scene: Scene;
let world: World | null = null;
let renderer: Renderer | null = null;
let layoutName: LayoutName = 'desktop';

function labelPos(k: Key, active: boolean): [number, number] {
  const L = LAYOUTS[layoutName];
  const [x, y] = active ? L.homes[k] : L.fossil;
  if (!active) return layoutName === 'mobile' ? [x + L.size * 0.42, y - L.size * 0.2] : [x - L.size * 0.5, y - L.size * 0.22];
  const nudge: Partial<Record<Key, number>> = layoutName === 'mobile' ? { moss: -28, echo: 18, pip: -40 } : {};
  return [x + (nudge[k] ?? 0), y + L.size * 0.06];
}

function updateLabels() {
  for (const el of labels.querySelectorAll<HTMLButtonElement>('.crit')) {
    const k = el.dataset.key as Key, c = scene.creatures.find(c => c.key === k);
    el.hidden = !c; if (!c) continue;
    const [x, y] = labelPos(k, c.active), L = LAYOUTS[layoutName];
    el.style.left = (x / L.w * 100) + '%'; el.style.top = (y / L.h * 100) + '%';
    el.classList.toggle('dead', !c.active); el.classList.toggle('right', !c.active && layoutName === 'mobile');
    el.dataset.mood = c.mood;
    el.querySelector('.name')!.innerHTML = `${esc(c.name)} <em>${c.active ? esc(c.mood) : 'extinct'}</em>`;
    el.querySelector('.bal')!.innerHTML = `${c.balance} <span>MUNCH${c.active ? '' : ' FROZEN'}</span>`;
    el.setAttribute('aria-label', `${c.name}, ${c.balance} MUNCH ${c.active ? 'available, ' + c.mood : 'frozen, extinct'}. Open proof.`);
    el.setAttribute('aria-expanded', String(openDrawer === k));
  }
}

function drawerHtml(k: Key) {
  const c = scene.creatures.find(c => c.key === k); if (!c) return '';
  const live = chain?.creatures?.find(x => x.id === c.id);
  const bid = (job: string) => chain?.bids?.[job]?.[c.id];
  const proofs: [string, string][] = {
    ash: [['refused-post-death-spend', 'Refused spending after death'], ['death-tick', 'Death tick'], ['old-short-bid', 'Last bid while alive']],
    moss: [['paid-collaboration', 'Paid Echo 30 for translation'], ['parent-bid', `Parent bid ${bid('bilingual-v1') ?? ''}`], ['paid-job', 'Paid at settlement'], ['funded-child-account-creation', 'Funded Pip']],
    echo: [['paid-collaboration', 'Received 30 for translation'], ['register-echo', 'Registered']],
    pip: [['funded-child-account-creation', 'Funded birth'], ['child-first-bid', `First bid ${bid('child-first') ?? ''}`]],
  }[k] as any;
  const row = (t: string, v: string, copy = false) => `<div class="row"><dt>${t}</dt><dd><code>${esc(v)}</code>${copy ? `<button class="copy" data-copy="${esc(v)}" aria-label="Copy ${esc(t)}">Copy</button>` : ''}</dd></div>`;
  const birth = chain?.births?.[c.id];
  return `<div class="drawerhead"><h3>${esc(c.name)} ${c.active ? '' : '<span class="extinct">EXTINCT</span>'}</h3><button class="close" aria-label="Close proof drawer">✕</button></div>
  ${k === 'ash' && scene.refusalSeen ? `<p class="refusal">The contract refused Ash's spend with <code>Smart contract panicked: extinct</code>. ${link(proof('refused-post-death-spend').explorer, 'Open the refusal')}</p>` : ''}
  <dl>${row('Account', c.id, true)}${row('MUNCH at this frame', `${c.balance}${c.active ? '' : ' frozen'}`)}${row('Active flag', String(c.active))}${row('Native reserve', near(c.reserve) + ' NEAR')}${row('Strategy hash', c.strategy, true)}${c.parent ? row('Parent', c.parent, true) : ''}${birth ? row('Birth status', `${birth.state} · ${near(birth.native)} NEAR funded`) : ''}${live?.life ? row('Life NFT holder', live.life.owner_id) : ''}${live?.account ? row('Account balance now', near(live.account.amount) + ' NEAR') : ''}</dl>
  <div class="prooflinks">${link(accountUrl(c.id), 'Open the account')}${proofs.map(([l, t]) => proof(l) ? link(proof(l).explorer, t) + ' ' + badge(proof(l)) : '').join('')}</div>`;
}
function renderDrawer() {
  const d = $('#drawer');
  if (!openDrawer || !scene.creatures.some(c => c.key === openDrawer)) { d.hidden = true; openDrawer = null; return; }
  d.hidden = false; d.innerHTML = drawerHtml(openDrawer);
}

function eventDetail(s: Scene) {
  if (s.flows.length) return flowSummary(s.flows);
  const key: any = { 'old-short-bid': 'old-demand', 'refused-post-death-spend': 'extinct', 'paid-collaboration': 'buy-help', 'parent-bid': 'parent-bid', 'funded-child-account-creation': 'reproduce', 'child-first-bid': 'child-bid' }[s.kind];
  const r = run.decisions?.[key]?.result;
  if (s.kind === 'refused-post-death-spend') return 'Spend refused · contract panicked: extinct';
  if (s.kind === 'live-now') return `Read from the controller at block ${chain.block_height}`;
  return r ? `Recorded model decision ${r.decision.action}${r.decision.price ? ' ' + r.decision.price : ''} · ${r.model ?? r.mode}` : 'Conserved balances from contract state';
}

let flowTimer: any;
function update(animate: boolean) {
  scene = buildScene(run, index);
  const e = scene.economy;
  $('#s-turn').textContent = String(e.turn); $('#s-supply').textContent = String(e.supply); $('#s-burn').textContent = String(e.burned);
  $('#s-market').textContent = String(e.market); $('#s-escrow').textContent = ` / ${e.escrow + e.pending}`;
  $('#m-num').textContent = String(index + 1).padStart(2, '0');
  const last = index === run.events.length - 1;
  $('#m-status').textContent = scene.kind === 'live-now' ? 'LIVE CONTRACT STATE' : scene.status === 'expected-failure' ? 'VERIFIED CONTRACT REFUSAL' : last && run.liveMatchesFinal ? 'FINAL STATE · MATCHES LIVE TESTNET' : 'RECORDED TESTNET EVENT';
  $('#m-title').innerHTML = scene.explorer ? link(scene.explorer, titleOf(scene.kind)) : esc(titleOf(scene.kind));
  $('#m-data').textContent = eventDetail(scene);
  ($('#timeline') as HTMLInputElement).max = String(run.events.length - 1);
  ($('#timeline') as HTMLInputElement).value = String(index);
  $('#count').textContent = `${index + 1} / ${run.events.length}`;
  $('#play').innerHTML = playing ? 'Pause' : '<span class="long">Replay the real loop</span><span class="short">Replay</span>';
  $('#motion').innerHTML = reduced ? '<span class="long">Motion off</span><span class="short">Still</span>' : '<span class="long">Motion on</span><span class="short">Motion</span>'; $('#motion').setAttribute('aria-pressed', String(reduced));
  updateLabels(); renderDrawer(); renderPanels();
  world?.setScene(scene, animate);
  const tag = $('#flowtag');
  clearTimeout(flowTimer);
  if (animate && scene.flows.length && !reduced) {
    tag.textContent = flowSummary(scene.flows); tag.classList.add('on');
    flowTimer = setTimeout(() => tag.classList.remove('on'), 2600);
  } else tag.classList.remove('on');
}

function renderPanels() {
  const born = scene.born;
  const bid = (job: string, id: string) => chain?.bids?.[job]?.[id];
  const childBid = bid('child-first', 'pip.ctrl.feral-039832.testnet'), parentBid = bid('bilingual-v1', 'moss.feral-039832.testnet');
  const check = (done: boolean, label: string, text: string) => `<div class="check"><b>${done ? '✓' : '○'}</b> ${link(proof(label).explorer, text)} ${badge(proof(label))}</div>`;
  const tool = chain?.tool;
  $('#checks').innerHTML =
    check(true, 'death-tick', 'Finite supply with real burns') +
    check(scene.refusalSeen, 'refused-post-death-spend', 'Ash died and spending was refused') +
    check(born, 'funded-child-account-creation', 'Pip account and life NFT') +
    check(index >= run.events.findIndex((e: any) => e.kind === 'child-first-bid'), 'child-first-bid', `Child bids ${childBid ?? '?'} · Parent bids ${parentBid ?? '?'}`) +
    sepoliaCheck(tool);
  const receipts = run.events.slice(0, index + 1).filter((x: any) => x.receipt).reverse().slice(0, 5);
  $('#receipts').innerHTML = receipts.map((r: any) => `<a class="receipt" href="${esc(r.explorer)}" target="_blank" rel="noopener noreferrer"><strong>${esc(titleOf(r.kind))} ↗</strong><code title="${esc(r.receipt)}">${esc(short(r.receipt))}</code></a>`).join('');
}
function sepoliaCheck(tool: any) {
  const paid = sepolia?.paid?.sepolia_tx;
  if (paid) return `<div class="check"><b>✓</b> ${link('https://sepolia.etherscan.io/tx/' + paid, 'Sepolia tool bought through Chain Signatures')} <b class="ok">✓ ToolPaid ${esc(sepolia.paid.amount)} TOOL</b></div>`;
  const relayer = sepolia?.relayer?.address;
  return `<div class="check"><b>○</b> Sepolia tool purchase through Chain Signatures <b class="wait">${tool ? esc(tool.state) : 'not sent yet'}</b>${relayer ? `<span class="sub">MPC derived relayer ${link('https://sepolia.etherscan.io/address/' + relayer, short(relayer))} is waiting for test ETH</span>` : ''}</div>`;
}
function renderAllTx() {
  $('#alltx').innerHTML = run.transactions.map((t: any) => `<a class="receipt" href="${esc(t.explorer)}" target="_blank" rel="noopener noreferrer"><strong>${esc(titleOf(t.label))} ↗ ${badge(t)}</strong><code>${esc(t.hash)}</code></a>`).join('');
}
function renderSource(state: 'checking' | 'live' | 'bundled' | 'failed', note = '') {
  const ok = reconciles(chain.economy, chain.creatures);
  const v = run.transactions.filter((t: any) => ['verified', 'refusal-verified'].includes(verdict(t))).length;
  const txt = state === 'checking' ? 'Reading NEAR testnet…'
    : state === 'live' ? `Live testnet · block ${chain.block_height} · ${v}/${run.transactions.length} txs verified${ok ? ' · supply reconciles' : ''}`
    : `${OFFLINE ? 'Offline file' : 'Bundled read'} · chain checked at block ${chain.block_height} · ${v}/${run.transactions.length} txs verified${note}`;
  $('#source').innerHTML = `<span class="dot ${state}"></span>${esc(txt)}${OFFLINE ? '' : ' <button id="reread">Re-read</button>'}`;
  const b = document.querySelector('#reread') as HTMLButtonElement | null; if (b) b.onclick = () => goLive();
}

async function goLive() {
  if (OFFLINE || params.get('live') === 'off') { renderSource('bundled'); return; }
  renderSource('checking');
  try {
    const next = await readChain(fetch.bind(window) as any, run.controller, baseRun.transactions);
    if (!reconciles(next.economy, next.creatures)) throw new Error('live state does not reconcile');
    // Finished transactions never change. If a public archival node is rate
    // limiting us right now, keep the build time chain check for that hash.
    next.txs = next.txs.map(t => t.final === 'unknown' ? { ...(chain.txs.find(b => b.hash === t.hash) ?? t), from: 'bundled' } as any : t);
    chain = next; chainLive = true;
    const atFinal = index === run.events.length - 1;
    run = withLiveFinal(baseRun, chain);
    if (atFinal) index = run.events.length - 1;
    renderSource('live'); renderAllTx(); update(false);
  } catch (e) {
    console.warn('live read failed, keeping the bundled chain read', e);
    renderSource('failed', ' · live read failed');
  }
}

function step(dir: number, animate = true) { const n = Math.max(0, Math.min(run.events.length - 1, index + dir)); if (n === index) return false; index = n; update(animate && dir === 1); return true; }
function stopPlay() { playing = false; clearInterval(playTimer); }
$('#back').onclick = () => { stopPlay(); step(-1); };
$('#next').onclick = () => { stopPlay(); step(1); };
$('#play').onclick = () => {
  if (playing) { stopPlay(); update(false); return; }
  playing = true; if (index === run.events.length - 1) { index = 0; update(false); }
  playTimer = setInterval(() => { if (!step(1)) { stopPlay(); update(false); } }, reduced ? 1400 : 2300);
  update(false);
};
($('#timeline') as HTMLInputElement).oninput = ev => { stopPlay(); index = Number((ev.target as HTMLInputElement).value); update(false); };
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-jump]')) b.onclick = () => {
  stopPlay(); const k = b.dataset.jump!;
  const i = k === 'final' ? run.events.length - 1 : run.events.findIndex((e: any) => e.kind === k);
  // land one step early and play the moment itself forward
  if (k !== 'final' && i > 0) { index = i - 1; update(false); step(1); } else { index = i; update(false); }
};
$('#motion').onclick = () => { reduced = !reduced; if (world) world.reduced = reduced; update(false); };
reduceQuery.addEventListener?.('change', e => { reduced = e.matches; if (world) world.reduced = reduced; update(false); });
labels.onclick = ev => { const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('.crit'); if (!b) return; const k = b.dataset.key as Key; openDrawer = openDrawer === k ? null : k; updateLabels(); renderDrawer(); if (openDrawer) $('#drawer').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); };
$('#drawer').onclick = ev => {
  const t = ev.target as HTMLElement;
  if (t.closest('.close')) { openDrawer = null; updateLabels(); renderDrawer(); }
  const c = t.closest<HTMLButtonElement>('.copy');
  if (c) { navigator.clipboard?.writeText(c.dataset.copy!).then(() => { c.textContent = 'Copied'; }, () => { c.textContent = 'Select to copy'; }); }
};
document.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') { stopPlay(); step(1); } else if (e.key === 'ArrowLeft') { stopPlay(); step(-1); } else if (e.key === 'Escape' && openDrawer) { openDrawer = null; updateLabels(); renderDrawer(); }
});

if (params.get('frame') === 'start') index = 0;
const frameKind = params.get('frame'); if (frameKind && frameKind !== 'start' && frameKind !== 'final') { const i = run.events.findIndex((e: any) => e.kind === frameKind); if (i >= 0) index = i; }
renderAllTx(); renderSource('bundled'); update(false);

// Habitat renderer
const stage = $('#stage'), canvas = $<HTMLCanvasElement>('#world');
function chooseLayout(): LayoutName { return stage.clientWidth < 640 ? 'mobile' : 'desktop'; }
function fit() {
  const name = chooseLayout();
  if (name !== layoutName) { layoutName = name; stage.dataset.layout = name; updateLabels(); }
  world?.setLayout(name);
  const L = LAYOUTS[name], cssW = stage.clientWidth, cssH = cssW * L.h / L.w;
  const mobile = matchMedia('(max-width: 700px)').matches;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer?.resize(cssW, cssH, dpr);
  if (world && renderer) renderer.draw(world);
}
(async () => {
  try {
    const atlas = await loadAtlas();
    const mobile = matchMedia('(max-width: 700px)').matches;
    world = new World(atlas, mobile ? 96 : 180); world.reduced = reduced;
    layoutName = chooseLayout(); stage.dataset.layout = layoutName; world.setLayout(layoutName); world.setScene(scene, false);
    const force = params.get('renderer');
    try { if (force === 'canvas') throw new Error('canvas forced'); renderer = await createPixi(canvas, world); }
    catch (e) { console.info('PixiJS unavailable, using Canvas2D', e); const fresh = canvas.cloneNode() as HTMLCanvasElement; canvas.replaceWith(fresh); renderer = createCanvas2D(fresh, world); }
    stage.dataset.renderer = renderer.kind;
    $('#renderer-note').textContent = `TAP A CREATURE FOR PROOF · ${renderer.kind === 'pixi' ? 'PIXIJS' : 'CANVAS2D'}${atlas.phase2.loaded ? ` · ${atlas.phase2.clips} ANIMATION STRIPS` : ''}`;
    $('#loading').remove();
    fit(); updateLabels();
    new ResizeObserver(() => fit()).observe(stage);
    let lastT = performance.now(), raf = 0;
    const frame = (t: number) => { raf = requestAnimationFrame(frame); const dt = (t - lastT) / 1000; lastT = t; world!.update(dt); renderer!.draw(world!); };
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { lastT = performance.now(); raf = requestAnimationFrame(frame); } });
    (window as any).__feral = { world, renderer: renderer.kind, atlas: atlas.phase2, get scene() { return scene; }, get chainLive() { return chainLive; } };
  } catch (e) { console.error(e); $('#loading').textContent = 'The habitat art failed to load. Balances and proofs above are unaffected.'; }
})();
goLive();
