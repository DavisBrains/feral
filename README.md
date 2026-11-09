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

All 103 tests passed in the local preflight, including 37 runner safety tests and three offline signed transaction decoder tests. Seven model situations repeated three times produced 21 valid decisions matching the controlled scenario. The complete local runner produced 26 state events.

Read [the current handoff](docs/PHASE2.md) for exact results, model trials, missing work and reproduction commands. [The event log](evidence/terrarium-run.json), [the real work](evidence/live-work/card.svg), [native reconciliation](evidence/native-reconciliation.json) and [mock MPC proof](evidence/mock-mpc.json) are local evidence. The original design and day 1 handoff remain as historical documents.

## The live terrarium

The app in `app/` now reads the deployed controller `ctrl.feral-039832.testnet` on NEAR testnet. It pins one block, reads every creature, its MUNCH balance, its life NFT, the birth record for `pip.ctrl.feral-039832.testnet`, the three jobs and every bid, then checks all 24 proof transactions on an archival node. The header shows the block it read. If the live state ever differs from the recorded run, a new final frame called Live testnet now is added rather than silently changing history. Every transaction links to testnet.nearblocks.io.

The habitat uses the phase 1 Botanical Reliquary art and the phase 2 animation strips. PixiJS draws it with WebGL and a Canvas2D renderer takes over if WebGL fails. Both draw the same world state. Walking, breathing and MUNCH seed coins are driven from code. Coins only fly when the recorded before and after snapshots show that exact movement, and the numbers always come from the contract, never from the animation. Reduced motion swaps travel for short fades. See [docs/SPRITES.md](docs/SPRITES.md).

```
cd app
npm install
npm run chain      # read only testnet check, writes public/chain.json
npm run dev        # live web app
node build-file.mjs  # single offline HTML in dist-file, about 1.1 MB gzipped
npm test
```

Screenshots are in `evidence/screenshots/`.

## Sepolia tool purchase

`sepolia/purchase.mjs` buys a tool on Sepolia through NEAR Chain Signatures with the testnet MPC signer `v1.signer-prod.testnet`. No EVM private key exists. The relayer address `0x667e3DF0fb679593d4C31C7789926b4EAA7E4C10` is derived for `feral-039832.testnet` with path `feral-sepolia-relayer-v1`. The voucher signer `0x1DeD2a744F7F98cF7aA41B9F505656378Fe8b0a0` is derived for the controller with path `feral-sepolia-v1/moss.feral-039832.testnet`. Without `--execute` it only prints the plan, saved in `evidence/sepolia-tool-plan.json`. The relayer still needs test ETH before the purchase can run.

## Honest boundaries

Every test token is valueless. There is no bridge, investment return or biological life claim. A keeper executes the bounded actions. Child accounts are real but keyless. NFT ownership cannot drain creature balances. Job verification and birth recovery are trusted MVP operations. A signature alone never means paid. The tool counts as paid only after the Sepolia ToolPaid event is confirmed.
