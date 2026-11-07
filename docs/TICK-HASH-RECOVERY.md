# Hashless death tick diagnosis and fix

## Observations

Only public read queries, local code changes and local tests were performed by the executor. No public signing or sending was performed. The existing live journal was not reset, edited or resolved by the executor.

The finalized controller state is still turn 0, demand 1, burned 0 and supply 1000. Ash is still active. The root has one full access key with nonce 276606257000011. The successfully finalized cancel-old-job transaction has exactly that nonce. No subsequent transaction has consumed the key nonce, including a contract failure. Therefore the death tick has not landed as of these observations.

The rendered public nearblocks account page lists twelve root account transactions including faucet creation, with cancel-old-job as the most recent. The controller's self signed deployment is a separate transaction and is not a root outgoing transaction. The public indexer API URL returned 404, but the normal account page loaded. The indexer may lag, so finalized RPC state and nonce are the stronger evidence.

The death tick intent began at 09:44:19.206 WAT on 7 November 2026. Both the terminal log and the journal were last modified at 09:44:19.900 WAT, about 0.694 seconds later. This is not the old 240 second watchdog timeout. The runner threw away raw CLI output and failed to retain exit status or signal. The exact underlying CLI error cannot be reconstructed. A quick CLI or RPC preflight failure is consistent with the evidence. A regex missing a landed successful tick is not consistent with the unchanged finalized nonce and turn.

Raw public RPC evidence and file timing are saved in evidence/testnet-tick-diagnosis.json. The read only recovery guard passed and its observations are in evidence/testnet-tick-recovery-dry-run.txt.

## The fix

Every new transaction now uses near cli's sanctioned sign-with-legacy-keychain save-to-file mode first. This cannot broadcast. Signed transaction files are kept only inside the ignored .local-transactions directory with directory mode 700 and shell umask 077. Never print, upload or commit them.

The offline Rust inspect_signed helper decodes the file with official near-primitives 0.38.0, validates its signature, computes the canonical transaction hash and exposes only public metadata. No key is read by the helper. The runner checks intended actions, then persists the hash and nonce in the journal before invoking near cli's file-with-base64-signed-transaction broadcast command. Hash discovery no longer depends on CLI terminal formatting. The public RPC class remains read only.

CLI prepare and broadcast results now retain phase, exit code, signal, watchdog status and allowlisted error indicators. Raw output, signatures, signed blobs and keys are not recorded in public evidence. A prepare-only failure is explicitly labelled and may safely prepare again because broadcast was never invoked. A known hash is never replaced with a newly signed transaction on an ambiguous broadcast.

The offline helper is already built on this box. To rebuild, use the OpenSSL environment from scripts/test-local.sh and run cargo build -p feral-integration --example inspect_signed. The first standalone build omitted that environment and failed before tests. Rerunning with the existing environment succeeded.

## Exact parent command

Do not use a made up resolve hash. There is no discovered death tick transaction to resolve. Do not delete the journal or manually mark the old intent as successful.

```sh
cd /workspace/near/feral
bash scripts/testnet-run.sh --execute --account feral-039832.testnet --retry-unconfirmed-tick death-tick
```

This is a narrowly scoped recovery exception, not a generic force retry. It rechecks the predecessor transaction, the single access key and its unchanged nonce, turn zero, zero burns and Ash's active state. It archives the original unresolved intent instead of discarding it. The prepared replacement must use the same public key and exactly nonce 276606257000012. It will not automatically choose a higher nonce.

A pending transaction can never be conclusively excluded just from views. Pinning the competing nonce prevents two same nonce transactions from both being accepted. The contract also requires tick next_turn to equal the current turn plus one, so tick(1) cannot burn upkeep twice even if a competing transaction appears. If another transaction wins the race or the guards change, the runner stops rather than silently raising the nonce or refunding anything. Find the real winning transaction and resolve its hash after review.

After this explicit recovery, ordinary clean checkpoint resumes use the normal execute command without the retry flag. Generic legacy hashless submissions remain blocked. A prepared hash with no confirmed outcome also remains stopped for explicit review; do not sign a replacement merely because a status lookup failed.

The dry run can repeat all recovery checks without writing the live journal, signing or sending

```sh
bash scripts/testnet-run.sh --dry-run --account feral-039832.testnet --retry-unconfirmed-tick death-tick
```
