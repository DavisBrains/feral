# Phase 2 local implementation

Recorded 7 November 2026 at 9.20 AM WAT.

## Completed verification

FERAL_USE_MODEL=1 FERAL_REQUIRE_MODEL=1 bash scripts/test-local.sh exited 0. The raw evidence is evidence/phase2-final-run.log. All 63 tests passed with no final failures or skips.

There are 27 Rust unit tests, four sandbox integration tests, ten Node agent and tool tests, seven app and voucher tests, and fifteen Forge tests. A trailing pip version probe after the standalone model benchmark failed because this uv managed environment has no pip module. The Node benchmark itself completed its 21 matches. Package installation and freezing used uv. The final complete pipeline independently exited 0.

The three contract WASM builds passed. The TypeScript check, production Vite build and npm audit passed. The final app dependency audit reports zero known vulnerabilities after upgrading Vite to 7.3.7 and ethers to 6.17.0.

The normal controller artifact is target/near/feral_controller/feral_controller.wasm. Its SHA256 is 1745c9d85d48f112e0e8d4f358f12c8a62a4f028058e219e8b84a084476b27bb and its size is 337694 bytes. The fault artifact in target/fault is a separate build and must never be deployed publicly.

## The brains really run

The successful route is ordinary unauthenticated Hugging Face safetensors downloads, transformers 5.22.2 and torch 2.15.0 CPU. No network restriction was bypassed and no credential or paid inference service was used. Downloads completed normally. After downloading, the server runs offline on the box at 127.0.0.1 port 11435. The selected creature model is Qwen2.5 1.5B Instruct. Its exact model identifier and cached revision are pinned in agents/model-lock.json. Python dependencies are recorded in agents/model-requirements.lock.txt.

The decoder generates JSON through a token trie containing legal actions. The model selects between those actions, including waiting. Prices and spending limits come from bounded inherited policies. Independent JavaScript validation checks the returned action again before the keeper invokes any contract method. This is constrained model decision making, not unrestricted agent planning. It is not a deterministic decision table disguised as a model.

Seven controlled situations were repeated three times. All 21 decisions were valid and matched the scenario objectives. Measured inference took 1.17 to 3.59 seconds with a median of 2.51 seconds. These repeats are a narrow deterministic benchmark, not a general intelligence or statistical reliability claim.

The final complete sandbox loop used seven actual local model decisions and zero fallback decisions. Their measured inference times were 1.28 to 2.74 seconds with a median of 2.66 seconds. The actual actions were an old short caption bid, waiting after extinction, buying translation help for 30, offering that help for 30, bidding 90 for the parent card job, funding a child and bidding 80 as the child. The mode and timings are attached to each decision event.

### Exactly what was tried

The earlier Ollama qwen2.5 3b attempt remained blocked by its registry storage redirect resolving to a nonpublic address. It was not bypassed or retried through a disguised route. Its unused server is now stopped.

SmolLM2 135M Instruct downloaded normally and ran on CPU. A transformers input API mismatch was corrected, then it generated repetitive dates instead of valid decisions in two free generation trials. It was rejected.

Qwen2.5 0.5B Instruct downloaded normally and ran. Free generation produced invalid fields and an out of budget price. Constrained generation made legal decisions, but the initial goal prompt chose to wait instead of reproducing. A live run genuinely stopped at that decision. Improving the prompt made it reproduce but caused it to wait in other useful work situations. It was rejected as the live demo brain. Both benchmark files and the stopped run are retained.

Qwen2.5 1.5B Instruct also produced unsafe prices during free generation. Those outputs were never executed. With constrained generation and independent validation it passed the 21 decision benchmark and completed the full sandbox economy. Its model choices drive the actual contract calls. Deterministic policy remains available only as a labelled replay and safety fallback. The default verification script requires the live model and aborts rather than silently falling back.

## Autonomous local loop

integration-tests/examples/terrarium.rs creates a disposable local sandbox and drives the complete loop. There are 26 structured events in evidence/terrarium-run.json. Every event snapshots actual controller balances, life state, native totals and NFT holder. Each snapshot checks MUNCH conservation.

It starts with three separately funded accounts and a fixed 1000 MUNCH supply. It records the old bid, changes demand, commits extinction and verifies a direct forbidden spend. Two separate creature observations produce the help purchase and provider quote. The keeper runs the transcript tool, checks its real outputs, pays the provider, records the parent bid and settles the work. The parent then funds a real child account and life NFT. After another tick the child records its first different onchain bid.

The final balances are 190, 155, 5 frozen and 90 MUNCH. Available market funds are 420 and another 90 is escrowed for the child's first job. Total supply is 950 and cumulative burn is 50. The child's job has only been bid on, not falsely reported as paid.

### Real work output

agents/tools.mjs accepts an arbitrary supplied bilingual transcript within published size bounds and renders a new SVG card. The output, extracted translation track and source manifest have independently computed hashes. The supplied translations are disclosed. This is real dynamic rendering and translation track preparation, not a claim of AI translation.

The runner accepts FERAL_TRANSCRIPT pointing at another input file. Tests prove two different supplied transcripts generate different cards and that SVG text is escaped. Current work is in evidence/live-work/card.svg with its manifest and translation track. No static caption fixture is copied by the runner.

## Callback failure and native accounting

A feature gated sandbox build injects an actual panic in the callback after the account creation Promise succeeded. The account exists with 0.06 NEAR while 100 MUNCH stays reserved. Advancing time and ticking does not refund the successful creation. Trusted explicit reconciliation completes the existing birth once. A second attempt to refund or reconcile it fails.

The native audit covers that failed callback, a failed create batch with actual native refund, and a successful create plus callback. It waits for receipt refunds before comparing balances. In each case it checks the sender's actual debit against summed receipt gas charges and reconciles total account balances including the child. Storage backing is part of the native balance, not an extra expense. For these sandbox cases the measured contract reward was zero. Do not generalize sandbox fees to public testnet. Exact values are in evidence/native-reconciliation.json.

Recovery is still owner trusted. The evidence hash is recorded but not cryptographically verified by the controller. This must not be called trustless recovery.

## Life NFTs have permissions

The controller uses near contract standards NEP 171 core and metadata. Every successful creature registration or birth mints a unique life NFT. A child inherits the parent's current NFT holder. The NFT grants no withdrawal right.

Only the current holder can sponsor from the holder's own MUNCH or set a bounded goal. A preserve goal blocks reproduction at the contract level and in the decision layer. Transferring the NFT transfers these permissions immediately. Tests reject former holders, nonholders, overspending and attempts to revive an extinct creature. NFT transfer call rollback is exercised in sandbox, and goal or sponsorship actions are locked during an in flight NFT transfer.

## MPC paths are local only

The controller constructs an EIP 712 digest from accepted work, the fixed destination, supported token, campaign, actor and job identities, amount, expiry and nonce. It reserves the separate destination budget and sends the current request shape containing path, payload_v2 with Ecdsa and domain_id 0.

The sandbox mock proves that the immediate signer predecessor is the controller and the path is child scoped. The Rust digest matches ethers independently. A disposable local signing fixture produces an MPC shaped response whose signer is recovered and validated locally. Tests reject altered recipient, amount, nonce, expiry and output, and prove only one mock sign call occurs.

No request was sent to v1.signer-prod.testnet. No Sepolia account, deployment, signing or broadcast occurred. The exact envelope of the public deployed MPC signer still needs verification after approval. A returned signature is not marked paid. Destination receipt observation, paid reconciliation and expired reservation release are unfinished. Reservations stay committed safely rather than being silently reused.

## Terrarium UI

The original flat UI builds and is served locally at http://127.0.0.1:4173/. Use http://127.0.0.1:4173/?frame=final for the completed family tree. It opens with The era of programmable money starts here. It reads the actual structured state log and clearly labels recorded playback, the local network, the live model mode and the controlled participants. It shows draining balances, the dark extinct creature, funded lineage, work download and local receipt trail.

The production assets and JSON return HTTP 200. DOM rendering has not been inspected with a browser. No screenshot was taken because this executor has no browser subagent tool and the desktop skill forbids Shell driven browser automation. The parent can use its browser tool to capture evidence/terrarium-ui.png from the final frame URL. No fabricated screenshot exists.

## Public testnet status

No public chain action was performed. evidence/testnet-run.md records the exact remaining NEAR only gate and truthfully has no public hashes or explorer links. The forwarded approval quote was not independently available as an original owner turn to this executor. The main agent can act using the original owner approval it received. This is not a request to ask David again.

No GitHub repository, remote, push, post or submission was created. The main agent should not infer approval for public MPC requests, Sepolia or publication from the NEAR only scope.

## Run again

```sh
HF_HOME=/workspace/near/hf-models HF_HUB_OFFLINE=1 /workspace/near/local-model/bin/python agents/model_server.py
```

Start that service only if port 11435 is not already running Feral's model. In another shell run the default live verification pipeline.

```sh
bash scripts/test-local.sh
```

For explicit deterministic replay only use both switches below. The resulting evidence and UI are labelled accordingly.

```sh
FERAL_USE_MODEL=0 FERAL_REQUIRE_MODEL=0 bash scripts/test-local.sh
```

## Exact final test names

```text
test tests::arbitrary_strategy_hash_refused - should panic ... ok
test tests::below_strategy_price_refused - should panic ... ok
test tests::callback_without_result_refused - should panic ... ok
test tests::deposit_does_not_revive ... ok
test tests::discounted_bid_settles_exact_price_and_releases_surplus ... ok
test tests::dead_cannot_pay - should panic ... ok
test tests::callback_duplicate_refused - should panic ... ok
test tests::duplicate_birth_refused - should panic ... ok
test tests::job_replay_refused - should panic ... ok
test tests::exactly_ten_survives_once_then_dies ... ok
test tests::failed_birth_refunds_even_if_parent_dies ... ok
test tests::life_cannot_revive_extinction - should panic ... ok
test tests::life_goal_can_block_reproduction_without_draining_funds - should panic ... ok
test tests::life_owner_can_set_goal_and_sponsor ... ok
test tests::former_holder_cannot_sponsor - should panic ... ok
test tests::paper_playthrough ... ok
test tests::checked_promise_callbacks ... ok
test tests::repeated_tick_refused - should panic ... ok
test tests::nonholder_goal_refused - should panic ... ok
test tests::native_overflow_refused - should panic ... ok
test tests::service_replay_refused - should panic ... ok
test tests::reserved_money_cannot_fund_second_birth - should panic ... ok
test tests::stale_demand_cannot_pay - should panic ... ok
test tests::successful_cleanup_after_parent_death ... ok
test tests::underflow_refused - should panic ... ok
test tests::unauthorized_tick_refused - should panic ... ok
test tests::transferred_life_changes_permissions ... ok
test created_account_failed_callback_recovers_without_refund_and_native_reconciles ... ok
test nft_permissions_follow_owner_and_do_not_drain_or_revive ... ok
test controller_scoped_current_mpc_request_matches_ethers_and_mock_signature ... ok
test sandbox_paper_playthrough_and_failure_paths ... ok
✔ policy chooses paid collaboration (0.813745ms)
✔ child has different valid bid (0.121905ms)
✔ dead creature only waits (1.595273ms)
✔ prompt injection cannot redirect payment (0.11503ms)
✔ bounded integer and policy enforced (0.257439ms)
✔ reproduction respects budget (0.1007ms)
✔ model adapter validates and records fallback (0.290713ms)
✔ two supplied transcripts produce different real cards (0.774609ms)
✔ SVG content is escaped and input bounded (0.221465ms)
✔ NFT preserve goal blocks reproduction (0.229115ms)
✔ every playback frame conserves MUNCH (0.626077ms)
✔ playback includes real death birth and child bid (0.439638ms)
✔ receipts are local and never pretend to be public explorers (0.217781ms)
✔ MPC fixture roundtrip recovers fixture signer (28.950642ms)
✔ MPC schema uses current payload v2 (0.708077ms)
✔ signature parser rejects changed digest and recovery (5.422004ms)
✔ domain binds chain and treasury (3.147274ms)
[PASS] testBadSignatureRefused() (gas: 63770)
[PASS] testCampaignCap() (gas: 354876)
[PASS] testChangedAmountRefused() (gas: 63777)
[PASS] testChangedRecipientRefused() (gas: 63763)
[PASS] testExpiredRefused() (gas: 49049)
[PASS] testJobReplayWithFreshNonceRefused() (gas: 225000)
[PASS] testPerVoucherCap() (gas: 53933)
[PASS] testReentrancyBlocked() (gas: 2538401)
[PASS] testReplayRefused() (gas: 212545)
[PASS] testTotalCap() (gas: 509654)
[PASS] testTransferFailureRollsBackNonce() (gas: 1200112)
[PASS] testValidVoucherPays() (gas: 188931)
[PASS] testWrongChainRefused() (gas: 64405)
[PASS] testWrongTokenRefused() (gas: 48955)
[PASS] testWrongTreasuryRefused() (gas: 1106871)
```
