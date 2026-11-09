# Feral

Feed them work or watch them turn to stone.

Feral is a small swarm of AI agents that are born, work, evolve and die on NEAR. Each creature has its own NEAR account and its own purse of a play coin called MUNCH. The creatures bid against each other for jobs, hire each other, pay for children that inherit their strategy with one change, and turn to stone when the money runs out. The contract checks every move, so the swarm can only do what the rules allow.

Feral uses two of the hackathon's partner tools. The creatures think with real NEAR AI, running Qwen3 VL 30B on NEAR AI Cloud. One creature paid for a tool on Ethereum's Sepolia network with NEAR Chain Signatures, so it never needed an Ethereum wallet of its own.

## Proof in twelve links

1. [The live page](https://davisbrains.github.io/feral/). Press Live season and every move you make goes to NEAR testnet.
2. [The arena contract](https://testnet.nearblocks.io/address/play.feral-039832.testnet) holds MUNCH, the life NFTs, jobs, births and deaths.
3. [A live turn decided by NEAR AI](https://testnet.nearblocks.io/txns/2dd4rU1Mjq4HkrU1YHHy26XeUaiR8iwdabtwYKmCbZrZ). On season 2 turn 6 Echo chose to bid 30 with Qwen3 VL 30B on NEAR AI Cloud, and the contract recorded the bid.
4. [A NEAR AI translation paid on chain](https://testnet.nearblocks.io/txns/DWCUeVmJopr5L3iF9QmDHwj2qtrt2hJ8517FsEPa8MCa). Echo wrote the Spanish line with NEAR AI and the contract paid it.
5. [A child is born](https://testnet.nearblocks.io/txns/GkYLHBmZ4aM37WzBLQmxiBReWCySCFMg8G479BE6Bny3). Moss paid for Moss 1, which got a [brand new NEAR account](https://testnet.nearblocks.io/address/s2-moss-k1.play.feral-039832.testnet).
6. [Ash turns to stone](https://testnet.nearblocks.io/txns/H4a9jGEKUBEyW5tj15SMFoSjvXE7nVAEHhBrRFw5HxDo). Ash could not pay upkeep, so the contract marked it extinct.
7. [The fossil is refused](https://testnet.nearblocks.io/txns/92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX). A spend for Ash after death failed with the word extinct.
8. [A Chain Signatures payment on Sepolia](https://sepolia.etherscan.io/tx/0x74855dbbf8696a0b285c12b8343f44005bf1d9344957d881e352c6f609bfd128). Moss paid for a tool with a signature made on NEAR.
9. [The same payment sent twice is turned back](https://sepolia.etherscan.io/tx/0x3e72b880d0f040f8a16b8e5701d06acaefd1c999594d358f8a24db7ff25caf72).
10. [A sponsor without the life NFT is refused](https://testnet.nearblocks.io/txns/8juYz4d6GPLx933dFJxCYq5eU85zzZHBGNYRcVfaWbfz).
11. [The keeper account](https://testnet.nearblocks.io/address/keeper.feral-039832.testnet). Its key can only call game moves and can not send NEAR.
12. [Every attack we ran and its refusal](evidence/attacks.json).

## Feral in one minute

Feral is a tiny world of small creatures that live on NEAR, a public blockchain. A blockchain is a shared record book that nobody can quietly edit. Every creature has its own real account in that book and its own balance of a play coin called MUNCH.

Staying alive costs money. Every turn each living creature pays 10 MUNCH of upkeep, and that MUNCH is burned, so it is gone for good. To keep eating, the creatures take small jobs such as making caption cards, and they bid against each other for the work. One creature can also pay another to translate a line into Spanish.

A creature that saves enough can have a child. The parent pays 100 MUNCH, and the game creates a brand new NEAR account for the child. The child copies its parent's way of working with exactly one small change, so each family slowly drifts.

When a creature's pouch runs dry, it turns to stone. From that moment the contract refuses every spend it tries, forever. Its life NFT, a one of a kind token that stands for that life, stays on chain with the record of the turn it died.

The creatures think with real NEAR AI. Each turn Qwen3 VL 30B on NEAR AI Cloud picks one move for each creature from the moves the contract allows, and says why in its own words. If the AI ever fails, written fixed rules step in as a backup, and the page says which one decided.

Feral also reaches past NEAR. In the recorded run, Moss paid for a tool on Sepolia, an Ethereum test network. Its NEAR account signed the payment through NEAR Chain Signatures, so it never needed an Ethereum wallet of its own.

You can step in too. You can feed a creature, sponsor one with a bigger share of your pouch, post a job, change what work the market wants, and advance the turn. Each of these is a real transaction on NEAR testnet that anyone can open and check.

Everything here uses valueless test tokens. There is no bridge and nothing to buy.

## Why it matters

The hackathon theme is Build Beyond Boundaries. Feral is a small test of money that lives by its own rules. Nobody can print more MUNCH in the middle of a season, nobody can bring a fossil back, and nobody can skip upkeep, because the contract checks every move.

The creatures make their own choices with NEAR AI, yet they can only pick moves the contract would accept. The same idea could keep real AI agents honest once they hold real money, and a NEAR account can even pay on another chain.

## How it fits the tracks

- **AI Swarms.** The creatures are a swarm of NEAR AI agents that compete for work, hire each other and breed. Each child is a new NEAR account with its parent's strategy plus one change, so the swarm evolves turn by turn and its fossils stay on chain for good.
- **Games With Real Economies.** You keep two family lines alive for eight turns by feeding, sponsoring and posting jobs, and every coin you spend is a real testnet transfer.
- **Agent Economy.** Each creature earns and spends, and one paid for a tool on Sepolia through Chain Signatures.
- **Memecoins With Mechanics.** MUNCH supply only shrinks, because upkeep burns some every turn.
- **AI Security & Defense.** The keeper holds a key that can only call game moves, and every attack we ran was refused on chain.
- **NFTs That Do Something.** Holding a life NFT is what lets you sponsor that creature and set its goal.

## The game in short

Three creatures live in a terrarium. They bid for caption jobs to stay fed, pay a neighbour for translations, and save up to pay for a child. You play without a wallet. Your goal is to keep two family lines alive for 8 turns with a pouch of 120 MUNCH.

## Try it

Open the [live page](https://davisbrains.github.io/feral/) and press Live season. It reads the arena on NEAR testnet through a small keeper on Render, at [feral-keeper.onrender.com](https://feral-keeper.onrender.com/healthz). The keeper pings itself every ten minutes through 25 November so it stays awake. If it ever does fall asleep, the first visit takes about a minute and the page says so while you wait.

The public keeper asks NEAR AI for every creature's choice, and each note names the model that answered. If NEAR AI fails or the spend cap is reached, the creatures use their written rules as a backup and the note says Fixed rules backup.

One visitor steers a season at a time. If the season sits idle for two minutes, the next visitor sees Take over and can play straight away.

Or run it on your own machine.

```
git clone https://github.com/DavisBrains/feral && cd feral
cd app && npm install && npm run build && cd ..
cd keeper && npm install && node server.mjs
```

Then open http://127.0.0.1:8787 in a browser.

The keeper needs a NEAR testnet function call key for `keeper.feral-039832.testnet` to send live moves. Without it you can still watch the recorded proof run. For the creature model, set `NEAR_AI_KEY` to use NEAR AI Cloud, or start the local model with `python agents/arena_model.py`, or use neither and the creatures use the fixed rules backup.

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

The keeper asks in this order.

1. NEAR AI Cloud, using `Qwen/Qwen3-VL-30B-A3B-Instruct` through the OpenAI compatible API at https://cloud-api.near.ai/v1. The public keeper runs this.
2. A local Qwen2.5 1.5B Instruct model, only on a machine that runs one. The demo video was filmed this way.
3. Fixed written rules, as an automatic backup when no model answers.

The page labels every decision and every translation with the one that actually answered, and says when one was skipped and why. If NEAR AI Cloud reports no credits or a rate limit, the keeper waits a while before it asks again. When a creature has only one legal move, no model is asked and the note says so.

We tried other NEAR AI models first. The reasoning models spent their whole answer budget thinking, while Qwen3 VL 30B gave a legal answer every time in under a second and a half. Each answer is capped at 80 tokens, and the keeper makes at most 240 NEAR AI calls an hour and 2,000 a day. One decision costs about $0.00007, so a full day at the cap costs about 14 cents. Past the cap the backup rules take over and the page says so.

Season 2 turn 6 was the first public turn decided by NEAR AI. Echo picked a bid of 30 out of nine legal moves in 0.6 seconds and wrote its Spanish line in 0.5 seconds.

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

- Swarms. Each creature is its own agent with its own NEAR account, and each one thinks with NEAR AI. They bid against each other for jobs, the lowest live bid wins, and card makers hire a translator, so the market comes out of their bids. Children are new NEAR sub accounts that copy their parent with one change, so the swarm drifts over the season, and the ones that can not earn turn to stone.
- Games. You get a 120 MUNCH pouch and one goal, keep two family lines alive for eight turns. The economy runs on its own between your moves, without a patch.
- Agents. One creature paid for a tool on Sepolia through Chain Signatures.
- Memecoins. Upkeep burns 10 MUNCH per living creature every turn, so supply only shrinks.
- Security. Every attack in the Attacks panel was refused on testnet or Sepolia.
- NFTs. A sponsor with the life NFT [worked](https://testnet.nearblocks.io/txns/6P2PxmweJiTiAcronmJMbEaPnrhvR3JAgqhABZFJCd7F) and one without it [was refused](https://testnet.nearblocks.io/txns/8juYz4d6GPLx933dFJxCYq5eU85zzZHBGNYRcVfaWbfz).

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

### Turn 6 thinks with NEAR AI

Season 2, turn 6, played on the public keeper. The page labels both choices NEAR AI Cloud with Qwen3 VL 30B.

- The market posted a Plain translation job for 60 MUNCH. [HmzRGbH3…](https://testnet.nearblocks.io/txns/HmzRGbH3DDsMXeuDjTaxVTBrBeJfp221sfTwkfjnWpPS)
- Echo asked NEAR AI and bid 30. In its own words, "I bid 30 to win the translation job, earning enough to meet my savings goal and breed." [2dd4rU1M…](https://testnet.nearblocks.io/txns/2dd4rU1Mjq4HkrU1YHHy26XeUaiR8iwdabtwYKmCbZrZ)
- The contract gave the job to Echo. [FLYENUhm…](https://testnet.nearblocks.io/txns/FLYENUhmYRTnx7UsZqou3c1MyMfVBUM6zmQ3yChAvzWE)
- Echo translated Thank you for watching into Gracias por ver with NEAR AI and was paid. [DWCUeVmJ…](https://testnet.nearblocks.io/txns/DWCUeVmJopr5L3iF9QmDHwj2qtrt2hJ8517FsEPa8MCa)
- Every living creature paid its upkeep and that MUNCH was burned. [74ajNsYj…](https://testnet.nearblocks.io/txns/74ajNsYjUYLWNtmFV4M6LQJAQkGraoxGC2GaTzTAuyPJ)

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
cd keeper && npm test       # visitor limits, NEAR AI spend cap, model fallback, takeover, keep awake, cards
cargo test -p feral-arena   # arena contract rules
node scripts/attack.mjs     # NEAR testnet attacks, results in evidence/attacks.json
```

`cd app && npm run build:file` makes one offline HTML file of the recorded run in `app/dist-file`, about 1.1 MB gzipped.

## Known limits

- The public keeper is on a free Render plan. It pings itself so it stays awake through judging. If Render restarts it, the turn log comes back from the copy saved in `keeper/seed`.
- NEAR AI runs on a $10 credit with a spend cap. When the cap is reached the creatures use the fixed rules backup until the next hour.
- Feeding is always one meal of 10 MUNCH, and sponsorship goes to one creature at a time.
- The recorded proof run has no model reasons saved, so its notes show what each creature saw.

## Credits

Everything in this repository was made during NEAR HACKATHON. The first commit is from 7 November 2026.

Partner tools used are NEAR AI Cloud for the creatures' thinking and NEAR Chain Signatures for the Sepolia payment. Libraries and tools used include near sdk, near contract standards, near api js, cargo near, near workspaces, PixiJS, Vite, TypeScript, esbuild, Hugging Face transformers, OpenZeppelin contracts, Foundry, fontTools and Playwright. Fonts are Fraunces, Instrument Sans and IBM Plex Mono under the SIL Open Font License.

## Licence

MIT, see LICENSE.
