import * as n from '/workspace/near/feral/keeper/near.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const L = readFileSync('/workspace/near/feral/keeper/data/journal.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(e => e.season === 2 && e.turn >= 4 && e.tx);
const out = [];
for (const e of L) {
  const r = await n.txStatus(e.tx); const st = r.status ?? r.transaction_outcome?.outcome?.status;
  const fails = (r.receipts_outcome || []).map(o => o.outcome.status.Failure).filter(Boolean);
  const msg = fails.length ? JSON.stringify(fails[0]).match(/ExecutionError":"([^"]+)/)?.[1] ?? JSON.stringify(fails[0]).slice(0, 120) : null;
  out.push({ turn: e.turn, label: e.label, tx: e.tx, final: r.final_execution_status, success: !('Failure' in (st || {})) && !fails.length, error: msg, signer: r.transaction?.signer_id, method: r.transaction?.actions?.[0]?.FunctionCall?.method_name });
}
writeFileSync('/workspace/near/feral/video/raw/tx-verify.json', JSON.stringify(out, null, 2));
for (const o of out) console.log(o.turn, o.success ? 'OK  ' : 'FAIL', o.final, o.tx, o.method, o.signer, '|', o.label, o.error ?? '');
