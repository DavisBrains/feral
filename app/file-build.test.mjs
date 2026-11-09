import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {makeTestnetPlayback} from './sync-evidence.mjs';
import {loadTs} from './ts-load.mjs';
if(!existsSync(new URL('./dist-file/index.html',import.meta.url))){const r=spawnSync(process.execPath,['build-file.mjs'],{cwd:new URL('.',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
const html=readFileSync(new URL('./dist-file/index.html',import.meta.url),'utf8');
const run=JSON.parse(readFileSync(new URL('./public/run.json',import.meta.url)));
const chainRead=JSON.parse(readFileSync(new URL('./public/chain.json',import.meta.url)));
const scene=await loadTs('./src/scene.ts');
const chain=await loadTs('./src/chain.ts');

test('standalone HTML has one classic inline script, strict CSP and no external URLs',()=>{
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.ok(!/<(?:script|link)[^>]+(?:src|href)=|type="module"|<link[^>]+modulepreload/i.test(html));
 assert.ok(!/localhost|127\.0\.0\.1|url\(\s*["']?(?:https?:|\/)/i.test(html));
 assert.match(html,/connect-src 'none'/);assert.match(html,/img-src data:/);
});
test('file build stays under the 1.2 MB compressed budget',()=>{assert.ok(gzipSync(html,{level:9}).length<1.2e6);});
test('all 24 public transaction links and the real child account are bundled',()=>{
 assert.equal(run.transactions.length,24);for(const t of run.transactions)assert.ok(html.includes(t.hash),t.label);
 assert.ok(html.includes('pip.ctrl.feral-039832.testnet'));
});
test('flows only exist where the recorded snapshots show the exact movement',()=>{
 for(let i=0;i<run.events.length;i++){
  const s=scene.buildScene(run,i);
  const prev=i?scene.buildScene(run,i-1):null;
  for(const f of s.flows){
   assert.ok(f.amount>0,s.kind);
   const bal=(sc,k)=>sc.creatures.find(c=>c.key===k)?.balance??0;
   if(!['market','escrow','furnace'].includes(f.to))assert.ok(bal(s,f.to)-bal(prev,f.to)===f.amount||s.kind.startsWith('register-'),s.kind);
  }
  if(['parent-bid','claim-card-job','lineage-goal','demand-shock','child-first-bid','old-short-bid','refused-post-death-spend'].includes(s.kind))assert.equal(s.flows.length,0,s.kind);
 }
 const burn=scene.buildScene(run,run.events.findIndex(e=>e.kind==='second-upkeep'));
 assert.equal(burn.flows.filter(f=>f.to==='furnace').reduce((a,f)=>a+f.amount,0),30);
});
test('death, refusal and hatch only follow contract outcomes',()=>{
 const di=run.events.findIndex(e=>e.kind==='death-tick'),ri=run.events.findIndex(e=>e.kind==='refused-post-death-spend'),bi=run.events.findIndex(e=>e.kind==='funded-child-account-creation');
 for(let i=0;i<run.events.length;i++){
  const s=scene.buildScene(run,i),ash=s.creatures.find(c=>c.key==='ash');
  if(ash){assert.equal(ash.pose==='fossil',i>=di);assert.equal(ash.balance,5);}
  assert.equal(s.refusal,i===ri);assert.equal(s.hatch,i===bi);assert.equal(s.born,i>=bi);
 }
});
test('a live read replaces the final frame only when it differs, never silently',()=>{
 assert.equal(scene.withLiveFinal(run,chainRead).events.length,run.events.length);
 const changed=structuredClone(chainRead);changed.creatures[0].balance='180';
 const r=scene.withLiveFinal(run,changed);assert.equal(r.events.length,run.events.length+1);assert.equal(r.events.at(-1).kind,'live-now');
});
test('bundled chain read verifies every proof and reconciles supply',()=>{
 assert.ok(chain.reconciles(chainRead.economy,chainRead.creatures));
 for(const t of run.transactions)assert.match(chain.txVerdict(chainRead.txs.find(x=>x.hash===t.hash),t.state),/verified/,t.label);
 assert.equal(chainRead.births['pip.ctrl.feral-039832.testnet'].state,'complete');
 assert.equal(chainRead.bids['child-first']['pip.ctrl.feral-039832.testnet'],'80');assert.equal(chainRead.bids['bilingual-v1']['moss.feral-039832.testnet'],'90');
});
test('a refusal only counts when the chain reports the extinct panic',()=>{
 assert.equal(chain.txVerdict({ok:false,failure:'Exceeded the prepaid gas',failedReceipts:1,final:'FINAL'},'expected-failure'),'mismatch');
 assert.equal(chain.txVerdict({ok:false,failure:'Smart contract panicked: extinct',failedReceipts:1,final:'FINAL'},'expected-failure'),'refusal-verified');
 assert.equal(chain.txVerdict({ok:true,failure:null,failedReceipts:1,final:'FINAL'},'success'),'mismatch');
});
test('snapshot generation refuses incomplete runs and mismatched proof',()=>{
 const j=JSON.parse(readFileSync(new URL('../evidence/testnet-journal.json',import.meta.url)));const t=JSON.parse(readFileSync(new URL('../evidence/testnet-transactions.json',import.meta.url)));
 assert.equal(makeTestnetPlayback(j,t).final.creatures.length,4);assert.throws(()=>makeTestnetPlayback({...j,complete:false},t),/completed/);assert.throws(()=>makeTestnetPlayback(j,{...t,root:'wrong.testnet'}),/mismatch/);
 assert.ok(!JSON.stringify(run).includes('.local-transactions'));assert.ok(!html.includes('.near-credentials'));
});
