// Live play projection: arena chain snapshots -> the same Scene the renderer
// draws for the recorded run. Pure. Particles are only emitted for exact
// balance movements between two consecutive chain reads.
import { moodOf, poseOf, type Flow, type Key, type Node, type Scene, type SceneCreature } from './scene';

export interface LiveLife { id: string; balance: string; plain?: string; policy: string; holder: string | null; life: any }
export interface LiveSnap { block: number; economy: any; season: any; lives: LiveLife[]; jobs: any[] }
const CHILD_SLOTS: Key[] = ['pip', 'pip2', 'pip3', 'pip4'];

/** Founders keep their own art; children take Pip slots in birth order. */
export function slotMap(lives: LiveLife[]): Map<string, Key> {
  const m = new Map<string, Key>(); let k = 0;
  for (const l of lives) {
    const founder = !l.life.parent && ['moss', 'echo', 'ash'].includes(l.life.name);
    if (founder) m.set(l.id, l.life.name as Key);
    else if (k < CHILD_SLOTS.length) m.set(l.id, CHILD_SLOTS[k++]);
  }
  return m;
}
export const lineagesAlive = (s: LiveSnap) => new Set(s.lives.filter(l => l.life.active).map(l => l.life.lineage)).size;
const nameOf = (l: LiveLife) => l.life.name.charAt(0).toUpperCase() + l.life.name.slice(1);

export function liveCreatures(s: LiveSnap): SceneCreature[] {
  const slots = slotMap(s.lives);
  return s.lives.filter(l => slots.has(l.id)).map(l => {
    const balance = Number(l.balance), active = !!l.life.active, mood = moodOf(balance, active);
    return { key: slots.get(l.id)!, id: l.id, name: nameOf(l), balance, active, mood, pose: poseOf(mood), parent: l.life.parent ?? null, reserve: '0', strategy: l.life.strategy_hash, mutation: l.life.mutation ?? -1 };
  });
}
interface Pot { node: Node; delta: number; label: string }
/** Exact matching only: a positive delta needs one equal negative delta. */
export function liveFlows(prev: LiveSnap | null, next: LiveSnap): Flow[] {
  if (!prev || !prev.season || !next.season || prev.season.id !== next.season.id) return [];
  const slots = slotMap(next.lives), out: Flow[] = [];
  const pots: Pot[] = [];
  for (const l of next.lives) {
    const k = slots.get(l.id); if (!k) continue;
    const before = prev.lives.find(p => p.id === l.id);
    if (!before) continue;
    const d = Number(l.balance) - Number(before.balance);
    if (d) pots.push({ node: k, delta: d, label: nameOf(l) });
  }
  const pool = (node: Node, key: string, label: string) => { const d = Number(next.season[key]) - Number(prev.season[key]); if (d) pots.push({ node, delta: d, label }); };
  pool('budget', 'budget_left', 'your budget'); pool('market', 'market', 'the market'); pool('escrow', 'escrow', 'job escrow');
  // upkeep: every creature that fell by exactly 10 while burn grew by the same total
  const burned = Number(next.season.burned) - Number(prev.season.burned);
  if (burned > 0) {
    const eaters = pots.filter(p => p.delta === -10 && p.node !== 'budget' && p.node !== 'market' && p.node !== 'escrow');
    if (eaters.length * 10 === burned) for (const p of eaters) { out.push({ from: p.node, to: 'furnace', amount: 10, label: `${p.label} ate 10 MUNCH upkeep`, tx: '' }); p.delta = 0; }
  }
  for (const gain of pots.filter(p => p.delta > 0)) {
    const src = pots.find(p => p.delta === -gain.delta);
    if (!src) continue;
    out.push({ from: src.node, to: gain.node, amount: gain.delta, label: `${gain.delta} MUNCH from ${src.label} to ${gain.label}`, tx: '' });
    src.delta = 0; gain.delta = 0;
  }
  return out;
}
export function liveScene(prev: LiveSnap | null, s: LiveSnap, index: number): Scene {
  const creatures = liveCreatures(s);
  const prevIds = new Set(prev?.lives.map(l => l.id) ?? []);
  const sameSeason = prev?.season?.id === s.season?.id;
  const hatched = sameSeason ? creatures.find(c => c.parent && !prevIds.has(c.id)) : undefined;
  const flows = liveFlows(prev, s);
  const working = flows.filter(f => f.from === 'escrow').map(f => f.to as Key);
  const se = s.season ?? {};
  return {
    index, kind: 'live-play', status: 'success', tx: '', explorer: '',
    economy: { turn: Number(se.turn ?? 0), market: Number(se.market ?? 0), escrow: Number(se.escrow ?? 0), pending: Number(se.pending ?? 0), burned: Number(se.burned ?? 0), supply: Number(s.economy?.supply ?? 0) },
    creatures, flows, refusal: false, refusalSeen: false,
    hatch: !!hatched, hatchKey: hatched?.key, born: creatures.some(c => !!c.parent), working,
  };
}
/** Family tree rows: each lineage root with its descendants, depth first. */
export function familyTree(s: LiveSnap): { id: string; name: string; depth: number; active: boolean; balance: number; plain: string; change: string | null; born: number; died: number | null }[] {
  const rows: any[] = [];
  const kids = (id: string | null) => s.lives.filter(l => (l.life.parent ?? null) === id);
  const changes = s.economy?.changes ?? [];
  const walk = (l: LiveLife, depth: number) => {
    rows.push({ id: l.id, name: nameOf(l), depth, active: l.life.active, balance: Number(l.balance), plain: l.plain ?? l.policy, change: l.life.mutation == null ? null : changes[l.life.mutation] ?? String(l.life.mutation), born: l.life.born_turn, died: l.life.died_turn ?? null });
    for (const k of kids(l.id)) walk(k, depth + 1);
  };
  for (const r of kids(null)) walk(r, 0);
  return rows;
}
