# NEAR testnet runner handoff

This is a code only handoff. The parent subsequently ran the first twelve transactions and stopped before the death tick. Read [TICK-HASH-RECOVERY.md](TICK-HASH-RECOVERY.md) for its diagnosis, fix and exact guarded resume command. The executor sent no public transaction and never opened the credential file. The parent supplied the already created throwaway account feral-039832.testnet. The earlier public status section in PHASE2.md is historical and superseded here.

## Command for the parent

The working directory is /workspace/near/feral. The model service must be healthy on loopback port 11435. It is already running at handoff. Only if it has stopped, start it in a separate terminal with the offline command below.

```sh
cd /workspace/near/feral
HF_HOME=/workspace/near/hf-models HF_HUB_OFFLINE=1 /workspace/near/local-model/bin/python agents/model_server.py
```

Preview without reading credentials, signing or sending

```sh
cd /workspace/near/feral
bash scripts/testnet-run.sh --dry-run --account feral-039832.testnet
```

The parent can then run the live gate

```sh
cd /workspace/near/feral
bash scripts/testnet-run.sh --execute --account feral-039832.testnet
```

Do not run two execute processes. There is an exclusive lock. A clean exit removes it. If a process was killed hard, inspect the PID in evidence/testnet-run.lock and confirm it is no longer running before manually removing only that stale lock. Never delete the journal to bypass a stopped run.

## Budget from the real public read only preview

The root balance was 10 NEAR. The pinned normal WASM is 337694 bytes. The controller receives 3.8 NEAR, including code storage backing, a 25000 byte state allowance and operating margin. Three keyed starting accounts receive 0.01 NEAR each. Registrations attach native reserves of 0.20, 0.10 and 0.02 NEAR.

Total transfers are 4.15 NEAR. The conservative fee allowance is 1 NEAR. Maximum outlay estimate is therefore 5.15 NEAR, leaving an estimated 4.85 NEAR in the root. The check additionally retains a 1 NEAR margin and root storage backing. These are conservative planning allowances, not a binding fee quote. Storage backing is locked native value, not a second fee. The child's 0.06 NEAR comes from the parent's existing 0.20 reserve and is not counted twice. The script recomputes affordability on every invocation.

MUNCH and life NFTs are integrated in the controller WASM through near contract standards. They do not need separate contract deployments. No public fault artifact, mock signer or EVM contract is deployed.

## The minimal public gate

There are 24 planned transactions, not counting the root creation already supplied by the parent.

1. Create the controller account, deploy the pinned production WASM and initialize the root as owner.
2. Create three small keyed creature accounts and register allocations of 250, 145 and 5 MUNCH. Verify their life NFTs.
3. Use Qwen for the old short caption bid. Change demand and cancel the old job.
4. Tick to commit extinction. Ask the live model what the dead creature would do, then deliberately submit one forbidden spend signed by that creature. Only the expected extinct failure counts as success for this test.
5. Ask Qwen for the help purchase and provider quote. Render a real bilingual SVG and translation track from the supplied transcript. Pay 30 MUNCH for collaboration, record the parent's 90 MUNCH bid and settle the card job against the generated output hash.
6. Set the NFT goal to lineage and ask Qwen to reproduce. Birth funds a real keyless child subaccount with 0.06 NEAR and 100 MUNCH through the checked callback. Verify the actual child account, lineage and life NFT.
7. Tick again and ask Qwen for the child's first bid. The changed strategy bids 80 MUNCH. Check final balances of 190, 155, 5 frozen and 90, supply of 950 and actual burn of 50.

Seven live Qwen decisions drive this loop. A fallback, malformed decision or unexpected model choice stops execution instead of being replaced with a deterministic action. Model JSON is independently validated against the bounded schema. Job matching and work acceptance remain keeper trusted. The card uses supplied bilingual text and does not claim automatic translation. Set FERAL_TRANSCRIPT before the first run to use a different supplied bilingual transcript. Its hash is locked into the journal.

## Stop and resume

To stop at a known checkpoint, use the exact step label from dry run

```sh
bash scripts/testnet-run.sh --execute --stop-after paid-job
```

Run the same execute command again to resume. Completed operations are verified by public transaction and state reads. They are not signed or sent again. Persisted decisions are reused and labelled as recorded live decisions, not fresh inference. Ctrl C during CLI submission prevents further submissions after the current result is durably recorded. A hard kill may leave a stale execution lock.

An intent is saved before invoking near cli. Any captured transaction hash is persisted immediately. If the CLI exits or is killed before the script captures a hash, the journal blocks automatic retry. Inspect the signer's explorer and find the exact matching transaction. A discovered hash can be supplied explicitly

```sh
bash scripts/testnet-run.sh --execute --resolve-hash create-controller=THE_REAL_HASH
```

The script verifies signer, receiver, action types, funding, method arguments, gas, deposit and final outcome before accepting a recovered hash. If an intent is proven never submitted, review it manually before clearing only that intent. There is intentionally no force retry or journal reset option. Public raw CLI output is not saved because key generation stays inside near cli's legacy keychain flow. New calls save a protected signed file first and persist its canonical hash before broadcasting, so they no longer depend on CLI output parsing.

A successful account creation with a failed birth callback must remain stopped for explicit reconciliation. Never recreate the child or automatically refund its committed native funding. The public runner does not inject faults or perform recovery mutations.

## Evidence

The authoritative journal is evidence/testnet-journal.json. It contains public operation intents, hashes, model decisions and state events, never keys. The script generates evidence/testnet-run.md and evidence/testnet-transactions.json with every captured hash and a testnet.nearblocks.io link. Nested asynchronous birth receipt IDs and outcomes are included. The default dry run writes only evidence/testnet-plan.json and console output, not the live journal.

Deployment is labelled deploy-controller. Registrations are register-moss, register-echo and register-ash. Work and collaboration are paid-job and paid-collaboration. Extinction and rejection are death-tick and refused-post-death-spend. The birth and first bid are funded-child-account-creation and child-first-bid. The child creation is a receipt under the birth transaction, not a fabricated separate transaction hash.

The runner has local verification and twelve parent executed public successes. The full live loop is not yet complete. No MPC call, Sepolia, wallet belonging to David, GitHub, push or posting is part of the script. Those actions still need their own separate approval if later desired.

## Real local verification

The full local test pipeline and the runner safety tests were run, not just written. There are 103 unique passing tests and no failures or skips. This comprises 27 Rust unit tests, four sandbox integration tests, 10 agent and tool tests, 37 runner tests and three offline decoder tests, seven app and voucher tests and 15 Forge tests. The pipeline also rebuilds the normal and fault WASM artifacts separately, runs the live sandbox economy, type checks and builds the UI, and reports zero known npm vulnerabilities.

The 37 runner tests and three offline decoder tests include budget math, read only RPC enforcement, signer and receiver scope, all 24 CLI command grammars using local help only, exact transaction matching, expected failure handling, live decision validation, operation tamper checks, an exclusive lock, durable hash recovery, no hash refusal and no duplicate submissions. They use injected local mocks and do not execute public signing. The public runner itself has not been tested live.

```sh
bash scripts/test-local.sh
node --test scripts/testnet-run.test.mjs
```

Logs are evidence/testnet-preflight-local-tests.log and evidence/testnet-runner-tests.log. The latest live local economy is evidence/terrarium-run.json. Its seven inference timings are recorded with the real model decisions.
