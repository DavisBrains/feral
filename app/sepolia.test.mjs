import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const e=JSON.parse(readFileSync(new URL('../evidence/sepolia-tool-purchase.json',import.meta.url)));
const chain=JSON.parse(readFileSync(new URL('./public/chain.json',import.meta.url)));
test('Sepolia purchase evidence is complete and consistent',()=>{
 const steps=Object.fromEntries(e.steps.map(s=>[s.step,s]));
 for(const k of ['deploy-test-token','deploy-treasury','redeem-tool-payment'])assert.match(steps[k].sepolia_tx,/^0x[0-9a-f]{64}$/);
 for(const k of ['mpc-sign-deploy-test-token','mpc-sign-deploy-treasury','configure-tools','request-tool-payment','mpc-sign-redeem-tool-payment'])assert.match(steps[k].near_tx,/^[1-9A-HJ-NP-Za-km-z]{43,44}$/);
 const d=steps['digest-agreement'];assert.equal(d.local,d.treasury);assert.equal(d.local.slice(2),d.controller);
 assert.equal(steps['deploy-test-token'].contract,e.predicted.token);assert.equal(steps['deploy-treasury'].contract,e.predicted.treasury);
 assert.equal(e.paid.event,'ToolPaid');assert.equal(e.paid.amount,'7');assert.equal(e.paid.sepolia_tx,steps['redeem-tool-payment'].sepolia_tx);
});
test('controller liability matches the redeemed voucher',()=>{
 assert.equal(chain.tool.state,'signature-returned');assert.equal(chain.tool.digest,e.voucher_digest.slice(2));assert.equal(chain.tool.actor,'moss.feral-039832.testnet');
});
