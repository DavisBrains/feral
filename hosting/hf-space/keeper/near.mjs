// Thin NEAR testnet layer for the keeper. Views go to public RPCs. Writes are
// signed only with the keeper's function-call key, which the network itself
// limits to the arena contract, the listed game methods and a gas allowance.
import { readFileSync, existsSync } from 'node:fs';
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions } from 'near-api-js';

export const CONTRACT = process.env.FERAL_ARENA || 'play.feral-039832.testnet';
export const KEEPER = process.env.FERAL_KEEPER || 'keeper.feral-039832.testnet';
export const RPCS = (process.env.FERAL_RPCS || 'https://test.rpc.fastnear.com,https://rpc.testnet.near.org').split(',');
export const explorerTx = h => `https://testnet.nearblocks.io/txns/${h}`;
export const explorerAccount = a => `https://testnet.nearblocks.io/address/${a}`;

export async function rpc(method, params) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { last = new Error('rate limited'); continue; }
      const j = await r.json();
      if (j.error) { const e = new Error(JSON.stringify(j.error).slice(0, 400)); e.rpc = j.error; throw e; }
      return j.result;
    } catch (e) { last = e; if (e.rpc && !String(e.message).includes('TIMEOUT')) throw e; }
    await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
  }
  throw last;
}
export async function view(method, args = {}, blockId) {
  const r = await rpc('query', { request_type: 'call_function', ...(blockId ? { block_id: blockId } : { finality: 'final' }), account_id: CONTRACT, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') });
  return { value: JSON.parse(Buffer.from(r.result).toString() || 'null'), block: r.block_height, block_hash: r.block_hash };
}
export const viewAccount = id => rpc('query', { request_type: 'view_account', finality: 'final', account_id: id });
export const accessKey = (id, pk) => rpc('query', { request_type: 'view_access_key', finality: 'final', account_id: id, public_key: pk });
export const txStatus = (hash, sender = KEEPER) => rpc('EXPERIMENTAL_tx_status', { tx_hash: hash, sender_account_id: sender, wait_until: 'FINAL' });

// One consistent snapshot: every view pinned to the same block.
export async function snapshot(season) {
  const head = await view('economy');
  const b = head.block;
  const [s, lives, jobs] = await Promise.all([view('season', { id: season ?? null }, b), view('lives_of', { season: season ?? null }, b), view('jobs_of', { season: season ?? null }, b)]);
  return { block: b, economy: head.value, season: s.value, lives: lives.value, jobs: jobs.value };
}

export function loadKey() {
  if (process.env.FERAL_KEEPER_KEY) return process.env.FERAL_KEEPER_KEY;
  const f = process.env.FERAL_KEEPER_KEY_FILE || `${process.env.HOME}/.feral-keeper/fc-key.json`;
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, 'utf8')).private_key;
}
let account = null, publicKey = null;
export function signer() {
  if (account) return account;
  const k = loadKey(); if (!k) throw new Error('keeper key not configured');
  const kp = KeyPair.fromString(k); publicKey = kp.getPublicKey().toString();
  account = new Account(KEEPER, new JsonRpcProvider({ url: RPCS[0] }), new KeyPairSigner(kp));
  return account;
}
export const keeperPublicKey = () => { signer(); return publicKey; };

const decodeValue = v => { if (!v) return null; const s = Buffer.from(v, 'base64').toString(); try { return JSON.parse(s); } catch { return s; } };
function failureText(status) {
  const f = status?.Failure; if (!f) return null;
  const s = JSON.stringify(f);
  const m = s.match(/Smart contract panicked: ([^"\\]+)/); return m ? m[1] : s.slice(0, 300);
}
/** Sends one function call. Never throws for a contract refusal: returns it. */
export async function call(method, args = {}, tgas = 60) {
  const acc = signer();
  let res;
  try {
    res = await acc.signAndSendTransaction({ receiverId: CONTRACT, actions: [actions.functionCall(method, args, BigInt(tgas) * 10n ** 12n, 0n)], waitUntil: 'FINAL', throwOnFailure: false });
  } catch (e) {
    // Rejected before execution (for example an out of scope key). No tx hash exists.
    return { ok: false, hash: null, method, args, error: String(e?.message ?? e).slice(0, 300), stage: 'rejected-before-execution' };
  }
  const hash = res.transaction?.hash ?? res.transaction_outcome?.id;
  const outcomes = res.receipts_outcome ?? [];
  const receiptFailure = outcomes.map(o => failureText(o.outcome.status)).find(Boolean);
  const top = failureText(res.status);
  const ok = !top && res.status?.SuccessValue !== undefined;
  const logs = outcomes.flatMap(o => o.outcome.logs);
  const burnt = outcomes.reduce((a, o) => a + BigInt(o.outcome.tokens_burnt), BigInt(res.transaction_outcome?.outcome?.tokens_burnt ?? 0));
  return { ok, hash, explorer: explorerTx(hash), method, args, result: ok ? decodeValue(res.status.SuccessValue) : null, error: top ?? null, receipt_failure: ok ? receiptFailure ?? null : null, logs, gas_burnt_yocto: burnt.toString() };
}
