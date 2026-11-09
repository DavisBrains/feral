// Pure decision layer: legal options mirror the contract's own checks, the
// model picks one, the keeper re-validates, and the fixed policy is the
// clearly labelled fallback. Nothing here signs or sends.
export const PRICES = [20, 30, 40, 50, 60, 70, 80, 90];
export const FLOORS = [100, 120, 140, 160, 180];
export const KINDS = ['short', 'bilingual', 'translation'];
export const CHANGES = ['price down', 'price up', 'breeding floor down', 'breeding floor up', 'next job kind', 'previous job kind'];
export const GOALS = ['work', 'save', 'breed'];
export const UPKEEP = 10, CHILD_MUNCH = 60, PARENT_FLOOR = 20, MAX_LIVES = 7;

// mirrors Genome::can_take in arena/src/lib.rs (translators take plain translation jobs)
export const canTake = (g, kind) => g.job === 0 ? kind === 0 : g.job === 1 ? kind <= 1 : kind === 2;
export function mutate(g, change) {
  const c = { ...g };
  if (change === 0) { if (c.price === 0) return null; c.price--; }
  else if (change === 1) { if (c.price === 7) return null; c.price++; }
  else if (change === 2) { if (c.floor === 0) return null; c.floor--; }
  else if (change === 3) { if (c.floor === 4) return null; c.floor++; }
  else if (change === 4) c.job = (c.job + 1) % 3;
  else if (change === 5) c.job = (c.job + 2) % 3;
  else return null;
  return c;
}
/** Plain words for a policy. */
export function describe(g) {
  if (g.job === 2) return `sells translations at ${PRICES[g.price]} MUNCH · saves ${FLOORS[g.floor]} before breeding`;
  const what = g.job === 1 ? 'bilingual caption cards (and short captions)' : 'short captions only';
  return `seeks ${what} · never bids below ${PRICES[g.price]} · saves ${FLOORS[g.floor]} before breeding`;
}
export const breedNeed = g => Math.max(FLOORS[g.floor], CHILD_MUNCH + PARENT_FLOOR);

/** Legal options for one creature this turn, from a pinned chain snapshot. */
export function options(life, snap) {
  const l = life.life, g = l.genome, bal = Number(life.balance), s = snap.season;
  const out = [{ action: 'wait' }];
  if (!l.active) return out;
  for (const j of snap.jobs) {
    if (j.state !== 'open' || j.demand_version !== s.demand_version || s.turn > j.expiry_turn || !canTake(g, j.kind)) continue;
    if (j.bids.some(b => b.actor === life.id)) continue;
    const min = PRICES[g.price], reward = Number(j.reward);
    if (reward < min) continue;
    const prices = [...new Set([min, Math.max(min, reward - 10), reward])].sort((a, b) => a - b);
    for (const p of prices) out.push({ action: 'bid', job: j.id, price: p });
  }
  const alive = snap.lives.length;
  if (l.goal !== 1 && !l.pending && alive < MAX_LIVES && bal >= breedNeed(g))
    CHANGES.forEach((name, i) => { if (mutate(g, i)) out.push({ action: 'breed', change: name }); });
  return out;
}
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validate(decision, opts) {
  if (!decision || typeof decision !== 'object') throw new Error('no decision object');
  const hit = opts.find(o => same(o, decision));
  if (!hit) throw new Error('not one of the legal actions');
  return hit;
}
/** The fixed policy: deterministic, labelled whenever it is used. */
export function fixedPolicy(life, opts) {
  const g = life.life.genome, bal = Number(life.balance);
  const breeds = opts.filter(o => o.action === 'breed');
  if (breeds.length && (life.life.goal === 2 || bal >= breedNeed(g) + 30)) return breeds[0];
  const bids = opts.filter(o => o.action === 'bid').sort((a, b) => a.price - b.price);
  return bids[0] ?? { action: 'wait' };
}
export function observation(life, snap) {
  const l = life.life, s = snap.season, bal = Number(life.balance);
  return {
    you: l.name, balance: bal, upkeep_per_turn: UPKEEP, turns_until_starving: Math.floor(bal / UPKEEP),
    policy: describe(l.genome), goal_set_by_holder: GOALS[l.goal], demand_board: KINDS[s.demand], turn: s.turn, target_turns: s.target_turns,
    open_jobs: snap.jobs.filter(j => j.state === 'open').map(j => ({ id: j.id, kind: KINDS[j.kind], reward: Number(j.reward), bids: j.bids.length })),
    breeding_costs: CHILD_MUNCH, breeding_needs_balance: breedNeed(l.genome),
  };
}
export const SYSTEM = 'You are a creature in a small terrarium. Your MUNCH balance is your life: you burn upkeep every turn and die when you cannot pay. Earn by bidding on jobs your policy allows. A lower bid is more likely to win but earns less. Breeding funds a child that inherits your policy with one change, which keeps your family alive. Choose exactly one legal action.';

/** Model adapter. Any endpoint speaking POST /choose can plug in (local Qwen today, a hosted model later). */
export function modelAdapter(url, fetchImpl = fetch) {
  if (!url) return null;
  return {
    url,
    async health() { const r = await fetchImpl(url + '/health', { signal: AbortSignal.timeout(3000) }); if (!r.ok) throw new Error('model down'); return r.json(); },
    async choose(observation, opts) {
      const r = await fetchImpl(url + '/choose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system: SYSTEM, observation, options: opts, explain: true }), signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('model refused: ' + (await r.text()).slice(0, 120));
      return r.json();
    },
    async translate(en) {
      const r = await fetchImpl(url + '/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ en }), signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('translation refused');
      return r.json();
    },
  };
}
/** Decide for one creature. Returns the action actually taken and exactly how it was chosen. */
export async function decide(life, snap, model) {
  const opts = options(life, snap);
  if (opts.length === 1) return { action: opts[0], mode: 'only-legal-action', options: opts.length };
  if (model) {
    try {
      const r = await model.choose(observation(life, snap), opts);
      return { action: validate(r.decision, opts), mode: 'live-model', provider: r.provider ?? 'local-qwen', provider_label: r.provider_label ?? 'Local Qwen', model: r.model, seconds: r.seconds, options: opts.length,
        reason: typeof r.reason === 'string' && r.reason.length <= 200 ? r.reason : null, ...(r.skipped?.length ? { skipped: r.skipped } : {}) };
    } catch (e) {
      return { action: fixedPolicy(life, opts), mode: 'fixed-policy', provider: 'fixed-policy', provider_label: 'Fixed rules backup', reason: 'no model answered, ' + String(e.message).slice(0, 160), options: opts.length, ...(e.skipped ? { skipped: e.skipped } : {}) };
    }
  }
  return { action: fixedPolicy(life, opts), mode: 'fixed-policy', provider: 'fixed-policy', provider_label: 'Fixed rules backup', reason: 'no model endpoint on this host', options: opts.length };
}
const SPANISH = { 'Fresh bread every morning.': 'Pan fresco cada mañana.', 'Thank you for watching.': 'Gracias por mirar.', 'The market opens at nine.': 'El mercado abre a las nueve.', 'Rain is coming tonight.': 'Esta noche viene la lluvia.', 'Meet me at the river.': 'Nos vemos en el río.', 'Our shop is open today.': 'Nuestra tienda abre hoy.', 'Every balance can be checked on the chain.': 'Cada saldo se puede comprobar en la cadena.' };
export const LINES = Object.keys(SPANISH);
export function checkTranslation(en, es) {
  if (typeof es !== 'string') throw new Error('no text');
  const t = es.trim();
  if (t.length < 2 || t.length > 140 || t.toLowerCase() === en.toLowerCase() || !/[a-záéíóúñ]/i.test(t) || /[<>{}]/.test(t)) throw new Error('translation failed checks');
  return t;
}
export async function translate(en, model) {
  if (model) {
    try { const r = await model.translate(en); return { es: checkTranslation(en, r.es), mode: 'live-model', provider: r.provider ?? 'local-qwen', provider_label: r.provider_label ?? 'Local Qwen', model: r.model, seconds: r.seconds, ...(r.skipped?.length ? { skipped: r.skipped } : {}) }; }
    catch (e) { return { es: SPANISH[en], mode: 'supplied-translation', provider: 'supplied', provider_label: 'Supplied text', reason: String(e.message).slice(0, 160), ...(e.skipped ? { skipped: e.skipped } : {}) }; }
  }
  return { es: SPANISH[en], mode: 'supplied-translation', reason: 'no model endpoint on this host' };
}
