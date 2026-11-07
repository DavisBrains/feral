# Day 1 implementation handoff

Recorded 7 November 2026 at 9.03 AM WAT.

## Scope and permissions

Everything remains on the box at /workspace/near/feral. The git repository has no remote. No GitHub repository was created or pushed. No public chain account, faucet, wallet connection, public signature, broadcast, deployment, post or submission was attempted. Sandbox transactions and Forge signatures use disposable local fixtures only.

The original research drafts remain in docs. design-handoff.md records the earlier workflow restriction and is historical. David subsequently approved the local implementation route.

## Installed tools

Rust 1.95.0 through rustup with wasm32 unknown unknown, rustfmt and clippy. near SDK and contract standards are pinned to 5.30.1. cargo near is 0.23.0. near workspaces is pinned to 0.24.0 and uses near sandbox 2.14.0. Forge and Anvil are 1.9.0. OpenZeppelin contracts are pinned to 5.4.0.

OpenSSL headers and libraries were already available. The sandbox build needed explicit OPENSSL_DIR, OPENSSL_LIB_DIR and OPENSSL_INCLUDE_DIR because pkg config is absent. scripts/test-local.sh supplies those paths.

## Final verification

The complete committed pipeline ran through bash scripts/test-local.sh and exited 0. evidence/final-local-run.log contains the raw result. There were 35 passing tests in total and no final failures or skips. Earlier compiler and test naming issues were fixed and rerun. The SVG generator also ran and checked exact bilingual text and 1080 square dimensions. cargo fmt check passed.

The controller WASM built successfully through cargo near. It is 226347 bytes. Its SHA256 is 4f29640e17f469b299b4e6e7ebf20ff52f50a2a28cb23a778866ff3691cd54dd. This is a local nonreproducible build. No reproducible Docker build or deployment is claimed.

### Rust unit suite

cargo test -p feral-controller --lib ran 19 tests. All passed.

```text
arbitrary_strategy_hash_refused
callback_duplicate_refused
callback_without_result_refused
checked_promise_callbacks
dead_cannot_pay
deposit_does_not_revive
duplicate_birth_refused
exactly_ten_survives_once_then_dies
failed_birth_refunds_even_if_parent_dies
job_replay_refused
native_overflow_refused
paper_playthrough
repeated_tick_refused
reserved_money_cannot_fund_second_birth
service_replay_refused
stale_demand_cannot_pay
successful_cleanup_after_parent_death
unauthorized_tick_refused
underflow_refused
```

The two parent death cases use unit state and mocked promise results. They do not prove concurrent public chain timing. The checked callback test covers one success and one failed promise. Callback privacy is tested through the real exported sandbox method.

### Sandbox integration suite

cargo test -p feral-integration --test playthrough -- --nocapture ran sandbox_paper_playthrough_and_failure_paths. It passed.

It reproduces the fixture from 1000 initial MUNCH through the two turns. Upkeep reduces supply first to 980 and then to 950. Every tested stage checks summed balances against supply and supply plus cumulative burns against 1000. A pays B 30 for the deterministic translation artifact, receives 90 for the actual SVG hash and funds a child with 100 MUNCH. The final balances are market 510, A 190, B 155, extinct C 5 and child 90.

The child exists as a real local NEAR account with exactly 60000000000000000000000 yoctoNEAR and 100 bytes of account storage. It has a changed canonical policy hash. The account has no keys or code. The controller keeper acts for it.

The sandbox also verifies direct dead actor spend refusal, direct dead NEP 141 transfer refusal, duplicate birth refusal, external callback forgery refusal, resolved birth reconciliation refusal, existing child creation failure with MUNCH and native entitlement restoration, and repeated tick refusal. The account failure is an expected intermediate failed receipt. The checked callback returns false and the test passes.

Only MUNCH conservation is asserted across the complete playthrough. Child native funding and reserve refund are checked, and receipt gas information is retained. Full network native balance reconciliation across every gas fee, rebate and storage lock is not yet implemented.

### Solidity suite

forge test -vv ran 15 tests. All passed.

```text
testBadSignatureRefused
testCampaignCap
testChangedAmountRefused
testChangedRecipientRefused
testExpiredRefused
testJobReplayWithFreshNonceRefused
testPerVoucherCap
testReentrancyBlocked
testReplayRefused
testTotalCap
testTransferFailureRollsBackNonce
testValidVoucherPays
testWrongChainRefused
testWrongTokenRefused
testWrongTreasuryRefused
```

The wrong chain and wrong treasury tests independently prove domain binding. The malicious token test attempts reentrancy during transfer. Failed token transfers leave nonce and spending state unchanged. All signatures are local fixture signatures. MPC and Sepolia were not exercised. Anvil is installed but the voucher tests run inside Forge's local EVM, not an Anvil network.

## Model runtime result

Ollama 0.40.15 installed and started successfully on CPU at localhost. The first archive extraction failed because zstd was missing. A local Python archive dependency resolved that installation issue. The system package repository itself returned errors and was not weakened or reconfigured.

The qwen2.5 3b model download failed. Ollama refused the registry storage redirect because its hostname resolved to nonpublic 198.18.0.1. No bypass was attempted. The server was stopped. No inference ran, so there is no measured inference latency or token rate. evidence/model-runtime.json records this result. The caption artifacts are deterministic fixtures and must never be presented as live model choices.

## Implemented architecture

One controller owns the integrated MUNCH ledger, job escrow and pending birth escrow. Integer arithmetic and finite initial supply separate token transfers from native account funding. Tick commits extinction and returns normally. Later ordinary actor calls panic for extinct actors. Token deposits cannot revive them. Native deposits also cannot revive them.

Birth validates a direct subaccount, unique child ID, nonce, one pending birth per parent, creature capacity, native reserve, token allocation and parent floor. It reserves value before a create account and transfer Promise batch. A private callback checks exactly one bounded result. Callback cleanup deliberately ignores parent active state. A successful child is credited only once. A failed creation restores frozen parent entitlements without reviving the parent.

Missing callbacks have no timeout refund. reconcile_birth is an owner only trusted recovery method. Its evidence hash is recorded but the contract does not independently verify the external account or receipt evidence. An operator who lies can misuse that administrative recovery power. Do not market it as trustless recovery. Injecting a real successful creation followed by callback failure and recovering it in sandbox remains a required next test.

Strategies are four canonical safe manifests returned by strategy_manifest. The contract checks their hashes and bounded profile identifiers. These are inherited toy economic policies, not mutated model weights.

The Solidity treasury binds all voucher fields and the EIP 712 destination domain, rejects replay by both nonce and campaign job, and enforces per voucher, per campaign and global caps. Its test token is an ordinary fixed initial supply ERC20. It is separate from NEAR MUNCH.

## Not implemented

There is no controller MPC request adapter, NEAR side EIP 712 encoder, returned signature parser, actual controller scoped address derivation, relayer, destination receipt observer or signed liability state machine. The derivation and relayer ownership rules remain in chain-signatures-plan.md. The derived signer must use controller account plus child scoped path. The relayer alone needs ETH for the voucher rail.

There is no live model decision runner, independent agent negotiation, autonomous keeper service, terrarium interface, playable demand controls, NFT ownership or NFT behavioural permissions. The generator and translation are real files with reproducible hashes, but their contents are chosen fixtures. The current job verifier is the trusted owner call. No claim of autonomous useful work follows from the deterministic test.

No production audit, fuzz campaign, multiuser load test, full storage economics audit or public testnet proof has run.

## Toward the 9 November WAT gate

First add the real agent loop around the two bounded tools and label deterministic replay separately. Resolve inference through an approved route without bypassing the blocked model download. Add fault injection for a failed callback after successful account creation and a repeatable evidence recovery test. Complete exact native accounting and a clean local runner. Then request the approvals below and reproduce paid work, upkeep, extinction and a funded child on public testnet before expanding scope.

The crosschain wow moment still requires the controller voucher construction and liability reservation code, local crosschain integration tests, an approved MPC signature and an observed destination payout. Do not claim the wow moment works yet.

## Separate approvals still needed

David must approve the exact NEAR testnet account creation or connection. Wallet secrets stay with David through the sanctioned sign in flow.

David must separately approve faucet funding for that named account and the exact funding amounts.

David must approve controller deployment with the code hash, initialization owner and native funding cap.

David must approve the initial funded creature registrations and the testnet loop calls that allocate or move MUNCH, burn upkeep, pay work and create the funded child. Each actual wallet action needs its own exact payload approval.

David must approve any testnet recovery or redeployment transaction separately.

David must approve the exact MPC sign request with controller account, child scoped path, voucher digest, deposit and gas cap.

David must approve the Sepolia relayer account setup or connection, then faucet ETH funding for that named address.

David must approve the test ERC20 deployment and initial mint, the treasury deployment with its actual signer and spending caps, and the token transfer that prefunds the treasury. These are separate transactions.

David must approve the precise voucher redemption broadcast and gas cap. Any replacement transaction needs separate approval.

If external inference is chosen, David must approve the provider, prompt data disclosure and spending cap. No external API credential has been used.

Public GitHub repo creation, adding its remote and pushing code require separate approval. Demo publication, an X post and hackathon submission also require separate approvals. None has been performed.
