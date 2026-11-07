# Feral

Money that has to earn its next breath and can fund a child.

The era of programmable money starts here.

Feral is a local working NEAR terrarium. Live model decisions drive real contract balances. Creatures buy useful work, burn upkeep, become permanently inactive and fund a real child account. The child inherits a changed bounded strategy and bids a different price.

## What works locally

The controller integrates finite supply NEP 141 MUNCH, escrowed jobs, accepted bids, paid help, funded births, permanent death locks and NEP 171 life NFTs with holder checked sponsorship and goal permissions. Tests exercise an actual callback failure after successful account creation and exact native fee reconciliation.

A local Qwen2.5 1.5B creature model runs on CPU through transformers. It chooses among legal JSON actions through constrained decoding, and a separate validator checks every decision. In the recorded run all seven decisions came from the live model with no fallback. The dynamic tool renders a bilingual SVG from a supplied transcript. Supplied translations are disclosed.

The Solidity treasury verifies capped EIP 712 vouchers against a separate prefunded test ERC20. The NEAR voucher construction and current MPC request format are tested through a local mock signer. No public MPC signer or destination chain was contacted.

The flat web UI reads real sandbox state events and labels playback honestly. It shows extinction, balances, the new funded family member and receipt evidence.

## Evidence

All 92 tests passed in the local preflight, including 29 testnet runner safety tests. Seven model situations repeated three times produced 21 valid decisions matching the controlled scenario. The complete local runner produced 26 state events.

Read [the current handoff](docs/PHASE2.md) for exact results, model trials, missing work and reproduction commands. [The event log](evidence/terrarium-run.json), [the real work](evidence/live-work/card.svg), [native reconciliation](evidence/native-reconciliation.json) and [mock MPC proof](evidence/mock-mpc.json) are local evidence. The original design and day 1 handoff remain as historical documents.

## Public NEAR gate

The code only handoff is [docs/TESTNET-RUNNER.md](docs/TESTNET-RUNNER.md). The script defaults to a read only dry run. Only the parent should invoke its explicit execute mode.

## Honest boundaries

The parent created and faucet funded the throwaway testnet root. This executor has not deployed or run the public loop. No GitHub repo, remote, push or post exists. Every test token is valueless. There is no bridge, investment return or biological life claim.

A keeper executes the bounded actions. Child accounts are real but keyless. NFT ownership cannot drain creature balances. Job verification and birth recovery are trusted MVP operations. Destination payment observation, paid reconciliation and reservation expiry cleanup remain unfinished. A signature alone never means paid.

A browser screenshot is still pending. The built UI is served on the box at http://127.0.0.1:4173/?frame=final. It has been built and data tested, not visually inspected in this executor.
