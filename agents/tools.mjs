import {createHash} from 'node:crypto';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';
export const sha=x=>createHash('sha256').update(x).digest('hex');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderTranscript(t){
 if(!t||typeof t.title!=='string'||t.title.length>60||!Array.isArray(t.segments)||t.segments.length<1||t.segments.length>4)throw Error('bounded transcript required');
 for(const s of t.segments)if(!Number.isSafeInteger(s.start_ms)||s.start_ms<0||typeof s.en!=='string'||typeof s.es!=='string'||s.en.length<1||s.es.length<1||s.en.length>100||s.es.length>100)throw Error('bilingual segment required');
 const lines=[];for(const s of t.segments){for(const [lang,text] of [['EN',s.en],['ES',s.es]]){const words=text.split(/\s+/);let line=lang+' ';for(const w of words){if(line.length+w.length>43){lines.push(line);line='';}line+=w+' ';}lines.push(line.trim());}}
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#102c23"/><circle cx="950" cy="120" r="48" fill="#caff77"/><text x="65" y="110" font-family="sans-serif" font-size="38" fill="#caff77">FERAL WORK OUTPUT</text><text x="65" y="190" font-family="sans-serif" font-size="36" fill="white">'+esc(t.title)+'</text>';
 svg+=lines.map((line,i)=>'<text x="65" y="'+(290+i*48)+'" font-family="sans-serif" font-size="30" fill="'+(line.startsWith('ES')?'#caff77':'white')+'">'+esc(line)+'</text>').join('');
 svg+='<text x="65" y="1290" font-family="sans-serif" font-size="22" fill="#caff77">Generated from supplied bilingual transcript. Trusted tool.</text></svg>';
 return {svg,translation:JSON.stringify(t.segments.map(s=>({start_ms:s.start_ms,es:s.es}))),source:JSON.stringify(t)};
}
export function build(input,out){const t=JSON.parse(readFileSync(input,'utf8'));const r=renderTranscript(t);mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'card.svg'),r.svg);writeFileSync(path.join(out,'translation.json'),r.translation);const m={source_sha256:sha(r.source),output_sha256:sha(r.svg),translation_sha256:sha(r.translation),segments:t.segments.length,mode:'real deterministic transcript rendering; supplied translations',file:'card.svg'};writeFileSync(path.join(out,'manifest.json'),JSON.stringify(m,null,2)+'\n');return m;}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)console.log(JSON.stringify(build(process.argv[2],process.argv[3])));
