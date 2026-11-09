// Box only: after Ash has turned to stone, ask the contract to spend for Ash once and journal the refusal.
import { Engine } from './engine.mjs';
import * as near from './near.mjs';
const DATA = new URL('./data', import.meta.url).pathname;
const s = (await near.view('season', { id: null })).value;
const ash = `s${s.id}-ash.${near.CONTRACT}`;
const open = { id: `s${s.id}-t${s.turn}-m` };
const e = new Engine({ dataDir: DATA, model: null });
const r = await e.tx('bid', { actor: ash, job_id: open?.id ?? `s${s.id}-t${s.turn}-m`, price: '60' }, { season: s.id, turn: s.turn, kind: 'turn', label: 'Ash tries to bid after turning to stone', expectFailure: true, tgas: 30 });
console.log(JSON.stringify({ tx: r.tx, ok: r.ok, error: String(r.error).slice(0, 200), expected: r.expected, job: open?.id }));
