import { readFileSync } from 'node:fs';
const policies=[{job:'bilingual',min:90,floor:120},{job:'bilingual',min:80,floor:140},{job:'translation',min:30,floor:180},{job:'short',min:40,floor:120}];
export function validateObservation(s){
 if(s?.goal!==undefined&&(!Number.isSafeInteger(s.goal)||s.goal<0||s.goal>2))throw Error('goal bounds');
 if(!s||!Number.isSafeInteger(s.policy)||s.policy<0||s.policy>3||!Number.isSafeInteger(s.balance)||s.balance<0||typeof s.active!=='boolean'||!Array.isArray(s.jobs))throw Error('invalid observation');
 for(const j of s.jobs)if(!['bilingual','translation','short'].includes(j.kind)||!Number.isSafeInteger(j.reward)||j.reward<0||j.reward>100)throw Error('invalid job');
 return policies[s.policy];
}
export function fallback(s){ const p=validateObservation(s);if(!s.active)return {action:'wait'};
 if(s.goal!==1 && s.can_reproduce && s.balance>=Math.max(120,p.floor))return {action:'reproduce'};
 const job=s.jobs.find(j=>j.kind===p.job&&j.reward>=p.min);
 if(!job)return {action:'wait'};
 if(p.job==='bilingual'&&s.needs_translation&&!s.has_translation){if(s.balance>=40&&s.provider_active)return {action:'collaborate',job:'translation',price:30};return {action:'wait'};}
 return {action:'bid',job:p.job,price:p.min};}
export function validateDecision(raw,s){ const p=validateObservation(s);const d=typeof raw==='string'?JSON.parse(raw):raw;
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('decision object required');
 const allowed=d.action==='wait'||d.action==='reproduce'?['action']:['action','job','price'];
 if(Object.keys(d).some(k=>!allowed.includes(k)))throw Error('unknown fields');
 if(!s.active&&d.action!=='wait')throw Error('extinct');
 if(d.action==='wait')return d;
 if(d.action==='reproduce'){if(s.goal===1||!s.can_reproduce||s.balance<Math.max(120,p.floor))throw Error('reproduction budget');return d;}
 if(!Number.isSafeInteger(d.price)||d.price<0||d.price>100)throw Error('bounded integer price');
 if(d.action==='collaborate'){if(p.job!=='bilingual'||d.job!=='translation'||d.price!==30||s.balance<40||!s.provider_active||s.has_translation||!s.needs_translation)throw Error('collaboration bounds');return d;}
 if(d.action!=='bid'||d.job!==p.job||!s.jobs.some(j=>j.kind===d.job&&d.price>=p.min&&d.price<=j.reward))throw Error('bid violates strategy or demand');
 if(d.job==='bilingual'&&s.needs_translation&&!s.has_translation)throw Error('missing translation');
 return d;}
export async function decide(s,model){validateObservation(s);let rejected=null;if(model){try{const raw=await model(s);return {mode:'local-model',model:raw?.model??null,seconds:raw?.seconds??null,decision:validateDecision(raw?.decision??raw,s)}}catch(e){rejected=String(e.message)}}return {mode:'deterministic-policy',rejected,decision:validateDecision(fallback(s),s)};}
export async function localModel(s){
 const endpoint=process.env.FERAL_MODEL_URL||'http://127.0.0.1:11435/decision';const u=new URL(endpoint);if(u.hostname!=='127.0.0.1'&&u.hostname!=='localhost')throw Error('only loopback inference allowed');
 const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('local model unavailable');const v=await r.json();return v;}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){const s=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(await decide(s,process.env.FERAL_USE_MODEL==='1'?localModel:null)));}
