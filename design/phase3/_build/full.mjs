import { chromium } from 'playwright-core';
const H='/workspace/near/feral/design/phase3/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--allow-file-access-from-files'] });
for (const [f,w,h,out] of [['html/page-desktop-v2.html',1440,900,'mockups/page-desktop-1440.png'],['html/page-mobile-v2.html',390,844,'mockups/page-mobile-390.png']]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor: w<500?2:1 });
  const errs=[]; p.on('requestfailed', r=>errs.push(r.url()));
  await p.goto('file://'+H+f); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  await p.addStyleTag({content:'*{animation-play-state:paused!important}body{position:relative}.f-dock{position:absolute!important;bottom:0}'});
  await p.screenshot({path:H+out, fullPage:true}); console.log(out, errs.length?errs:'ok'); await p.close();
}
await b.close();
