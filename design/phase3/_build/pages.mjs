import { chromium } from 'playwright-core';
const H='/workspace/near/feral/design/phase3/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--allow-file-access-from-files'] });
const jobs=[];
for (const v of [1,2,3]) {
  jobs.push([`html/page-desktop-v${v}.html`,1440,900,`mockups/hero-variant-${v}-desktop.png`,false]);
  jobs.push([`html/page-mobile-v${v}.html`,390,844,`mockups/hero-variant-${v}-mobile.png`,false]);
}
jobs.push(['html/page-desktop-v2.html',1440,900,'mockups/page-desktop-1440.png',true]);
jobs.push(['html/page-mobile-v2.html',390,844,'mockups/page-mobile-390.png',true]);
for (const [f,w,h,out,full] of jobs) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor: w<500?2:1 });
  const errs=[]; p.on('requestfailed', r=>errs.push(r.url()));
  await p.goto('file://'+H+f); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  await p.addStyleTag({content:'*{animation-play-state:paused!important}'+(full?'body{position:relative}.f-dock{position:absolute!important;bottom:0}':'')});
  await p.screenshot({path:H+out, fullPage:full});
  console.log(out, errs.length?errs:'ok'); await p.close();
}
await b.close();
