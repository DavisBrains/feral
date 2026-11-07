import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {makeTestnetPlayback} from './sync-evidence.mjs';
import {verifyScene} from './playback.mjs';
if(!existsSync(new URL('./dist-file/index.html',import.meta.url))){const r=spawnSync(process.execPath,['build-file.mjs'],{cwd:new URL('.',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
const html=readFileSync(new URL('./dist-file/index.html',import.meta.url),'utf8');
const run=JSON.parse(readFileSync(new URL('./public/run.json',import.meta.url)));
function render(){const root={innerHTML:''},nodes=new Map();vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],{document:{querySelector:s=>s==='#app'?root:(nodes.has(s)?nodes.get(s):nodes.set(s,{}).get(s))},location:{search:''},URLSearchParams,setInterval:()=>0,clearInterval:()=>{},fetch:()=>assert.fail('no network allowed'),console},{timeout:5000});return {root,nodes};}
test('standalone HTML has one classic inline script and no rendering dependencies',()=>{
 assert.equal((html.match(/<script>/g)||[]).length,1);assert.ok(!/<(?:script|link)[^>]+(?:src|href)=|type="module"|modulepreload|fetch\s*\(|XMLHttpRequest|WebSocket|import\s*\(/i.test(html));
 assert.ok(!/localhost|127\.0\.0\.1|@import|url\(\s*["']?(?:https?:|\/)/i.test(html));assert.match(html,/connect-src 'none'/);
});
test('real final state renders without a server or browser network API',()=>{
 const {root}=render();for(const name of ['moss','echo','ash','pip'])assert.match(root.innerHTML,new RegExp('data-creature="'+name+'"'));
 assert.match(root.innerHTML,/data-creature="ash" data-active="false"/);assert.match(root.innerHTML,/data-creature="pip" data-active="true"/);
 for(const balance of ['190','155','5','90'])assert.match(root.innerHTML,new RegExp('>'+balance+'<'));
 assert.match(root.innerHTML,/REAL NEAR TESTNET/);assert.match(root.innerHTML,/Offline snapshot/);assert.match(root.innerHTML,/RECORDED QWEN DECISIONS/);
 assert.match(root.innerHTML,/src="data:image\/svg\+xml/);assert.ok(!root.innerHTML.includes('No public chain transaction'));
});
test('all public transaction links and real child account are reachable by explicit taps',()=>{
 const {root}=render();assert.equal(run.transactions.length,24);for(const t of run.transactions)assert.ok(root.innerHTML.includes(t.explorer),t.label);
 assert.ok(root.innerHTML.includes('https://testnet.nearblocks.io/address/pip.ctrl.feral-039832.testnet'));
 const refused=run.transactions.find(t=>t.label==='refused-post-death-spend');assert.equal(refused.state,'expected-failure');assert.ok(root.innerHTML.includes(refused.hash));
});
test('every replay frame renders from its conserved real snapshot',()=>{
 const {root,nodes}=render();for(let i=0;i<run.events.length;i++){nodes.get('#timeline').oninput({target:{value:String(i)}});assert.ok(verifyScene(run.events[i]));assert.ok(root.innerHTML.includes(run.events[i].explorer));}
});
test('snapshot generation refuses incomplete runs and mismatched proof',()=>{
 const j=JSON.parse(readFileSync(new URL('../evidence/testnet-journal.json',import.meta.url)));const t=JSON.parse(readFileSync(new URL('../evidence/testnet-transactions.json',import.meta.url)));
 assert.equal(makeTestnetPlayback(j,t).final.creatures.length,4);assert.throws(()=>makeTestnetPlayback({...j,complete:false},t),/completed/);assert.throws(()=>makeTestnetPlayback(j,{...t,root:'wrong.testnet'}),/mismatch/);
 const bad=structuredClone(t);bad.transactions[0].state='broadcasting';assert.throws(()=>makeTestnetPlayback(j,bad),/Unverified/);
 assert.ok(!JSON.stringify(run).includes('cli_diagnostics'));assert.ok(!JSON.stringify(run).includes('.local-transactions'));
});
