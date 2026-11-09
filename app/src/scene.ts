// Pure evidence -> scene projection. No renderer, DOM or network here.
export type Art = 'moss' | 'echo' | 'ash' | 'pip';
// Visual slots. Every child uses Pip's art; extra slots only exist in live play.
export type Key = Art | 'pip2' | 'pip3' | 'pip4';
export const art = (k: Key): Art => (k.startsWith('pip') ? 'pip' : k) as Art;
export type Mood = 'abundant' | 'steady' | 'hungry' | 'critical' | 'fossil';
export type Pose = 'front' | 'hungry' | 'critical' | 'fossil';
export type Node = Key | 'market' | 'escrow' | 'furnace' | 'budget';

export interface SceneCreature {
  key: Key; id: string; name: string; balance: number; active: boolean; mood: Mood; pose: Pose;
  parent: string | null; reserve: string; strategy: string; mutation: number;
}
export interface Flow { from: Node; to: Node; amount: number; label: string; tx: string }
export interface Scene {
  index: number; kind: string; status: string; tx: string; explorer: string;
  economy: { turn: number; market: number; escrow: number; pending: number; burned: number; supply: number };
  creatures: SceneCreature[];
  flows: Flow[];
  refusal: boolean;      // a chain confirmed extinct refusal is on screen
  refusalSeen: boolean;  // the refusal happened at or before this frame
  hatch: boolean;        // this frame is the confirmed funded birth
  hatchKey?: Key;        // which slot hatched (live play can have several children)
  born: boolean;         // pip exists in contract state at this frame
  working: Key[];        // creatures doing paid work at this frame
}

export const NAMES: Record<Key, string> = { moss: 'Moss', echo: 'Echo', ash: 'Ash', pip: 'Pip', pip2: 'Pip', pip3: 'Pip', pip4: 'Pip' };
export const keyOf = (id: string): Key => id.split('.')[0] as Key;

export function moodOf(balance: number, active: boolean): Mood {
  if (!active) return 'fossil';
  if (balance < 20) return 'critical';
  if (balance < 60) return 'hungry';
  return balance >= 180 ? 'abundant' : 'steady';
}
export const poseOf = (m: Mood): Pose => (m === 'abundant' || m === 'steady' ? 'front' : m);

function project(state: any): Pick<Scene, 'economy' | 'creatures'> {
  const e = state.economy;
  return {
    economy: { turn: +e.turn, market: +e.market, escrow: +e.job_escrow, pending: +e.pending, burned: +e.burned, supply: +e.supply },
    creatures: state.creatures.map((c: any) => {
      const balance = Number(c.balance), active = !!c.creature.active, mood = moodOf(balance, active), key = keyOf(c.id);
      return { key, id: c.id, name: NAMES[key] ?? key, balance, active, mood, pose: poseOf(mood), parent: c.creature.parent ?? null,
        reserve: String(c.creature.native_reserve ?? '0'), strategy: c.creature.strategy_hash, mutation: c.creature.mutation };
    }),
  };
}

// Flows are only emitted when the recorded before/after snapshots show the
// exact movement. Particles are decoration on top of a verified delta.
export function flowsFor(kind: string, prev: any | null, next: any, tx: string): Flow[] {
  if (!prev) return [];
  const a = project(prev), b = project(next);
  const bal = (s: typeof a, k: Key) => s.creatures.find(c => c.key === k)?.balance;
  const d = (k: Key) => (bal(b, k) ?? 0) - (bal(a, k) ?? 0);
  const out: Flow[] = [];
  if (kind === 'paid-collaboration' && d('moss') < 0 && d('echo') === -d('moss'))
    out.push({ from: 'moss', to: 'echo', amount: d('echo'), label: `${d('echo')} MUNCH for translation`, tx });
  if (kind === 'paid-job' && b.economy.escrow < a.economy.escrow && d('moss') === a.economy.escrow - b.economy.escrow)
    out.push({ from: 'escrow', to: 'moss', amount: d('moss'), label: `${d('moss')} MUNCH paid at settlement`, tx });
  if (kind.includes('job') && kind.startsWith('create') && b.economy.escrow > a.economy.escrow && a.economy.market - b.economy.market === b.economy.escrow - a.economy.escrow)
    out.push({ from: 'market', to: 'escrow', amount: b.economy.escrow - a.economy.escrow, label: `${b.economy.escrow - a.economy.escrow} MUNCH escrowed for a job`, tx });
  if (kind === 'cancel-old-job' && b.economy.escrow < a.economy.escrow)
    out.push({ from: 'escrow', to: 'market', amount: a.economy.escrow - b.economy.escrow, label: `${a.economy.escrow - b.economy.escrow} MUNCH back to market`, tx });
  if (kind.startsWith('register-')) {
    const k = kind.slice(9) as Key;
    if (bal(a, k) === undefined && bal(b, k)! > 0 && a.economy.market - b.economy.market === bal(b, k))
      out.push({ from: 'market', to: k, amount: bal(b, k)!, label: `${bal(b, k)} MUNCH seed`, tx });
  }
  if (kind === 'funded-child-account-creation' && bal(a, 'pip') === undefined && bal(b, 'pip')! > 0 && d('moss') === -bal(b, 'pip')!)
    out.push({ from: 'moss', to: 'pip', amount: bal(b, 'pip')!, label: `${bal(b, 'pip')} MUNCH inherited`, tx });
  const burned = b.economy.burned - a.economy.burned;
  if (burned > 0) {
    let sum = 0;
    for (const c of b.creatures) { const delta = d(c.key); if (delta < 0 && bal(a, c.key) !== undefined) { out.push({ from: c.key, to: 'furnace', amount: -delta, label: `${-delta} MUNCH upkeep burned`, tx }); sum += -delta; } }
    if (sum !== burned) return out.filter(f => f.to !== 'furnace');
  }
  return out;
}

export function buildScene(run: any, index: number): Scene {
  const events = run.events;
  const i = Math.max(0, Math.min(events.length - 1, index));
  const ev = events[i], prev = i > 0 ? events[i - 1].state : null;
  const p = project(ev.state);
  const refusalIndex = events.findIndex((e: any) => e.kind === 'refused-post-death-spend' && e.status === 'expected-failure');
  const born = p.creatures.some(c => c.key === 'pip');
  const working: Key[] = [];
  if (['paid-collaboration', 'claim-card-job', 'paid-job'].includes(ev.kind)) working.push('moss', 'echo');
  if (ev.kind === 'parent-bid') working.push('moss');
  if (ev.kind === 'child-first-bid') working.push('pip');
  return {
    index: i, kind: ev.kind, status: ev.status, tx: ev.receipt, explorer: ev.explorer, ...p,
    flows: flowsFor(ev.kind, prev, ev.state, ev.receipt),
    refusal: i === refusalIndex,
    refusalSeen: refusalIndex >= 0 && i >= refusalIndex,
    hatch: ev.kind === 'funded-child-account-creation' && ev.status === 'success' && born && !(prev?.creatures ?? []).some((c: any) => keyOf(c.id) === 'pip'),
    hatchKey: 'pip',
    born, working,
  };
}

// Swap the final frame for a live chain read, but only when the read
// reconciles. Otherwise keep the bundled snapshot.
export function withLiveFinal(run: any, live: any): any {
  if (!live) return run;
  const state = { economy: live.economy, creatures: live.creatures.map((c: any) => ({ id: c.id, balance: c.balance, creature: c.creature })) };
  const last = run.events.at(-1);
  if (JSON.stringify(project(state)) === JSON.stringify(project(last.state))) return { ...run, liveMatchesFinal: true };
  return { ...run, liveMatchesFinal: false, events: [...run.events, { kind: 'live-now', state, status: 'success', receipt: '', explorer: '' }] };
}

// One readable line per moment. Upkeep from several creatures is one burn.
export function flowSummary(flows: Flow[]): string {
  const burns = flows.filter(f => f.to === 'furnace'), rest = flows.filter(f => f.to !== 'furnace');
  const parts = rest.map(f => f.label);
  if (burns.length) parts.push(`${burns.reduce((a, f) => a + f.amount, 0)} MUNCH upkeep burned${burns.length > 1 ? `, ${burns[0].amount} from each of ${burns.length}` : ''}`);
  return parts.join(' · ');
}
