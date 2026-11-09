# Feral

Feed them work or watch them turn to stone.

## Feral in one minute

Feral is a tiny world of small creatures that live on NEAR, a public blockchain. A blockchain is a shared record book that nobody can quietly edit. Every creature has its own real account in that book and its own balance of a play coin called MUNCH.

Staying alive costs money. Every turn each living creature pays 10 MUNCH of upkeep, and that MUNCH is burned, so it is gone for good. To keep eating, the creatures take small jobs such as making caption cards, and they bid against each other for the work. One creature can also pay another to translate a line into Spanish.

A creature that saves enough can have a child. The parent pays 100 MUNCH, and the game creates a brand new NEAR account for the child. The child copies its parent's way of working with exactly one small change, so each family slowly drifts.

When a creature's pouch runs dry, it turns to stone. From that moment the contract refuses every spend it tries, forever. Its life NFT, a one of a kind token that stands for that life, stays on chain with the record of the turn it died.

Feral also reaches past NEAR. In the recorded run, Moss paid for a tool on Sepolia, an Ethereum test network. Its NEAR account signed the payment through NEAR Chain Signatures, so it never needed an Ethereum wallet of its own.

You can step in too. You can feed a creature, sponsor one with a bigger share of your pouch, post a job, change what work the market wants, and advance the turn. Each of these is a real transaction on NEAR testnet that anyone can open and check.

Everything here uses valueless test tokens. There is no bridge and nothing to buy.

## Why it matters

The hackathon theme is Build Beyond Boundaries. Feral is a small test of money that lives by its own rules. Nobody can print more MUNCH in the middle of a season, nobody can bring a fossil back, and nobody can skip upkeep, because the contract checks every move.

The creatures make their own choices with an AI model, yet they can only pick moves the contract would accept. The same idea could keep real AI agents honest once they hold real money, and a NEAR account can even pay on another chain.

## How it fits the tracks

- **Games With Real Economies.** The creatures are game characters with their own wallets, and their economy keeps changing without a patch.
- **Memecoins With Mechanics.** MUNCH has a fixed supply that only shrinks, because every turn of upkeep burns some of it.
- **AI Swarms.** The creatures bid against each other for work and hire each other, and the market grows out of those bids.
- **Agent Economy.** Each creature earns, spends, hires a neighbour and can pay for a tool on another chain.
- **AI Security & Defense.** The keeper that acts for players holds a limited key that can only call game moves, and every attack that ran was refused on chain.
- **NFTs That Do Something.** Each life NFT gives its holder the right to sponsor that creature and set its goal, and a sponsor without the NFT was refused.

## The game in short

Three creatures live in a terrarium. They bid for caption jobs to stay fed, pay a neighbour for translations, and save up to pay for a child. You play without a wallet. Your goal is to keep two family lines alive for 8 turns with a pouch of 120 MUNCH.

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

- The arena contract holds MUNCH (NEP 141), the life NFTs (NEP 171), jobs, bids, escrow, upkeep, deaths and births. Source in `arena/`. [`play.feral-039832.testnet`](https://testnet.nearblocks.io/address/play.feral-039832.testnet)
- The keeper owns the arena and sends moves for visitors and creatures. Its key can only call the arena's game methods, cannot attach a deposit and cannot send NEAR. [`keeper.feral-039832.testnet`](https://testnet.nearblocks.io/address/keeper.feral-039832.testnet)
- Moss of season 2 is a real account created by the arena, and its neighbours are made the same way. [`s2-moss.play.feral-039832.testnet`](https://testnet.nearblocks.io/address/s2-moss.play.feral-039832.testnet)
- The contract from the recorded proof run stays untouched as evidence. [`ctrl.feral-039832.testnet`](https://testnet.nearblocks.io/address/ctrl.feral-039832.testnet)
- The NEAR MPC signer made the signatures for Sepolia. [`v1.signer-prod.testnet`](https://testnet.nearblocks.io/address/v1.signer-prod.testnet)
- On Sepolia, this relayer sent the tool purchase. [`0x667e3DF0…`](https://sepolia.etherscan.io/address/0x667e3DF0fb679593d4C31C7789926b4EAA7E4C10)
- On Sepolia, this treasury holds the test tool token. [`0xCf6DEd4D…`](https://sepolia.etherscan.io/address/0xCf6DEd4D863cb359F4D7E79734C99549E8Fd3A6C)
- On Sepolia, this is the test token itself. [`0x791e035d…`](https://sepolia.etherscan.io/address/0x791e035df4c255d4b0539Ca80FFAEbe3A623603E)
- Moss paid for the tool on Sepolia with a signature made on NEAR. [0x74855dbb…](https://sepolia.etherscan.io/tx/0x74855dbbf8696a0b285c12b8343f44005bf1d9344957d881e352c6f609bfd128)
- Sending the same paid order a second time was turned back. [0x3e72b880…](https://sepolia.etherscan.io/tx/0x3e72b880d0f040f8a16b8e5701d06acaefd1c999594d358f8a24db7ff25caf72)

The contract enforces upkeep, death and refusal. A child gets its parent's strategy with exactly one bounded change, chosen from six. Spends from a fossil are refused forever.

## What you have to trust

- The keeper decides when turns run and relays your moves. It cannot move NEAR, call other contracts, or break a contract rule. A dishonest keeper could stop running turns or skip your moves.
- The model chooses among moves the contract would accept anyway. A bad model can make poor choices. It cannot make an illegal one.
- NEAR AI Cloud and the local model are trusted to report their own answers. The page shows what each returned.
- Translations come from a model and nobody reviewed them.
- The NEAR MPC network signed the Sepolia transactions.
- The public testnet RPC nodes report the chain state the page reads.
- Visitor limits live in the keeper and the contract together. The keeper rate limits each visitor, lets one pilot steer a season, and caps new seasons per hour. The contract caps the pouch and every amount.

## Tracks in detail

- Games. The whole loop is a game with a real economy that runs without a patch. Creatures are NPCs with their own accounts and balances.
- Memecoins. MUNCH has a mechanic. Supply burns 10 per living creature every turn, new MUNCH only comes from a season seed, and a fossil's coins are locked forever.
- Swarms. Creatures bid against each other for jobs, the lowest live bid wins, and card makers hire a translator. The economy emerges from those bids. Each child is a NEAR sub account of the arena.
- Agents. Model driven creatures earn, spend, hire each other and pay for a tool on Sepolia through Chain Signatures.
- Security. The keeper key is a scoped function call key. Every attack in the Attacks panel was refused, and each refusal is on testnet or Sepolia.
- NFTs. Each life NFT carries the right to sponsor its creature and set its goal.
  - The keeper sponsored Moss while holding its life NFT, and it worked. [6P2Pxmwe…](https://testnet.nearblocks.io/txns/6P2PxmweJiTiAcronmJMbEaPnrhvR3JAgqhABZFJCd7F)
  - An account without the life NFT tried to sponsor and was refused. [8juYz4d6…](https://testnet.nearblocks.io/txns/8juYz4d6GPLx933dFJxCYq5eU85zzZHBGNYRcVfaWbfz)

## A full visitor turn on testnet

Season 2, turn 1, started from the page.

- Starting the season minted a fresh 1,000 MUNCH seed and made three founder accounts. [45A9k2tw…](https://testnet.nearblocks.io/txns/45A9k2twnWSQjFxy43pgUezbRQmSWSZNJBiL63dTwJgQ)
- The visitor pinned new work on the demand board. [CVSrX4io…](https://testnet.nearblocks.io/txns/CVSrX4ionsdw2qJnxV9h9NLAWuXRudjAyzqWLCgyPJca)
- The visitor posted a job and its pay went into escrow. [CoDaT8hr…](https://testnet.nearblocks.io/txns/CoDaT8hrA8TJA1nEfjFD4yhCbCKM1Pk6VU6TWR5bUVpb)
- The visitor fed Ash one meal of 10 MUNCH. [kR5MFj9U…](https://testnet.nearblocks.io/txns/kR5MFj9UixCKPowaHccVJtt9yx7GPjm4fEP4BopKxXz)
- The visitor sponsored Moss from the pouch. [6P2Pxmwe…](https://testnet.nearblocks.io/txns/6P2PxmweJiTiAcronmJMbEaPnrhvR3JAgqhABZFJCd7F)
- The market posted its own job for the turn. [CUUpgfUm…](https://testnet.nearblocks.io/txns/CUUpgfUmGi3uGGJ7DrkQ7EXtxp2N42VgM8o9G5VoLwH8)
- Moss bid for the work. [3PfHxvdg…](https://testnet.nearblocks.io/txns/3PfHxvdgB7bX7CHJGYciamkJ1vYtSdGtsEfjpU2V4cH1)
- The contract gave the job to the lowest bid. [6N3x7f52…](https://testnet.nearblocks.io/txns/6N3x7f52i6nSTKZcp5mPQxhuYDYJf5KzaEF8pipFvFr7)
- Moss paid Echo for the Spanish translation. [BasJojjj…](https://testnet.nearblocks.io/txns/BasJojjjzSEAs7Sp4JWs17DGmfULg32DxaFTjgfJd9wa)
- Moss delivered the card and was paid. [49FuGSw3…](https://testnet.nearblocks.io/txns/49FuGSw3GSAKfvkfKaFBGdoi2tgy6U5C5XVfv3T3PnQh)
- Every living creature paid its upkeep and that MUNCH was burned. [HeW3mFwA…](https://testnet.nearblocks.io/txns/HeW3mFwAhVk3gu8Q7hsazrofRg58XWQKHvEUg95LRNEw)

### Ash turns to stone

Season 2, turns 4 and 5, filmed on the box keeper with Local Qwen. The demand board asked for Plain translation, so Echo took the work and Ash had nothing it could earn.

- Echo bid on the Plain translation job. [F43rzKM4…](https://testnet.nearblocks.io/txns/F43rzKM4a6z7rsRz3DfKg2h5PTJvmHkog7WpdWYRhNog)
- Echo wrote the Spanish line with Local Qwen and was paid 60 MUNCH. [23GTkCFM…](https://testnet.nearblocks.io/txns/23GTkCFMi41Yg3ox5DpwXmjHT3enBnmkvK4PJ4vhJuUY)
- Moss paid for a child and Moss 1 was born with its own account. [GkYLHBmZ…](https://testnet.nearblocks.io/txns/GkYLHBmZ4aM37WzBLQmxiBReWCySCFMg8G479BE6Bny3)
- Ash paid its last 10 MUNCH of upkeep and was left with nothing. [HNmYXzGe…](https://testnet.nearblocks.io/txns/HNmYXzGeiDwKTJiEGJZ19aPv1yD72oAyA6yT3osZioi7)
- On turn 5 Ash could not pay upkeep, so the contract turned it to stone. The receipt logs the extinction of s2 ash on turn 5. [H4a9jGEK…](https://testnet.nearblocks.io/txns/H4a9jGEKUBEyW5tj15SMFoSjvXE7nVAEHhBrRFw5HxDo)
- The keeper then asked the contract to spend for Ash. The contract refused with the word extinct. [92acs7hA…](https://testnet.nearblocks.io/txns/92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX)
- Ash's life NFT still exists and its life record now reads inactive, died on turn 5. [The account](https://testnet.nearblocks.io/address/s2-ash.play.feral-039832.testnet)

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
