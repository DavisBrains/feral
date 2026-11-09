import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './ts-load.mjs';
const {parsePhase2}=await loadTs('./src/atlas.ts');
test('phase 2 manifest parser accepts nested and list shapes',()=>{
 const nested=parsePhase2({frame_size:[128,128],foot_anchor:[64,113],creatures:{moss:{idle:{file:'runtime/moss_idle.webp',frames:6,fps:8},'seed-open':{file:'runtime/moss_seed.webp',frames:8}}}});
 assert.equal(nested.length,2);assert.equal(nested[0].frames,6);assert.equal(nested[1].anim,'seed_open');assert.equal(nested[1].loop,false);
 const list=parsePhase2({animations:[{creature:'Pip',animation:'hatch',sheet:'pip_hatch.webp',frame_count:10,frame_rate:12}]});
 assert.deepEqual([list[0].key,list[0].anim,list[0].frames,list[0].fps],['pip','hatch',10,12]);
 assert.deepEqual(parsePhase2(undefined),[]);
});
test('designer manifest with variants and frame durations',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 const f=new URL('../design/phase2/runtime/manifest.json',import.meta.url);
 if(!existsSync(f))return;
 const rows=parsePhase2(JSON.parse(readFileSync(f,'utf8')),'128');
 assert.ok(rows.length>0);for(const r of rows){assert.match(r.file,/_128\.webp$/);assert.equal(r.w,128);}
 assert.ok(rows.some(r=>r.key==='ash'&&r.anim==='cooling'&&r.loop===false));
 assert.ok(rows.some(r=>r.key==='pip'&&r.anim==='hatch'&&r.durations?.length===r.frames));
});
