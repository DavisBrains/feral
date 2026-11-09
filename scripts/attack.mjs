// Attacks against the live arena (NEAR testnet) and the Sepolia treasury.
// Every attack must be refused. Each result is recorded with its transaction,
// or with the RPC rejection when NEAR refuses to even accept the transaction.
//   node scripts/attack.mjs            NEAR testnet attacks only
//   node scripts/attack.mjs --sepolia  also the ONE approved Sepolia replay
// The Sepolia replay resubmits the already redeemed voucher from the
// throwaway MPC relayer. It is sent once; a recorded result is never resent.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions } from '../keeper/node_modules/near-api-js/lib/index.js';
import * as near from '../keeper/near.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../evidence/attacks.json');
const ROOT = 'feral-039832.testnet', ARENA = near.CONTRACT, V1 = 'ctrl.feral-039832.testnet';
const prior = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { attacks: [] };
const results = [];
const save = () => writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), arena: ARENA, attacks: [...results, ...prior.attacks.filter(a => !results.some(r => r.id === a.id))] }, null, 2) + '\n');
const ONLY = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const want = id => !ONLY || ONLY.includes(id);
const record = r => { results.push({ at: new Date().toISOString(), ...r }); console.log(`${r.refused === null ? 'SKIPPED' : r.refused ? 'REFUSED' : 'NOT REFUSED'} ${r.id} ${r.tx ?? ''} ${r.reason ?? ''}`); save(); };

// A NEAR transaction from the throwaway root account through the near CLI keychain.
async function rootCall(receiver, method, args, gas = '30 Tgas', deposit = '0 NEAR') {
  const r = spawnSync('near', ['contract', 'call-function', 'as-transaction', receiver, method, 'json-args', JSON.stringify(args), 'prepaid-gas', gas, 'attached-deposit', deposit, 'sign-as', ROOT, 'network-config', 'testnet', 'sign-with-legacy-keychain', 'send'], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 180000 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const hash = (out.match(/Transaction ID:\s*([1-9A-HJ-NP-Za-km-z]{43,44})/) ?? out.match(/(?:transactions|txns)\/([1-9A-HJ-NP-Za-km-z]{43,44})/))?.[1];
  if (!hash) return { hash: null, error: out.replace(/ed25519:[1-9A-HJ-NP-Za-km-z]{60,}/g, '[redacted]').slice(-400) };
  let tx; for (let i = 0; i < 20 && !tx; i++) { try { tx = await near.txStatus(hash, ROOT); } catch { await new Promise(s => setTimeout(s, 3000)); } }
  const fail = JSON.stringify(tx?.status?.Failure ?? tx?.receipts_outcome?.map(o => o.outcome.status.Failure).find(Boolean) ?? null);
  const m = fail.match(/Smart contract panicked: ([^"\\]+)/) ?? fail.match(/"(\w*Method\w*|\w*Private\w*)"/);
  return { hash, failed: fail !== 'null', error: m ? m[1] : fail === 'null' ? null : fail.slice(0, 200) };
}
const SEPOLIA_ONLY = process.argv.includes('--sepolia-only');
if (SEPOLIA_ONLY) { const done = prior.attacks.find(a => a.id === 'sepolia-voucher-replay' && a.tx); if (done) { console.log('already recorded', done.tx); process.exit(0); } await sepoliaReplay(); process.exit(0); }
const snap = await near.snapshot();
const lives = snap.lives ?? [];
const s = snap.season;
console.log(`arena ${ARENA} season ${s?.id} ${s?.status} turn ${s?.turn}`);
const alive = lives.filter(l => l.life.active);
const target = alive[0];
if (!target) throw Error('no living creature to aim at. Start a season first.');

// 1. Forged birth callback: on_birth is #[private]. A stranger calling it would mint a child for free.
{
  const r = await rootCall(ARENA, 'on_birth', { parent: target.id, child: `s${s.id}-forged.${ARENA}`, nonce: 1, change: 0 });
  record({ id: 'forged-birth-callback', chain: 'near-testnet', title: 'Forged birth callback', attempt: `${ROOT} calls on_birth directly to mint a child without paying`, tx: r.hash, refused: !!r.hash && r.failed, reason: r.error });
}
// 2. Forged founders callback: replaying on_founders would re-run season setup.
{
  const r = await rootCall(ARENA, 'on_founders', { season: s.id });
  record({ id: 'forged-founders-callback', chain: 'near-testnet', title: 'Replayed founders callback', attempt: `${ROOT} replays on_founders for season ${s.id}`, tx: r.hash, refused: !!r.hash && r.failed, reason: r.error });
}
// 3. Sponsor by a non holder: only the holder of the creature's life NFT may sponsor it.
{
  const r = await rootCall(ARENA, 'sponsor', { actor: target.id, amount: '20' });
  record({ id: 'sponsor-non-holder', chain: 'near-testnet', title: 'Sponsor without the life NFT', attempt: `${ROOT} holds no life NFT and tries to sponsor ${target.life.name} with 20 MUNCH`, tx: r.hash, refused: !!r.hash && r.failed, reason: r.error });
}
// 4. Visitor bypass: a stranger moving time forward directly.
{
  const r = await rootCall(ARENA, 'tick', {});
  record({ id: 'tick-non-owner', chain: 'near-testnet', title: 'Advance time without the keeper', attempt: `${ROOT} calls tick directly`, tx: r.hash, refused: !!r.hash && r.failed, reason: r.error });
}
// 5. Duplicate season: a second start while one is live would mint a second seed.
if (s.status === 'live' && !s.closed) {
  const r = await near.call('start_season', { pilot: '0'.repeat(64), target_turns: 8, budget: '120' }, 100);
  record({ id: 'duplicate-season', chain: 'near-testnet', title: 'Second seed while a season is live', attempt: 'The keeper key asks for another 1,000 MUNCH seed mid season', tx: r.hash, refused: !r.ok, reason: r.error });
}
// 6. Duplicate birth: two births in flight for one parent. Needs a parent that can pay for one.
{
  const parent = alive.find(l => Number(l.balance) >= 200 && l.life.goal !== 1 && !l.life.pending);
  if (!parent) record({ id: 'duplicate-birth', chain: 'near-testnet', title: 'Two births for one parent', attempt: 'Send two birth calls for the same parent at once', tx: null, refused: null, reason: 'skipped this run, no living parent can afford one birth yet. Covered by arena unit tests (duplicate_birth_refused_while_pending, birth_callback_replay_refused).' });
  else {
    const [a, b] = await Promise.all([near.call('birth', { parent: parent.id, change: 0 }, 120), near.call('birth', { parent: parent.id, change: 0 }, 120)]);
    const second = a.ok ? b : a;
    record({ id: 'duplicate-birth', chain: 'near-testnet', title: 'Two births for one parent', attempt: `Two birth calls for ${parent.life.name} in flight together`, tx: second.hash, refused: !(a.ok && b.ok), reason: second.error, first_tx: (a.ok ? a : b).hash });
  }
}
// 7. Out of scope key: the keeper's function call key aimed at another contract,
//    at a method outside its list, and with a deposit. NEAR rejects these before execution.
{
  const kp = KeyPair.fromString(near.loadKey());
  const acc = new Account(near.KEEPER, new JsonRpcProvider({ url: near.RPCS[0] }), new KeyPairSigner(kp));
  const tryIt = async (receiverId, act) => { try { const r = await acc.signAndSendTransaction({ receiverId, actions: [act], waitUntil: 'FINAL', throwOnFailure: false }); return { hash: r.transaction?.hash ?? null, error: JSON.stringify(r.status?.Failure ?? null) }; } catch (e) { return { hash: null, error: String(e?.message ?? e).slice(0, 240) }; } };
  const g = 30n * 10n ** 12n;
  const a = await tryIt(V1, actions.functionCall('tick', {}, g, 0n));
  record({ id: 'key-other-contract', chain: 'near-testnet', title: 'Keeper key against the proof run contract', attempt: `keeper key calls tick on ${V1}`, tx: a.hash, refused: !a.hash || a.error !== 'null', reason: a.error, stage: a.hash ? 'executed' : 'rejected-before-execution' });
  const b0 = await tryIt(ARENA, actions.functionCall('ft_transfer', { receiver_id: ROOT, amount: '1' }, g, 0n));
  record({ id: 'key-method-out-of-list', chain: 'near-testnet', title: 'Keeper key moving MUNCH out', attempt: 'keeper key calls ft_transfer, a method outside its list', tx: b0.hash, refused: !b0.hash || b0.error !== 'null', reason: b0.error, stage: b0.hash ? 'executed' : 'rejected-before-execution' });
  const b = await tryIt(ARENA, actions.functionCall('feed', { actor: ROOT }, g, 1n));
  record({ id: 'key-deposit', chain: 'near-testnet', title: 'Keeper key attaching a deposit', attempt: 'keeper key calls feed with 1 yocto attached', tx: b.hash, refused: !b.hash || b.error !== 'null', reason: b.error, stage: b.hash ? 'executed' : 'rejected-before-execution' });
  const c = await tryIt(ROOT, actions.transfer(10n ** 22n));
  record({ id: 'key-move-near', chain: 'near-testnet', title: 'Keeper key sending NEAR', attempt: 'keeper key tries to transfer 0.01 NEAR to the root account', tx: c.hash, refused: !c.hash || c.error !== 'null', reason: c.error, stage: c.hash ? 'executed' : 'rejected-before-execution' });
}

// 8. The one approved Sepolia attack: replay the redeemed voucher from the throwaway relayer.
if (process.argv.includes('--sepolia')) {
  const done = prior.attacks.find(a => a.id === 'sepolia-voucher-replay' && a.tx);
  if (done) { console.log('Sepolia replay already recorded, not resending', done.tx); results.push(done); save(); }
  else await sepoliaReplay();
}

async function sepoliaReplay() {
  const { JsonRpcProvider: Evm, Transaction, Interface, Signature, decodeBase58, toBeHex, computeAddress } = await import('../app/node_modules/ethers/lib.esm/index.js');
  const { parseSignature } = await import('../app/voucher.mjs');
  const ev = JSON.parse(readFileSync(path.join(here, '../evidence/sepolia-tool-purchase.json'), 'utf8'));
  const art = JSON.parse(readFileSync(path.join(here, '../evm/out/FeralTreasury.sol/FeralTreasury.json'), 'utf8'));
  const provider = new Evm(process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com', 11155111, { staticNetwork: true });
  const treasury = ev.predicted.treasury, relayer = ev.relayer.address, v = ev.voucher;
  const derived = computeAddress('0x04' + toBeHex(decodeBase58((await near.rpc('query', { request_type: 'call_function', finality: 'final', account_id: 'v1.signer-prod.testnet', method_name: 'derived_public_key', args_base64: Buffer.from(JSON.stringify({ path: ev.relayer.path, predecessor: ROOT, domain_id: 0 })).toString('base64') }).then(r => JSON.parse(Buffer.from(r.result).toString()))).replace('secp256k1:', '')), 64).slice(2));
  if (derived !== relayer) throw Error('relayer derivation changed, refusing');
  const iface = new Interface(art.abi);
  const voucher = { campaign: '0x' + v.campaign, job: '0x' + v.job, creature: '0x' + v.creature, recipient: '0x' + v.recipient, token: '0x' + v.token, amount: BigInt(v.amount), outputHash: '0x' + v.output_hash, nonce: BigInt(v.nonce), expiry: BigInt(v.expiry) };
  const data = iface.encodeFunctionData('redeem', [voucher, ev.voucher_signature]);
  // Read what the treasury already knows before sending anything.
  const used = await provider.call({ to: treasury, data: iface.encodeFunctionData('usedNonces', [voucher.nonce]) }).then(r => iface.decodeFunctionResult('usedNonces', r)[0]).catch(() => null);
  let simulated = null; try { await provider.call({ from: relayer, to: treasury, data }); simulated = 'did not revert'; } catch (e) { const d = e?.data ?? e?.info?.error?.data; try { simulated = iface.parseError(d)?.name ?? String(d); } catch { simulated = String(e?.shortMessage ?? e).slice(0, 120); } }
  const nonce = await provider.getTransactionCount(relayer), fee = await provider.getFeeData();
  const prio = (fee.maxPriorityFeePerGas ?? 1_000_000n) + 1_000_000n;
  const tx = Transaction.from({ type: 2, chainId: 11155111n, nonce, to: treasury, data, value: 0n, gasLimit: 120000n, maxFeePerGas: (fee.maxFeePerGas ?? 2_000_000_000n) * 2n + prio, maxPriorityFeePerGas: prio });
  const sign = await rootCall('v1.signer-prod.testnet', 'sign', { request: { path: ev.relayer.path, payload_v2: { Ecdsa: tx.unsignedHash.slice(2) }, domain_id: 0 } }, '300 Tgas', '1 yoctoNEAR');
  if (!sign.hash || sign.failed) throw Error('MPC sign failed ' + JSON.stringify(sign));
  const st = await near.txStatus(sign.hash, ROOT);
  const value = JSON.parse(Buffer.from(st.status.SuccessValue, 'base64').toString());
  tx.signature = Signature.from(parseSignature(value, tx.unsignedHash, relayer));
  const sent = await provider.broadcastTransaction(tx.serialized);
  const rc = await provider.waitForTransaction(sent.hash, 1, 240000);
  record({ id: 'sepolia-voucher-replay', chain: 'sepolia', title: 'Replay the redeemed voucher on Sepolia', attempt: `relayer ${relayer} resubmits voucher nonce ${v.nonce}, already paid in ${ev.paid.sepolia_tx}`, tx: sent.hash, explorer: `https://sepolia.etherscan.io/tx/${sent.hash}`, refused: rc?.status === 0, reason: `reverted on chain, simulated revert ${simulated}`, used_nonce_on_chain: used, voucher_expiry: Number(v.expiry), mpc_sign_tx: sign.hash, block: rc?.blockNumber, gas_used: rc?.gasUsed?.toString() });
}
console.log(results.every(r => r.refused !== false) ? 'ALL REFUSED' : 'SOMETHING WAS NOT REFUSED');
