# Chain Signatures plan

Checked 7 November 2026 WAT through official documentation and the official near/mpc contract README. Documentation evidence only. No chain RPC, signing, funding, deployment or faucet action was performed.

## Current official surface

The documented testnet signer is v1.signer-prod.testnet. Mainnet v1.signer is outside scope. The official implementation guide documents the current chainsig.js wrapper with payloads, path, keyType Ecdsa and signerAccount. Those wrapper inputs are not the raw contract ABI.

The official near/mpc contract README documents raw method sign with a request object containing path, payload_v2 and domain_id. For ECDSA use domain_id 0 and payload_v2 containing Ecdsa mapped to exactly 32 bytes encoded as 64 hexadecimal characters. Example shape follows. The hash below is a placeholder and must never be submitted as a real payment.

```json
{
  "request": {
    "path": "feral-sepolia-v1",
    "payload_v2": { "Ecdsa": "<64 hexadecimal characters of EIP 712 digest>" },
    "domain_id": 0
  }
}
```

The official README also documents legacy payload as 32 integer bytes and key_version as aliases. Do not mix legacy and new fields. The current documentation index describes domain_id while older tutorials may show nested wrapper responses. Pin one tested parser rather than copying an old tutorial shape.

The ECDSA result contains big_r, s and recovery_id. Read r from the 32 byte x coordinate of the compressed big_r point, s from the scalar field and the recovery bit from recovery_id. Validate lengths, low s and recovered expected address. Do not sign a second hash or apply personal_sign prefix. The contract signs the supplied ECDSA digest without further hashing. Confirm the deployed JSON tagging with a fixture and an approved first signature before relying on an exact envelope. The current contract README does not print a complete returned JSON object.

The official README requires at least 1 yoctoNEAR and says at least 10 Tgas on the sign receipt. Gas configuration can change. Day 2 should read deployed config and choose a safe attached allowance for the sign call plus separate callback gas. Never treat 10 Tgas as a permanent guarantee. No live config was queried here.

## Who actually signs

The address is derived from MPC root public key, immediate NEAR predecessor account and path. If the controller calls the MPC contract for a child, the derivation is controller plus path, not the child's account. Use one path per child such as feral-sepolia-v1/child-id and disclose that it is a controller scoped credential. Alternatively deploy a restricted child executor and make that child call MPC directly if we want the literal child derived identity. The latter is extra scope. Account metadata and a real funded birth do not by themselves establish child initiated foreign signing.

The controller must construct the voucher digest from validated immutable values. Never expose an unrestricted sign arbitrary payload method to the keeper. An extinct child cannot request new vouchers. Previously signed liabilities remain reserved because an offchain death cannot invalidate an already signed EVM authorization by itself. Expiry and consumed nonce govern destination validity.

## Voucher rail

Prefer a NEAR signed EIP 712 voucher redeemed by a separately funded EVM relayer. EIP 712 domain binds name FeralTreasury, version 1, Sepolia chainId 11155111 and the deployed treasury address. Struct binds creature ID hash, job ID hash, output hash, ERC20 address, recipient, integer amount, unique nonce and expiry. Signed fields must be exactly the fields the treasury verifies.

Treasury verifies recovered authorized signer, strict deadline, supported token, bounded amount and unused nonce. Consume nonce before token transfer and revert the whole redemption on failed transfer. Use a safe ERC20 transfer library and no fee on transfer or rebasing token. Tests must reject wrong chain, wrong treasury, changed recipient, amount, token, expired voucher, bad signature and replay. Include a reentrancy test.

The derived signer address needs no Sepolia ETH for this voucher rail. The separate relayer needs Sepolia ETH to deploy contracts and redeem. The treasury needs the separate test ERC20 amount. This is cheaper operationally than funding every derived account for transaction gas. Direct MPC signed EVM transactions would instead require ETH at the derived account and correct nonce and EIP 1559 handling. Do not mix the two rails in explanations.

NEAR reserve, signing requested, signature issued, destination submitted, destination paid and reconciled are separate states. A disclosed trusted observer checks the actual Sepolia receipt, correct treasury event and successful ERC20 transfer before showing paid and releasing the tool output. A NEAR signature receipt is not evidence of an EVM payment. An unbroadcast or failed broadcast leaves a signed liability live until expiration or proven consumption. Exact expiry reconciliation needs a safety margin and explicit policy.

## Day 2 sequence after approval

1. Finish local controller and EVM voucher tests before involving public chains. Local signing uses fixture keys only and must not be represented as an MPC network test.
2. Ask David to approve the exact NEAR testnet deployment account and funding plan. Use an approved account creation and wallet flow without handling private keys or seed phrases.
3. Compile with a compatible Rust toolchain, deploy controller, verify code hash and reserve balances. Read testnet signer config and public key without signing.
4. Fix the caller account, child scoped path and ECDSA domain. Derive the public Sepolia address and record it with the exact inputs. No address can be truthfully given now because no deployment account has been selected or created.
5. Have David approve the Sepolia relayer account, treasury and test token deployment transactions and faucet funding separately. Fund only the named relayer and treasury. Derive gas amount from estimated deployment and redemption costs with a published cap, not an invented fixed faucet requirement. For the demo ERC20 choose 100 integer base units in the treasury and a tool bill of 7 base units. These are proposed test quantities, not approved funding actions.
6. Obtain separate approval for exact sign payload, request deposit, gas cap and nonce. Attach the required yoctoNEAR from controller prepaid reserve. Request one actual testnet MPC signature and verify recovery locally.
7. Obtain approval for exact Sepolia redemption transaction and gas cap. Broadcast once, verify confirmed receipt, observe provider output release and record evidence. Restart observer and prove nonce replay fails.

No blanket approval for all future transactions should be inferred from the concept approval.

## Inference availability on this box

Checked executable PATH and standard model cache locations only. ollama, llama-server and llama-cli were not found. The local Ollama endpoint at 127.0.0.1 port 11434 was unavailable. Standard Ollama model directories and /home/box/.cache/huggingface/hub were absent. No values of private variables were printed, read from files or used.

The following named process environment variables were not set. OPENAI_API_KEY, ANTHROPIC_API_KEY, NEAR_AI_API_KEY, NEARAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY and OLLAMA_HOST. This is a limited availability check and does not establish that no approved model route exists elsewhere.

Rust 1.85.1, Cargo 1.85.1, Node 24.22.1 and npm 11.21.1 are installed. near-sandbox, anvil and forge were absent from PATH. Official docs.rs currently resolves near-sdk and near-contract-standards to 5.30.1. Compiler minimum compatibility and WASM target were not verified. Do not claim that the installed Rust builds the current SDK.

A local model would need a runtime, a model download, resource check and structured decision evaluation. Nothing was installed or downloaded. Deterministic agents can prove accounting but cannot be presented as genuine live LLM decisions. An external inference route requires an approved provider, credentials through the sanctioned secret flow, spending cap and approval to send prompt data. The archived hackathon rules mention NEAR AI credits through NEAR Builders, but no signup, credit claim or API call was performed.

## Sources

https://docs.near.org/chain-abstraction/chain-signatures

https://docs.near.org/chain-abstraction/chain-signatures/implementation

https://github.com/near/mpc/blob/main/crates/contract/README.md

https://docs.rs/crate/near-sdk/latest

https://docs.rs/crate/near-contract-standards/latest
