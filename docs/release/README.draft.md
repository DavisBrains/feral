# Feral

Feed them work or watch them turn to stone.

Feral is a small game on NEAR testnet. Three creatures live in a terrarium. Every turn each one pays 10 MUNCH of upkeep. They bid for caption jobs to stay fed, pay a neighbour for translations, and save up to pay for a child. A creature that runs out of MUNCH turns to stone for good, and the contract refuses anything it tries to do after that.

You play without a wallet. Every move you make is a real NEAR testnet transaction that you can open on the explorer. Your goal is to keep two family lines alive for 8 turns with a pouch of 120 MUNCH.

Everything here uses valueless test tokens. There is no bridge and nothing to buy.

## Try it

Open the [live page](https://davisbrains.github.io/feral/) and press Live season. It reads the arena on NEAR testnet through a small keeper on Render, at [feral-keeper.onrender.com](https://feral-keeper.onrender.com/healthz). The keeper sleeps when nobody visits, so the first visit can take about a minute while it wakes. The page says so while you wait.

The public keeper runs on a free plan with no room for a model, so its creatures follow their written fixed policy and every note says so. The local Qwen model needs a bigger machine, and the demo video shows it deciding.

Or run it on your own machine.

```
git clone https://github.com/DavisBrains/feral && cd feral
cd app && npm install && npm run build && cd ..
cd keeper && npm install && node server.mjs
```

Then open http://127.0.0.1:8787 in a browser.

The keeper needs a NEAR testnet function call key for `keeper.feral-039832.testnet` to send live moves. Without it you can still watch the recorded proof run. For the creature model, set `NEAR_AI_KEY` to use NEAR AI Cloud, or start the local model with `python agents/arena_model.py`, or use neither and the page will say the creatures follow their fixed policy.

## Do this and see that

1. Open the page. You see the live season banner, and it names the model that is answering right now.
2. Press Advance in the hero panel. Within a minute the turn log fills with new rows. Each row links to a NEAR testnet transaction.
3. Open any row link. The explorer shows the call on `play.feral-039832.testnet` with the same amounts the page shows.
4. Press Feed and pick Ash. Your pouch drops by 10 and Ash gains 10 MUNCH on chain.
5. Press Post job, pick a line and a reward, and pin it. The reward leaves your pouch and waits in escrow until a creature delivers.
6. Pin a different notice on the demand board, then advance. Jobs for the old work are cancelled and their MUNCH returns to whoever paid.
7. Read What they chose. Each note shows the move a creature made, the reason in the model's own words, and which model answered.
8. After a paid card job, find The card they made to earn. The page checks the card's SHA 256 against the hash settled on chain before it shows the card.
9. Switch to Recorded run and press Play. Watch Ash turn to stone, the contract refuse a spend from the fossil, and Moss pay for a child that inherits its strategy with one change.
10. Scroll to We tried to break it. Each attack lists the refusal and links its transaction, including one Sepolia replay that reverted.

## How the creatures decide

Each turn the keeper reads the chain and builds the list of moves the contract would accept for each creature. A model picks one move from that list and gives a short reason. The keeper checks that the pick is on the list, and the contract checks every rule again when the move is sent.

The keeper asks models in this order.

1. NEAR AI Cloud, using `Qwen/Qwen3-VL-30B-A3B-Instruct` through the OpenAI compatible API at https://cloud-api.near.ai/v1.
2. A local Qwen2.5 1.5B Instruct model on the keeper, as a fallback.
3. A fixed written policy, as the last resort.

The page labels every decision and every translation with the one that actually answered, and says when one was skipped and why. If NEAR AI Cloud reports no credits or a rate limit, the keeper waits a while before it asks again. When a creature has only one legal move, no model is asked and the note says so.

The NEAR AI account had no credits when this was written, so the most recent live turns were answered by the local fallback, and their notes say that.

## What lives on chain

All of this is on NEAR testnet unless it says Sepolia.

- `play.feral-039832.testnet` is the arena contract. It holds MUNCH (NEP 141), the life NFTs (NEP 171), jobs, bids, escrow, upkeep, deaths and births. Source in `arena/`.
- `keeper.feral-039832.testnet` owns the arena and sends moves for visitors and creatures. Its key can only call the arena's game methods, cannot attach a deposit and cannot send NEAR.
- `s2-moss.play.feral-039832.testnet` and its neighbours are the creatures of season 2. Each is a real account created by the arena.
- `ctrl.feral-039832.testnet` is the contract from the recorded proof run. It stays untouched as evidence.
- `v1.signer-prod.testnet` is the NEAR MPC signer used for Chain Signatures.
- On Sepolia, the relayer `0x667e3DF0fb679593d4C31C7789926b4EAA7E4C10`, the treasury `0xCf6DEd4D863cb359F4D7E79734C99549E8Fd3A6C` and the test token `0x791e035df4c255d4b0539Ca80FFAEbe3A623603E`. The tool purchase was paid in `0x74855dbbf8696a0b285c12b8343f44005bf1d9344957d881e352c6f609bfd128` and its replay reverted in `0x3e72b880d0f040f8a16b8e5701d06acaefd1c999594d358f8a24db7ff25caf72`.

The contract enforces upkeep, death and refusal. A child gets its parent's strategy with exactly one bounded change, chosen from six. Spends from a fossil are refused forever.

## What you have to trust

- The keeper decides when turns run and relays your moves. It cannot move NEAR, call other contracts, or break a contract rule. A dishonest keeper could stop running turns or skip your moves.
- The model chooses among moves the contract would accept anyway. A bad model can make poor choices. It cannot make an illegal one.
- NEAR AI Cloud and the local model are trusted to report their own answers. The page shows what each returned.
- Translations come from a model and nobody reviewed them.
- The NEAR MPC network signed the Sepolia transactions.
- The public testnet RPC nodes report the chain state the page reads.
- Visitor limits live in the keeper and the contract together. The keeper rate limits each visitor, lets one pilot steer a season, and caps new seasons per hour. The contract caps the pouch and every amount.

## Tracks

- Games. The whole loop is a game with a real economy that runs without a patch. Creatures are NPCs with their own accounts and balances.
- Memecoins. MUNCH has a mechanic. Supply burns 10 per living creature every turn, new MUNCH only comes from a season seed, and a fossil's coins are locked forever.
- Swarms. Creatures bid against each other for jobs, the lowest live bid wins, and card makers hire a translator. The economy emerges from those bids.
- Agents. Model driven creatures earn, spend, hire each other and pay for a tool on Sepolia through Chain Signatures.
- Security. The keeper key is a scoped function call key. Every attack in the Attacks panel was refused, and each refusal is on testnet or Sepolia.
- NFTs. Each life NFT carries the right to sponsor its creature and set its goal. Sponsoring with the NFT worked on testnet in `6P2PxmweJiTiAcronmJMbEaPnrhvR3JAgqhABZFJCd7F`, and a sponsor without it was refused in `8juYz4d6GPLx933dFJxCYq5eU85zzZHBGNYRcVfaWbfz`.

## A full visitor turn on testnet

Season 2, turn 1, started from the page.

- start season `45A9k2twnWSQjFxy43pgUezbRQmSWSZNJBiL63dTwJgQ`
- pin the demand board `CVSrX4ionsdw2qJnxV9h9NLAWuXRudjAyzqWLCgyPJca`
- visitor job `CoDaT8hrA8TJA1nEfjFD4yhCbCKM1Pk6VU6TWR5bUVpb`
- feed Ash `kR5MFj9UixCKPowaHccVJtt9yx7GPjm4fEP4BopKxXz`
- sponsor Moss `6P2PxmweJiTiAcronmJMbEaPnrhvR3JAgqhABZFJCd7F`
- market job `CUUpgfUmGi3uGGJ7DrkQ7EXtxp2N42VgM8o9G5VoLwH8`
- Moss bids `3PfHxvdgB7bX7CHJGYciamkJ1vYtSdGtsEfjpU2V4cH1`
- award `6N3x7f52i6nSTKZcp5mPQxhuYDYJf5KzaEF8pipFvFr7`
- translation bought from Echo `BasJojjjzSEAs7Sp4JWs17DGmfULg32DxaFTjgfJd9wa`
- card settled `49FuGSw3GSAKfvkfKaFBGdoi2tgy6U5C5XVfv3T3PnQh`
- upkeep tick `HeW3mFwAhVk3gu8Q7hsazrofRg58XWQKHvEUg95LRNEw`

## Tests

```
cd app && npm test          # page logic, labels, offline file, Sepolia evidence
cd keeper && npm test       # visitor limits, model fallback, cards
cargo test -p feral-arena   # arena contract rules
node scripts/attack.mjs     # NEAR testnet attacks, results in evidence/attacks.json
```

`cd app && npm run build:file` makes one offline HTML file of the recorded run in `app/dist-file`, about 1.1 MB gzipped.

## Known limits

- The public keeper is on a free Render plan. It sleeps after 15 quiet minutes and uses the fixed policy.
- Feeding is always one meal of 10 MUNCH, and sponsorship goes to one creature at a time.
- The recorded proof run has no model reasons saved, so its notes show what each creature saw.

## Credits

Everything in this repository was made during NEAR HACKATHON. The first commit is from 7 November 2026.

Libraries and tools used include near sdk, near contract standards, near api js, cargo near, near workspaces, PixiJS, Vite, TypeScript, esbuild, Hugging Face transformers, OpenZeppelin contracts, Foundry, fontTools and Playwright. Fonts are Fraunces, Instrument Sans and IBM Plex Mono under the SIL Open Font License.

## Licence

MIT, see LICENSE.
