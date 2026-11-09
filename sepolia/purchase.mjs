// Sepolia tool purchase through NEAR Chain Signatures (testnet MPC signer).
// Default is a read only plan. `--execute` performs the approved sequence.
// No EVM private key exists anywhere: every Sepolia transaction is signed by
// v1.signer-prod.testnet for an address derived from a throwaway NEAR testnet
// account. NEAR keys stay in the legacy keychain used by the near CLI and are
// never read by this script.
import {spawnSync} from 'node:child_process';
import {writeFileSync, readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {JsonRpcProvider, Transaction, Interface, Contract, ContractFactory, getCreateAddress, formatEther, parseUnits, decodeBase58, toBeHex, computeAddress, Signature} from '../app/node_modules/ethers/lib.esm/index.js';
import {digest as voucherDigest, parseSignature} from '../app/voucher.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const ROOT = 'feral-039832.testnet', CTRL = 'ctrl.feral-039832.testnet', ACTOR = 'moss.feral-039832.testnet', JOB = 'bilingual-v1';
const MPC = 'v1.signer-prod.testnet';
const RELAYER_PATH = 'feral-sepolia-relayer-v1', PROVIDER_PATH = 'feral-tool-provider-v1';
const CHAIN_ID = 11155111n, BILL = 7n, SUPPLY = 100n;
const SEPOLIA = process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const NEAR_RPC = 'https://archival-rpc.testnet.fastnear.com';
const MIN_WEI = parseUnits('0.002', 'ether');
const EVIDENCE = path.join(here, '../evidence/sepolia-tool-purchase.json');
const log = (...a) => console.log(...a);

async function near(method, params) {
  const r = await fetch(NEAR_RPC, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})});
  const j = await r.json(); if (j.error || j.result?.error) throw Error(JSON.stringify(j.error ?? j.result.error)); return j.result;
}
async function view(account, method, args) {
  const r = await near('query', {request_type: 'call_function', finality: 'final', account_id: account, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64')});
  const t = Buffer.from(r.result).toString(); return t ? JSON.parse(t) : null;
}
const addrOf = k => computeAddress('0x04' + toBeHex(decodeBase58(k.replace('secp256k1:', '')), 64).slice(2));
const derive = async (predecessor, p) => addrOf(await view(MPC, 'derived_public_key', {path: p, predecessor, domain_id: 0}));

// One NEAR testnet transaction through the near CLI. Returns hash and decoded result.
async function nearCall(signer, receiver, method, args, gas, deposit) {
  const r = spawnSync('near', ['contract', 'call-function', 'as-transaction', receiver, method, 'json-args', JSON.stringify(args), 'prepaid-gas', gas, 'attached-deposit', deposit, 'sign-as', signer, 'network-config', 'testnet', 'sign-with-legacy-keychain', 'send'], {encoding: 'utf8', env: {...process.env, NO_COLOR: '1'}, timeout: 180000});
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const hash = (out.match(/Transaction ID:\s*([1-9A-HJ-NP-Za-km-z]{43,44})/) ?? out.match(/(?:transactions|txns)\/([1-9A-HJ-NP-Za-km-z]{43,44})/))?.[1];
  if (!hash) { writeFileSync(path.join(here, `cli-${method}.log`), out.replace(/ed25519:[1-9A-HJ-NP-Za-km-z]{60,}/g, '[redacted]')); throw Error(`${method}: no transaction id (exit ${r.status})`); }
  let tx; for (let i = 0; i < 20; i++) { try { tx = await near('tx', {tx_hash: hash, sender_account_id: signer, wait_until: 'FINAL'}); break; } catch { await new Promise(s => setTimeout(s, 3000)); } }
  if (!tx) throw Error(`${method}: ${hash} not final`);
  if (tx.status.Failure) throw Error(`${method} failed ${hash}: ${JSON.stringify(tx.status.Failure)}`);
  const value = tx.status.SuccessValue ? JSON.parse(Buffer.from(tx.status.SuccessValue, 'base64').toString()) : null;
  return {hash, explorer: `https://testnet.nearblocks.io/txns/${hash}`, value, receipts: tx.receipts_outcome.map(o => ({id: o.id, executor: o.outcome.executor_id, ok: !o.outcome.status.Failure}))};
}

// Ask the MPC network to sign an EVM transaction hash for the relayer path.
async function mpcSignEvm(tx, relayer, steps, label) {
  const hash = tx.unsignedHash;
  const call = await nearCall(ROOT, MPC, 'sign', {request: {path: RELAYER_PATH, payload_v2: {Ecdsa: hash.slice(2)}, domain_id: 0}}, '300 Tgas', '1 yoctoNEAR');
  const sig = parseSignature(call.value, hash, relayer);
  tx.signature = Signature.from(sig);
  steps.push({step: `mpc-sign-${label}`, near_tx: call.hash, near_explorer: call.explorer, evm_hash_signed: hash});
  return tx;
}
async function sendEvm(provider, tx, steps, label) {
  const res = await provider.broadcastTransaction(tx.serialized);
  const rc = await res.wait(1, 180000);
  if (!rc || rc.status !== 1) throw Error(`${label} reverted ${res.hash}`);
  steps.push({step: label, sepolia_tx: res.hash, sepolia_explorer: `https://sepolia.etherscan.io/tx/${res.hash}`, block: rc.blockNumber, gas_used: rc.gasUsed.toString(), contract: rc.contractAddress ?? undefined});
  return rc;
}

const provider = new JsonRpcProvider(SEPOLIA, Number(CHAIN_ID), {staticNetwork: true});
const relayer = await derive(ROOT, RELAYER_PATH);
const voucherSigner = await derive(CTRL, `feral-sepolia-v1/${ACTOR}`);
const toolProvider = await derive(ROOT, PROVIDER_PATH);
const balance = await provider.getBalance(relayer);
const nonce = await provider.getTransactionCount(relayer);
const tokenAddr = getCreateAddress({from: relayer, nonce}), treasuryAddr = getCreateAddress({from: relayer, nonce: nonce + 1});
const job = await view(CTRL, 'job', {job_id: JOB});
const existing = await view(CTRL, 'tool_liability', {nonce: 0});
const plan = {network: 'NEAR testnet + Ethereum Sepolia', mpc_signer: MPC, relayer: {address: relayer, near_predecessor: ROOT, path: RELAYER_PATH, balance_eth: formatEther(balance), nonce},
  voucher_signer: {address: voucherSigner, near_predecessor: CTRL, path: `feral-sepolia-v1/${ACTOR}`, note: 'Signs only the EIP 712 voucher. Needs no ETH.'},
  tool_provider: {address: toolProvider, near_predecessor: ROOT, path: PROVIDER_PATH, note: 'Receives the 7 TOOL test units. Address only.'},
  predicted: {token: tokenAddr, treasury: treasuryAddr}, job: {id: JOB, paid: job?.paid, claimant: job?.claimant, output_hash: job?.output_hash}, existing_tool_liability: existing,
  needs_eth_wei: MIN_WEI.toString()};
log(JSON.stringify(plan, null, 2));
if (!EXECUTE) process.exit(0);
if (existing) throw Error('A tool liability already exists. Refusing to repeat the purchase.');
if (balance < MIN_WEI) { log(`BLOCKED: relayer ${relayer} holds ${formatEther(balance)} SepETH. It needs about 0.002 SepETH for two deployments and one redemption.`); process.exit(2); }
if (!job?.paid || job.claimant !== ACTOR) throw Error('accepted paid work is required first');

const steps = [];
const save = extra => writeFileSync(EVIDENCE, JSON.stringify({...plan, steps, ...extra, updated: new Date().toISOString()}, null, 2) + '\n');
const art = n => JSON.parse(readFileSync(path.join(here, `../evm/out/${n}.sol/${n}.json`), 'utf8'));
const fee = await provider.getFeeData();
const maxPriority = (fee.maxPriorityFeePerGas ?? 1_000_000n) + 1_000_000n, maxFee = (fee.maxFeePerGas ?? 2_000_000_000n) * 2n + maxPriority;
const evmTx = async (data, to, n, label) => {
  const gasLimit = (await provider.estimateGas({from: relayer, to, data})) * 12n / 10n;
  const tx = Transaction.from({type: 2, chainId: CHAIN_ID, nonce: n, to, data, value: 0n, gasLimit, maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPriority});
  return sendEvm(provider, await mpcSignEvm(tx, relayer, steps, label), steps, label);
};

// 1 and 2: test token minted straight to the treasury address, then the treasury.
const tokenArt = art('TestMunchToolToken'), treasuryArt = art('FeralTreasury');
const tokenData = new ContractFactory(tokenArt.abi, tokenArt.bytecode.object).interface.encodeDeploy([treasuryAddr, SUPPLY]);
await evmTx(tokenArt.bytecode.object + tokenData.slice(2), null, nonce, 'deploy-test-token'); save();
const treasuryData = new ContractFactory(treasuryArt.abi, treasuryArt.bytecode.object).interface.encodeDeploy([voucherSigner, tokenAddr, BILL, BILL, BILL]);
await evmTx(treasuryArt.bytecode.object + treasuryData.slice(2), null, nonce + 1, 'deploy-treasury'); save();

// 3: fix the destination on the controller (one time, owner only).
const hex32 = s => createHash('sha256').update(s).digest('hex');
const campaign = hex32('feral-tool-campaign-v1');
const cfg = await nearCall(ROOT, CTRL, 'configure_tools', {config: {signer: MPC, domain: {chain_id: Number(CHAIN_ID), treasury: treasuryAddr.slice(2).toLowerCase()}, campaign, token: tokenAddr.slice(2).toLowerCase(), recipient: toolProvider.slice(2).toLowerCase(), per_voucher: String(BILL), total_cap: String(BILL)}}, '50 Tgas', '0 NEAR');
steps.push({step: 'configure-tools', near_tx: cfg.hash, near_explorer: cfg.explorer}); save();

// 4: the controller asks the MPC network to sign the voucher for Moss's paid job.
const latest = await near('block', {finality: 'final'});
const now = Math.floor(Number(latest.header.timestamp) / 1e9);
const voucher = {campaign, job: hex32(JOB), creature: hex32(ACTOR), recipient: toolProvider.slice(2).toLowerCase(), token: tokenAddr.slice(2).toLowerCase(), amount: String(BILL), output_hash: job.output_hash, nonce: 0, expiry: now + 1800};
// Three independent digests must agree before the one shot request:
// local EIP 712, the deployed treasury, and the controller's Rust encoder.
const evmVoucher = {campaign: '0x' + campaign, job: '0x' + voucher.job, creature: '0x' + voucher.creature, recipient: toolProvider, token: tokenAddr, amount: BILL, outputHash: '0x' + job.output_hash, nonce: 0n, expiry: BigInt(voucher.expiry)};
const localDigest = voucherDigest({chain_id: Number(CHAIN_ID), treasury: treasuryAddr}, {...voucher, recipient: toolProvider, token: tokenAddr});
const treasuryDigest = await new Contract(treasuryAddr, treasuryArt.abi, provider).digest(evmVoucher);
const rustDigest = await view(CTRL, 'preview_tool_digest', {voucher});
steps.push({step: 'digest-agreement', local: localDigest, treasury: treasuryDigest, controller: rustDigest}); save();
if (localDigest !== treasuryDigest || localDigest.slice(2) !== rustDigest) throw Error('digest disagreement, refusing to request a signature');
const req = await nearCall(ROOT, CTRL, 'request_tool_payment', {actor: ACTOR, job_id: JOB, voucher}, '300 Tgas', '0 NEAR');
steps.push({step: 'request-tool-payment', near_tx: req.hash, near_explorer: req.explorer, returned: req.value}); save();
const liability = await view(CTRL, 'tool_liability', {nonce: 0});
if (liability?.state !== 'signature-returned') throw Error('MPC signature not returned: ' + liability?.state);
const d = voucherDigest({chain_id: Number(CHAIN_ID), treasury: treasuryAddr}, {...voucher, recipient: toolProvider, token: tokenAddr});
if (d.slice(2) !== liability.digest) throw Error('controller digest differs from local EIP 712 digest');
const voucherSig = parseSignature(JSON.parse(liability.signature), d, voucherSigner);

// 5: redeem on Sepolia. A NEAR signature alone is never treated as paid.
const iface = new Interface(treasuryArt.abi);
const redeemData = iface.encodeFunctionData('redeem', [evmVoucher, voucherSig]);
const rc = await evmTx(redeemData, treasuryAddr, nonce + 2, 'redeem-tool-payment');
const paid = rc.logs.map(l => { try { return iface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'ToolPaid');
if (!paid || paid.args.amount !== BILL) throw Error('ToolPaid event missing');
save({voucher, voucher_digest: d, voucher_signature: voucherSig, paid: {event: 'ToolPaid', amount: String(BILL), recipient: toolProvider, sepolia_tx: rc.hash}});
log('PAID', `https://sepolia.etherscan.io/tx/${rc.hash}`);
