// The keeper's game engine. Every state change is one real NEAR testnet
// transaction to the arena contract, signed with the scoped function-call key.
// The contract enforces the rules; this file only proposes and records.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as near from './near.mjs';
import { decide, translate, KINDS, CHANGES, LINES, describe } from './policy.mjs';
import { renderCard } from './work.mjs';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const sha = s => createHash('sha256').update(s).digest('hex');
export class Engine {
  constructor({ dataDir, model, chain = near, now = () => Date.now(), translationDemand = false }) {
    this.dir = dataDir; this.model = model; this.chain = chain; this.now = now; this.translationDemand = translationDemand;
    mkdirSync(path.join(dataDir, 'out'), { recursive: true });
    this.journalFile = path.join(dataDir, 'journal.jsonl');
    this.log = existsSync(this.journalFile) ? readFileSync(this.journalFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    this.metaFile = path.join(dataDir, 'meta.json');
    this.meta = existsSync(this.metaFile) ? JSON.parse(readFileSync(this.metaFile, 'utf8')) : { lines: {}, lastActivity: 0, jobSeq: 0 };
    this.busy = null; this.progress = '';
  }
  saveMeta() { writeFileSync(this.metaFile, JSON.stringify(this.meta)); }
  record(e) {
    const entry = { at: new Date(this.now()).toISOString(), ...e };
    this.log.push(entry); appendFileSync(this.journalFile, JSON.stringify(entry) + '\n');
    return entry;
  }
  async tx(method, args, { season, turn, kind, label, tgas, visitor, expectFailure, output, output_hash }) {
    this.progress = label;
    const r = await this.chain.call(method, args, tgas);
    return this.record({ season, turn, kind, label, method, args, tx: r.hash, explorer: r.explorer ?? null, ok: r.ok, result: r.result ?? null,
      error: r.error ?? null, stage: r.stage ?? null, receipt_failure: r.receipt_failure ?? null, logs: r.logs ?? [], gas_burnt_yocto: r.gas_burnt_yocto ?? null, visitor: visitor ?? null, ...(output ? { output, output_hash } : {}),
      expected: expectFailure ? (r.ok ? 'UNEXPECTED SUCCESS' : 'refused as expected') : undefined });
  }
  async snap() { return this.chain.snapshot(); }
  async exclusive(name, fn) {
    if (this.busy) { const e = new Error(`keeper busy: ${this.busy}`); e.status = 409; throw e; }
    this.busy = name;
    try { return await fn(); } finally { this.busy = null; this.progress = ''; }
  }
  touch() { this.meta.lastActivity = this.now(); this.saveMeta(); }

  // ---------- seasons ----------
  async startSeason(visitorHash, { target = 8, budget = 120 } = {}) {
    return this.exclusive('starting a season', async () => {
      const snap = await this.snap();
      if (snap.season && !snap.season.closed) {
        if (snap.season.pending !== '0' || snap.season.status === 'starting') throw Object.assign(new Error('season still settling'), { status: 409 });
        await this.tx('close_season', { reason: snap.season.status === 'live' ? 'new season' : 'ended' }, { season: snap.season.id, turn: snap.season.turn, kind: 'system', label: 'Close the previous season, burn its MUNCH and life NFTs', tgas: 200 });
      }
      const r = await this.tx('start_season', { pilot: visitorHash, target_turns: target, budget: String(budget) }, { season: (snap.economy.season ?? 0) + 1, turn: 0, kind: 'visitor', label: 'Start a season, mint the 1000 MUNCH seed and create three real founder accounts', tgas: 200, visitor: visitorHash });
      this.touch();
      return r;
    });
  }
  // ---------- visitor levers ----------
  async visitor(visitorHash, a) {
    return this.exclusive('a visitor action', async () => {
      const snap = await this.snap(); const s = snap.season;
      if (!s || s.status !== 'live') throw Object.assign(new Error('no live season'), { status: 409 });
      const ctx = { season: s.id, turn: s.turn, kind: 'visitor', visitor: visitorHash };
      const life = id => { const l = snap.lives.find(x => x.id === id); if (!l) throw Object.assign(new Error('unknown creature'), { status: 400 }); return l; };
      let r;
      if (a.type === 'demand') {
        const kind = Number(a.kind); if (![0, 1, ...(this.translationDemand ? [2] : [])].includes(kind)) throw Object.assign(new Error('demand'), { status: 400 });
        r = await this.tx('set_demand', { kind }, { ...ctx, label: `You pinned ${['short captions', 'bilingual caption cards', 'plain translation'][kind]} on the demand board` });
      } else if (a.type === 'feed') {
        const l = life(a.actor); r = await this.tx('feed', { actor: l.id }, { ...ctx, label: `You fed ${cap(l.life.name)} one meal of 10 MUNCH` });
      } else if (a.type === 'sponsor') {
        const l = life(a.actor), amount = Number(a.amount); if (![20, 40, 60].includes(amount)) throw Object.assign(new Error('amount'), { status: 400 });
        r = await this.tx('sponsor', { actor: l.id, amount: String(amount) }, { ...ctx, label: `You sponsored ${cap(l.life.name)} with ${amount} MUNCH through its life NFT` });
      } else if (a.type === 'goal') {
        const l = life(a.actor), goal = Number(a.goal); if (![0, 1, 2].includes(goal)) throw Object.assign(new Error('goal'), { status: 400 });
        r = await this.tx('set_goal', { actor: l.id, goal }, { ...ctx, label: `You set ${cap(l.life.name)} to ${['work', 'save and not breed', 'breed when it can'][goal]}` });
      } else if (a.type === 'job') {
        const reward = Number(a.reward), line = Number(a.line), turns = a.turns == null ? 2 : Number(a.turns);
        if (!Number.isInteger(reward) || reward < 30 || reward > 100 || reward % 10 || !LINES[line] || ![1, 2, 3].includes(turns)) throw Object.assign(new Error('job'), { status: 400 });
        const id = `s${s.id}-v${++this.meta.jobSeq}`; this.meta.lines[id] = LINES[line]; this.saveMeta();
        r = await this.tx('post_job', { job_id: id, reward: String(reward), from_budget: true, expiry_turns: turns }, { ...ctx, label: `You posted a ${KINDS[s.demand]} job for ${reward} MUNCH, “${LINES[line]}”, open ${turns} turn${turns > 1 ? 's' : ''}` });
      } else throw Object.assign(new Error('unknown action'), { status: 400 });
      this.touch();
      return r;
    });
  }
  // ---------- the turn ----------
  async turn(visitorHash) {
    return this.exclusive('running a turn', async () => {
      let snap = await this.snap(); const s0 = snap.season;
      if (!s0 || s0.status !== 'live') throw Object.assign(new Error('no live season'), { status: 409 });
      const S = s0.id, T = s0.turn + 1, ctx = { season: S, turn: T };
      this.record({ ...ctx, kind: 'turn-start', label: `Your live turn ${T} of ${s0.target_turns}`, visitor: visitorHash });
      // 1. stale jobs go back to their payer
      for (const j of snap.jobs) if ((j.state === 'open' || j.state === 'awarded') && (j.demand_version !== s0.demand_version || s0.turn > j.expiry_turn || (j.claimant && !snap.lives.find(l => l.id === j.claimant)?.life.active)))
        await this.tx('cancel_job', { job_id: j.id }, { ...ctx, kind: 'turn', label: `Job ${j.id} expired or lost its demand, ${j.reward} MUNCH back to the ${j.from_budget ? 'visitor budget' : 'market'}` });
      // 2. the market posts one job for the current demand
      snap = await this.snap();
      if (!snap.jobs.some(j => !j.from_budget && j.state === 'open' && j.demand_version === snap.season.demand_version) && Number(snap.season.market) >= 60) {
        const id = `s${S}-t${T}-m`; this.meta.lines[id] = LINES[(T + S) % LINES.length]; this.saveMeta();
        await this.tx('post_job', { job_id: id, reward: '60', from_budget: false, expiry_turns: 1 }, { ...ctx, kind: 'turn', label: `The market posts a ${KINDS[snap.season.demand]} job for 60 MUNCH` });
        snap = await this.snap();
      }
      // 3. every living creature decides
      const decisions = [];
      for (const life of snap.lives.filter(l => l.life.active)) {
        this.progress = `${life.life.name} is deciding`;
        const d = await decide(life, snap, this.model);
        decisions.push({ life, d });
        this.record({ ...ctx, kind: 'decision', label: `${cap(life.life.name)} chose ${fmt(d.action)}`, actor: life.id, decision: d, policy: describe(life.life.genome), balance: life.balance });
      }
      // 4. bids, several creatures may bid on the same job
      for (const { life, d } of decisions) if (d.action.action === 'bid')
        await this.tx('bid', { actor: life.id, job_id: d.action.job, price: String(d.action.price) }, { ...ctx, kind: 'turn', label: `${cap(life.life.name)} bids ${d.action.price} on ${d.action.job}` });
      snap = await this.snap();
      // 5. the contract awards each job to the lowest live bid; the winner works
      for (const j of snap.jobs.filter(j => j.state === 'open' && j.bids.length)) {
        const aw = await this.tx('award', { job_id: j.id }, { ...ctx, kind: 'turn', label: `Contract awards ${j.id} to the lowest of ${j.bids.length} bid${j.bids.length > 1 ? 's' : ''}` });
        if (!aw.ok) continue;
        const winner = snap.lives.find(l => l.id === aw.result);
        const en = this.meta.lines[j.id] ?? LINES[0];
        let es = null, translator = null, tmode = null;
        if (j.kind === 2) { // plain translation, Spanish only, no card
          this.progress = `${winner.life.name} is translating`;
          const t = await translate(en, this.model);
          this.record({ ...ctx, kind: 'decision', label: `${cap(winner.life.name)} translated the line (${t.mode === 'live-model' ? t.provider_label : 'supplied fallback'})`, actor: winner.id, translation: { en, es: t.es, ...t } });
          await this.tx('settle', { job_id: j.id, output_hash: sha(t.es) }, { ...ctx, kind: 'turn', label: `${cap(winner.life.name)} delivers the Spanish line and is paid` });
          continue;
        }
        if (j.kind === 1) {
          const tr = snap.lives.filter(l => l.life.active && l.life.genome.job === 2 && l.id !== winner.id).sort((a, b) => a.life.genome.price - b.life.genome.price)[0];
          if (!tr) { this.record({ ...ctx, kind: 'turn', label: `${cap(winner.life.name)} found no living translator. The bilingual card cannot be delivered.` }); continue; }
          this.progress = `${tr.life.name} is translating`;
          const t = await translate(en, this.model);
          es = t.es; translator = tr.life.name; tmode = t.mode === 'live-model' ? `${t.model} via ${t.provider_label} live` : 'supplied text';
          this.record({ ...ctx, kind: 'decision', label: `${cap(tr.life.name)} translated the line (${t.mode === 'live-model' ? t.provider_label : 'supplied fallback'})`, actor: tr.id, translation: { en, es, ...t } });
          const bt = await this.tx('buy_translation', { job_id: j.id, provider: tr.id, translation_hash: sha(es) }, { ...ctx, kind: 'turn', label: `${cap(winner.life.name)} pays ${cap(tr.life.name)} for the translation` });
          if (!bt.ok) continue;
        }
        const card = renderCard({ en, es, maker: winner.life.name, translator, job: j.id, season: S, turn: T, reward: j.reward, translationMode: tmode });
        writeFileSync(path.join(this.dir, 'out', `${j.id}.svg`), card.svg);
        await this.tx('settle', { job_id: j.id, output_hash: card.hash }, { ...ctx, kind: 'turn', label: `${cap(winner.life.name)} delivers the card and is paid`, output: `${j.id}.svg`, output_hash: card.hash });
      }
      // 6. funded births: the contract derives parent policy plus one change
      for (const { life, d } of decisions) if (d.action.action === 'breed') {
        const change = CHANGES.indexOf(d.action.change);
        const b = await this.tx('birth', { parent: life.id, change }, { ...ctx, kind: 'turn', label: `${cap(life.life.name)} pays for a child, ${d.action.change}`, tgas: 120 });
        if (b.ok && b.result === false) this.record({ ...ctx, kind: 'turn', label: 'Child account creation failed; MUNCH refunded to the parent' });
      }
      // 7. upkeep, extinction and the win condition, all on chain
      const t = await this.tx('tick', {}, { ...ctx, kind: 'turn', label: `Turn ${T} upkeep, every living creature burns 10 MUNCH`, tgas: 100 });
      this.touch();
      return t;
    });
  }
}
export const fmt = a => a.action === 'bid' ? `to bid ${a.price} on ${a.job}` : a.action === 'breed' ? `to breed (${a.change})` : 'to wait';
