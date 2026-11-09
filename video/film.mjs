import { chromium } from '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.63.0-alpha-2026-08-31/node_modules/playwright-core/index.mjs';
import { readFileSync, renameSync, appendFileSync, mkdirSync } from 'node:fs';
const OUT = '/workspace/near/feral/video/raw', URL0 = 'http://127.0.0.1:8787/';
const TOKEN = readFileSync('/home/box/.feral-keeper/operator.token', 'utf8').trim();
const which = process.argv.slice(2);
const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(' ')}`; console.log(l); appendFileSync(`${OUT}/film.log`, l + '\n'); };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome'});
async function clip(name, { w = 1920, h = 1080, mobile = false } = {}, fn) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir: `${OUT}/tmp`, size: { width: w, height: h } } });
  await ctx.route('http://127.0.0.1:8787/api/**', r => r.continue({ headers: { ...r.request().headers(), 'x-feral-operator': TOKEN } }));
  const p = await ctx.newPage(); const t0 = Date.now();
  p.on('pageerror', e => log(name, 'pageerror', String(e).slice(0, 200)));
  try { await fn(p); } catch (e) { log(name, 'ERROR', e.message.slice(0, 300)); }
  const v = p.video(); await ctx.close();
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  renameSync(await v.path(), `${OUT}/${name}.webm`); log('clip', name, dur + 's');
}
const still = (p, n) => p.screenshot({ path: `${OUT}/stills/${n}.png` });
const live = async p => { await p.goto(URL0); await p.waitForSelector('.f-banner.is-live', { timeout: 90000 }); await p.waitForTimeout(2500); };
const replay = async p => { await live(p); await p.click('#pl-mode [data-mode="replay"]'); await p.waitForTimeout(3000); };
const scrollTo = async (p, sel, block = 'center') => { await p.evaluate(([s, bl]) => document.querySelector(s)?.scrollIntoView({ behavior: 'smooth', block: bl }), [sel, block]); await p.waitForTimeout(1600); };
const state = p => p.evaluate(async () => (await fetch('/api/state', { headers: { 'x-feral-visitor': localStorage.getItem('feral-visitor') || '' } })).json());
async function advance(p, tag) {
  const before = (await state(p)).chain.season.turn;
  await scrollTo(p, '#hero-side');
  await p.click('#hero-side button[data-act="turn"]'); log(tag, 'advance clicked from turn', before);
  const t0 = Date.now();
  while (Date.now() - t0 < 600000) {
    await p.waitForTimeout(3000);
    const s = await state(p);
    if (s.progress) log(tag, 'progress', s.progress);
    if (!s.busy && s.chain.season.turn > before) { log(tag, 'turn done', s.chain.season.turn); return s; }
  }
  throw new Error('turn timeout');
}
const run = {
  async b1_hero() { await clip('b1-hero-desktop', {}, async p => { await live(p); await p.waitForTimeout(5000); await still(p, 'hero-before'); await p.mouse.wheel(0, 500); await p.waitForTimeout(5000); await scrollTo(p, '#stage'); await p.waitForTimeout(6000); await still(p, 'stage-before'); }); },
  async b2_tips() { await clip('b2-tooltips', {}, async p => { await live(p);
    for (const [sel, n] of [['.hero .f-term[data-tip="munch"]', 'munch'], ['.f-banner .f-term[data-tip="qwen"]', 'qwen'], ['#hero-side .f-term[data-tip="lineage"]', 'lineage'], ['#season-lede .f-term[data-tip="upkeep"]', 'upkeep'], ['.f-pouch .f-term[data-tip="pouch"]', 'pouch'], ['.sheet-demand .f-term[data-tip="demand"]', 'demand'], ['.f-term[data-tip="bid"]', 'bid']]) {
      const el = p.locator(sel).first(); if (!(await el.count())) { log('tip missing', n); continue; }
      await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await el.hover(); await p.waitForTimeout(2600); if (n === 'qwen' || n === 'upkeep') await still(p, 'tip-' + n); await p.mouse.move(5, 5); await p.waitForTimeout(500);
    } }); },
  async b3_demand() { await clip('b3-demand-board', {}, async p => { await live(p); await scrollTo(p, '.sheet-demand'); await p.waitForTimeout(4000); await still(p, 'demand-board'); await p.locator('.sheet-demand .f-term').hover(); await p.waitForTimeout(3000); }); },
  async b4_birth() { await clip('b4-replay-pip-birth', {}, async p => { await replay(p); await scrollTo(p, '#tabs'); await p.waitForTimeout(1500); await p.click('#tabs [data-jump="funded-child-account-creation"]'); await p.waitForTimeout(800); await scrollTo(p, '#stage'); await p.waitForTimeout(7000); await still(p, 'replay-pip-birth'); await scrollTo(p, '#ledger'); await p.waitForTimeout(4000); }); },
  async b5_sepolia() { await clip('b5-replay-sepolia', {}, async p => { await replay(p); await scrollTo(p, '.f-sig'); await p.waitForTimeout(6000); await still(p, 'replay-sepolia'); }); },
  async b6_mobile() { await clip('b6-mobile-390', { w: 390, h: 844, mobile: true }, async p => { await live(p); await p.waitForTimeout(5000); await still(p, 'mobile-first'); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 500); await p.evaluate(() => scrollBy({ top: 500, behavior: 'smooth' })); await p.waitForTimeout(1800); } await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await p.waitForTimeout(2500); }); },
  async m1_turn4() { await clip('m1-turn4-echo-translates', {}, async p => { await live(p); await scrollTo(p, '#stage'); await p.waitForTimeout(3000);
    const s = await advance(p, 'turn4'); await p.waitForTimeout(4000); await scrollTo(p, '#stage'); await p.waitForTimeout(5000); await still(p, 'turn4-stage');
    await scrollTo(p, '.rowC .chose'); await p.waitForTimeout(5000); await still(p, 'turn4-decisions'); await scrollTo(p, '.logp'); await p.waitForTimeout(5000); await still(p, 'turn4-log');
    await scrollTo(p, '.rowA'); await p.waitForTimeout(4000); await still(p, 'turn4-outcome'); }); },
  async m2_turn5() { await clip('m2-turn5-ash-turns-to-stone', {}, async p => { await live(p); await scrollTo(p, '#stage'); await p.waitForTimeout(4000); await still(p, 'turn5-before');
    await p.click('#hero-side button[data-act="turn"]').catch(() => {}); log('turn5', 'advance clicked');
    const t0 = Date.now(); let done = null;
    await scrollTo(p, '#stage');
    while (Date.now() - t0 < 600000) { await p.waitForTimeout(3000); const s = await state(p); if (s.progress) log('turn5', 'progress', s.progress); if (!s.busy && s.chain.season.turn >= 5) { done = s; break; } }
    log('turn5', 'done', JSON.stringify(done?.chain.lives.map(l => [l.life.name, l.balance, l.life.active])));
    await p.waitForTimeout(9000); await still(p, 'turn5-stone-stage');
    await scrollTo(p, '.rowA'); await p.waitForTimeout(5000); await still(p, 'turn5-outcome');
    await scrollTo(p, '.logp'); await p.waitForTimeout(5000); await still(p, 'turn5-log');
    await scrollTo(p, '#stage'); await p.locator('.f-spec[data-key="ash"]').click().catch(e => log('ash label', e.message.slice(0, 80))); await p.waitForTimeout(1000); await scrollTo(p, '#drawer'); await p.waitForTimeout(5000); await still(p, 'turn5-ash-drawer'); }); },
  async m3_refusal() { await clip('m3-refused-spend-and-life-nft', {}, async p => { await live(p); await scrollTo(p, '.logp'); await p.waitForTimeout(6000); await still(p, 'refusal-log');
    await scrollTo(p, '#stage'); await p.locator('.f-spec[data-key="ash"]').click().catch(() => {}); await p.waitForTimeout(800); await scrollTo(p, '#drawer'); await p.waitForTimeout(5000);
    await p.goto('file:///workspace/near/feral/video/raw/ash-record.html'); await p.waitForTimeout(7000); await still(p, 'ash-life-nft-record'); }); },
  async b8_explorer() { await clip('b8-nearblocks-refused-and-death', {}, async p => { for (const [h, n] of [['92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX', 'nearblocks-refused'], ['H4a9jGEKUBEyW5tj15SMFoSjvXE7nVAEHhBrRFw5HxDo', 'nearblocks-death-tick'], ['23GTkCFMi41Yg3ox5DpwXmjHT3enBnmkvK4PJ4vhJuUY', 'nearblocks-translation-settle']]) { await p.goto('https://testnet.nearblocks.io/txns/' + h, { timeout: 60000 }).catch(e => log('nb', e.message.slice(0, 80))); await p.waitForTimeout(8000); log('nb title', await p.title()); await still(p, n); } }); },
  async b9_controls() { await clip('b9-visitor-controls', {}, async p => { await live(p); await scrollTo(p, '.sheet-demand', 'start'); await p.waitForTimeout(2500);
    for (const sel of ['.sheet-demand label', '.f-paper:has(h4:text("Sponsor a creature")) button', '.f-paper:has(h4:text("Feed a creature")) button', '.f-paper:has(h4:text("Post a job")) button', '.f-paper:has(h4:text("Post a job")) input']) {
      const els = p.locator(sel); const n = Math.min(await els.count(), 3); for (let i = 0; i < n; i++) { await els.nth(i).hover().catch(() => {}); await p.waitForTimeout(900); } }
    await scrollTo(p, '.f-act'); await p.waitForTimeout(3500); await p.mouse.move(5, 5); await p.waitForTimeout(1500); }); },
  async hires() { for (const [w, h, mob, pre] of [[1440, 900, false, 'hi'], [390, 844, true, 'hi-390']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage(); await live(p);
    await p.waitForTimeout(3000); await still(p, pre + '-hero');
    for (const [sel, n] of [['#stage', 'stage-stone'], ['.rowA', 'outcome'], ['.logp', 'turn-log'], ['.sheet-demand', 'demand-board']]) { await p.evaluate(s => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(1800); await still(p, `${pre}-${n}`); }
    if (!mob) { await p.evaluate(() => document.querySelector('#stage')?.scrollIntoView({ block: 'center' })); await p.locator('.f-spec[data-key="ash"]').click().catch(() => {}); await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('#drawer')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(1500); await still(p, `${pre}-ash-drawer`);
      await p.goto('file:///workspace/near/feral/video/raw/ash-record.html'); await p.waitForTimeout(800); await still(p, `${pre}-ash-record`); }
    await ctx.close(); log('hires', pre); } },
  async b7_after() { await clip('b7-hero-after', {}, async p => { await live(p); await scrollTo(p, '#stage'); await p.waitForTimeout(7000); await still(p, 'stage-after'); await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await p.waitForTimeout(4000); }); },
};
mkdirSync(`${OUT}/tmp`, { recursive: true });
for (const k of which) await run[k]();
await b.close();
