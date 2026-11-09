// Reads the deployed controller on NEAR testnet (view calls only, no signing)
// and stores a block pinned chain read beside the bundled snapshot.
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = await build({configFile:false, logLevel:'silent', build:{write:false, ssr:path.join(here,'src/chain.ts'), rollupOptions:{output:{format:'es'}}}});
const code = (Array.isArray(out)?out[0]:out).output[0].code;
const chain = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const run = JSON.parse(readFileSync(path.join(here,'public/run.json'),'utf8'));
const state = await chain.readChain(fetch, run.controller, run.transactions);
state.source = 'bundled-read';
const bad = run.transactions.filter(t => !['verified','refusal-verified'].includes(chain.txVerdict(state.txs.find(x=>x.hash===t.hash), t.state)));
if (!chain.reconciles(state.economy, state.creatures)) throw Error('Live chain state does not reconcile');
writeFileSync(path.join(here,'public/chain.json'), JSON.stringify(state,null,2)+'\n');
console.log(`Chain read at block ${state.block_height}: ${state.creatures.length} creatures, ${state.txs.length} txs, ${bad.length} unverified`);
for (const t of bad) console.log('UNVERIFIED', t.label, t.hash);
