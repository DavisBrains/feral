import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {verifyScene} from './playback.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const load=p=>JSON.parse(readFileSync(path.join(here,p),'utf8'));
export function makeTestnetPlayback(journal,transactions){
 if(!journal.complete||!transactions.complete)throw Error('A completed real testnet run is required. Never silently substitute sandbox evidence.');
 if(journal.root!==transactions.root||journal.controller!==transactions.controller)throw Error('Evidence account mismatch');
 if(transactions.transactions.some(t=>! /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(t.hash)||!['success','expected-failure'].includes(t.state)))throw Error('Unverified public transaction');
 const proofs=transactions.transactions.map(t=>({label:t.label,hash:t.hash,state:t.state,explorer:`https://testnet.nearblocks.io/txns/${t.hash}`,signer:t.signer,receiver:t.receiver,receipt_ids:t.receipt_ids}));
 const byLabel=new Map(proofs.map(t=>[t.label,t]));
 const events=journal.events.filter(e=>e.snapshot).map(e=>{
  const tx=byLabel.get(e.step);if(!tx||tx.hash!==e.transaction||tx.state!==e.state)throw Error('Journal and transaction proof disagree for '+e.step);
  return {kind:e.step,state:e.snapshot,status:e.state,receipt:e.transaction,explorer:tx.explorer};
 });
 if(events.some(e=>!verifyScene(e)))throw Error('MUNCH conservation failed');
 if(!events.length||JSON.stringify(events.at(-1).state)!==JSON.stringify(journal.final))throw Error('Final snapshot mismatch');
 return {network:'NEAR testnet',root:journal.root,controller:journal.controller,complete:true,source:'Bundled public testnet snapshot',decisions:journal.decisions,transactions:proofs,events,final:journal.final};
}
export function syncEvidence(){
 const run=makeTestnetPlayback(load('../evidence/testnet-journal.json'),load('../evidence/testnet-transactions.json'));
 mkdirSync(path.join(here,'public/live-work'),{recursive:true});
 writeFileSync(path.join(here,'public/run.json'),JSON.stringify(run,null,2)+'\n');
 cpSync(path.join(here,'../evidence/testnet-work'),path.join(here,'public/live-work'),{recursive:true});
 console.log(`Bundled ${run.events.length} state snapshots and ${run.transactions.length} real testnet transaction links`);
 return run;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))syncEvidence();
