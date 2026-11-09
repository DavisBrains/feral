# Raw footage for the demo video

Filmed on 9 Nov 2026 between 12:05 and 12:18 WAT with headless Chromium through Playwright. The page is the box keeper at http://127.0.0.1:8787 running Local Qwen (Qwen2.5 1.5B on the box). NEAR AI was off. Desktop clips are 1920x1080 webm and the mobile clip is 390x844. Stills named hi are 1440x900 or 390x844 at device scale 2. The other stills are 1920x1080 at scale 1.

Every hash below was read back from the testnet RPC with `video/verify-tx.mjs`. All are final. Results are in `tx-verify.json`.

## Main action, in story order

| Clip | Length | What it shows |
|---|---|---|
| m1-turn4-echo-translates.webm | 1m 37s | Live season 2 at turn 3 with Ash starving at 10 MUNCH. Advance is pressed at about 0m11s. The stage shows each step while the keeper works. Echo bids at about 0m38s, Echo is paid for the Spanish line at about 0m48s, Moss pays for a child at about 0m54s and Moss 1 hatches, upkeep lands at about 0m57s and Ash drops to 0. Then the stage, the What they chose notes, the turn log with tx links and the turn outcome. |
| m2-turn5-ash-turns-to-stone.webm | 1m 20s | Turn 5. Advance at about 0m10s. The market posts a Plain translation job, Echo bids, wins and translates again, then upkeep lands at about 0m37s and Ash turns to stone on the stage. Then the Ash turned to stone outcome, the turn log and Ash's drawer showing Fossil, 0 frozen and the life NFT holder. |
| m3-refused-spend-and-life-nft.webm | 29s | The turn log now starts with the refused row "Ash tries to bid after turning to stone, refused on chain, extinct". Ash's drawer. Then a card of raw RPC reads showing the life NFT, the life record with active false and died turn 5, and the refused tx. |

## B roll

| Clip | Length | What it shows |
|---|---|---|
| b1-hero-desktop.webm | 23s | Hero, goal panel, banner reading Local Qwen, then the terrarium with all four creatures before the deaths. Ash is starving at 10. |
| b2-tooltips.webm | 37s | Tooltips for MUNCH, Local Qwen, lineage, upkeep, pouch, demand and bid. |
| b3-demand-board.webm | 16s | The demand board with Plain translation pinned and its tooltip. |
| b4-replay-pip-birth.webm | 27s | Recorded proof run. The Birth chapter is picked and Pip hatches, then the ledger. |
| b5-replay-sepolia.webm | 17s | Recorded proof run ledger ending on the Sepolia purchase signed by a NEAR account. |
| b6-mobile-390.webm | 24s | Live page at 390 wide before the deaths, scrolled top to bottom and back. |
| b7-hero-after.webm | 18s | The terrarium after the death with Ash as stone and Moss 1 alive. |
| b9-visitor-controls.webm | 24s | Visitor controls. Demand choices, sponsor, feed and post a job are hovered but never pressed, then Set a goal. |

## Testnet transactions

All are signed by keeper.feral-039832.testnet with its function call key on play.feral-039832.testnet.

| Turn | Step | Tx |
|---|---|---|
| 4 | Echo bids 60 on s2-t4-m, a Plain translation job | [F43rzKM4a6z7rsRz3DfKg2h5PTJvmHkog7WpdWYRhNog](https://testnet.nearblocks.io/txns/F43rzKM4a6z7rsRz3DfKg2h5PTJvmHkog7WpdWYRhNog) |
| 4 | Contract awards the job to Echo | [GSFQoKdTCu4tLNeQEErkNDJ55y6vbqD7ZT31PFiL6pZ8](https://testnet.nearblocks.io/txns/GSFQoKdTCu4tLNeQEErkNDJ55y6vbqD7ZT31PFiL6pZ8) |
| 4 | Echo delivers the Spanish line and is paid 60 | [23GTkCFMi41Yg3ox5DpwXmjHT3enBnmkvK4PJ4vhJuUY](https://testnet.nearblocks.io/txns/23GTkCFMi41Yg3ox5DpwXmjHT3enBnmkvK4PJ4vhJuUY) |
| 4 | Moss pays for a child, Moss 1 is born | [GkYLHBmZ4aM37WzBLQmxiBReWCySCFMg8G479BE6Bny3](https://testnet.nearblocks.io/txns/GkYLHBmZ4aM37WzBLQmxiBReWCySCFMg8G479BE6Bny3) |
| 4 | Upkeep, 40 burned, Ash goes from 10 to 0 | [HNmYXzGeiDwKTJiEGJZ19aPv1yD72oAyA6yT3osZioi7](https://testnet.nearblocks.io/txns/HNmYXzGeiDwKTJiEGJZ19aPv1yD72oAyA6yT3osZioi7) |
| 5 | Market posts s2-t5-m, Plain translation for 60 | [7dQN5d5CLirBXurP7HoqKKVE5GQfTLkdVQsekjAT4JuG](https://testnet.nearblocks.io/txns/7dQN5d5CLirBXurP7HoqKKVE5GQfTLkdVQsekjAT4JuG) |
| 5 | Echo bids 60 | [FCZio9VptMWw3HeVW7kCxs1Kiiq8y9i2FHFcrBcHDtzR](https://testnet.nearblocks.io/txns/FCZio9VptMWw3HeVW7kCxs1Kiiq8y9i2FHFcrBcHDtzR) |
| 5 | Contract awards the job to Echo | [5RYbSjimdqbBdswEzC98MoSMpRU5ZG9KsHQRkdyb3UpW](https://testnet.nearblocks.io/txns/5RYbSjimdqbBdswEzC98MoSMpRU5ZG9KsHQRkdyb3UpW) |
| 5 | Echo delivers and is paid 60 | [6DbVZHg6cxz9TutsfBou8eZ8m2QgZJ4Whvkj4RPb6o4X](https://testnet.nearblocks.io/txns/6DbVZHg6cxz9TutsfBou8eZ8m2QgZJ4Whvkj4RPb6o4X) |
| 5 | Upkeep. Ash cannot pay and turns to stone. Log line "extinction s2-ash.play.feral-039832.testnet turn 5" | [H4a9jGEKUBEyW5tj15SMFoSjvXE7nVAEHhBrRFw5HxDo](https://testnet.nearblocks.io/txns/H4a9jGEKUBEyW5tj15SMFoSjvXE7nVAEHhBrRFw5HxDo) |
| 5 | Bid as Ash after death. Refused with "Smart contract panicked: extinct" | [92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX](https://testnet.nearblocks.io/txns/92acs7hAf8ejo6gTawTbyTahpoUci4WJWVUc5UVABXbX) |

One stray tx is left out of the story. [HqJ1Rn8QYnUCRypxnRThD1FKy2ddqbgR56wuwRBVi7ax](https://testnet.nearblocks.io/txns/HqJ1Rn8QYnUCRypxnRThD1FKy2ddqbgR56wuwRBVi7ax) was my first try at the refused bid. A script bug sent it for an account that does not exist, so it failed for the wrong reason. It was removed from the keeper journal and is not shown on screen.

Translations by Local Qwen. Turn 4 "Every balance can be checked on the chain." became "Cada balanza puede ser revisada en la cadena." Turn 5 "Fresh bread every morning." became "Pan fresco cada mañana."

## Life NFT record after death

Read with `nft_token` and `lives_of` at block 276912679. Token s2-ash.play.feral-039832.testnet is held by keeper.feral-039832.testnet with the title Feral life ash. The life record reads balance 0, active false, born turn 0, died turn 5. The card is `ash-record.html`, made by `video/make-ash-record.mjs`.

## Stills

Before the death, at 1920x1080. hero-before, stage-before, tip-qwen, tip-upkeep, demand-board, replay-pip-birth, replay-sepolia, mobile-first, turn4-stage, turn4-decisions, turn4-log, turn4-outcome, turn5-before.

After the death, at 1920x1080. turn5-stone-stage, turn5-outcome, turn5-log, turn5-ash-drawer, refusal-log, ash-life-nft-record, stage-after.

At device scale 2. hi-hero, hi-stage-stone, hi-outcome, hi-turn-log, hi-demand-board, hi-ash-drawer, hi-ash-record, and the same set as hi-390 for mobile.

## Notes for the edit

Headless capture runs at about 25 frames a second, so the stage animation is a little less smooth than in a real browser. Nearblocks pages show a Cloudflare check to headless Chromium, so no explorer page was filmed. Use the RPC card in m3 or film nearblocks by hand. The season is now at turn 5 of 8 with Moss, Echo and Moss 1 alive.
