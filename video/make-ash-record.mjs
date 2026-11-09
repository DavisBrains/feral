import * as n from '/workspace/near/feral/keeper/near.mjs';
import { writeFileSync } from 'node:fs';
const id = 's2-ash.play.feral-039832.testnet';
const nft = await n.view('nft_token', { token_id: id });
const lives = (await n.view('lives_of', { season: 2 })).value;
const life = lives.find(l => l.id === id) ?? lives.find(l => JSON.stringify(l).includes(id));
const tx = await n.txStatus('92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const j = o => esc(JSON.stringify(o, null, 2));
writeFileSync('/workspace/near/feral/video/raw/ash-record.html', `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0f1a12;color:#e9e4d4;font:18px/1.45 ui-monospace,Menlo,monospace;padding:48px 64px}
h1{font:600 34px Georgia,serif;margin:0 0 6px} p.s{color:#9fb29f;margin:0 0 28px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:28px} .c{background:#18261b;border:1px solid #2f4632;border-radius:10px;padding:20px 24px}
.c h2{font:600 15px system-ui;letter-spacing:.12em;text-transform:uppercase;color:#c9a96b;margin:0 0 12px} pre{margin:0;white-space:pre-wrap;font-size:15px}
.bad{color:#ff9b85;font-weight:700} .ok{color:#9be38f}</style>
<h1>Ash on NEAR testnet after turning to stone</h1><p class="s">Raw reads from the testnet RPC at block ${nft.block}. Contract play.feral-039832.testnet</p>
<div class="g"><div class="c"><h2>Life NFT · nft_token</h2><pre>${j({ token_id: nft.value.token_id, owner_id: nft.value.owner_id, title: nft.value.metadata.title, extra: JSON.parse(nft.value.metadata.extra) })}</pre></div>
<div class="c"><h2>Life record · lives_of season 2</h2><pre>${j({ id, balance: life.balance, active: life.life.active, born_turn: life.life.born_turn, died_turn: life.life.died_turn, earned: life.life.earned, burned: life.life.burned })}</pre></div>
<div class="c" style="grid-column:span 2"><h2>Spend after death · bid as Ash</h2><pre>tx      92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX
status  <span class="bad">Failure · Smart contract panicked: extinct</span>
link    testnet.nearblocks.io/txns/92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX</pre></div></div>`);
console.log(JSON.stringify({ life: life.life.died_turn, active: life.life.active, bal: life.balance, tx: { ok: tx.ok, error: tx.error } }));
