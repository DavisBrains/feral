import {readFileSync,writeFileSync,renameSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync,chmodSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decide,localModel,validateDecision} from '../agents/brain.mjs';
import {renderTranscript,build as buildWork,sha} from '../agents/tools.mjs';

export const ROOT='feral-039832.testnet';
export const RPC_URL='https://rpc.testnet.near.org';
export const EXPECTED_WASM='1745c9d85d48f112e0e8d4f358f12c8a62a4f028058e219e8b84a084476b27bb';
export const NEAR=10n**24n;
export const IDS={root:ROOT,controller:`ctrl.${ROOT}`,moss:`moss.${ROOT}`,echo:`echo.${ROOT}`,ash:`ash.${ROOT}`,child:`pip.ctrl.${ROOT}`};
const BASE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const JOURNAL=path.join(BASE,'evidence/testnet-journal.json');
const TXJSON=path.join(BASE,'evidence/testnet-transactions.json');
const MD=path.join(BASE,'evidence/testnet-run.md');
const SIGNED_DIR=path.join(BASE,'.local-transactions');
const INSPECTOR=path.join(BASE,'target/debug/examples/inspect_signed');
const WASM=path.join(BASE,'target/near/feral_controller/feral_controller.wasm');
const INITIAL_HASH='BMudVUSoFqYhvXV7JkAqkyZkAjfGJbS5yTob9hEDohT3';
const EMPTY_CODE='11111111111111111111111111111111';
const POLICIES=['job=bilingual;min_price=90;birth_floor=120','job=bilingual;min_price=80;birth_floor=140','job=translation;min_price=30;birth_floor=180','job=short;min_price=40;birth_floor=120'];
const ALLOWED_METHODS=new Set(['register','create_job','bid_job','set_demand','cancel_job','tick','pay_creature','claim_job','settle_job','set_goal','birth']);
const ALLOWED_RPC=new Set(['query','gas_price','EXPERIMENTAL_protocol_config','tx','block']);
export const near=n=>{n=BigInt(n);const sign=n<0n?'-':'';const s=(n<0n?-n:n).toString().padStart(25,'0');return sign+s.slice(0,-24)+'.'+s.slice(-24).replace(/0+$/,'').padEnd(1,'0');};
let stopRequested=false;
export const base58=bytes=>{const abc='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=BigInt('0x'+Buffer.from(bytes).toString('hex'));let out='';while(n){out=abc[Number(n%58n)]+out;n/=58n;}for(const b of bytes){if(b)break;out='1'+out;}return out||'1';};
export function argsCanonical(x){if(Array.isArray(x))return x.map(argsCanonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,argsCanonical(x[k])]));return x;}
const equal=(a,b)=>JSON.stringify(argsCanonical(a))===JSON.stringify(argsCanonical(b));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export class ReadOnlyRpc{
 constructor(fetcher=fetch){this.fetcher=fetcher;}
 async request(method,params){if(!ALLOWED_RPC.has(method))throw Error('RPC writes are prohibited; signing is exclusively through near-cli');const r=await this.fetcher(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'feral-read-only',method,params}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error){const err=Error('NEAR RPC query failed');err.rpcError=j.error;throw err;}return j.result;}
 async account(id){try{return await this.request('query',{request_type:'view_account',finality:'final',account_id:id});}catch(e){if(JSON.stringify(e.rpcError??'').includes('UNKNOWN_ACCOUNT'))return null;throw e;}}
 async view(method,args={}){const r=await this.request('query',{request_type:'call_function',finality:'final',account_id:IDS.controller,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});return JSON.parse(Buffer.from(r.result).toString());}
 async tx(hash,sender,waitUntil='FINAL'){return this.request('tx',{tx_hash:hash,sender_account_id:sender,wait_until:waitUntil});}
}
export function makeOperations(controllerFunding){
 const create=(id,receiver,amount)=>({id,kind:'create',signer:ROOT,receiver,amount:String(amount)});
 const call=(id,method,args,extra={})=>({id,kind:'call',signer:ROOT,receiver:IDS.controller,method,args,gas:100,deposit:'0',...extra});
 return [
  create('create-controller',IDS.controller,controllerFunding),
  {id:'deploy-controller',kind:'deploy',signer:IDS.controller,receiver:IDS.controller,gas:100,deposit:'0',args:{owner:ROOT}},
  create('create-moss-account',IDS.moss,NEAR/100n),create('create-echo-account',IDS.echo,NEAR/100n),create('create-ash-account',IDS.ash,NEAR/100n),
  call('register-moss','register',{id:IDS.moss,amount:'250',strategy_hash:sha(POLICIES[0])},{deposit:String(NEAR/5n)}),
  call('register-echo','register',{id:IDS.echo,amount:'145',strategy_hash:sha(POLICIES[2])},{deposit:String(NEAR/10n)}),
  call('register-ash','register',{id:IDS.ash,amount:'5',strategy_hash:sha(POLICIES[3])},{deposit:String(NEAR/50n)}),
  call('create-old-job','create_job',{job_id:'short-v0',amount:'40',expiry_turn:3,requirements_hash:sha('short transcript')}),
  call('old-short-bid','bid_job',{actor:IDS.ash,job_id:'short-v0',price:'$LIVE_ASH_PRICE'}),
  call('demand-shock','set_demand',{version:1}),call('cancel-old-job','cancel_job',{job_id:'short-v0'}),
  call('death-tick','tick',{next_turn:1}),
  call('refused-post-death-spend','pay_creature',{actor:IDS.ash,provider:IDS.moss,amount:'1',service_id:'after-death',output_hash:'a'.repeat(64)},{signer:IDS.ash,gas:30,expectedFailure:'extinct'}),
  call('create-card-job','create_job',{job_id:'bilingual-v1',amount:'90',expiry_turn:4,requirements_hash:'$TRANSCRIPT_HASH'}),
  call('paid-collaboration','pay_creature',{actor:IDS.moss,provider:IDS.echo,amount:'30',service_id:'translation-v1',output_hash:'$TRANSLATION_HASH'}),
  call('parent-bid','bid_job',{actor:IDS.moss,job_id:'bilingual-v1',price:'$LIVE_PARENT_PRICE'}),
  call('claim-card-job','claim_job',{actor:IDS.moss,job_id:'bilingual-v1'}),
  call('paid-job','settle_job',{job_id:'bilingual-v1',output_hash:'$CARD_HASH'}),
  call('lineage-goal','set_goal',{actor:IDS.moss,goal:2}),
  call('funded-child-account-creation','birth',{parent:IDS.moss,child:IDS.child,nonce:1,native:String(NEAR*6n/100n),strategy_hash:sha(POLICIES[1]),mutation:1},{gas:150}),
  call('second-upkeep','tick',{next_turn:2}),
  call('create-child-job','create_job',{job_id:'child-first',amount:'90',expiry_turn:4,requirements_hash:'$TRANSCRIPT_HASH'}),
  call('child-first-bid','bid_job',{actor:IDS.child,job_id:'child-first',price:'$LIVE_CHILD_PRICE'})
 ];
}
export function estimatePlan(rootAccount,protocol,gasInfo,wasmBytes,completed=new Set()){
 if(!rootAccount)throw Error('Approved throwaway account does not exist');
 const perByte=BigInt(protocol.runtime_config.storage_amount_per_byte);if(perByte<=0n||protocol.protocol_version<85)throw Error('Unsupported protocol or storage price');
 const storageForCode=(BigInt(wasmBytes)+200n)*perByte;
 const stateAllowance=25_000n*perByte;
 const operatingMargin=15n*NEAR/100n;
 const round=NEAR/10n;
 const controllerFunding=((storageForCode+stateAllowance+operatingMargin+round-1n)/round)*round;
 const operations=makeOperations(controllerFunding);
 const remaining=operations.filter(o=>!completed.has(o.id));
 const transfers=remaining.reduce((sum,o)=>sum+BigInt(o.amount??o.deposit??0),0n);
 // Conservative allowance, not a quote. Three times today's maximum attached gas
 // plus creation and deploy bandwidth allowance. All attached child funding is
 // already in the parent's 0.20 reserve and is NOT counted a second time.
 const gas=remaining.reduce((sum,o)=>sum+BigInt(o.gas??100)*10n**12n,0n);
 const projectedGas=gas*BigInt(gasInfo.gas_price)*3n+13n*NEAR/100n;
 const feeAllowance=remaining.length?(projectedGas>NEAR?projectedGas:NEAR):0n;
 const rootStorage=BigInt(rootAccount.storage_usage)*perByte;
 const balance=BigInt(rootAccount.amount);const retainedMargin=NEAR;
 const maxOutlay=transfers+feeAllowance;
 const affordable=balance>=maxOutlay+rootStorage+retainedMargin;
 return {root:ROOT,network:'testnet',protocol_version:protocol.protocol_version,wasm_bytes:wasmBytes,storage_price:perByte.toString(),gas_price:gasInfo.gas_price,root_balance:balance.toString(),root_storage_backing:rootStorage.toString(),controller_code_storage_estimate:storageForCode.toString(),controller_state_allowance:stateAllowance.toString(),controller_funding:controllerFunding.toString(),remaining_transfers:transfers.toString(),fee_allowance:feeAllowance.toString(),max_outlay_estimate:maxOutlay.toString(),remaining_root_estimate:(balance-maxOutlay).toString(),retained_margin:retainedMargin.toString(),affordable,operations};
}
export function cliArgs(op){
 const tail=['network-config','testnet','sign-with-legacy-keychain','send'];
 if(![ROOT,IDS.controller,IDS.ash].includes(op.signer))throw Error('Signer outside throwaway scope');
 if(op.kind==='create'){
  if(![IDS.controller,IDS.moss,IDS.echo,IDS.ash].includes(op.receiver)||op.signer!==ROOT)throw Error('Create scope');
  return ['account','create-account','fund-myself',op.receiver,`${op.amount} yoctonear`,'autogenerate-new-keypair','save-to-legacy-keychain','sign-as',ROOT,...tail];
 }
 if(op.kind==='deploy'&&(op.signer!==IDS.controller||op.receiver!==IDS.controller||op.gas!==100||op.deposit!=='0'||!equal(op.args,{owner:ROOT})))throw Error('Deploy scope');
 if(op.kind==='deploy')return ['contract','deploy',IDS.controller,'use-file',WASM,'with-init-call','new','json-args',JSON.stringify({owner:ROOT}),'prepaid-gas','100 Tgas','attached-deposit','0 NEAR',...tail];
 if(op.kind!=='call'||op.receiver!==IDS.controller||!ALLOWED_METHODS.has(op.method))throw Error('Call outside approved loop');
 if(JSON.stringify(op.args).includes('$'))throw Error('Unresolved live argument');
 return ['contract','call-function','as-transaction',IDS.controller,op.method,'json-args',JSON.stringify(op.args),'prepaid-gas',`${op.gas} Tgas`,'attached-deposit',`${op.deposit} yoctonear`,'sign-as',op.signer,...tail];
}
export function extractTxHash(text){
 const clean=text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
 for(const re of [/https:\/\/(?:explorer\.testnet\.near\.org\/transactions|testnet\.nearblocks\.io\/txns)\/([1-9A-HJ-NP-Za-km-z]{43,44})\b/g,/(?:Transaction\s+(?:ID|hash)|Transaction\s*:)\s*:?\s*([1-9A-HJ-NP-Za-km-z]{43,44})\b/gi]){const m=[...clean.matchAll(re)];if(m.length)return m.at(-1)[1];}
 return null;
}
export function verifyActions(t,op){if(!t||t.signer_id!==op.signer||t.receiver_id!==op.receiver)throw Error('Transaction does not match signer and receiver');
 if(op.kind==='create'){
  if(t.actions.length!==3||!t.actions.some(x=>x==='CreateAccount'||(x&&typeof x==='object'&&'CreateAccount'in x))||!t.actions.some(x=>x?.Transfer?.deposit===op.amount)||!t.actions.some(x=>x?.AddKey?.access_key?.permission==='FullAccess'))throw Error('Creation action mismatch');
 }else if(op.kind==='deploy'){
  if(t.actions.length!==2||!t.actions.some(x=>x&&typeof x==='object'&&'DeployContract'in x))throw Error('Deployment action missing');
  const init=t.actions.find(x=>x.FunctionCall?.method_name==='new')?.FunctionCall;if(!init||init.deposit!=='0'||BigInt(init.gas)!==100n*10n**12n||!equal(JSON.parse(Buffer.from(init.args,'base64')), {owner:ROOT}))throw Error('Initialization mismatch');
 }else{
  if(t.actions.length!==1)throw Error('Unexpected extra actions');const f=t.actions[0].FunctionCall;
  if(!f||f.method_name!==op.method||f.deposit!==op.deposit||BigInt(f.gas)!==BigInt(op.gas)*10n**12n||!equal(JSON.parse(Buffer.from(f.args,'base64')),op.args))throw Error('Function call mismatch');
 }
}
export function verifyTransaction(outcome,op){
 verifyActions(outcome.transaction,op);
 const failed=outcome.status?.Failure;
 if(op.expectedFailure){const panic=failed?.ActionError?.kind?.FunctionCallError?.ExecutionError;if(typeof panic!=='string'||!new RegExp(`(?:^|\\b)${op.expectedFailure}(?:$|\\b)`).test(panic))throw Error('Expected extinct rejection was not observed');return 'expected-failure';}
 if(failed)throw Error('Transaction failed; inspect recorded explorer link before any retry');
 if(!('SuccessValue'in(outcome.status??{})))throw Error('Transaction final outcome unknown');return 'success';
}
const atomic=(filename,value)=>{mkdirSync(path.dirname(filename),{recursive:true});const tmp=filename+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});renameSync(tmp,filename);};
export function resumePolicy(entry){if(!entry)return 'new';if(entry.state==='preparing'&&!entry.hash)return 'prepare-again';if(['success','expected-failure'].includes(entry.state))return 'verify';if(entry.hash)return 'recover-hash';throw Error('Unresolved submission without a hash. Do not resend. Supply --resolve-hash label=hash after identifying the transaction, or review an unsent intent manually.');}
function writeEvidence(j){
 atomic(JOURNAL,j);const rows=Object.values(j.steps).filter(s=>s.hash).map(s=>({label:s.id,hash:s.hash,explorer:`https://testnet.nearblocks.io/txns/${s.hash}`,state:s.state,signer:s.op.signer,receiver:s.op.receiver,receipt_ids:s.receipt_ids??[],failure_expected:!!s.op.expectedFailure,prepared:s.prepared,cli_diagnostics:s.cli_diagnostics??[]}));
 atomic(TXJSON,{network:'testnet',root:ROOT,controller:IDS.controller,faucet_creation:{hash:INITIAL_HASH,explorer:`https://testnet.nearblocks.io/txns/${INITIAL_HASH}`,source:'parent supplied existing creation'},transactions:rows,decisions:j.decisions,events:j.events,complete:j.complete??false});
 const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
 let md=`# Feral public testnet evidence\n\nThrowaway root ${ROOT}\n\nController ${IDS.controller}\n\nThe parent created the root with the official faucet before this script. Its supplied creation transaction is https://testnet.nearblocks.io/txns/${INITIAL_HASH}\n\nNo MPC, Sepolia, GitHub or posting action is part of this runner.\n\n| Step | Transaction | State |\n| --- | --- | --- |\n`;
 md+=rows.map(x=>`| ${esc(x.label)} | [${x.hash}](${x.explorer}) | ${x.state} |`).join('\n');
 md+=`\n\nRun complete ${Boolean(j.complete)}\n\nChild account https://testnet.nearblocks.io/address/${IDS.child}\n\nBirth is a root transaction with an asynchronous child creation receipt. Both identifiers are recorded in JSON when available. Native funding and MUNCH remain separate.\n`;
 if(j.last_error)md+='\nStopped safely '+esc(j.last_error)+'\n';writeFileSync(MD,md);
}
export async function finalized(rpc,hash,sender,{attempts=3,pause=wait}={}){
 // Each public RPC request is capped at 30 seconds. Never multiply that by 30.
 for(let n=0;n<attempts;n++){try{const result=await rpc.tx(hash,sender,'NONE');if(result.final_execution_status!=='FINAL')throw Error('Transaction not final yet');return result;}catch(e){
  if(n===attempts-1)throw Error('Could not confirm transaction finality after bounded reads. Hash retained; no automatic resend.');
  await pause(2000);
 }}
}
export function saveSignedArgs(op,filename,recovery){
 const args=cliArgs(op);args.pop();
 if(recovery)args.push('--signer-public-key',recovery.public_key,'--nonce',String(recovery.nonce));
 return [...args,'save-to-file',filename];
}
export const broadcastSignedArgs=filename=>['transaction','send-signed-transaction','file-with-base64-signed-transaction',filename,'network-config','testnet','send'];
export function classifyCliResult(code,signal,timedOut,text){
 return {exit_code:code,signal:signal??null,timed_out:timedOut,output_bytes:Buffer.byteLength(text),flags:{timeout:/timed?\s*out|timeout/i.test(text),rate_limited:/429|too many requests/i.test(text),connection:/connection|connect error|dns|resolve host/i.test(text),invalid_nonce:/InvalidNonce|invalid nonce/i.test(text),expired:/Expired|expired transaction/i.test(text),insufficient_balance:/NotEnoughBalance|insufficient balance|not enough balance/i.test(text),contract_panic:/Smart contract panicked|FunctionCallError|ExecutionError/i.test(text),rpc_error:/RPC|JSON.RPC|TransportError|Server error/i.test(text)},reported_hash:extractTxHash(text)};
}
export async function cliProcess(args,{spawnProcess=spawn,timeoutMs=90000,killGraceMs=2000}={}){
 return new Promise((resolve,reject)=>{
  const child=spawnProcess('near',args,{cwd:BASE,stdio:['ignore','pipe','pipe'],env:{...process.env,NO_COLOR:'1'}});let buffer='',timedOut=false;
  const capture=data=>{buffer=(buffer+data.toString()).slice(-256000);};child.stdout.on('data',capture);child.stderr.on('data',capture);
  let force;const terminate=()=>{child.kill('SIGTERM');force??=setTimeout(()=>child.kill('SIGKILL'),killGraceMs);};
  const timeout=setTimeout(()=>{timedOut=true;terminate();},timeoutMs);
  const stop=()=>{stopRequested=true;terminate();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
  const cleanup=()=>{clearTimeout(timeout);clearTimeout(force);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);};
  child.once('error',()=>{cleanup();reject(Error('near-cli could not start'));});
  child.once('close',(code,signal)=>{cleanup();const result=classifyCliResult(code,signal,timedOut,buffer);buffer='';resolve(result);});
 });
}
export function inspectSigned(filename){
 const r=spawnSync(INSPECTOR,[filename],{encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000});
 if(r.status!==0)throw Error('Offline signed transaction inspection failed; no raw blob or diagnostic is exposed');
 return JSON.parse(r.stdout);
}
export async function guardRejectionRecovery(j,rpc,id,inspect=inspectSigned){
 if(id!=='refused-post-death-spend')throw Error('Recovery exception is only for the extinct rejection');
 const entry=j?.steps?.[id];if(!entry?.hash||!entry.prepared||['success','expected-failure'].includes(entry.state))throw Error('Missing unresolved prepared rejection');
 const template=makeOperations(0n).find(x=>x.id===id);assertOperationTemplate(template,entry.op,{},j);
 // A known outcome must go through ordinary verification, never rebroadcast.
 try{await rpc.tx(entry.hash,IDS.ash,'NONE');throw Error('Transaction is known. Resume normally without the retry option.');}
 catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_TRANSACTION')throw e;}
 const meta=inspect(path.join(SIGNED_DIR,id+'.json'));verifyActions(meta.transaction,entry.op);
 if(meta.hash!==entry.hash||meta.transaction.hash!==entry.hash||String(meta.transaction.nonce)!==entry.prepared.nonce||meta.transaction.public_key!==entry.prepared.public_key||meta.block_hash!==entry.prepared.block_hash)throw Error('Saved signed transaction changed; no retry');
 const [keys,ash,balance,account,protocol,gas,block]=await Promise.all([
  rpc.request('query',{request_type:'view_access_key_list',finality:'final',account_id:IDS.ash}),
  rpc.view('creature',{id:IDS.ash}),rpc.view('ft_balance_of',{account_id:IDS.ash}),rpc.account(IDS.ash),
  rpc.request('EXPERIMENTAL_protocol_config',{finality:'final'}),rpc.request('gas_price',[null]),rpc.request('block',{block_id:entry.prepared.block_hash})]);
 if(!Number.isSafeInteger(block.header?.height)||!Number.isSafeInteger(keys.block_height)||!Number.isSafeInteger(protocol.transaction_validity_period)||keys.block_height-block.header.height>=protocol.transaction_validity_period)throw Error('Signed transaction expired or validity unknown; no retry');
 const key=keys.keys.find(k=>k.public_key===entry.prepared.public_key);
 if(!key||key.access_key.permission!=='FullAccess'||BigInt(key.access_key.nonce)+1n!==BigInt(entry.prepared.nonce))throw Error('Ash nonce changed; locate transaction before retry');
 if(ash?.active!==false||balance!=='5')throw Error('Death lock or frozen balance mismatch');
 const spendable=BigInt(account.amount)-BigInt(account.storage_usage)*BigInt(protocol.runtime_config.storage_amount_per_byte);
 if(spendable<BigInt(entry.op.gas)*10n**12n*BigInt(gas.gas_price)*2n)throw Error('Ash lacks conservative gas balance');
 return entry;
}
export async function rebroadcastRejection(j,rpc,id,{inspect=inspectSigned,processRunner=cliProcess,persist=writeEvidence}={}){
 const entry=await guardRejectionRecovery(j,rpc,id,inspect);
 // Send the SAME bytes, hash and nonce. Never prepare a replacement or erase a step.
 entry.state='broadcasting';persist(j);
 const result=await processRunner(broadcastSignedArgs(path.join(SIGNED_DIR,id+'.json')));
 (entry.cli_diagnostics??=[]).push({phase:'rebroadcast-identical',...result});persist(j);
 if(result.reported_hash&&result.reported_hash!==entry.hash)throw Error('CLI reported a different transaction hash');
}
export async function runCli(op,onHash,context={}){
 const dir=context.directory??SIGNED_DIR;mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
 const filename=path.join(dir,op.id+'.json');const run=context.processRunner??cliProcess;
 if(!(context.fileExists??existsSync)(filename)){
  const prepare=await run(saveSignedArgs(op,filename,context.recovery));context.recordDiagnostic?.('prepare',prepare);
  if(prepare.exit_code!==0)throw Error('near-cli prepare failed or timed out. No broadcast was attempted; retry after inspecting the recorded phase diagnostics.');
 }
 const meta=(context.inspect??inspectSigned)(filename);verifyActions(meta.transaction,op);
 if(!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(meta.hash)||meta.hash!==meta.transaction.hash)throw Error('Invalid canonical transaction hash');
 if(!Number.isSafeInteger(meta.transaction.nonce))throw Error('Unsafe transaction nonce');
 if(context.recovery&&(String(meta.transaction.nonce)!==String(context.recovery.nonce)||meta.transaction.public_key!==context.recovery.public_key))throw Error('Recovery must use the exact pinned competing nonce and key');
 const prepared={nonce:String(meta.transaction.nonce),public_key:meta.transaction.public_key,block_hash:meta.block_hash};
 onHash(meta.hash,prepared); // DURABLE BEFORE ANY BROADCAST, independent of terminal output.
 if(stopRequested)throw Error('Stopped after preparation without broadcasting');
 context.onBroadcastStarted?.();
 const result=await run(broadcastSignedArgs(filename));context.recordDiagnostic?.('broadcast',result);
 if(result.reported_hash&&result.reported_hash!==meta.hash)throw Error('CLI reported a different transaction hash; inspect before continuing');
 return {hash:meta.hash,diagnostic:result};
}

async function assertPost(rpc,op,work){
 if(op.kind==='create'){if(!await rpc.account(op.receiver))throw Error('Created account not visible');return;}
 if(op.kind==='deploy'){const a=await rpc.account(IDS.controller);if(a.code_hash!==base58(Buffer.from(EXPECTED_WASM,'hex')))throw Error('Deployed WASM hash mismatch');await rpc.view('economy');return;}
 const a=op.args;
 if(op.method==='register'){const c=await rpc.view('creature',{id:a.id});if(!c||c.strategy_hash!==a.strategy_hash)throw Error('Registration mismatch');const nft=await rpc.view('nft_token',{token_id:a.id});if(nft.owner_id!==ROOT)throw Error('Life NFT owner mismatch');}
 if(op.method==='bid_job'&&(await rpc.view('bid',{actor:a.actor,job_id:a.job_id}))!==a.price)throw Error('Bid mismatch');
 if(op.method==='tick'&&(await rpc.view('economy')).turn<a.next_turn)throw Error('Tick not observed');
 if(op.method==='create_job'){const job=await rpc.view('job',{job_id:a.job_id});if(!job||job.requirements_hash!==a.requirements_hash||job.amount!==a.amount)throw Error('Job mismatch');}
 if(op.method==='settle_job'){const job=await rpc.view('job',{job_id:a.job_id});if(!job.paid||job.output_hash!==a.output_hash)throw Error('Job not paid');}
 if(op.method==='set_goal'&&(await rpc.view('goal',{actor:a.actor}))!==a.goal)throw Error('NFT goal mismatch');
 if(op.method==='birth'){
  const b=await rpc.view('birth_status',{child:IDS.child});if(b?.state!=='complete')throw Error('Birth not complete. Inspect account and pending reservation; never auto-refund or retry.');
  const child=await rpc.account(IDS.child);if(!child||BigInt(child.amount)<6n*NEAR/100n)throw Error('Child native funding mismatch');
  const c=await rpc.view('creature',{id:IDS.child});if(c.parent!==IDS.moss||c.strategy_hash!==sha(POLICIES[1]))throw Error('Child lineage mismatch');
  const nft=await rpc.view('nft_token',{token_id:IDS.child});if(nft.owner_id!==ROOT)throw Error('Child life NFT mismatch');
 }
 if(op.expectedFailure){const c=await rpc.view('creature',{id:IDS.ash});if(c.active||(await rpc.view('ft_balance_of',{account_id:IDS.ash}))!=='5')throw Error('Death lock or frozen balance mismatch');}
}
async function snapshot(rpc){const economy=await rpc.view('economy');const creatures=[];let sum=BigInt(await rpc.view('ft_balance_of',{account_id:IDS.controller}));for(const id of [IDS.moss,IDS.echo,IDS.ash,IDS.child]){const c=await rpc.view('creature',{id});if(c){const balance=await rpc.view('ft_balance_of',{account_id:id});sum+=BigInt(balance);creatures.push({id,balance,creature:c});}}if(sum!==BigInt(economy.supply)||sum+BigInt(economy.burned)!==1000n)throw Error('MUNCH conservation mismatch');return {economy,creatures};}
export async function publicPlan(rpc,wasmBytes,completed=new Set()){
 const [account,protocol,gas]=await Promise.all([rpc.account(ROOT),rpc.request('EXPERIMENTAL_protocol_config',{finality:'final'}),rpc.request('gas_price',[null])]);return estimatePlan(account,protocol,gas,wasmBytes,completed);
}
function loadInput(){const input=path.resolve(process.env.FERAL_TRANSCRIPT??path.join(BASE,'agents/inputs/demo-transcript.json'));const transcript=JSON.parse(readFileSync(input));const result=renderTranscript(transcript);return {input,source_hash:sha(result.source),output_hash:sha(result.svg),translation_hash:sha(result.translation)};}
export function checkedLiveDecision(result,observation,expected){
 const d=validateDecision(result.decision,observation);
 if(result.mode!=='local-model'||result.model!=='Qwen/Qwen2.5-1.5B-Instruct')throw Error('Expected live Qwen model decision; no fallback action will be submitted');
 if(d.action!==expected)throw Error(`Live model chose ${d.action}; expected ${expected}. Stopped honestly, not overridden.`);
 return d;
}
async function decision(j,rpc,key,actor,jobs,has_translation,can_reproduce,expected){
 if(j.decisions[key]){const d=j.decisions[key];return checkedLiveDecision(d.result,d.observation,expected);}
 const [c,balance,goal]=await Promise.all([rpc.view('creature',{id:actor}),rpc.view('ft_balance_of',{account_id:actor}),rpc.view('goal',{actor})]);
 const obs={actor,policy:c.mutation,goal,active:c.active,balance:Number(balance),jobs,needs_translation:true,has_translation,provider_active:true,can_reproduce};
 const result=await decide(obs,localModel);j.decisions[key]={observation:obs,result};writeEvidence(j);
 return checkedLiveDecision(result,obs,expected);
}
async function resolveOperation(template,j,rpc,work){
 const op=structuredClone(template);
 const assign=(key,value)=>{for(const k of Object.keys(op.args??{}))if(op.args[k]===key)op.args[k]=value;};
 assign('$TRANSCRIPT_HASH',work.source_hash);assign('$TRANSLATION_HASH',work.translation_hash);assign('$CARD_HASH',work.output_hash);
 if(op.id==='old-short-bid'){const d=await decision(j,rpc,'old-demand',IDS.ash,[{kind:'short',reward:40}],true,false,'bid');assign('$LIVE_ASH_PRICE',String(d.price));}
 if(op.id==='refused-post-death-spend')await decision(j,rpc,'extinct',IDS.ash,[{kind:'bilingual',reward:90}],false,false,'wait');
 if(op.id==='paid-collaboration'){
  await decision(j,rpc,'buy-help',IDS.moss,[{kind:'bilingual',reward:90}],false,false,'collaborate');await decision(j,rpc,'provider-quote',IDS.echo,[{kind:'translation',reward:30}],true,false,'bid');
  const manifest=buildWork(work.input,path.join(BASE,'evidence/testnet-work'));if(manifest.source_sha256!==work.source_hash||manifest.output_sha256!==work.output_hash||manifest.translation_sha256!==work.translation_hash)throw Error('Transcript changed during run');
 }
 if(op.id==='parent-bid'){const d=await decision(j,rpc,'parent-bid',IDS.moss,[{kind:'bilingual',reward:90}],true,false,'bid');assign('$LIVE_PARENT_PRICE',String(d.price));}
 if(op.method==='birth')await decision(j,rpc,'reproduce',IDS.moss,[],true,true,'reproduce');
 if(op.id==='child-first-bid'){const d=await decision(j,rpc,'child-bid',IDS.child,[{kind:'bilingual',reward:90}],true,false,'bid');assign('$LIVE_CHILD_PRICE',String(d.price));}
 return op;
}

export function assertOperationTemplate(template,op,work,j){
 const expected=structuredClone(template);
 const replacements={'$TRANSCRIPT_HASH':work.source_hash,'$TRANSLATION_HASH':work.translation_hash,'$CARD_HASH':work.output_hash};
 for(const [placeholder,key] of [['$LIVE_ASH_PRICE','old-demand'],['$LIVE_PARENT_PRICE','parent-bid'],['$LIVE_CHILD_PRICE','child-bid']]){
  if(Object.values(expected.args??{}).includes(placeholder)){
   const d=j.decisions[key];if(!d||d.result.mode!=='local-model')throw Error('Missing live decision for resumed operation');
   checkedLiveDecision(d.result,d.observation,'bid');
   replacements[placeholder]=String(d.result.decision.price);
  }
 }
 for(const k of Object.keys(expected.args??{}))if(expected.args[k] in replacements)expected.args[k]=replacements[expected.args[k]];
 if(!equal(expected,op))throw Error('Recorded operation differs from the fixed approved plan');
}

export async function executeStep(j,rpc,template,work,options={}){
 const persist=options.persist??writeEvidence;
 let entry=j.steps[template.id];const action=resumePolicy(entry);
 if(action==='new'||action==='prepare-again'){
  const op=await (options.resolveOperation??resolveOperation)(template,j,rpc,work);
  assertOperationTemplate(template,op,work,j);
  entry={id:op.id,op,state:'preparing',started_at:new Date().toISOString(),...(j.tick_recovery&&op.id==='death-tick'?{recovery:j.tick_recovery}:{})};j.steps[op.id]=entry;persist(j);
  const cli=options.runCli??runCli;const result=await cli(op,(hash,prepared)=>{if(entry.hash&&entry.hash!==hash){entry.conflicting_hash=hash;persist(j);return;}entry.hash=hash;entry.prepared=prepared;entry.state='prepared';persist(j);},{recovery:entry.recovery,recordDiagnostic:(phase,result)=>{(entry.cli_diagnostics??=[]).push({phase,...result});persist(j);},onBroadcastStarted:()=>{entry.state='broadcasting';persist(j);}});
  if(!entry.hash&&result.hash){entry.hash=result.hash;persist(j);}
  if(entry.conflicting_hash)throw Error('Multiple transaction hashes captured. Review both; no automatic continuation.');
  if(!entry.hash)throw Error(`Submission ${op.id} has no captured hash. It is deliberately NOT retried. Use --resolve-hash after review.`);
 }
 assertOperationTemplate(template,entry.op,work,j);
 entry.state='confirming';persist(j);
 const result=await finalized(rpc,entry.hash,entry.op.signer);
 entry.receipt_ids=result.receipts_outcome?.map(x=>({id:x.id,executor:x.outcome.executor_id,status:x.outcome.status}))??[];
 try{entry.state=verifyTransaction(result,entry.op);persist(j);await (options.assertPost??assertPost)(rpc,entry.op,work);}catch(e){entry.state='stopped-review';entry.error=String(e.message);persist(j);throw e;}
 // No duplicated local snapshots on restart.
 if(!j.events.some(e=>e.step===entry.id)){j.events.push({step:entry.id,transaction:entry.hash,explorer:`https://testnet.nearblocks.io/txns/${entry.hash}`,state:entry.state,...(entry.op.kind==='create'?{}:{snapshot:await (options.snapshot??snapshot)(rpc)})});persist(j);}
 console.log(`${entry.id} ${entry.state} https://testnet.nearblocks.io/txns/${entry.hash}`);
}
function parseArgs(args){let mode='dry-run',stopAfter=null,retryTick=null,retryRejection=null;const resolutions=[];for(let i=0;i<args.length;i++){const a=args[i];if(a==='--execute')mode='execute';else if(a==='--dry-run')mode='dry-run';else if(a==='--account'){if(args[++i]!==ROOT)throw Error('Only the approved throwaway root is allowed');}else if(a==='--stop-after')stopAfter=args[++i];else if(a==='--retry-unconfirmed-rejection')retryRejection=args[++i];else if(a==='--retry-unconfirmed-tick')retryTick=args[++i];else if(a==='--resolve-hash')resolutions.push(args[++i]);else if(a==='--help')return {help:true};else throw Error('Unknown option '+a);}if(args.includes('--execute')&&args.includes('--dry-run'))throw Error('Choose dry-run or execute, not both');return {mode,stopAfter,resolutions,retryTick,retryRejection};}
export async function guardTickRecovery(j,rpc,id){
 if(id!=='death-tick')throw Error('Recovery exception is only for the monotonic death-tick');
 const entry=j?.steps?.[id];if(!entry||entry.hash||entry.state!=='submitting')throw Error('Only the legacy hashless tick intent can be recovered this way');
 const template=makeOperations(0n).find(x=>x.id===id);assertOperationTemplate(template,entry.op,{},j);
 const previous=j.steps['cancel-old-job'];if(previous?.state!=='success'||!previous.hash)throw Error('Missing verified predecessor');
 const outcome=await rpc.tx(previous.hash,ROOT);verifyTransaction(outcome,previous.op);
 const t=outcome.transaction;if(!Number.isSafeInteger(t.nonce))throw Error('Unsafe predecessor nonce');
 const [keys,economy,ash]=await Promise.all([rpc.request('query',{request_type:'view_access_key_list',finality:'final',account_id:ROOT}),rpc.view('economy'),rpc.view('creature',{id:IDS.ash})]);
 if(keys.keys.length!==1||keys.keys[0].public_key!==t.public_key||String(keys.keys[0].access_key.nonce)!==String(t.nonce))throw Error('Signer nonce changed. Locate the missing transaction; do not retry.');
 if(economy.turn!==0||!ash?.active||economy.burned!=='0')throw Error('Tick may already have landed. Locate and resolve its hash; do not retry.');
 return {public_key:t.public_key,base_nonce:String(t.nonce),nonce:String(BigInt(t.nonce)+1n),previous_hash:previous.hash,reason:'No finalized tick; unchanged signer nonce and turn zero. Exact competing nonce plus tick(1) guard prevents double upkeep.',observed_at_wat:new Date().toLocaleString('sv-SE',{timeZone:'Africa/Lagos'})+' WAT'};
}

export function acquireRunLock(filename){
 mkdirSync(path.dirname(filename),{recursive:true});let fd;
 try{fd=openSync(filename,'wx',0o600);}catch{throw Error('Execute lock exists. Check the recorded PID; never remove a live runner lock.');}
 writeFileSync(fd,JSON.stringify({pid:process.pid,root:ROOT})+'\n');
 return ()=>{closeSync(fd);unlinkSync(filename);};
}
export async function main(argv=process.argv.slice(2)){
 const options=parseArgs(argv);if(options.help){console.log('testnet-run.sh [--dry-run | --execute] [--account feral-039832.testnet] [--stop-after STEP] [--resolve-hash STEP=HASH] [--retry-unconfirmed-tick death-tick] [--retry-unconfirmed-rejection refused-post-death-spend]');return;}
 if(options.mode==='dry-run')return mainWithOptions(options);
 const release=acquireRunLock(path.join(BASE,'evidence/testnet-run.lock'));
 try{return await mainWithOptions(options);}finally{release();}
}
async function mainWithOptions(options){
 const wasm=readFileSync(WASM);if(sha(wasm)!==EXPECTED_WASM)throw Error('WASM differs from the tested normal artifact. Never deploy the fault artifact. Rebuild and review first.');
 const work=loadInput();const rpc=new ReadOnlyRpc();let j=existsSync(JOURNAL)?JSON.parse(readFileSync(JOURNAL)):null;
 if(j&&(j.root!==ROOT||j.wasm_sha256!==EXPECTED_WASM||j.transcript_hash!==work.source_hash))throw Error('Journal identity, WASM or transcript mismatch');
 const completed=new Set(j?Object.values(j.steps).filter(s=>['success','expected-failure'].includes(s.state)).map(s=>s.id):[]);
 const plan=await publicPlan(rpc,wasm.length,completed);
 if(options.retryRejection&&options.retryRejection!=='refused-post-death-spend')throw Error('Only the extinct rejection supports identical retry');
 if(options.stopAfter&&!plan.operations.some(o=>o.id===options.stopAfter))throw Error('Unknown stop-after step');
 if(options.mode==='dry-run'&&(options.resolutions.length||options.retryRejection))throw Error('Hash resolution requires execute mode; dry-run never changes the journal');
 if(options.mode==='dry-run'){
  // This branch NEVER starts near-cli, opens credentials, signs or broadcasts.
  atomic(path.join(BASE,'evidence/testnet-plan.json'),plan);
  console.log('DRY RUN ONLY. Public RPC views; no credential access, signing or sending.');
  console.log(`Account ${ROOT}\nBalance ${near(plan.root_balance)} NEAR\nController funding ${near(plan.controller_funding)} NEAR\nRemaining transfers ${near(plan.remaining_transfers)} NEAR\nConservative fee allowance ${near(plan.fee_allowance)} NEAR\nMaximum outlay estimate ${near(plan.max_outlay_estimate)} NEAR\nRoot remaining estimate ${near(plan.remaining_root_estimate)} NEAR\nRequired retained margin ${near(plan.retained_margin)} NEAR\nAffordable ${plan.affordable}`);
  for(const o of plan.operations)console.log(`${completed.has(o.id)?'DONE':'PLAN'} ${o.id} signer=${o.signer} receiver=${o.receiver} ${o.kind==='call'?o.method+' '+JSON.stringify(o.args):o.kind} attached=${near(o.amount??o.deposit??0)} NEAR`);
  if(options.retryTick)console.log('READ ONLY tick recovery check '+JSON.stringify(await guardTickRecovery(j,rpc,options.retryTick)));
  return plan;
 }
 if(!existsSync(INSPECTOR))throw Error('Build offline inspector first with cargo build -p feral-integration --example inspect_signed');
 if(!plan.affordable)throw Error('Insufficient funds for the remaining plan and retained margin; no transaction sent.');
 const health=await fetch('http://127.0.0.1:11435/health',{signal:AbortSignal.timeout(10000)}).then(r=>r.json());if(health.model!=='Qwen/Qwen2.5-1.5B-Instruct'||!health.ready)throw Error('Expected live local model is not ready');
 if(!j){
  for(const id of [IDS.controller,IDS.moss,IDS.echo,IDS.ash,IDS.child])if(await rpc.account(id))throw Error('Run namespace already exists without a journal. Do not overwrite or adopt it blindly.');
  j={version:1,root:ROOT,controller:IDS.controller,wasm_sha256:EXPECTED_WASM,transcript_hash:work.source_hash,plan,steps:{},decisions:{},events:[],complete:false};writeEvidence(j);
 }
 if(options.retryTick){const recovery=await guardTickRecovery(j,rpc,options.retryTick);(j.recovered_intents??=[]).push(j.steps['death-tick']);delete j.steps['death-tick'];j.tick_recovery=recovery;writeEvidence(j);}
 for(const item of options.resolutions){const at=item.indexOf('=');const id=item.slice(0,at),hash=item.slice(at+1);if(at<1||!j.steps[id]||!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(hash))throw Error('Invalid hash resolution');if(j.steps[id].hash&&j.steps[id].hash!==hash)throw Error('Cannot replace an already captured hash');j.steps[id].hash=hash;writeEvidence(j);}
 try{
  for(const template of plan.operations){if(stopRequested){console.log('Stopped safely after signal; no further submission');return;}if(options.retryRejection===template.id){await rebroadcastRejection(j,rpc,options.retryRejection);options.retryRejection=null;}await executeStep(j,rpc,template,work);if(stopRequested||template.id===options.stopAfter){console.log('Stopped at requested durable checkpoint');return;}}
  const final=await snapshot(rpc);const balances=final.creatures.map(c=>BigInt(c.balance));if(!equal(balances.map(String),['190','155','5','90'])||final.economy.supply!=='950'||final.economy.burned!=='50'||final.creatures[2].creature.active)throw Error('Final fixture invariants differ. Evidence retained for review.');
  if((await rpc.view('bid',{actor:IDS.child,job_id:'child-first'}))!=='80')throw Error('Child first bid mismatch');
  j.complete=true;j.final=final;delete j.last_error;writeEvidence(j);console.log('Feral public NEAR testnet gate completed. Evidence is in evidence/testnet-run.md and testnet-transactions.json.');
 }catch(e){j.last_error=String(e.message);writeEvidence(j);throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('STOPPED SAFELY '+e.message);process.exitCode=1;});
