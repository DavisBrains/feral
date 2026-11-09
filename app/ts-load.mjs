// Loads a TypeScript module from src for node tests without a bundler server.
import {transformSync} from 'esbuild';
import {readFileSync} from 'node:fs';
export async function loadTs(rel){
  const src=readFileSync(new URL(rel,import.meta.url),'utf8').replace(/^import .*from '\.\.\/\.\.\/design.*$/gm,'').replaceAll('import.meta.glob(','__glob(');
  const {code}=transformSync('const __glob=()=>({});\n'+src,{loader:'ts',format:'esm'});
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
