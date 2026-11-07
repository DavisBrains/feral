import test from 'node:test';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,IDS,NEAR,ReadOnlyRpc,estimatePlan,makeOperations,near,base58,cliArgs,extractTxHash,verifyTransaction,resumePolicy,executeStep,assertOperationTemplate,acquireRunLock,checkedLiveDecision,publicPlan,saveSignedArgs,broadcastSignedArgs,classifyCliResult,runCli,guardTickRecovery,guardRejectionRecovery,rebroadcastRejection,cliProcess,finalized,functionCallCost,prepareRejectedSpendRepair,redactCliOutput} from './testnet-run.mjs';
const HASH='BMudVUSoFqYhvXV7JkAqkyZkAjfGJbS5yTob9hEDohT3';
const root={amount:String(10n*NEAR),storage_usage:182};
const protocol={protocol_version:88,runtime_config:{storage_amount_per_byte:'10000000000000000000'}};
const gas={gas_price:'100000000'};
const plan=()=>estimatePlan(root,protocol,gas,337694);
const ops=()=>plan().operations;
const op=id=>ops().find(x=>x.id===id);
const fn=o=>({FunctionCall:{method_name:o.method??'new',args:Buffer.from(JSON.stringify(o.args)).toString('base64'),gas:String(BigInt(o.gas)*10n**12n),deposit:o.deposit}});
function outcome(o){return {final_execution_status:'FINAL',transaction:{signer_id:o.signer,receiver_id:o.receiver,actions:o.kind==='create'?['CreateAccount',{Transfer:{deposit:o.amount}},{AddKey:{public_key:'ed25519:public-placeholder',access_key:{nonce:0,permission:'FullAccess'}}}]:o.kind==='deploy'?[{DeployContract:{code:'omitted'}},fn(o)]:[fn(o)]},status:{SuccessValue:''},receipts_outcome:[]};}
const journal=()=>({steps:{},events:[],decisions:{}});
const work={source_hash:'a'.repeat(64),translation_hash:'b'.repeat(64),output_hash:'c'.repeat(64)};
const clone=x=>structuredClone(x);
const quiet=async f=>{const old=console.log;console.log=()=>{};try{return await f();}finally{console.log=old;}};

test('10 NEAR budget is affordable with 5.15 NEAR conservative outlay',()=>{const p=plan();assert.equal(p.affordable,true);assert.equal(near(p.controller_funding),'3.8');assert.equal(near(p.remaining_transfers),'4.15');assert.equal(near(p.max_outlay_estimate),'5.15');assert.equal(near(p.remaining_root_estimate),'4.85');assert.equal(p.operations.length,24);});
test('budget includes child funding once through the parent reserve',()=>{const p=plan();assert.equal(p.remaining_transfers,String(415n*NEAR/100n));assert.equal(op('funded-child-account-creation').deposit,'0');assert.equal(op('funded-child-account-creation').args.native,String(6n*NEAR/100n));});
test('low balance is refused and signed negative estimates format correctly',()=>{const p=estimatePlan({...root,amount:String(NEAR)},protocol,gas,337694);assert.equal(p.affordable,false);assert.equal(near(p.remaining_root_estimate),'-4.15');});
test('resume budget excludes completed transfers; complete plan costs zero',()=>{const p=estimatePlan(root,protocol,gas,337694,new Set(ops().map(o=>o.id)));assert.equal(p.max_outlay_estimate,'0');assert.equal(p.remaining_transfers,'0');});
test('missing account and unsupported protocol rejected',()=>{assert.throws(()=>estimatePlan(null,protocol,gas,337694));assert.throws(()=>estimatePlan(root,{...protocol,protocol_version:84},gas,337694));});
test('RPC refuses broadcast before touching the network',async()=>{let calls=0;const rpc=new ReadOnlyRpc(async()=>{calls++;throw Error('must not fetch');});await assert.rejects(rpc.request('broadcast_tx_commit',[]),/prohibited/);await assert.rejects(rpc.request('send_tx',{}),/prohibited/);assert.equal(calls,0);});
test('RPC reads use only the pinned public testnet endpoint',async()=>{const seen=[];const rpc=new ReadOnlyRpc(async(url,init)=>{seen.push([url,JSON.parse(init.body)]);return {ok:true,json:async()=>({result:root})};});assert.deepEqual(await rpc.account(ROOT),root);assert.equal(seen[0][0],'https://rpc.testnet.near.org');assert.equal(seen[0][1].method,'query');assert.equal(seen[0][1].params.finality,'final');});
test('account missing is distinct from transient RPC error',async()=>{const rpc=new ReadOnlyRpc(async()=>({ok:true,json:async()=>({error:{cause:{name:'UNKNOWN_ACCOUNT'}}})}));assert.equal(await rpc.account(IDS.child),null);const bad=new ReadOnlyRpc(async()=>({ok:false,status:503}));await assert.rejects(bad.account(ROOT),/503/);});
test('public plan performs only three allowed read operations',async()=>{const calls=[];const rpc={account:async id=>{calls.push(id);return root;},request:async method=>{calls.push(method);return method==='gas_price'?gas:protocol;}};assert.equal((await publicPlan(rpc,337694)).affordable,true);assert.deepEqual(calls,[ROOT,'EXPERIMENTAL_protocol_config','gas_price']);});
test('CLI scope denies outside receivers, signers, MPC and arbitrary deployment',()=>{const a=op('death-tick');assert.throws(()=>cliArgs({...a,receiver:'v1.signer-prod.testnet'}));assert.throws(()=>cliArgs({...a,method:'sign'}));assert.throws(()=>cliArgs({...a,signer:'david.near'}));assert.throws(()=>cliArgs({...op('create-controller'),receiver:'elsewhere.testnet'}));assert.throws(()=>cliArgs({...op('deploy-controller'),receiver:ROOT}));});
test('CLI uses only legacy keychain and fixed testnet config',()=>{for(const o of ops().filter(o=>!JSON.stringify(o).includes('$'))){const a=cliArgs(o);assert.deepEqual(a.slice(-4),['network-config','testnet','sign-with-legacy-keychain','send']);assert.equal(a.some(x=>/private.key|seed.phrase|plaintext|mainnet|sepolia/i.test(x)),false);}});
test('unresolved live prices cannot reach CLI',()=>assert.throws(()=>cliArgs(op('parent-bid')),/Unresolved/));
test('every planned CLI command parses locally with --help and never executes',()=>{for(const o of ops()){const resolved=clone(o);for(const k of Object.keys(resolved.args??{}))if(typeof resolved.args[k]==='string'&&resolved.args[k].startsWith('$'))resolved.args[k]=resolved.args[k].includes('PRICE')?'90':'a'.repeat(64);const r=spawnSync('/home/box/.local/bin/near',[...cliArgs(resolved),'--help'],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,`${o.id} CLI help grammar rejected`);assert.match(r.stdout+r.stderr,/Usage:/);}});
test('transaction parser accepts CLI links and ANSI output, not public keys',()=>{assert.equal(extractTxHash(`\x1b[32mTransaction ID: ${HASH}\x1b[0m`),HASH);assert.equal(extractTxHash(`https://testnet.nearblocks.io/txns/${HASH}`),HASH);assert.equal(extractTxHash(`https://explorer.testnet.near.org/transactions/${HASH}`),HASH);assert.equal(extractTxHash(`Public key: ${HASH}`),null);});
test('create verification handles actual string CreateAccount representation',()=>{const o=op('create-controller');assert.equal(verifyTransaction(outcome(o),o),'success');const x=outcome(o);x.transaction.actions[0]={CreateAccount:{}};assert.equal(verifyTransaction(x,o),'success');});
test('creation rejects extra actions, wrong funding and restricted keys',()=>{const o=op('create-controller');for(const change of [x=>x.transaction.actions.push({DeleteAccount:{beneficiary_id:ROOT}}),x=>x.transaction.actions[1].Transfer.deposit='1',x=>x.transaction.actions[2].AddKey.access_key.permission={FunctionCall:{}}]){const x=outcome(o);change(x);assert.throws(()=>verifyTransaction(x,o));}});
test('call and deployment verify exact domain, arguments, deposit and gas',()=>{for(const o of [op('death-tick'),op('deploy-controller')]){assert.equal(verifyTransaction(outcome(o),o),'success');for(const change of [x=>x.transaction.receiver_id=ROOT,x=>x.transaction.signer_id='other.testnet',x=>x.transaction.actions.at(-1).FunctionCall.deposit='1',x=>x.transaction.actions.at(-1).FunctionCall.gas='1',x=>x.transaction.actions.at(-1).FunctionCall.args=Buffer.from('{}').toString('base64')]){const x=outcome(o);change(x);assert.throws(()=>verifyTransaction(x,o));}}});
test('only specifically expected extinct failure counts as expected rejection',()=>{const o=op('refused-post-death-spend');const x=outcome(o);assert.throws(()=>verifyTransaction(x,o));x.status={Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'Smart contract panicked: extinct'}}}}};assert.equal(verifyTransaction(x,o),'expected-failure');assert.throws(()=>verifyTransaction(x,op('death-tick')));x.status={Failure:{error:'out of gas'}};assert.throws(()=>verifyTransaction(x,o));});
test('unknown result or ordinary failure never counts as success',()=>{const o=op('death-tick');const x=outcome(o);x.status={};assert.throws(()=>verifyTransaction(x,o),/unknown/);x.status={Failure:{error:'insufficient balance'}};assert.throws(()=>verifyTransaction(x,o),/failed/);});
test('resumption never blindly resends unknown submission',()=>{assert.equal(resumePolicy(), 'new');assert.throws(()=>resumePolicy({state:'submitting'}),/Do not resend/);assert.equal(resumePolicy({state:'submitting',hash:HASH}),'recover-hash');assert.equal(resumePolicy({state:'success',hash:HASH}),'verify');});
test('static journal operation tampering rejected',()=>{const o=op('register-moss');assert.doesNotThrow(()=>assertOperationTemplate(o,o,work,journal()));assert.throws(()=>assertOperationTemplate(o,{...o,deposit:String(9n*NEAR)},work,journal()),/fixed approved plan/);});
const obs={actor:IDS.child,policy:1,balance:90,goal:0,active:true,jobs:[{kind:'bilingual',reward:90}],needs_translation:true,has_translation:true,provider_active:true,can_reproduce:false};
const live={mode:'local-model',model:'Qwen/Qwen2.5-1.5B-Instruct',seconds:2,decision:{action:'bid',job:'bilingual',price:80}};
test('live decisions reject fallback, extra input and unexpected actions even on resume',()=>{assert.equal(checkedLiveDecision(live,obs,'bid').price,80);assert.throws(()=>checkedLiveDecision({...live,mode:'deterministic-policy'},obs,'bid'));assert.throws(()=>checkedLiveDecision({...live,decision:{action:'wait'}},obs,'bid'));assert.throws(()=>checkedLiveDecision({...live,decision:{...live.decision,method:'sign'}},obs,'bid'));});
test('resumed live prices must match validated decision and work hashes',()=>{const template=op('child-first-bid');const j=journal();j.decisions['child-bid']={observation:obs,result:live};assert.doesNotThrow(()=>assertOperationTemplate(template,{...template,args:{...template.args,price:'80'}},work,j));assert.throws(()=>assertOperationTemplate(template,{...template,args:{...template.args,price:'90'}},work,j));assert.throws(()=>assertOperationTemplate(template,{...template,args:{...template.args,price:'80'}},work,journal()));});
test('execute lock blocks concurrent runners and permits clean resume',()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'feral-lock-'));try{const file=path.join(dir,'lock');const release=acquireRunLock(file);assert.equal(JSON.parse(readFileSync(file)).root,ROOT);assert.throws(()=>acquireRunLock(file),/lock exists/);release();acquireRunLock(file)();}finally{rmSync(dir,{recursive:true,force:true});}});
test('completed step is verified without invoking signer or duplicating event',async()=>{const o=op('create-controller');const j=journal();let sends=0;const persisted=[];const options={persist:x=>persisted.push(clone(x)),runCli:async(a,onHash)=>{sends++;onHash(HASH);return {hash:HASH};}};const rpc={tx:async()=>outcome(o),account:async()=>root};await quiet(async()=>{await executeStep(j,rpc,o,work,options);await executeStep(j,rpc,o,work,options);});assert.equal(sends,1);assert.equal(j.events.length,1);assert.equal(j.steps[o.id].state,'success');assert.equal(persisted[0].steps[o.id].state,'preparing');assert.equal(persisted[0].steps[o.id].hash,undefined);});
test('interruption after durable hash capture recovers without resending',async()=>{const o=op('create-controller'),j=journal();let sends=0;const rpc={tx:async()=>outcome(o),account:async()=>root};const options={persist:()=>{},runCli:async(a,onHash)=>{sends++;onHash(HASH);throw Error('simulated interrupt');}};await assert.rejects(executeStep(j,rpc,o,work,options),/interrupt/);assert.equal(j.steps[o.id].hash,HASH);options.runCli=async()=>{throw Error('must not resend');};await quiet(()=>executeStep(j,rpc,o,work,options));assert.equal(sends,1);assert.equal(j.steps[o.id].state,'success');});
test('submission with no hash blocks all retries and RPC confirmation',async()=>{const o=op('create-controller'),j=journal();let sends=0,queries=0;const rpc={tx:async()=>{queries++;}};const options={persist:()=>{},runCli:async()=>{sends++;j.steps[o.id].state='submitting';return {};}};await assert.rejects(executeStep(j,rpc,o,work,options),/NOT retried/);await assert.rejects(executeStep(j,rpc,o,work,options),/Do not resend/);assert.equal(sends,1);assert.equal(queries,0);});
test('mismatched recovered transaction stops for review without submitting',async()=>{const o=op('create-controller'),j=journal();j.steps[o.id]={id:o.id,op:o,state:'submitting',hash:HASH};const x=outcome(o);x.transaction.receiver_id='outside.testnet';await assert.rejects(executeStep(j,{tx:async()=>x},o,work,{persist:()=>{},runCli:()=>assert.fail('must not send')}),/does not match/);assert.equal(j.steps[o.id].state,'stopped-review');});
test('base58 hashes preserve leading zero bytes',()=>{assert.equal(base58(Buffer.alloc(32)),'1'.repeat(32));assert.equal(base58(Buffer.from([0,1])),'12');});
test('save-before-send and broadcast command grammars parse without signing',()=>{const o=op('death-tick');for(const args of [saveSignedArgs(o,'/tmp/no-real-blob.json',{public_key:'ed25519:74qz2mMcsfKJkvhvbJnwvxv7o1WNHLq1f6JZu7zLhpxW',nonce:'276606257000012'}),broadcastSignedArgs('/tmp/no-real-blob.json')]){const r=spawnSync('/home/box/.local/bin/near',[...args,'--help'],{encoding:'utf8',timeout:10000});assert.equal(r.status,0);assert.match(r.stdout+r.stderr,/Usage:/);}assert.equal(saveSignedArgs(o,'/tmp/no-real-blob.json').includes('send'),false);});
test('canonical hash is recorded before broadcasting even when CLI prints no hash',async()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'feral-prepare-'));try{const o=op('death-tick'),events=[];const tx=outcome(o).transaction;Object.assign(tx,{hash:HASH,nonce:42,public_key:'public-test-key'});const result=await runCli(o,(h,meta)=>{events.push('durable-hash');assert.equal(h,HASH);assert.equal(meta.nonce,'42');},{directory:dir,fileExists:()=>false,inspect:()=>({hash:HASH,transaction:tx,block_hash:'public-block'}),processRunner:async args=>{const preparing=args.includes('save-to-file');events.push(preparing?'prepare':'broadcast');if(!preparing)assert.ok(events.includes('durable-hash'));return {exit_code:0,reported_hash:null};}});assert.equal(result.hash,HASH);assert.deepEqual(events,['prepare','durable-hash','broadcast']);}finally{rmSync(dir,{recursive:true,force:true});}});
test('prepare failure is diagnosed and never broadcasts',async()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'feral-prepare-'));try{let calls=0;const diagnostics=[];await assert.rejects(runCli(op('death-tick'),()=>assert.fail('no hash before signing'),{directory:dir,fileExists:()=>false,processRunner:async()=>{calls++;return {exit_code:null,timed_out:true};},recordDiagnostic:(p,r)=>diagnostics.push({p,r})}),/No broadcast/);assert.equal(calls,1);assert.equal(diagnostics[0].p,'prepare');assert.equal(resumePolicy({state:'preparing'}),'prepare-again');}finally{rmSync(dir,{recursive:true,force:true});}});
test('broadcast timeout retains a precomputed hash and phase diagnostic',async()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'feral-prepare-'));try{const o=op('death-tick'),tx={...outcome(o).transaction,hash:HASH,nonce:42,public_key:'fixture'};let saved=null;const r=await runCli(o,h=>saved=h,{directory:dir,fileExists:()=>true,inspect:()=>({hash:HASH,transaction:tx}),processRunner:async()=>({exit_code:null,timed_out:true,signal:'SIGTERM',reported_hash:null})});assert.equal(saved,HASH);assert.equal(r.hash,HASH);assert.equal(r.diagnostic.timed_out,true);}finally{rmSync(dir,{recursive:true,force:true});}});
test('diagnostic classifier never includes raw potentially sensitive CLI output',()=>{const r=classifyCliResult(null,'SIGTERM',true,'timeout 429 connection private key: never-store-this');assert.equal(r.flags.rate_limited,true);assert.equal(r.timed_out,true);assert.equal(JSON.stringify(r).includes('never-store-this'),false);});
function tickGuardFixture(){const j=journal(),o=op('cancel-old-job');j.steps['cancel-old-job']={id:o.id,op:o,hash:HASH,state:'success'};j.steps['death-tick']={id:'death-tick',op:op('death-tick'),state:'submitting'};const x=outcome(o);Object.assign(x.transaction,{nonce:41,public_key:'public-fixture'});const keys={keys:[{public_key:'public-fixture',access_key:{nonce:41,permission:'FullAccess'}}]};const economy={turn:0,burned:'0'};return {j,keys,economy,rpc:{tx:async()=>x,request:async()=>keys,view:async m=>m==='economy'?economy:{active:true}}};}
test('legacy tick recovery pins exactly the unchanged signer next nonce',async()=>{const {j,rpc}=tickGuardFixture();const r=await guardTickRecovery(j,rpc,'death-tick');assert.equal(r.nonce,'42');assert.equal(r.base_nonce,'41');assert.equal(j.steps['death-tick'].state,'submitting');await assert.rejects(guardTickRecovery(j,rpc,'paid-job'),/only/);});
test('tick recovery refuses any nonce change, applied tick, known hash or other key',async()=>{for(const mutate of [f=>f.keys.keys[0].access_key.nonce++,f=>f.economy.turn++,f=>f.j.steps['death-tick'].hash=HASH,f=>f.keys.keys.push({...f.keys.keys[0]})]){const f=tickGuardFixture();mutate(f);await assert.rejects(guardTickRecovery(f.j,f.rpc,'death-tick'));}});
test('recovery nonce mismatch never reaches broadcast',async()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'feral-prepare-'));try{const o=op('death-tick'),tx={...outcome(o).transaction,hash:HASH,nonce:43,public_key:'fixture'};await assert.rejects(runCli(o,()=>assert.fail('must not record wrong nonce'),{directory:dir,fileExists:()=>true,inspect:()=>({hash:HASH,transaction:tx}),recovery:{nonce:'42',public_key:'fixture'},processRunner:async()=>assert.fail('must not broadcast')}),/pinned/);}finally{rmSync(dir,{recursive:true,force:true});}});

function rejectionFixture(){
 const j=journal(),o=op('refused-post-death-spend');
 j.steps[o.id]={id:o.id,op:o,state:'broadcasting',hash:HASH,prepared:{nonce:'42',public_key:'fixture',block_hash:'block-fixture'}};
 const meta={hash:HASH,block_hash:'block-fixture',transaction:{...outcome(o).transaction,hash:HASH,nonce:42,public_key:'fixture'}};
 const keys={block_height:100,keys:[{public_key:'fixture',access_key:{nonce:41,permission:'FullAccess'}}]};
 const account={amount:String(NEAR/100n),storage_usage:182};
 const rpc={tx:async()=>{const e=Error('unknown');e.rpcError={cause:{name:'UNKNOWN_TRANSACTION'}};throw e;},account:async()=>account,
 view:async m=>m==='creature'?{active:false}:'5',request:async(m)=>m==='query'?keys:m==='gas_price'?gas:m==='block'?{header:{height:99}}:{...protocol,transaction_validity_period:86400,runtime_config:{...protocol.runtime_config,min_gas_purchase_price:'1000000000',transaction_costs:{action_receipt_creation_config:{send_sir:100,send_not_sir:100,execution:100},action_creation_config:{function_call_cost:{send_sir:100,send_not_sir:100,execution:100},function_call_cost_per_byte:{send_sir:1,send_not_sir:1,execution:1}}}}}};
 return {j,o,rpc,meta,keys,account,inspect:()=>meta};
}
test('identical rejection recovery only uses existing hash bytes and nonce',async()=>{
 const f=rejectionFixture();let sends=0,persists=0;
 await rebroadcastRejection(f.j,f.rpc,f.o.id,{inspect:f.inspect,persist:()=>persists++,processRunner:async args=>{sends++;assert.deepEqual(args,broadcastSignedArgs(path.resolve('.local-transactions/refused-post-death-spend.json')));assert.equal(f.j.steps[f.o.id].hash,HASH);return {exit_code:0,reported_hash:null};}});
 assert.equal(sends,1);assert.equal(persists,2);assert.equal(f.j.steps[f.o.id].cli_diagnostics[0].phase,'rebroadcast-identical');
});
test('rejection retry refuses known tx, RPC outage, changed bytes, nonce, live ash, low gas or expiry',async()=>{
 for(const mutate of [
 f=>f.rpc.tx=async()=>outcome(f.o),f=>f.rpc.tx=async()=>{throw Error('network');},
 f=>f.meta.transaction.nonce++,f=>f.meta.hash='wrong',f=>f.keys.keys[0].access_key.nonce++,
 f=>f.rpc.view=async m=>m==='creature'?{active:true}:'5',f=>f.account.amount='1',
 f=>f.keys.block_height=100000,
 f=>f.j.steps[f.o.id].state='expected-failure',
 ]){const f=rejectionFixture();mutate(f);await assert.rejects(rebroadcastRejection(f.j,f.rpc,f.o.id,{inspect:f.inspect,persist:()=>assert.fail('no mutation'),processRunner:()=>assert.fail('must not send')}));}
 const f=rejectionFixture();await assert.rejects(guardRejectionRecovery(f.j,f.rpc,'funded-child-account-creation',f.inspect),/only/);
});
test('CLI timeout escalates to SIGKILL when SIGTERM is ignored',async()=>{
 const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();const signals=[];
 child.kill=s=>{signals.push(s);if(s==='SIGKILL')setImmediate(()=>child.emit('close',null,s));};
 const result=await cliProcess([],{spawnProcess:()=>child,timeoutMs:5,killGraceMs:5});
 assert.deepEqual(signals,['SIGTERM','SIGKILL']);assert.equal(result.timed_out,true);assert.equal(result.signal,'SIGKILL');
});
test('confirmation retries are bounded and never rebroadcast',async()=>{
 let calls=0,pauses=0;await assert.rejects(finalized({tx:async()=>{calls++;throw Error('unknown');}},HASH,IDS.ash,{pause:async()=>pauses++}),/bounded reads/);
 assert.equal(calls,3);assert.equal(pauses,2);
});
test('CLI nonzero exit with real extinct panic confirms and permits later steps including birth',async()=>{
 const j=journal(),o=op('refused-post-death-spend');const x=outcome(o);x.status={Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'Smart contract panicked: extinct'}}}}};
 let sends=0;const options={persist:()=>{},resolveOperation:async t=>t,assertPost:async()=>{},snapshot:async()=>({}),runCli:async(t,onHash)=>{sends++;onHash(HASH);return {hash:HASH,diagnostic:{exit_code:1}};}};
 await quiet(()=>executeStep(j,{tx:async()=>x},o,work,options));assert.equal(j.steps[o.id].state,'expected-failure');
 const next=op('create-card-job');next.args.requirements_hash=work.source_hash;
 await quiet(()=>executeStep(j,{tx:async()=>outcome(next)},op('create-card-job'),work,{...options,resolveOperation:async()=>next}));
 const birth=op('funded-child-account-creation');await quiet(()=>executeStep(j,{tx:async()=>outcome(birth)},birth,work,options));
 assert.equal(j.steps[birth.id].state,'success');assert.equal(sends,3);
});
test('expected failure requires a contract panic rather than arbitrary extinct text',()=>{
 const o=op('refused-post-death-spend'),x=outcome(o);x.status={Failure:{error:'extinct'}};assert.throws(()=>verifyTransaction(x,o));
 x.status={Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'unextinct'}}}}};assert.throws(()=>verifyTransaction(x,o));
});
test('classifier stores safe cause flags without raw CLI text',()=>{
 const r=classifyCliResult(1,null,false,'RPC Expired InvalidNonce NotEnoughBalance Smart contract panicked: extinct private key: never-store-this');
 for(const flag of ['rpc_error','expired','invalid_nonce','insufficient_balance','contract_panic'])assert.equal(r.flags[flag],true);
 assert.equal(JSON.stringify(r).includes('never-store-this'),false);
});

test('confirmation polls without server-side waiting and requires FINAL',async()=>{
 let calls=0;const o=op('refused-post-death-spend');const result=await finalized({tx:async(h,s,w)=>{assert.equal(w,'NONE');calls++;return {...outcome(o),final_execution_status:calls===1?'EXECUTED_OPTIMISTIC':'FINAL'};}},HASH,IDS.ash,{pause:async()=>{}});
 assert.equal(calls,2);assert.equal(result.final_execution_status,'FINAL');
});

test('gas purchase floor makes the original 30 Tgas unaffordable even at low current price',async()=>{
 const f=rejectionFixture();const p=await f.rpc.request('EXPERIMENTAL_protocol_config');const old={...f.o,gas:30};
 const cost=functionCallCost(old,p,gas);assert.equal(cost.purchase_gas_price,'1000000000');assert.ok(BigInt(cost.total_cost)>BigInt(f.account.amount));
 assert.ok(BigInt(functionCallCost(f.o,p,gas).total_cost)<BigInt(f.account.amount)-182n*10n**19n);
});
test('explicit rejected spend repair archives original and pins same nonce before fresh signing',async()=>{
 const f=rejectionFixture();f.j.steps[f.o.id].op.gas=30;f.meta.transaction.actions[0].FunctionCall.gas=String(30n*10n**12n);
 const order=[];const proof=await prepareRejectedSpendRepair(f.j,f.rpc,{inspect:f.inspect,persist:()=>order.push(f.j.steps[f.o.id].state),move:(a,b)=>{assert.match(b,/rejected-/);order.push('archive');}});
 assert.deepEqual(order,['repair-archiving','archive','preparing']);assert.equal(f.j.rejected_attempts[0].hash,HASH);assert.equal(f.j.steps[f.o.id].recovery.nonce,'42');assert.equal(f.j.steps[f.o.id].op.gas,5);assert.ok(BigInt(proof.old_cost.total_cost)>BigInt(proof.balance));
});
test('repair refuses a potentially affordable original or changed nonce',async()=>{
 for(const change of [f=>f.account.amount=String(NEAR),f=>f.keys.keys[0].access_key.nonce++]){const f=rejectionFixture();f.j.steps[f.o.id].op.gas=30;f.meta.transaction.actions[0].FunctionCall.gas=String(30n*10n**12n);change(f);await assert.rejects(prepareRejectedSpendRepair(f.j,f.rpc,{inspect:f.inspect,persist:()=>assert.fail('no write'),move:()=>assert.fail('no archive')}));}
});
test('rejection recovery preserves exact redacted CLI error and immediately surfaces nonzero exit',async()=>{
 const f=rejectionFixture();const diagnostic=classifyCliResult(1,null,false,'Sender ash does not have enough balance. Required 30000000000000000000000');
 await assert.rejects(rebroadcastRejection(f.j,f.rpc,f.o.id,{inspect:f.inspect,persist:()=>{},processRunner:async()=>diagnostic}),/Exact redacted output/);
 assert.match(f.j.steps[f.o.id].cli_diagnostics[0].output,/Required 30000000000000000000000/);
});
test('diagnostics retain public RPC errors but strip keys and encoded signed blobs',()=>{
 const input='NotEnoughBalance '+ 'ed25519:'+ 'A'.repeat(88)+' '+ 'B'.repeat(300)+' private key: never-store-this';
 const output=redactCliOutput(input);assert.match(output,/NotEnoughBalance/);assert.ok(!output.includes('A'.repeat(88)));assert.ok(!output.includes('B'.repeat(300)));assert.ok(!output.includes('never-store-this'));
});
test('replacement preparation retains pinned nonce and predecessor hash across executeStep',async()=>{
 const f=rejectionFixture();f.j.steps[f.o.id]={id:f.o.id,op:f.o,state:'preparing',recovery:{nonce:'42',public_key:'fixture'},replaces_hash:HASH};
 const x=outcome(f.o);x.status={Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'Smart contract panicked: extinct'}}}}};
 await quiet(()=>executeStep(f.j,{tx:async()=>x},f.o,work,{persist:()=>{},resolveOperation:async()=>f.o,runCli:async(o,onHash,ctx)=>{assert.equal(ctx.recovery.nonce,'42');onHash(HASH);return {hash:HASH};},assertPost:async()=>{},snapshot:async()=>({})}));
 assert.equal(f.j.steps[f.o.id].replaces_hash,HASH);assert.equal(f.j.steps[f.o.id].state,'expected-failure');
});

test('real protocol purchase floor reproduces precise old and replacement upfront costs',()=>{
 const t={...protocol,runtime_config:{...protocol.runtime_config,min_gas_purchase_price:'1000000000',transaction_costs:{pessimistic_gas_price_inflation_ratio:[1,1],action_receipt_creation_config:{send_sir:108059500000,send_not_sir:108059500000,execution:108059500000},action_creation_config:{function_call_cost:{send_sir:200000000000,send_not_sir:200000000000,execution:780000000000},function_call_cost_per_byte:{send_sir:2000000,send_not_sir:47683715,execution:2235934}}}}};
 const o=op('refused-post-death-spend');assert.equal(functionCallCost({...o,gas:30},t,gas).total_cost,'30920322345544000000000');assert.equal(functionCallCost(o,t,gas).total_cost,'5920322345544000000000');
});
test('remaining plan budgeting uses purchase price rather than burn price',()=>{
 const p=estimatePlan(root,{...protocol,runtime_config:{...protocol.runtime_config,min_gas_purchase_price:'1000000000'}},gas,337694);
 assert.ok(BigInt(p.fee_allowance)>BigInt(plan().fee_allowance));
});

test('timeout kills the entire CLI launcher group including native grandchildren',async()=>{
 const child=new EventEmitter();child.pid=12345;child.stdout=new EventEmitter();child.stderr=new EventEmitter();const signals=[];
 const result=await cliProcess([],{spawnProcess:(cmd,args,options)=>{assert.equal(options.detached,true);return child;},timeoutMs:5,killGraceMs:5,killProcess:(pid,s)=>{assert.equal(pid,-12345);signals.push(s);if(s==='SIGKILL')setImmediate(()=>child.emit('close',null,s));}});
 assert.deepEqual(signals,['SIGTERM','SIGKILL']);assert.equal(result.timed_out,true);
});
