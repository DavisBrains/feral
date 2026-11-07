# Extinct rejection recovery

The runner had already finished its broadcast child with exit code 1. Its journal still said broadcasting because the following confirmation phase did not have its own state. Confirmation made 30 requests with wait_until FINAL. Each request could wait 30 seconds, with two seconds between attempts. That explains roughly sixteen minutes of silence and the open TLS connection. The original CLI error text was deliberately discarded, so its exact cause cannot be recovered from the old flags.

Read only checks on 7 November 2026 found ash with 0.01 NEAR, 182 storage bytes, an unchanged access key nonce of 276607826000000 and a prepared nonce of 276607826000001. At the observed gas price of 100000000 yoctoNEAR per gas, 30 Tgas costs at most 0.003 NEAR before refunds. Storage backing is 0.00182 NEAR, leaving 0.00818 NEAR. That initial estimate was wrong. It used the current burn price and missed the minimum gas purchase price. See the correction below. The transaction remains unknown. Ash remains inactive with 5 MUNCH. No finalized extinct panic has been proved yet.

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

## Corrected submission diagnosis

The protocol runtime config reports min_gas_purchase_price of 1000000000, ten times the observed current burn price of 100000000. The receipt gas must be purchased upfront at the higher price. The signed 30 Tgas call therefore requires 0.030920322345544 NEAR, including action and receipt fees. Ash has only 0.01 NEAR. The transaction is balance-rejected before any contract execution. The earlier statement that gas shortage was ruled out was incorrect.

The saved signature and transaction hash both verify offline. The signing public key matches ash's public access key, the nonce is exactly its unused next nonce, and the reference block is still valid. These checks isolate the prepaid purchase balance as a concrete rejection condition. No original server error is recoverable because previous runner versions discarded the text. Future broadcast diagnostics now preserve redacted CLI output, including public RPC errors, in the journal. A nonzero CLI exit with unknown public status stops immediately rather than entering the long confirmation loop. A known contract panic is still verified using public final status.

An explicit repair lowers only this rejection call to 5 Tgas. Its upfront cost is 0.005920322345544 NEAR, below the conservative balance after storage of 0.00818 NEAR. The repair rechecks the public status, key, nonce, dead state, balance and exact saved signed transaction. It requires the original computed cost to exceed the entire account balance and requires the replacement to fit after storage. It archives the original signed file and full journal entry, then prepares a fresh block hash with exactly the same public key and nonce. Both attempts remain recorded. A nonce race can reject the replacement but cannot cause two executions.

The old transaction is not claimed permanently invalid under every possible future balance or protocol change. It is invalid under the observed public state. Same-nonce competition is the additional exclusivity guard. Do not top up ash while repairing. If the original becomes known or its nonce changes, repair refuses. No transaction was broadcast by the executor. An isolated CLI diagnostic had networking disabled; a further isolated diagnostic was blocked by Auto-review and was not retried.

Use this explicit parent-only repair command instead of the identical rebroadcast command above.

```sh
cd /workspace/near/feral
bash scripts/testnet-run.sh --execute --account feral-039832.testnet --repair-rejected-spend --stop-after refused-post-death-spend
```

After the expected-failure checkpoint is proved, resume without recovery options.

```sh
bash scripts/testnet-run.sh --execute --account feral-039832.testnet
```

If preparation has already been journaled but the repair command is interrupted, use ordinary resume. Never repeat repair blindly or remove the archived original. The remaining plan's conservative budget was also updated to use the purchase floor and remains affordable.

Validation passed 64 JavaScript tests and the full local sandbox playthrough, including an actual extinct panic with 5 Tgas and the later funded birth. CLI timeouts now terminate the entire launcher process group, including its native child. Preparation output is omitted from diagnostics to avoid recording generated secrets; only redacted signed-broadcast output is retained.
