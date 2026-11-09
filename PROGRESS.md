# Playable v2 progress (executor log)

- 09:20 WAT: v2 arena contract written (arena/), 30 unit tests pass. Deployed to play.feral-039832.testnet (deploy tx J8ui6mtDqEX97SEdBgSQx7T3UyDmTVjFLSgrDknnLP8Q). v1 ctrl untouched.
- 09:25 WAT: keeper.feral-039832.testnet created, function-call key scoped to play.feral-039832.testnet and 16 game methods, 0.5 NEAR allowance (tx ApF5hdsPfsHYc7mrCwuxAVhTnD44eX6TFibJRmUjkg6h).
- 09:40 WAT: first live visitor-driven turn ran end to end through the keeper API (season 1). Live Qwen chose moss's bid, Echo translated with the live model.
- Season 2 visitor driven turn 1 (all hashes in the final report): start_season 45A9k2tw…, set_demand CVSrX4io…, visitor post_job CoDaT8hr…, feed kR5MFj9U…, sponsor 6P2Pxmwe…, market post_job CUUpgfUm…, Moss bid (live model with its own reason) 3PfHxvdg…, award 6N3x7f52…, buy_translation BasJojjj…, settle 49FuGSw3…, tick HeW3mFwA….
- GD phase 3 pages (v2 headline) implemented in app/src (main.ts, play.ts, ui.ts, labels.ts, app.css, tokens.css). Fraunces subset, seals as 96 px WebP.
- scripts/attack.mjs run on NEAR testnet, 10 of 11 refused on chain or by the access key, duplicate birth covered by arena unit tests. Results in evidence/attacks.json and the Attacks panel.
- The one approved Sepolia replay of the used voucher was sent from the throwaway relayer and reverted, tx 0x3e72b880…caf72, block 12096460. Simulated revert reason Expired (the voucher expired at 09:16 WAT, before the replay); usedNonces(0) reads true on chain, so the replay guard would also refuse it. No other Sepolia transactions.
- Live cards now use design/phase3/card/render-card.mjs (copied to keeper/card.mjs), inlined in the page after a SHA-256 check against the settled hash. Proof run card untouched.
- Season 2 turn 2: Moss bid 8qdF2RRk…, award HKqDqmqK…, buy_translation 8EbtUJJA…, settle AFCxJUYe… (first field case card, s2-t1-m), tick 56DTZi7M….
- Tests: app 30 pass, keeper 9 pass, arena cargo 30 pass. Offline file 1.13 MB gzip (budget 1.2 MB), habitat art re-encoded for the offline file only.
- NEAR AI Cloud adapter (keeper/models.mjs). Order NEAR AI Cloud (Qwen/Qwen3-VL-30B-A3B-Instruct), local Qwen fallback, fixed policy. One probe call returned 402 no_limit_configured. Billing, auth and rate errors open a breaker that is saved to keeper/data, so no repeat calls until the wait ends. Key read from env or /home/box/.secrets/near-ai.env, never logged or committed.
- Season 2 turn 3 answered by the local fallback with NEAR AI skipped for no credits, no NEAR AI call made. post_job H7rHsJ7E…, bid CRYmiu9H…, award 28Fi9eJR…, buy_translation mebytnvN…, settle CNf6QhD1…, tick FnRpdrNz….
- Plain translation demand. Arena upgrade deployed to play.feral-039832.testnet (tx 88hZidL37ouSca9LcovKmqJScgSFitf5MBdfGRwMEypd, code hash 6XktndWUZjt2LgXzc4vcFFH1FL6HZykWY7Ys5cQQJycP, sha256 522b7d1d…). Keeper defaults FERAL_TRANSLATION_DEMAND on.
- Plain translation pinned on season 2 (set_demand kind 2, tx EcoJSvAtFt17MHnNSzVih5tkfGccNd52NNhu2vjcTBe8, demand_version 3). Live turn skipped so Ash stays at 10 MUNCH for the video death take.
- README merged into docs/release/README.draft.md with a phone PDF, LICENSE MIT added, HOSTING.md rewritten for free no card hosting.
