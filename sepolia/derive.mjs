import {computeAddress, decodeBase58, toBeHex} from '../app/node_modules/ethers/lib.esm/index.js';
export function addrFromNearKey(k){const b=decodeBase58(k.replace('secp256k1:',''));const hex=toBeHex(b,64);return computeAddress('0x04'+hex.slice(2));}
if(process.argv[2])console.log(addrFromNearKey(process.argv[2]));
