import test from 'node:test';import assert from 'node:assert/strict';import {mockSign,parseSignature,request,digest} from './voucher.mjs';
const d='11'.repeat(32);
test('MPC fixture roundtrip recovers fixture signer',()=>{const s=mockSign(d);assert.equal(parseSignature(s.response,d,s.expected_address),s.signature)});
test('MPC schema uses current payload v2',()=>assert.deepEqual(request('kid.controller.testnet',d),{request:{path:'feral-sepolia-v1/kid.controller.testnet',payload_v2:{Ecdsa:d},domain_id:0}}));
test('signature parser rejects changed digest and recovery',()=>{const s=mockSign(d);assert.throws(()=>parseSignature(s.response,'22'.repeat(32),s.expected_address));assert.throws(()=>parseSignature({...s.response,recovery_id:9},d,s.expected_address))});
test('domain binds chain and treasury',()=>{const v={campaign:d,job:d,creature:d,recipient:'0x'+'12'.repeat(20),token:'0x'+'13'.repeat(20),amount:'7',output_hash:d,nonce:0,expiry:2000};const dom={chain_id:11155111,treasury:'0x'+'14'.repeat(20)};assert.notEqual(digest(dom,v),digest({...dom,chain_id:1},v));assert.notEqual(digest(dom,v),digest({...dom,treasury:'0x'+'15'.repeat(20)},v))});
