// Read only NEAR testnet access. Pure functions plus an injected fetch so the
// same code runs in the browser and in node (read-chain.mjs).
export const VIEW_RPCS = ['https://test.rpc.fastnear.com', 'https://rpc.testnet.near.org'];
export const ARCHIVAL_RPCS = ['https://archival-rpc.testnet.fastnear.com', 'https://archival-rpc.testnet.near.org'];
export const EXPLORER = 'https://testnet.nearblocks.io';
export const txUrl = (hash: string) => `${EXPLORER}/txns/${encodeURIComponent(hash)}`;
export const accountUrl = (id: string) => `${EXPLORER}/address/${encodeURIComponent(id)}`;
export const JOBS = ['short-v0', 'bilingual-v1', 'child-first'];

type Fetch = (url: string, init: any) => Promise<{ ok: boolean; json(): Promise<any> }>;

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

// Public RPCs rate limit bursts, so keep at most four requests in flight.
let inflight = 0; const queue: (() => void)[] = [];
const slot = () => new Promise<void>(r => { if (inflight < 3) { inflight++; r(); } else queue.push(() => { inflight++; r(); }); });
const release = () => { inflight--; queue.shift()?.(); };

export async function rpc(fetchFn: Fetch, urls: string[], method: string, params: any, timeoutMs = 12000) {
  for (let attempt = 0; ; attempt++) {
    await slot();
    try { return await rpcOnce(fetchFn, urls, method, params, timeoutMs); }
    catch (e) { if (attempt >= 2 || /HANDLER_ERROR|MethodNotFound/.test(String(e))) throw e; }
    finally { release(); }
    await new Promise(r => setTimeout(r, 700 * (attempt + 1) + Math.random() * 400));
  }
}
async function rpcOnce(fetchFn: Fetch, urls: string[], method: string, params: any, timeoutMs: number) {
  let last: any;
  for (const url of urls) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const t = setTimeout(() => ctrl?.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'feral', method, params }), signal: ctrl?.signal });
      const body = await res.json();
      if (body.error) { last = new Error(`${method}: ${JSON.stringify(body.error).slice(0, 300)}`); continue; }
      if (body.result?.error) { last = new Error(`${method}: ${body.result.error}`); continue; }
      return body.result;
    } catch (e) { last = e; } finally { clearTimeout(t); }
  }
  throw last ?? new Error('rpc failed');
}

export async function view(fetchFn: Fetch, account: string, method: string, args: any, blockId?: number) {
  const params: any = { request_type: 'call_function', account_id: account, method_name: method, args_base64: b64(JSON.stringify(args)) };
  if (blockId) params.block_id = blockId; else params.finality = 'final';
  const r = await rpc(fetchFn, VIEW_RPCS, 'query', params);
  const text = new TextDecoder().decode(new Uint8Array(r.result));
  return { value: text ? JSON.parse(text) : null, block_height: r.block_height as number, block_hash: r.block_hash as string };
}

export interface TxCheck { hash: string; label: string; ok: boolean; failure: string | null; failedReceipts: number; final: string; block_hash?: string }

export function summarizeTx(label: string, hash: string, r: any): TxCheck {
  const status = r?.status ?? {};
  const failure = status.Failure ? JSON.stringify(status.Failure) : null;
  const failedReceipts = (r?.receipts_outcome ?? []).filter((o: any) => o.outcome?.status?.Failure).length;
  return { hash, label, ok: !failure, failure, failedReceipts, final: r?.final_execution_status ?? 'unknown', block_hash: r?.transaction_outcome?.block_hash };
}

export interface ChainState {
  source: 'live' | 'bundled-read';
  read_at: string;
  block_height: number;
  block_hash: string;
  controller: string;
  economy: any;
  creatures: { id: string; balance: string; creature: any; account: any | null; life: any | null }[];
  births: Record<string, any>;
  jobs: Record<string, any>;
  bids: Record<string, Record<string, string | null>>;
  txs: TxCheck[];
  tool: any | null;
}

export async function readChain(fetchFn: Fetch, controller: string, proofs: { label: string; hash: string; signer: string }[], opts: { txs?: boolean } = {}): Promise<ChainState> {
  // Pin every view to one block so balances and supply reconcile.
  const econ = await view(fetchFn, controller, 'economy', {});
  const at = econ.block_height;
  const list = (await view(fetchFn, controller, 'list_creatures', {}, at)).value as [string, any][];
  const creatures = await Promise.all(list.map(async ([id, creature]) => {
    const [bal, life, acct] = await Promise.all([
      view(fetchFn, controller, 'ft_balance_of', { account_id: id }, at),
      view(fetchFn, controller, 'nft_token', { token_id: id }, at).catch(() => ({ value: null })),
      rpc(fetchFn, VIEW_RPCS, 'query', { request_type: 'view_account', account_id: id, block_id: at }).catch(() => null),
    ]);
    return { id, balance: String(bal.value), creature, account: acct ? { amount: acct.amount, storage_usage: acct.storage_usage, code_hash: acct.code_hash } : null, life: life.value };
  }));
  const births: Record<string, any> = {};
  for (const c of creatures) if (c.creature.parent) births[c.id] = (await view(fetchFn, controller, 'birth_status', { child: c.id }, at)).value;
  const jobs: Record<string, any> = {};
  const bids: Record<string, Record<string, string | null>> = {};
  await Promise.all(JOBS.map(async j => {
    jobs[j] = (await view(fetchFn, controller, 'job', { job_id: j }, at)).value;
    bids[j] = {};
    await Promise.all(creatures.map(async c => { bids[j][c.id] = (await view(fetchFn, controller, 'bid', { actor: c.id, job_id: j }, at)).value; }));
  }));
  const tool = (await view(fetchFn, controller, 'tool_liability', { nonce: 0 }, at).catch(() => ({ value: null }))).value;
  let txs: TxCheck[] = [];
  if (opts.txs !== false) {
    txs = await Promise.all(proofs.map(async p => {
      try { return summarizeTx(p.label, p.hash, await rpc(fetchFn, ARCHIVAL_RPCS, 'tx', { tx_hash: p.hash, sender_account_id: p.signer, wait_until: 'NONE' }, 20000)); }
      catch (e: any) { return { hash: p.hash, label: p.label, ok: false, failure: 'unreachable: ' + String(e?.message ?? e).slice(0, 120), failedReceipts: 0, final: 'unknown' }; }
    }));
  }
  return { source: 'live', read_at: new Date().toISOString(), block_height: at, block_hash: econ.block_hash, controller, economy: econ.value, creatures, births, jobs, bids, txs, tool };
}

// The contract result is authoritative. A refusal only counts when the chain
// reports the extinct panic, never a gas error or an unknown submission.
export function txVerdict(t: TxCheck | undefined, expected: string): 'verified' | 'refusal-verified' | 'mismatch' | 'unknown' {
  if (!t || t.final === 'unknown') return 'unknown';
  if (expected === 'expected-failure') return !t.ok && /extinct/i.test(t.failure ?? '') ? 'refusal-verified' : 'mismatch';
  return t.ok && t.failedReceipts === 0 ? 'verified' : 'mismatch';
}

export function reconciles(economy: any, creatures: { balance: string }[]) {
  const held = creatures.reduce((s, c) => s + BigInt(c.balance), 0n);
  return held + BigInt(economy.market) + BigInt(economy.pending) + BigInt(economy.job_escrow) === BigInt(economy.supply) && BigInt(economy.supply) + BigInt(economy.burned) === 1000n;
}
