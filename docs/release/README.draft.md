# Feral

Feed them work or watch them turn to stone.

Small creatures live on NEAR testnet. Each turn costs them 10 MUNCH. They take jobs to stay fed, pay for their children to be born, and when one runs dry it turns to stone for good. You play without a wallet and every move is a real testnet transaction.

## Play

```
cd keeper && npm install && node server.mjs      # serves app/dist on http://127.0.0.1:8787
cd app && npm install && npm run build           # build the page first
python agents/arena_model.py                     # optional, Qwen2.5 1.5B on CPU at 127.0.0.1:11436
```

Without the model server creatures use a fixed policy and the page says so.

A visitor can pin the demand board, post a job (30 to 100 MUNCH, open 1 to 3 turns), feed a creature 10 MUNCH, sponsor one with 20, 40 or 60 MUNCH, set a goal, advance the turn, and close the season to start fresh. The goal is to keep two lineages alive for 8 turns inside a 120 MUNCH pouch.

## What is on chain

The arena contract `play.feral-039832.testnet` (source in `arena/`) holds MUNCH, life NFTs, jobs, bids and births. Upkeep, death and refusal are enforced there. A child inherits its parent policy plus exactly one bounded change. The keeper `keeper.feral-039832.testnet` holds only a function call key scoped to the arena's game methods, with no deposits and no NEAR transfers. Rate limits, a per visitor pouch, one pilot per season and a seasons per hour cap protect it.

## Proof

The recorded proof run on `ctrl.feral-039832.testnet` is kept separate from live play. Every one of its 24 receipts is checked on an archival node. Its caption card SHA-256 is on chain and the card file is never re-rendered. New live cards use the field case renderer and the page shows them only after their bytes hash to the settled value.

`scripts/attack.mjs` tries forged callbacks, sponsoring without the life NFT, ticking without the keeper, a second seed mid season, and using the keeper key outside its scope. Results are in `evidence/attacks.json` and the Attacks panel. One Sepolia replay of the already paid Chain Signatures voucher reverted on chain.

## Tests

`cd app && npm test`, `cd keeper && npm test`, `cargo test -p feral-arena`.

Test tokens only. No bridge, no profit.

---

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

`sepolia/purchase.mjs` buys a tool on Sepolia through NEAR Chain Signatures with the testnet MPC signer `v1.signer-prod.testnet`. No EVM private key exists. The relayer address `0x667e3DF0fb679593d4C31C7789926b4EAA7E4C10` is derived for `feral-039832.testnet` with path `feral-sepolia-relayer-v1`. The voucher signer `0x1DeD2a744F7F98cF7aA41B9F505656378Fe8b0a0` is derived for the controller with path `feral-sepolia-v1/moss.feral-039832.testnet`. Without `--execute` it only prints the plan, saved in `evidence/sepolia-tool-plan.json`. It has now run with `--execute`, and every step is recorded in `evidence/sepolia-tool-purchase.json`.

| Step | Transaction |
|---|---|
| MPC sign, token deploy (NEAR) | [CUZ5Lz2x…](https://testnet.nearblocks.io/txns/CUZ5Lz2x1nJ9otg331eDV72YjYJ9wbwYvuufukZTkoV2) |
| Deploy test TOOL token (Sepolia) | [0x3a7821ba…](https://sepolia.etherscan.io/tx/0x3a7821ba12b779ad73d9b26f0782874c9a0e6097d3d8188bd4bff824f2aad90d) at `0x791e035df4c255d4b0539Ca80FFAEbe3A623603E` |
| MPC sign, treasury deploy (NEAR) | [F1aVfg4m…](https://testnet.nearblocks.io/txns/F1aVfg4mPLLce7wtFfJoeH2Kty8KkcF61obwC39jMinJ) |
| Deploy FeralTreasury (Sepolia) | [0x1a9567a9…](https://sepolia.etherscan.io/tx/0x1a9567a9cf1de3a0b968699bd075f2d7dc5fa02145acde04eb4dc3e8a7ea4faa) at `0xCf6DEd4D863cb359F4D7E79734C99549E8Fd3A6C` |
| configure_tools (NEAR) | [BCM6zKGP…](https://testnet.nearblocks.io/txns/BCM6zKGPz4NGfABh61GKZKgYG1MhGn7xEB5pc8fQW2Kd) |
| request_tool_payment, controller MPC voucher signature (NEAR) | [C9SNWh3T…](https://testnet.nearblocks.io/txns/C9SNWh3TT9bqHaU7y6KcrRV6Zj2BtHE7m8FxFgRtR57C) |
| MPC sign, redeem (NEAR) | [5pwAuWvp…](https://testnet.nearblocks.io/txns/5pwAuWvpDSJnCnn45fW6qxSRtN2jjiBASWDb8CSfZUeD) |
| Redeem, ToolPaid 7 TOOL to `0xB06d3d94a063b90bAec90C7380a55D34ae10a32d` (Sepolia) | [0x74855dbb…](https://sepolia.etherscan.io/tx/0x74855dbbf8696a0b285c12b8343f44005bf1d9344957d881e352c6f609bfd128) |

Before the irreversible payment request, the script checked that the local, treasury and controller tool digests all agreed.

## Honest boundaries

Every test token is valueless. There is no bridge, investment return or biological life claim. A keeper executes the bounded actions. Child accounts are real but keyless. NFT ownership cannot drain creature balances. Job verification and birth recovery are trusted MVP operations. A signature alone never means paid. The tool counts as paid only after the Sepolia ToolPaid event is confirmed.
