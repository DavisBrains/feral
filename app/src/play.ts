// Live play. Every control sends one request to the keeper, which signs one
// NEAR testnet transaction with its scoped function-call key. The habitat and
// every number are redrawn from the next chain read, never from the click.
import pinBrass from '../../design/phase3/assets/ui/pin_brass.svg';
import cornerSvg from '../../design/phase3/assets/ui/paper_corner.svg';
import sprout from '../../design/phase3/assets/ornaments/sprout_bone.png';
import rootCorner from '../../design/phase3/assets/ornaments/root_corner_bone.png';
import { liveScene, familyTree, lineagesAlive, slotMap, type LiveSnap } from './live';
import { art, type Scene } from './scene';
import { esc, ico, short, cap, nf, txLink, acctLink, moodWord, lane, SEAL, COIN, COLOR, PORTRAIT, TX } from './ui';
import type { NoteData } from './main';

export interface PlayHost { show(scene: Scene, animate: boolean): void; mode(): 'live' | 'replay'; switchTo(m: 'live' | 'replay'): void; reduced(): boolean; relabel(): void }
type Sheet = '' | 'feed' | 'job' | 'sponsor' | 'demand';
const MARKET_JOB = 60; // the keeper posts one market job of this reward each turn (engine.mjs)
const UPKEEP = 10;

function visitorId(): string {
  let v = localStorage.getItem('feral-visitor');
  if (!v || !/^[a-f0-9]{32}$/.test(v)) { v = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('feral-visitor', v); }
  return v;
}
const put = (el: HTMLElement | null, html: string) => { if (el && (el as any)._h !== html) { (el as any)._h = html; el.innerHTML = html; } };

export function startPlay(host: PlayHost, api: string) {
  const vid = visitorId();
  let st: any = null, prev: LiveSnap | null = null, idx = 0, pending: string | null = null, timer: any, err: string | null = null, limitedUntil = 0;
  // Render free sleeps after ~15 min idle and takes about a minute to wake. Keep
  // retrying with a friendly message, then fall back to the recorded replay.
  let wakeStarted = 0, wakeFails = 0;
  const WAKE_MS = 90_000;
  const ui = { feedPick: '', sponsorPick: '', sponsorAmt: 20, demandPick: -1, jobLine: 0, jobReward: 60, jobTurns: 2, goalPick: '', goal: 0, sheet: '' as Sheet };
  const modeEl = document.getElementById('pl-mode')!;
  const banner = document.createElement('div'); banner.id = 'pl-banner'; banner.className = 'pl-banner';
  document.querySelector('.world')!.prepend(banner);
  const toasts = document.createElement('div'); toasts.className = 'pl-toasts'; toasts.setAttribute('aria-live', 'polite'); document.body.append(toasts);
  const scrim = document.createElement('div'); scrim.className = 'pl-scrim'; document.body.append(scrim);
  scrim.addEventListener('click', () => { ui.sheet = ''; render(); });

  async function get() {
    if (!api) throw new Error('keeper url missing');
    const ctrl = new AbortController();
    // Cold starts on Render free can hold the first request for about a minute.
    const wait = wakeStarted && !st ? WAKE_MS : 20_000;
    const to = setTimeout(() => ctrl.abort(), wait);
    try {
      const r = await fetch(api + '/api/state', { headers: { 'x-feral-visitor': vid }, cache: 'no-store', signal: ctrl.signal });
      if (!r.ok) throw new Error('keeper ' + r.status);
      return r.json();
    } finally { clearTimeout(to); }
  }
  async function post(path: string, body: any, label: string) {
    pending = label; render();
    try {
      const r = await fetch(api + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-feral-visitor': vid }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      const e = j.entry;
      if (r.status === 429) { limitedUntil = Date.now() + (Number(j.retry_after_s) || 20) * 1000; toast('error', 'Give them a breath', `Too many moves at once. You can act again in ${Math.ceil((limitedUntil - Date.now()) / 1000)} seconds.`); }
      else if (!r.ok || !e?.ok) toast('error', 'That did not go through', e?.error ? `The chain said no and nothing was spent. ${e.error}` : (j.error ?? 'The keeper could not send it. Nothing was spent.'), e?.tx);
      else { const [t, s] = receiptCopy(path, body, e); toast('ok', t, s, e.tx); ui.sheet = ''; }
    } catch { toast('error', 'The keeper went quiet', 'Nothing was sent. Try again in a moment.'); }
    pending = null; await poll(true);
  }
  const nameOf = (id: string) => cap(st?.chain?.lives?.find((l: any) => l.id === id)?.life?.name ?? id.split('.')[0].split('-').slice(1).join('-'));
  function receiptCopy(path: string, body: any, e: any): [string, string] {
    if (path === '/api/turn') { const r = e.result ?? {}; return [`Turn ${r.turn ?? ''} settled`, `${r.burned ?? '?'} MUNCH burned.${r.died?.length ? ` ${r.died.map(nameOf).join(' and ')} turned to stone.` : ' Everyone made it.'}${r.status && r.status !== 'live' ? ` Season ${r.status}.` : ''}`]; }
    if (path === '/api/season') return ['Season started', 'A fresh 1,000 MUNCH seed and three founder accounts are on testnet.'];
    if (body.type === 'feed') return [`Fed ${nameOf(body.actor)} ${UPKEEP} MUNCH`, 'It went straight to their balance on chain.'];
    if (body.type === 'sponsor') return [`You back ${nameOf(body.actor)}`, `${body.amount} MUNCH moved from your pouch to their balance.`];
    if (body.type === 'job') return ['Job pinned', `Bids open next turn. ${body.reward} MUNCH waits in escrow.`];
    if (body.type === 'demand') return ['Notice pinned', `${['Short captions', 'Bilingual cards', 'Plain translations'][body.kind] ?? 'That work'} pay ${MARKET_JOB} from next turn.`];
    if (body.type === 'goal') return ['Goal set', `${nameOf(body.actor)} will ${['work', 'save and not breed', 'breed when it can'][body.goal]}.`];
    return [e.label, 'Confirmed on NEAR testnet.'];
  }
  function toast(kind: 'ok' | 'error', title: string, text: string, tx?: string | null) {
    while (toasts.children.length >= 2) toasts.firstElementChild!.remove();
    const el = document.createElement('div'); el.className = `f-toast${kind === 'error' ? ' is-error' : ''}`;
    el.innerHTML = `<span class="ic">${ico(kind === 'error' ? 'alert' : 'check')}</span><div><b>${esc(title)}</b><span>${esc(text)}</span>${tx ? `<div class="mono">${txLink(tx, 'Receipt ' + short(tx))}</div>` : ''}</div><button class="x" aria-label="Dismiss">${ico('close', 'ico-s')}</button>`;
    el.querySelector('.x')!.addEventListener('click', () => el.remove());
    toasts.append(el); if (kind === 'ok') setTimeout(() => el.remove(), 5000);
  }
  async function poll(force = false) {
    clearTimeout(timer);
    if (host.mode() === 'live' && (force || !document.hidden)) {
      try {
        const next = await get(); err = null; wakeStarted = 0; wakeFails = 0;
        const snap: LiveSnap = next.chain;
        const changed = !st || JSON.stringify(st.chain.lives) !== JSON.stringify(snap.lives) || JSON.stringify(st.chain.season) !== JSON.stringify(snap.season);
        const logChanged = !st || st.log.length !== next.log.length;
        // older journal rows were written before the copy rules, so tidy them for display (no colons, names capitalised)
        for (const e of next.log ?? []) if (typeof e.label === 'string') e.label = e.label.replace(/:\s+/g, ', ').replace(/\b(moss|echo|ash|pip\d*)\b(?![.-])/g, (n: string) => n[0].toUpperCase() + n.slice(1)).replace(/^./, (c: string) => c.toUpperCase());
        st = next; (window as any).__feralLive = snap;
        if (changed) { const sc = liveScene(prev, snap, ++idx); host.show(sc, !!prev); prev = snap; }
        else if (logChanged) host.relabel();
        render();
      } catch (e) {
        err = String((e as Error).message);
        if (!st) { if (!wakeStarted) wakeStarted = Date.now(); wakeFails += 1; }
        render();
      }
    }
    const waking = !!api && !!wakeStarted && !st && (Date.now() - wakeStarted < WAKE_MS);
    timer = setTimeout(poll, st?.busy || pending ? 1200 : waking ? 2000 : 3000);
  }

  // ---------- data helpers ----------
  const lives = () => (st?.chain?.lives ?? []) as any[];
  const slotOf = (id: string) => slotMap(lives()).get(id) ?? 'pip';
  const artOf = (id: string) => art(slotOf(id) as any);
  const imgOf = (l: any) => !l.life.active && artOf(l.id) === 'ash' ? PORTRAIT['ash-fossil'] : PORTRAIT[artOf(l.id)];
  const seasonLog = () => (st?.log ?? []).filter((e: any) => e.season === st?.chain?.season?.id);
  const lastTurn = () => Math.max(0, ...seasonLog().filter((e: any) => e.kind === 'decision').map((e: any) => e.turn));
  const pouch = (s: any) => ({ left: Number(s.budget_left), total: Number(s.budget) });
  const blocked = () => !!pending || !!st?.busy || Date.now() < limitedUntil;

  const mname = (m: any) => String(m ?? '').replace(/^.*\//, '').replace('-Instruct', '');
  // who actually answered: NEAR AI Cloud, the local Qwen fallback, or neither
  const via = (x: any) => x?.provider === 'near-ai' ? `NEAR AI Cloud · ${mname(x.model)}` : x?.provider === 'local-qwen' || (x?.mode === 'live-model' && !x?.provider) ? `Local Qwen fallback · ${mname(x.model)}` : 'Fixed policy';
  const skippedNote = (x: any) => x?.skipped?.length ? ` · ${x.skipped.map((k: any) => `${k.label} ${k.kind === 'billing' ? 'out of credits' : k.kind === 'rate' ? 'rate limited' : 'unavailable'}`).join(', ')}` : '';
  function answeredBy(turn = lastTurn()) {
    const rows = seasonLog().filter((e: any) => e.kind === 'decision' && e.turn === turn).map((e: any) => e.translation ?? e.decision).filter((x: any) => x && x.mode !== 'only-legal-action');
    const names = [...new Set(rows.map((x: any) => via(x).split(' · ')[0]))];
    return names.length ? ` · answered by ${esc(names.join(' and '))}` : '';
  }
  function decisionNotes(turn = lastTurn()): NoteData[] {
    return seasonLog().filter((e: any) => e.kind === 'decision' && e.turn === turn).map((e: any) => {
      const l = lives().find(x => x.id === e.actor), name = cap(l?.life.name ?? 'creature'), key = l ? artOf(l.id) : 'pip';
      const t = e.translation, d = e.decision, a = d?.action ?? {};
      if (t) return { key, who: name, act: `Translated “${t.en}”`, why: `“${t.es}”`, whyKind: 'translation', src: t.mode === 'live-model' ? `Translated this turn · ${via(t)} · ${t.seconds}s · unreviewed${skippedNote(t)}` : `Supplied translation · no model answered${skippedNote(t)}`, dim: false } as NoteData;
      const act = a.action === 'bid' ? `Bid ${a.price} on job ${a.job}` : a.action === 'wait' ? 'Waited' : a.action === 'breed' || a.action === 'reproduce' ? 'Paid for a child' : cap(String(a.action ?? 'acted'));
      if (d?.mode === 'live-model') return { key, who: name, act, why: d.reason ?? null, whyKind: 'model', src: `Decided this turn · ${via(d)} · 1 of ${d.options} legal moves${d.reason ? ' · its own words' : ''}${skippedNote(d)}`, dim: !l?.life.active } as NoteData;
      if (d?.mode === 'only-legal-action') return { key, who: name, act, why: 'It had one legal move, so no model was asked.', whyKind: 'policy', src: 'Only legal move · no model call', dim: !l?.life.active } as NoteData;
      return { key, who: name, act, why: `Its written policy ${e.policy ?? ''}`.trim(), whyKind: 'policy', src: `Fixed policy · no model answered${skippedNote(d)}`, dim: !l?.life.active } as NoteData;
    });
  }

  // ---------- rendering ----------
  function render() {
    const live = host.mode() === 'live';
    put(modeEl, `<div class="f-mode" role="group" aria-label="Mode"><button data-mode="live" aria-pressed="${live}"><span class="f-live"></span>Live season</button><button data-mode="replay" aria-pressed="${!live}">${ico('replay')}<span class="long">Recorded proof run</span><span class="short">Recorded run</span></button></div>`);
    document.body.classList.toggle('sheet-open', live && !!ui.sheet);
    if (!live) { put(banner, `<div class="f-banner">${ico('replay')}<span><b>Recorded proof run.</b> <span class="long">A replay of the real run from 9 Nov. Nothing new is sent.</span><span class="short">A replay of the real run. Nothing new is sent.</span></span></div>`); renderSeasonIdle(); return; }
    const hero = document.getElementById('hero-side'), body = document.getElementById('season-body'), lede = document.getElementById('season-lede');
    if (err && !st) {
      put(banner, '');
      const waking = !!api && wakeStarted && (Date.now() - wakeStarted < WAKE_MS);
      if (!api) {
        put(hero, `<div class="f-panel f-empty"><img src="${rootCorner}" alt=""><b>Live keeper not linked yet</b><span>This build has no keeper address, so only the recorded proof run is available.</span><button class="f-btn f-btn--ghost" data-mode="replay">${ico('replay', 'ico-s')}Watch the proof run</button></div>`);
      } else if (waking) {
        put(hero, `<div class="f-panel f-empty"><span class="f-seeds"><i></i><i></i><i></i></span><b>Waking the terrarium</b><span>The free keeper sleeps when quiet and takes about a minute to wake. Hang on, or watch the recorded proof run.</span><button class="f-btn f-btn--ghost" data-mode="replay">${ico('replay', 'ico-s')}Watch the proof run</button></div>`);
      } else {
        put(hero, `<div class="f-panel f-empty err"><img src="${rootCorner}" alt=""><b>The keeper went quiet</b><span>Live play needs the keeper service. The recorded proof run still works.</span><button class="f-btn f-btn--ghost" data-mode="replay">${ico('replay', 'ico-s')}Watch the proof run</button></div>`);
      }
      put(body, ''); dock(null); return;
    }
    if (!st) { put(hero, `<div class="f-panel f-empty"><span class="f-seeds"><i></i><i></i><i></i></span><b>Reading the chain</b><span>Asking the arena contract for this season.</span></div>`); return; }
    const s = st.chain.season, m = st.model;
    const near = (m.providers ?? []).find((p: any) => p.provider === 'near-ai');
    const nearDown = near && !near.ready ? ` NEAR AI Cloud is ${near.blocked?.kind === 'billing' ? 'out of credits' : near.blocked?.kind === 'rate' ? 'rate limited' : 'unavailable'} for now.` : '';
    const modelLine = m.mode !== 'live-model' ? `<b>Fixed policy.</b>${nearDown} No model is ready, so creatures follow their written policy. Every decision says so.`
      : m.provider === 'near-ai' ? `Creatures decide with ${esc(mname(m.model))} on NEAR AI Cloud${near?.confirmed ? '' : ', tried first each turn'}. Each note says which model answered.`
      : `<b>Local Qwen fallback.</b>${nearDown} Creatures decide with ${esc(mname(m.model))} on the keeper. Each note says which model answered.`;
    put(banner, `<div class="f-banner is-live"><span class="f-live"></span><span><b>Live season${s ? ' ' + s.id : ''}.</b> Your moves are sent to NEAR testnet for real. ${modelLine}</span></div>`);
    const active = s && s.status === 'live' && !s.closed, you = st.you, pilot = you.pilot && active;
    put(lede, s ? `You get ${nf(s.budget)} MUNCH for the whole season. Spend it on meals, sponsors and jobs. The creatures decide the rest.` : 'Start a live season to play. Every move is a NEAR testnet transaction.');
    put(hero, heroHtml(s, active, you));
    put(body, !s ? '' : `<div class="rowA">${outcomeHtml(s)}${pilot ? pouchHtml(s) : watchHtml(s, you)}${receiptHtml(s)}</div>
      ${pilot ? `<div class="rowB">${demandHtml(s)}${sponsorHtml(s)}${feedHtml(s)}${jobHtml(s)}</div>` : ''}
      <div class="rowC">${logHtml(s)}<div class="chose"><span class="caps c2">What they chose · turn ${lastTurn()}${answeredBy()}</span><div class="notes">${decisionNotes().map(noteHtml).join('') || '<div class="f-panel f-empty"><img src="' + sprout + '" alt=""><b>No decisions yet</b><span>Advance a turn and their choices land here.</span></div>'}</div></div></div>
      <div class="rowE">${treeHtml(s)}${pilot ? goalSetHtml(s) : ''}${workHtml(s)}${keyHtml()}</div>`);
    dock(s, pilot);
  }
  function renderSeasonIdle() {
    put(document.getElementById('season-body'), `<div class="f-panel f-empty"><img src="${sprout}" alt=""><b>You are watching the recorded run</b><span>Switch to the live season to feed, sponsor, post jobs and move time forward.</span><button class="f-btn f-btn--ghost" data-mode="live"><span class="f-live"></span>Go to the live season</button></div>`);
    dock(null);
  }
  const noteHtml = (n: NoteData, i: number) => `<div class="f-note${n.dim ? ' is-dim' : ''}" style="--c:${n.dim ? 'var(--fossil)' : COLOR[n.key] ?? 'var(--bone-2)'};--rot:${[-1.2, .8, -.6, 1, -.4][i % 5]}deg"><div class="who"><i></i>${esc(n.who)} ${n.whyKind === 'translation' ? 'worked' : 'chose'}</div><div class="act">${esc(n.act)}</div>${n.why ? `<div class="why${n.whyKind === 'policy' ? ' seen' : ''}">${esc(n.why)}</div>` : ''}<div class="src">${esc(n.src)}</div></div>`;

  function heroHtml(s: any, active: boolean, you: any) {
    const goal = s ? goalHtml(s) : '';
    return `<div class="f-panel f-goal hero-goal">${goal}${goal ? '<hr class="f-rule">' : ''}${advanceHtml(s, active, you)}</div>`;
  }
  function goalHtml(s: any) {
    const N = s.target_turns, lines = new Map<string, any[]>();
    for (const l of lives()) { const k = l.life.lineage; lines.set(k, [...(lines.get(k) ?? []), l]); }
    const lanes = [...lines.values()].map(ms => {
      const alive = ms.some(x => x.life.active), died = alive ? null : Math.max(...ms.map(x => x.life.died_turn ?? 0));
      return lane(cap(ms[0].life.name), COLOR[artOf(ms[0].id)], alive ? s.turn : Math.max(0, (died ?? 1) - 1), N, alive, died);
    }).join('');
    const p = pouch(s);
    const verdict = s.status === 'won' ? `<div class="f-verdict win"><img src="${SEAL.moss}" alt=""><div><b>Both lines held. Season won.</b><span>You spent ${p.total - p.left} of ${p.total} MUNCH keeping them fed.</span></div></div>`
      : s.status === 'lost' ? `<div class="f-verdict lose"><img src="${SEAL.fossil}" alt=""><div><b>Fewer than two lines lived past turn ${s.ended_turn}.</b><span>Season lost. The fossils stay on chain for good.</span></div></div>` : '';
    return `<span class="caps c2">${ico('season', 'ico-s')} Season goal · ${lineagesAlive(st.chain)} lines alive</span><h4>Keep two lineages alive for ${N} turns</h4>${lanes}<div class="foot"><span>Turn ${s.turn} of ${N}</span><span>Pouch ${p.left} of ${p.total}</span></div>${verdict}`;
  }
  function advanceHtml(s: any, active: boolean, you: any) {
    const alive = lives().filter(l => l.life.active).length;
    const press = (cls: string, act: string, seal: string, label: string, dis = false) => `<button class="f-press ${cls}" ${act ? `data-act="${act}"` : ''} ${dis ? 'disabled' : ''} aria-label="${esc(label)}"><img src="${seal}" alt=""></button>`;
    if (st.busy || pending === 'turn' || pending === 'season') {
      const last = seasonLog().filter((e: any) => e.tx).at(-1);
      return `<div class="f-advance compact">${press('is-pending', '', SEAL.amber, 'Settling', true)}<div><h4>${pending === 'season' ? 'Starting a season' : 'Settling on chain'}</h4><p>${pending === 'season' ? 'Minting the seed and creating founder accounts.' : 'Hold tight. Each step is its own transaction.'}</p><div class="tx"><span class="f-seeds"><i></i><i></i><i></i></span> ${esc(st.progress || 'sending')}${last ? ` · ${txLink(last.tx)}` : ''}</div></div></div>`;
    }
    if (!s || !active) {
      const ended = s && (s.status === 'won' || s.status === 'lost'), can = you.can_start;
      return `<div class="f-advance compact">${press(can ? '' : 'is-disabled', can ? 'season' : '', ended && s.status === 'won' ? SEAL.moss : SEAL.amber, 'Start a new season', !can)}<div><h4>${ended ? (s.status === 'won' ? 'Season won. Start another?' : 'Season lost. Try again?') : 'Start a live season'}</h4><p>Mints a fresh 1,000 MUNCH seed and creates three founder accounts on NEAR testnet. You get a 120 MUNCH pouch.</p><div class="tx">${can ? 'One season at a time. It is yours while you play.' : `Free again in ${Math.ceil(you.lease_left_ms / 60000)} min, or when it ends.`}</div></div></div>`;
    }
    if (!you.pilot) return `<div class="f-advance compact">${press('is-disabled', '', SEAL.amber, 'Advance is held by another visitor', true)}<div><h4>You are watching season ${s.id}</h4><p>Another visitor holds this season. Everything here is read from the chain.</p><div class="tx">${you.can_start ? `It has gone quiet. <button class="f-link" data-act="season">Start a new season</button>` : `Free in ${Math.ceil(you.lease_left_ms / 60000)} min if it sits idle.`}</div></div></div>`;
    const dis = blocked();
    return `<div class="f-advance compact">${press(dis ? 'is-disabled' : '', 'turn', SEAL.amber, 'Advance the turn', dis)}<div><h4>Advance the turn</h4><p>Everyone alive pays ${UPKEEP} MUNCH. Then they bid, work and settle.</p><div class="tx">Turn ${s.turn + 1} is next · ${alive} alive · ${alive * UPKEEP} MUNCH will burn</div><button class="f-link pl-reset" data-act="season">${ico('season', 'ico-s')}Close this season and start fresh</button></div></div>`;
  }
  function outcomeHtml(s: any) {
    const tick = seasonLog().filter((e: any) => e.method === 'tick' && e.ok).at(-1);
    if (!tick) return `<div class="f-panel"><div class="f-advance"><span class="f-press seal-only" aria-hidden="true"><img src="${SEAL.pending}" alt=""></span><div><h4>No turn settled yet</h4><p>Pin a notice, feed someone, post a job. Then press Advance.</p></div></div></div>`;
    const r = tick.result ?? {}, died: string[] = r.died ?? [];
    const settled = seasonLog().filter((e: any) => e.turn === tick.turn && e.method === 'settle' && e.ok);
    const worker = (e: any) => nameOf((st.chain.jobs ?? []).find((j: any) => j.id === e.args?.job_id)?.claimant ?? e.label.split(' ')[0]);
    const pills = `<span class="f-pill amber">${ico('burn', 'ico-s')}${r.burned} burned</span>${died.map(d => `<span class="f-pill fossil">${ico('fossil', 'ico-s')}${esc(nameOf(d))} is a fossil</span>`).join('')}${settled.map((e: any) => `<span class="f-pill moss">${ico('work', 'ico-s')}${esc(worker(e))} paid ${esc(jobReward(e.args?.job_id))}</span>`).join('')}<span class="f-pill">${txLink(tick.tx, undefined, 'mono')}</span>`;
    const title = died.length ? `${died.map(nameOf).join(' and ')} turned to stone` : `Turn ${r.turn} settled`;
    const text = died.length ? 'It could not cover upkeep. What it held is frozen inside.' : `Everyone made it through.${settled.length ? ` ${settled.map(worker).join(' and ')} won paid work.` : ''}`;
    return `<div class="f-panel"><div class="f-advance"><span class="f-press seal-only" aria-hidden="true"><img src="${died.length ? SEAL.fossil : SEAL.moss}" alt=""></span><div><h4>${esc(title)}</h4><p>${esc(text)}</p><div class="f-out">${pills}</div></div></div></div>`;
  }
  function jobReward(id: string) { const j = (st.chain.jobs ?? []).find((x: any) => x.id === id); return j ? j.reward : ''; }
  function pouchHtml(s: any) {
    const { left, total } = pouch(s), seeds = Math.ceil(total / 10), full = Math.floor(left / 10);
    const cls = left === 0 ? ' is-empty' : left <= total * .2 ? ' is-low' : '';
    const note = left === 0 ? 'Empty. The creatures carry on without you.' : left <= total * .2 ? `${full === 1 ? 'One seed' : `${cap(['zero', 'one', 'two', 'three'][full] ?? String(full))} seeds`} left. Spend them where they count.` : 'Each seed is 10 MUNCH. It lasts the whole season.';
    return `<div class="f-panel f-pouch${cls}"><div class="row"><span class="caps c2">Your MUNCH pouch</span><span class="amt"><b>${left}</b> of ${total}</span></div><div class="f-coins">${Array.from({ length: seeds }, (_, i) => `<img src="${COIN}" alt="" class="${i < full ? '' : 'spent'}">`).join('')}</div><div class="mono meta">${note}</div></div>`;
  }
  function receiptHtml(s: any) {
    const e = seasonLog().filter((x: any) => x.tx && x.ok && (x.kind === 'visitor' || x.method === 'tick')).at(-1);
    if (!e) return '<div></div>';
    const icon = { feed: 'feed', sponsor: 'sponsor', post_job: 'job', set_demand: 'job', set_goal: 'life_nft', tick: 'burn', start_season: 'season' }[e.method as string] ?? 'check';
    return `<div><span class="caps c3 lbl">Latest receipt</span><div class="f-toast static"><span class="ic">${ico(icon)}</span><div><b>${esc(e.label)}</b><span>Turn ${e.turn} · season ${e.season}</span><div class="mono">${txLink(e.tx, 'Receipt ' + short(e.tx))}</div></div></div></div>`;
  }
  const sheetCls = (k: Sheet) => ui.sheet === k ? ' is-open' : '';
  const grab = '<div class="grab" aria-hidden="true"></div>';
  function demandHtml(s: any) {
    const pick = ui.demandPick < 0 ? s.demand : ui.demandPick, changed = pick !== s.demand, dis = blocked();
    const opt = (k: number, t: string, sub: string, off = false) => `<button class="f-opt${pick === k ? ' is-on' : ''}${off ? ' is-disabled' : ''}" data-demand="${k}" aria-pressed="${pick === k}"${off ? ' disabled' : ''}><span class="rad"></span><span class="t">${t}<small>${sub}</small></span><span class="pay">${off ? 'Soon' : `${MARKET_JOB} MUNCH`}</span></button>`;
    const shock = seasonLog().filter((e: any) => e.method === 'set_demand' && e.ok).at(-1);
    return `<div class="f-paper f-notice acts sheet-demand${sheetCls('demand')}" data-sheet="demand">${grab}<img class="pin" src="${pinBrass}" alt=""><span class="kick caps">Field notice · turn ${s.turn}</span><h3>Wanted this turn</h3><p>The market posts one ${MARKET_JOB} MUNCH job each turn for the work pinned here. Changing it is your demand shock. Old jobs lose their market.</p><div class="opts">${opt(0, 'Short captions', 'One line, English only')}${opt(1, 'Bilingual caption cards', 'English and Spanish on one card')}${opt(2, 'Plain translation', st.translation_demand ? 'Spanish only, no card' : 'Spanish only, no card. Waits on an arena upgrade', !st.translation_demand)}</div><div class="f-cost"><span class="c">${changed ? 'Costs nothing from your pouch' : shock ? `You pinned this on turn ${shock.turn}` : 'Season default'}</span><button class="f-btn${changed && !dis ? '' : ' is-disabled'}" data-act="demand" ${changed && !dis ? '' : 'disabled'}>${pending === 'demand' ? '<span class="f-seeds"><i></i><i></i><i></i></span>Pinning' : changed ? `${ico('job', 'ico-s')}Pin the new notice` : 'Already pinned'}</button></div>${changed ? '' : '<span class="f-stampmark">Pinned</span>'}</div>`;
  }
  const picks = (sel: string, attr: string, sub: (l: any) => string) => `<div class="f-choose">${lives().map(l => `<button class="f-pick${l.id === sel ? ' is-on' : ''}${l.life.active ? '' : ' is-disabled'}" data-${attr}="${esc(l.id)}" ${l.life.active ? '' : 'disabled'} aria-pressed="${l.id === sel}"><img src="${imgOf(l)}" alt="">${esc(cap(l.life.name))} <span class="sub">${sub(l)}</span></button>`).join('')}</div>`;
  const spentBtn = (left: number, need: number, ok: boolean, act: string, icon: string, label: string, verb: string) => {
    const why = left === 0 ? 'Pouch is empty' : left < need ? `Pouch cannot cover ${need}` : label;
    return `<button class="f-btn${ok ? '' : ' is-disabled'}" data-act="${act}" ${ok ? '' : 'disabled'}>${pending === act ? `<span class="f-seeds"><i></i><i></i><i></i></span>${verb}` : `${ico(icon, 'ico-s')}${esc(why)}`}</button>`;
  };
  function sponsorHtml(s: any) {
    const sel = lives().find(l => l.id === ui.sponsorPick && l.life.active), { left } = pouch(s), ok = !!sel && left >= ui.sponsorAmt && !blocked();
    return `<div class="f-paper f-act acts${sheetCls('sponsor')}" data-sheet="sponsor">${grab}<span class="caps sheet-only c-ink3">Pouch ${left} of ${s.budget}</span><h4>Sponsor a creature</h4><p>Back one creature with a bigger share of your pouch. Only the holder of its life NFT may do this, and the keeper holds them for you this season.</p>${picks(ui.sponsorPick, 'sponsor', l => l.life.active ? `${l.balance}` : 'ended')}<div class="f-cost"><div class="f-seg" role="group" aria-label="Amount">${[20, 40, 60].map(a => `<button class="${a === ui.sponsorAmt ? 'on' : ''}" data-amt="${a}" aria-pressed="${a === ui.sponsorAmt}">${a}</button>`).join('')}</div>${spentBtn(left, ui.sponsorAmt, ok, 'sponsor', 'sponsor', sel ? `Sponsor ${cap(sel.life.name)}` : 'Pick a creature', 'Sending')}</div><p class="f-help">${ui.sponsorAmt} MUNCH · pouch after ${Math.max(0, left - ui.sponsorAmt)}</p></div>`;
  }
  function feedHtml(s: any) {
    const sel = lives().find(l => l.id === ui.feedPick && l.life.active), { left } = pouch(s), ok = !!sel && left >= UPKEEP && !blocked();
    return `<div class="f-paper f-act acts${sheetCls('feed')}" data-sheet="feed">${grab}<span class="caps sheet-only c-ink3">Pouch ${left} of ${s.budget}</span><h4>Feed a creature</h4><p>A meal now buys them a turn. It goes straight to their balance on chain.</p>${picks(ui.feedPick, 'feed', l => l.life.active ? l.balance : 'stone')}<div class="f-cost"><span class="c">One meal · ${UPKEEP} MUNCH · pouch after ${Math.max(0, left - UPKEEP)}</span>${spentBtn(left, UPKEEP, ok, 'feed', 'feed', sel ? `Feed ${cap(sel.life.name)} ${UPKEEP}` : 'Pick a creature', 'Sending your meal')}</div><p class="f-help">Fossils cannot eat. The contract refuses them forever.</p></div>`;
  }
  function jobHtml(s: any) {
    const { left } = pouch(s), ok = left >= ui.jobReward && !blocked();
    return `<div class="f-paper f-notice acts tilt-r${sheetCls('job')}" data-sheet="job">${grab}<img class="pin" src="${pinBrass}" alt=""><span class="kick caps">Job posting · ${['short caption', 'bilingual card', 'plain translation'][s.demand] ?? 'job'}</span><h3>Post a job</h3><p>Pay comes from your pouch and waits in escrow. Creatures bid next turn and the lowest fair bid wins.</p>
    <div class="f-field"><label for="pl-line">What needs doing</label><select id="pl-line" class="f-input">${st.lines.map((l: string, i: number) => `<option value="${i}"${i === ui.jobLine ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
    <div class="jobgrid"><div class="f-field"><label>Reward</label><div class="f-step"><button data-rstep="-10" aria-label="Less" ${ui.jobReward <= 30 ? 'disabled' : ''}>−</button><span>${ui.jobReward}</span><button data-rstep="10" aria-label="More" ${ui.jobReward >= 100 ? 'disabled' : ''}>+</button></div><span class="f-help">MUNCH, from 30</span></div>
    <div class="f-field"><label>Open for</label><div class="f-seg" role="group" aria-label="Open for turns">${[1, 2, 3].map(n => `<button class="${n === ui.jobTurns ? 'on' : ''}" data-turns="${n}" aria-pressed="${n === ui.jobTurns}">${n}</button>`).join('')}</div><span class="f-help">turns</span></div></div>
    <div class="f-cost"><span class="c">Escrow ${ui.jobReward} · pouch after ${Math.max(0, left - ui.jobReward)}</span>${spentBtn(left, ui.jobReward, ok, 'job', 'job', 'Pin the job', 'Pinning')}</div></div>`;
  }
  function goalSetHtml(s: any) {
    const sel = lives().find(l => l.id === ui.goalPick && l.life.active), goals = ['Work', 'Save', 'Breed'];
    return `<div class="f-paper f-act"><h4>Set a goal</h4><p>The life NFT also lets you steer. Save forbids breeding on chain. Breed tells it to have a child as soon as its reserve allows.</p>${picks(ui.goalPick, 'goalpick', l => l.life.active ? ['work', 'save', 'breed'][l.life.goal] : 'ended')}<div class="f-cost"><div class="f-seg" role="group" aria-label="Goal">${goals.map((g, i) => `<button class="${i === ui.goal ? 'on' : ''}" data-goal="${i}" aria-pressed="${i === ui.goal}">${g}</button>`).join('')}</div><button class="f-btn${sel && !blocked() ? '' : ' is-disabled'}" data-act="goal" ${sel && !blocked() ? '' : 'disabled'}>${ico('life_nft', 'ico-s')}${sel ? `Set ${esc(cap(sel.life.name))}` : 'Pick a creature'}</button></div><p class="f-help">Free. It changes the goal field on chain.</p></div>`;
  }
  function watchHtml(s: any, you: any) {
    return `<div class="f-panel f-empty"><img src="${sprout}" alt=""><b>${s.status === 'live' ? 'You are watching' : 'This season has ended'}</b><span>${s.status === 'live' ? 'The visitor who started this season holds the controls. Every change you see comes from a chain read.' : 'Start a new season to play. The old one stays on chain.'}</span></div>`;
  }
  function treeHtml(s: any) {
    const rows = familyTree(st.chain);
    return `<div class="f-panel pl-tree"><span class="caps c2">${ico('lineage', 'ico-s')} Family tree · season ${s.id}</span><ul>${rows.map(r => {
      const l = lives().find(x => x.id === r.id), m = moodWord(r.balance, r.active);
      return `<li style="--d:${r.depth};--c:${r.active ? COLOR[artOf(r.id)] : 'var(--fossil)'}" class="${r.active ? '' : 'is-dead'}"><img src="${imgOf(l)}" alt=""><div><b>${esc(r.name)}</b> <span class="mono">${r.active ? `${r.balance} MUNCH · ${m.word}` : `Fossil · turn ${r.died}`}</span><small>${esc(r.plain)} · upkeep ${UPKEEP} a turn</small>${r.change ? `<small class="mut">Inherited with one change, ${esc(r.change)} · born turn ${r.born}</small>` : ''}<span class="links">${acctLink(r.id, 'account')}</span></div></li>`;
    }).join('')}</ul></div>`;
  }
  // Live cards are inlined so the page fonts render inside them. Only after the bytes hash to the settled value
  // and the markup holds nothing active. Anything else falls back to a plain image.
  const cards = new Map<string, { svg: string | null; match: boolean }>();
  async function loadCard(name: string, url: string, want: string) {
    cards.set(name, { svg: null, match: false });
    try {
      const text = await (await fetch(url)).text();
      const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
      const safe = /^<svg[\s>]/.test(text) && !/<script|<foreignObject|\son\w+\s*=|javascript:|href\s*=\s*["']?(?!#)/i.test(text);
      const match = hex === want;
      const ns = 'c' + hex.slice(0, 8) + '-'; // keep the card's filter ids from colliding with the page
      const shown = text.replace(/id="([\w-]+)"/g, `id="${ns}$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${ns}$1)`);
      cards.set(name, { svg: match && safe ? shown : null, match });
    } catch { cards.set(name, { svg: null, match: false }); }
    render();
  }
  function workHtml(s: any) {
    const paid = seasonLog().filter((e: any) => e.method === 'settle' && e.ok && e.args?.job_id).at(-1);
    if (!paid) return '';
    paid.output ??= `${paid.args.job_id}.svg`; paid.output_hash ??= paid.args.output_hash;
    const url = `${api}/api/out/${paid.output}`;
    const got = cards.get(paid.output);
    if (!got) loadCard(paid.output, url, paid.output_hash);
    const art = got?.svg ? `<div class="card card-svg" role="img" aria-label="Caption card delivered for ${esc(paid.args.job_id)}">${got.svg}</div>` : `<img class="card" src="${esc(url)}" alt="Caption card delivered for ${esc(paid.args.job_id)}">`;
    const check = got ? (got.match ? 'Its SHA-256 matches the hash settled on chain.' : 'Its SHA-256 does not match the settled hash, so it is shown as a plain image.') : 'Its SHA-256 is stored with the job on chain.';
    return `<div class="f-paper f-mount"><span class="caps meta">Paid work · this season</span><h3 class="disp mount-h">The card they made to earn</h3><div class="frame">${art}${['tl', 'tr', 'bl', 'br'].map(c => `<img class="corner ${c}" src="${cornerSvg}" alt="">`).join('')}</div><figcaption>${esc(paid.label)}. ${check}</figcaption><div class="row"><a class="f-btn" href="${esc(url)}" download>${ico('copy', 'ico-s')}Save the card</a>${txLink(paid.tx, 'See the payment')}</div></div>`;
  }
  function logHtml(s: any) {
    const icon = (e: any) => e.ok === false ? 'fossil' : ({ tick: 'burn', birth: 'birth', settle: 'work', buy_translation: 'translate', bid: 'bid', award: 'bid', feed: 'feed', sponsor: 'sponsor', post_job: 'job', set_demand: 'job', set_goal: 'life_nft', start_season: 'season', cancel_job: 'escrow' } as any)[e.method] ?? 'check';
    const amt = (e: any) => e.method === 'tick' ? `<span class="amt burn">${e.result?.burned ?? ''} burned</span>` : e.ok === false ? '<span class="amt">refused</span>' : e.args?.amount ? `<span class="amt">${e.args.amount}</span>` : e.args?.reward ? `<span class="amt">${e.args.reward}</span>` : e.method === 'feed' ? `<span class="amt">${UPKEEP}</span>` : '<span class="amt"></span>';
    const rows = seasonLog().filter((e: any) => e.kind !== 'decision' && e.kind !== 'turn-start').slice(-40).reverse();
    return `<div class="f-panel logp"><div class="lh"><span class="caps c2">Turn log · every row is a testnet transaction</span>${acctLink(st.contract, 'The arena')}</div>${rows.length ? `<ul class="f-log">${rows.map((e: any, i: number) => `<li class="${i === 0 ? 'is-new ' : ''}${e.ok === false ? 'is-refused' : ''}"><span class="tn">T${e.turn ?? 0}</span>${ico(icon(e))}<span class="what">${esc(e.label)}${e.ok === false ? `<small>Refused on chain. ${esc(e.error ?? '')}</small>` : e.kind === 'visitor' ? '<small>Your move</small>' : ''}</span>${amt(e)}${e.tx ? `<a class="h" href="${esc(TX(e.tx))}" target="_blank" rel="noopener noreferrer">${short(e.tx)} ${ico('explorer', 'ico-s')}</a>` : '<span class="h"></span>'}</li>`).join('')}</ul>` : `<div class="f-empty"><img src="${sprout}" alt=""><b>Nothing has happened yet</b><span>Advance a turn and the story starts writing itself here.</span></div>`}</div>`;
  }
  function keyHtml() {
    const k = st.key ?? {};
    const left = k.allowance_left ? (Number(BigInt(k.allowance_left) / 10n ** 21n) / 1000).toFixed(3) : '?';
    return `<div class="f-panel pl-key"><span class="caps c2">${ico('account', 'ico-s')} Who signs</span><p>The keeper signs for you with a <b>function call key</b> on ${acctLink(st.keeper_account)}. NEAR itself limits it to ${acctLink(st.contract)} and ${k.methods?.length ?? '?'} game methods, with ${left} NEAR of gas allowance left. It cannot move NEAR or touch any other contract.</p></div>`;
  }
  function dock(s: any, pilot = false) {
    const d = document.getElementById('dock')!;
    if (host.mode() !== 'live') return;
    const dis = !pilot || blocked();
    const it = (k: Sheet, icon: string, t: string) => `<button class="it${ui.sheet === k ? ' is-on' : ''}${pilot ? '' : ' is-disabled'}" data-sheetbtn="${k}" ${pilot ? '' : 'aria-disabled="true"'}>${ico(icon)}${t}</button>`;
    const act = s && s.status === 'live' ? (st?.you?.pilot ? 'turn' : '') : st?.you?.can_start ? 'season' : '';
    put(d, `${it('feed', 'feed', 'Feed')}${it('job', 'job', 'Post job')}<div class="mid"><button class="f-press${act && !(act === 'turn' && dis) && !blocked() ? '' : ' is-disabled'}${st?.busy || pending === 'turn' ? ' is-pending' : ''}" ${act ? `data-act="${act}"` : ''} aria-label="${act === 'season' ? 'Start a season' : 'Advance the turn'}"><img src="${SEAL.amber}" alt=""></button><span>${act === 'season' ? 'Start' : 'Advance'}</span></div>${it('sponsor', 'sponsor', 'Sponsor')}<button class="it" data-proof="1">${ico('munch')}Proof</button>`);
  }

  // ---------- events ----------
  document.addEventListener('click', ev => {
    const t = ev.target as HTMLElement;
    const go = t.closest<HTMLElement>('[data-mode]'); if (go) { const m = go.dataset.mode as 'live' | 'replay'; host.switchTo(m); render(); if (m === 'live') poll(true); return; }
    if (t.closest('[data-proof]')) { ui.sheet = ''; render(); document.getElementById('proof')?.scrollIntoView({ behavior: host.reduced() ? 'auto' : 'smooth' }); return; }
    const sb = t.closest<HTMLElement>('[data-sheetbtn]'); if (sb) { if (!st?.you?.pilot) { toast('error', 'Start your own season to act', 'This one is held by another visitor. You can still watch every receipt.'); return; } const k = sb.dataset.sheetbtn as Sheet; ui.sheet = ui.sheet === k ? '' : k; render(); return; }
    if (host.mode() !== 'live') return;
    const d = t.closest<HTMLElement>('[data-demand]'); if (d) { ui.demandPick = Number(d.dataset.demand); render(); return; }
    const rs = t.closest<HTMLElement>('[data-rstep]'); if (rs) { ui.jobReward = Math.max(30, Math.min(100, ui.jobReward + Number(rs.dataset.rstep))); render(); return; }
    const tu = t.closest<HTMLElement>('[data-turns]'); if (tu) { ui.jobTurns = Number(tu.dataset.turns); render(); return; }
    const f = t.closest<HTMLElement>('[data-feed]'); if (f) { ui.feedPick = f.dataset.feed!; render(); return; }
    const sp = t.closest<HTMLElement>('[data-sponsor]'); if (sp) { ui.sponsorPick = sp.dataset.sponsor!; render(); return; }
    const a = t.closest<HTMLElement>('[data-amt]'); if (a) { ui.sponsorAmt = Number(a.dataset.amt); render(); return; }
    const gp = t.closest<HTMLElement>('[data-goalpick]'); if (gp) { ui.goalPick = gp.dataset.goalpick!; render(); return; }
    const g = t.closest<HTMLElement>('[data-goal]'); if (g) { ui.goal = Number(g.dataset.goal); render(); return; }
    const act = t.closest<HTMLButtonElement>('[data-act]'); if (!act || act.disabled || blocked()) return;
    const k = act.dataset.act;
    if (k === 'turn') post('/api/turn', {}, 'turn');
    else if (k === 'season') { if (st?.chain?.season?.status === 'live' && st?.you?.pilot && !confirm('Close this season and start a fresh one? The old one stays on chain.')) return; post('/api/season', {}, 'season'); }
    else if (k === 'demand') { const kind = ui.demandPick; ui.demandPick = -1; post('/api/action', { type: 'demand', kind }, 'demand'); }
    else if (k === 'job') post('/api/action', { type: 'job', reward: ui.jobReward, line: ui.jobLine, turns: ui.jobTurns }, 'job');
    else if (k === 'feed') post('/api/action', { type: 'feed', actor: ui.feedPick }, 'feed');
    else if (k === 'sponsor') post('/api/action', { type: 'sponsor', actor: ui.sponsorPick, amount: ui.sponsorAmt }, 'sponsor');
    else if (k === 'goal') post('/api/action', { type: 'goal', actor: ui.goalPick, goal: ui.goal }, 'goal');
  });
  document.addEventListener('change', ev => { const t = ev.target as HTMLSelectElement; if (t.id === 'pl-line') ui.jobLine = Number(t.value); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ui.sheet) { ui.sheet = ''; render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(true); });
  poll(true);
  return { refresh: () => poll(true), render, notes: () => { if (host.mode() !== 'live' || !st) return []; const rank = (n: NoteData) => n.whyKind === 'model' ? 0 : n.whyKind === 'translation' ? 1 : 2; return decisionNotes().map((n, i) => ({ n, i })).sort((a, b) => rank(b.n) - rank(a.n) || a.i - b.i).map(x => x.n); } };
}
