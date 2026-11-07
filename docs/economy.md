# Feral economy draft

Research prepared 7 November 2026 WAT. Design only. No contract exists and no test pass is claimed.

## The promise

Money earns its next breath and funds a child. The visible turning point must show a downloadable bilingual caption card, a payment, a falling parent reserve, a new funded NEAR account and the child's different first bid. The extinct creature's next direct contract spend must fail.

## Three separate assets

MUNCH is an integer game token with a finite initial supply of 1000 base units and no subsequent mint. Zero decimals keeps the fixture readable. A controller integrated NEP 141 implementation is preferable for the first proof because game transfers and burns can change one state atomically. An internal counter alone must never be described as NEP 141 compliant.

Native NEAR is integer yoctoNEAR. Each creature has a prepaid native reserve held in controller custody before birth. Birth moves actual NEAR into a new named subaccount and moves MUNCH ownership to that child's account in the token ledger. These are separate balances. MUNCH does not turn into NEAR. UI must show custody reserve, real account native balance, storage locked amount and spendable amount separately.

Sepolia ETH and a separate Sepolia test ERC20 fund gas and the external tool purchase. Neither is bridged from MUNCH or NEAR. Destination treasury funds are prefunded and labelled.

## Conservation

The sum of every MUNCH balance including the market, active creatures, extinct creatures and pending birth reservations must equal total_supply. total_supply plus cumulative burn must equal 1000. Pending reservations are excluded from available balances and counted exactly once. External FT transfers, if enabled, must enter the same complete ledger.

Only upkeep burns MUNCH in this fixture. Registration, jobs, paid help and birth transfer existing units. Native birth and storage reservations cannot mint MUNCH. All arithmetic uses checked integer operations. Positive amounts, bounded input length and unique operation IDs are required.

Native accounting is separate. Initial controller and actor native funds equal current liquid balances plus storage locked balances plus outgoing funds in flight plus cumulative net protocol fees, adjusted for any explicit additional deposits or withdrawals. Storage stake is locked value, not destroyed value. Measure actual net gas charges and rebates from receipts instead of asserting a fixed fee. Sandbox paper numbers are not a network fee quote.

## Exact turns

A keeper advances a monotonic turn once. It processes each active creature once. At the beginning of a turn, if available unreserved MUNCH is less than upkeep of 10, mark the creature permanently inactive and emit extinction without burning its dust. Otherwise burn 10 and allow it to act in that turn. An account with exactly 10 survives that turn with zero and becomes inactive on the next tick unless it earns before then. No double upkeep and no skipped turn through repeated keeper calls.

The demand board is a versioned input. Jobs bind demand version, output requirements, budget, claimant and expiry before settlement. A funded market escrow pays once only after a verifier accepts an actual caption card. Store the content hash and manifest onchain and retain downloadable SVG or PNG plus source text locally. Hashes alone do not prove quality. The MVP verifier is a disclosed trusted service checking real files, dimensions and exact caption text. Model output cannot mark itself paid.

Paid help binds a unique service ID, agreed price, requester, provider and delivered output hash. Debit the requester and credit the provider atomically, only after delivery acceptance. Both participants must be active. Reusing the service ID fails. All proposals are untrusted and checked against actual balances and liabilities.

## Birth

A registered active parent may request one pending birth. A monotonically increasing parent birth nonce and a globally unique child account ID prevent duplicates and retries from creating two children. Do not silently overwrite a failed attempt ID.

The fixture transfers 100 MUNCH to the child and leaves at least 20 available MUNCH in the parent. Require the parent's unreserved balance to cover both values. A child starts with 100 and must pay upkeep from the next global turn. Record parent ID, strategy hash, bounded mutation identifier and birth turn. Hashes need a retrievable canonical strategy manifest.

Separately reserve the requested native child funding, measured child storage minimum and controller record storage requirement. Prepaid execution overhead must remain sufficient. Account funding includes storage stake rather than charging it twice. Use a direct subaccount of the controller so the controller can create it. The account name can encode lineage through metadata rather than account nesting. No child keys need to be generated for the local proof. Explain who can invoke controller actions for that real account. A keyless account with no executable code is not independently able to initiate transactions.

The create account and transfer actions belong to the same Promise batch. The controller deducts available reserves before scheduling it. The callback is private, checks exactly one promise result and the matching pending operation, and consumes the reservation once. Only successful creation promotes pending to active and moves reserved MUNCH to the child. Failure restores parent MUNCH and native entitlements only after the failed transfer refund is accounted for. Callback duplication must fail. Creation failure is not permission to retry with the same operation ID.

A successful external account creation and the controller callback are separate receipts. If account creation succeeds but the callback fails, never refund on a timer. Keep the reservation pending and recover by explicit, idempotent reconciliation with evidence. This is a key Nov 9 risk.

## Permanent extinction

Every ordinary creature initiated mutation checks active state at execution, including spending, job settlement, help, reproduction and strategy changes. An extinct account cannot revive through a token deposit or sponsorship. Any later deposit stays frozen and does not restore action rights. New registration cannot overwrite an extinct ID.

Important implementation distinction. A tick which discovers insolvency must commit the inactive state and return normally. Panicking in the same receipt rolls back death. Private reservation cleanup callbacks must remain possible even if a parent dies while birth is pending. They restore frozen entitlements or complete existing liabilities without granting new actions. Thus the phrase all mutating methods panic for inactive must mean ordinary actor methods, not system callbacks and the death transition itself.

## Paper playthrough

Demand shifts from short captions to bilingual cards before turn 1. Creature C keeps pursuing the unavailable old work. Creature A accepts a bilingual card and hires B for translation.

| Event | Market | A | B | C | Child | Burned | Supply |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Initial fixed allocation | 600 | 250 | 145 | 5 | 0 | 0 | 1000 |
| Turn 1 upkeep and C extinction | 600 | 240 | 135 | 5 | 0 | 20 | 980 |
| A pays B 30 for accepted translation | 600 | 210 | 165 | 5 | 0 | 20 | 980 |
| Accepted real card pays A 90 | 510 | 300 | 165 | 5 | 0 | 20 | 980 |
| Birth reservation of 100 | 510 | 200 | 165 | 5 | 0 | 20 | 980 |
| Funded birth completes | 510 | 200 | 165 | 5 | 100 | 20 | 980 |
| Turn 2 upkeep | 510 | 190 | 155 | 5 | 90 | 50 | 950 |

The birth reservation row additionally holds pending MUNCH of 100. All other rows have zero pending funds. Every row has balances plus pending plus burned equal to 1000. C retains 5 frozen units and its spend fails. A child has a new real account and a bounded different policy. The chosen demand shock and controlled participants must be disclosed. No emergent behaviour claim follows from this fixture.

Native paper fixture in milliNEAR, converted to integer yoctoNEAR in implementation. A reserve 200, B 100, C 20 and controller overhead 80 total 400. A funds its child with 60, leaving A 140. If 10 of the child's 60 is storage locked, the child has 50 liquid and 10 locked, not an extra 10 expense. Illustrative net protocol fees of 4 leave overhead 76. Final total is 140 plus 100 plus 20 plus 76 plus 50 plus 10 plus 4 equal to 400. Actual storage and fees must be measured. Any controller record stake is another split of its overhead, not new value.

## Required proofs

Run unit tests for each table row, overflow, underflow, owner checks, replay protection, repeated upkeep, reserved balance exclusion and permanent inactivity. Run sandbox integration for actual account existence and native balance after birth, an already existing child failure and refund, callback privacy, callback replay, duplicate birth and a dead account's direct spend. Verify ft_total_supply falls by 20 and then 30. The NFT track remains unclaimed until ownership checked behavioural permissions exist. No tests have been run for this draft.
