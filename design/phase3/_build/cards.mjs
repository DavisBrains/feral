import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const D='/workspace/near/feral/design/phase3/card/';
await p.goto('file://'+D+'preview.html'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
await p.screenshot({path:D+'preview-cards-overview.png',fullPage:true});
// full-size renders
await p.addStyleTag({content:'.c{width:1080px!important}.c svg{box-shadow:none!important}body{padding:0!important;gap:0!important;flex-direction:column}'});
await p.waitForTimeout(200);
for (const [id,n] of [['a','card-bilingual-real.png'],['b','card-short-sample.png'],['c','card-bilingual-long-sample.png']]) await (await p.$('#'+id+' svg')).screenshot({path:D+n});
await b.close(); console.log('ok');
