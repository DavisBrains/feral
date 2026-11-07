# Extinct rejection recovery

The runner had already finished its broadcast child with exit code 1. Its journal still said broadcasting because the following confirmation phase did not have its own state. Confirmation made 30 requests with wait_until FINAL. Each request could wait 30 seconds, with two seconds between attempts. That explains roughly sixteen minutes of silence and the open TLS connection. The original CLI error text was deliberately discarded, so its exact cause cannot be recovered from the old flags.

Read only checks on 7 November 2026 found ash with 0.01 NEAR, 182 storage bytes, an unchanged access key nonce of 276607826000000 and a prepared nonce of 276607826000001. At the observed gas price of 100000000 yoctoNEAR per gas, 30 Tgas costs at most 0.003 NEAR before refunds. Storage backing is 0.00182 NEAR, leaving 0.00818 NEAR. This rules out a currently exhausted gas balance. The transaction remains unknown. Ash remains inactive with 5 MUNCH. No finalized extinct panic has been proved yet.

The signed reference block is 276609327 from 09:54:28 WAT. The observed validity period is 86400 blocks, and the read only recovery guard passed. The transaction can still land while its reference block is valid and its nonce is unused. Stopping the local process cannot cancel a submitted transaction.

The fix caps CLI execution at 90 seconds, escalates to SIGKILL after a two second grace period, and caps confirmation at three nonwaiting public status requests. Each request retains its 30 second HTTP limit. The journal now records confirming separately from broadcasting. Confirmation requires FINAL status. An expected rejection must contain an actual contract execution error with the word extinct. A CLI error alone never proves a contract panic.

Explicit recovery only rebroadcasts the identical existing signed file, with the same hash and nonce. It does not sign a replacement, change a step hash, delete a journal entry, or skip any later operation. Before sending it checks the saved transaction, unknown public status, exact unused nonce, death lock, frozen balance, conservative gas reserve and block validity. It refuses a known transaction or any uncertain RPC result. If the transaction becomes known, omit the recovery option and resume normally.

The executor performed no transaction sends, accessed no credential files, stopped no live processes, and left evidence changes uncommitted.

## Parent commands

PID 528606 was already absent when the executor inspected it. No kill is needed. Never remove a live lock or start two runners.

First prove the rejection and stop before any later operation.

```sh
cd /workspace/near/feral
bash scripts/testnet-run.sh --execute --account feral-039832.testnet --retry-unconfirmed-rejection refused-post-death-spend --stop-after refused-post-death-spend
```

If the guard says the transaction is already known, use normal resume with the same checkpoint.

```sh
bash scripts/testnet-run.sh --execute --account feral-039832.testnet --stop-after refused-post-death-spend
```

After expected-failure has been verified, continue the full ordered loop including birth and the child first bid.

```sh
bash scripts/testnet-run.sh --execute --account feral-039832.testnet
```

Do not reuse the old retry-unconfirmed-tick option. The death tick is already final. If a retry stops with an expired transaction, do not delete or re-sign the old file. Review recovery separately.
