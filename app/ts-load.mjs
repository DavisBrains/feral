// Loads a TypeScript module from src for node tests without a bundler server.
// Bundles its local imports with esbuild, stubs images and styles, and turns
// import.meta.glob into an empty map so asset globs never touch the disk.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export async function loadTs(rel){
  const entry=fileURLToPath(new URL(rel,import.meta.url));
  const stub={name:'glob',setup(b){b.onLoad({filter:/\.ts$/},a=>({loader:'ts',contents:'const __glob=()=>({});\n'+readFileSync(a.path,'utf8').replaceAll('import.meta.glob(','__glob(')}));}};
  const loader=Object.fromEntries(['.webp','.png','.svg','.css','.woff2'].map(e=>[e,'empty']));
  const {outputFiles}=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'neutral',loader,plugins:[stub],external:['pixi.js'],logLevel:'silent'});
  return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
}
