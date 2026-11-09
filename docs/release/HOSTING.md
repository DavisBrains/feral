# Hosting plan (draft, nothing signed up, pushed or deployed)

With NEAR AI Cloud answering for the creatures, the keeper no longer needs the 4 GB local model. It is a small Node server (about 100 MB of memory) that needs one secret, the keeper function call key, plus the NEAR AI key.

Checked on 9 Nov 2026. Free tiers change often, so check again before signing up.

## Recommended free set, no card

1. Page on GitHub Pages from the DavisBrains/feral repo. No new account, free for a public repo. Needs the repo to be public, which David must approve.
   Or Cloudflare Pages. Free, no card, needs a Cloudflare account that David creates.
2. Keeper on a Render free web service. Free, no card, needs a Render account that David creates and links to GitHub.
3. Stopgap while the above is not ready, a Cloudflare quick tunnel from this box. No account at all.

### Render free, the honest tradeoffs
- It sleeps after 15 minutes with no visitors and takes about a minute to wake. The page shows Reading the chain meanwhile.
- Its disk is wiped on every restart, deploy or sleep. The chain keeps every balance, job and creature, so play carries on, but the page's turn log, the model reasons and new card files from before the restart are lost. The NEAR AI no credit wait also resets, so after a restart the keeper makes one call to learn it again.
- 750 free hours a month, enough for one service running all month.
- Render may restart a free service at any time.
- Fix later if needed by saving the journal to a free Postgres (expires after 30 days on Render) or rebuilding the log from chain receipts.

### Cloudflare quick tunnel, the honest tradeoffs
- `cloudflared tunnel --url http://127.0.0.1:8787` gives a random trycloudflare.com address in seconds with no account.
- It only works while this box and the keeper are running, and the address changes each time it starts.
- Cloudflare says quick tunnels are for testing. There is no uptime promise.
- It serves the page and the keeper together from the box, so nothing else needs hosting.

### Not free for a new account any more
- Koyeb closed its free plan to new sign ups in 2026 and needs a card.
- Fly.io and Railway need a card.

## Settings for the keeper on any host
- `FERAL_KEEPER_KEY` the keeper function call key, set as a secret.
- `NEAR_AI_KEY` the NEAR AI Cloud key, set as a secret. On this box it is read from /home/box/.secrets/near-ai.env and never logged.
- `NEAR_AI_MODEL` optional, defaults to Qwen/Qwen3-VL-30B-A3B-Instruct.
- `FERAL_MODEL_URL=` empty on a small host so the keeper skips the local model and falls straight to the fixed policy if NEAR AI cannot answer.
- `FERAL_ALLOW_ORIGIN` the page address, when the page is hosted apart from the keeper.
- `FERAL_TRUST_PROXY=1` so rate limits see the visitor address behind the host's proxy.
- `HOST=0.0.0.0` and `PORT` from the host.

Build the page with `VITE_KEEPER_URL=https://<keeper address> npm run build` and publish `app/dist`.

## Steps once David approves each one
1. Make the repo public, or create the Cloudflare account.
2. Create the Render account and the web service from the repo, root `keeper`, start `node server.mjs`, then add the secrets.
3. Check `/api/state` answers and shows the model route.
4. Build and publish the page pointing at the keeper.
5. Play one visitor turn from the public address and record the hashes.

The quick tunnel can be started from this box at any time David says so.
