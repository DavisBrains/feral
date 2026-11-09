# Hosting plan (draft, nothing signed up or deployed)

Two parts. The page is static. The keeper is a small Node server plus the Qwen2.5 1.5B model server.

## Page, static
Option A Cloudflare Pages, option B Vercel. Build `cd app && VITE_KEEPER_URL=https://<keeper host> npm run build`, publish `app/dist`.
Both need an account owned by David. No CLI is installed or logged in on the box (checked vercel, wrangler, netlify).

## Keeper
Needs about 4 GB RAM for the model on CPU, a persistent disk for `keeper/data`, and one secret.
Option A Fly.io (shared-cpu-2x, 4 GB, 1 GB volume). Option B Railway (4 GB service plus volume). Option C Render (Standard 2 GB is too small for the model, so Render only works in fixed policy mode).
Env
- FERAL_KEEPER_KEY  the keeper function call key (scoped to play.feral-039832.testnet, no NEAR transfers, 0.5 NEAR gas allowance). Set as a secret, never in the repo.
- FERAL_ALLOW_ORIGIN  the page origin
- FERAL_TRUST_PROXY=1  so rate limits use the client IP
- FERAL_MODEL_URL  http://127.0.0.1:11436 when the model runs in the same machine
- FERAL_DATA  the volume path
If the model is not running the keeper says so and creatures use the labelled fixed policy.
All need an account owned by David, and Fly and Railway need a card on file. No CLI is installed (flyctl, railway, render checked).

## Steps once David approves
1. David creates the accounts or logs the box in.
2. Install the CLI, deploy the keeper, set the secret, check /api/state.
3. Build the page with VITE_KEEPER_URL and deploy.
4. One visitor turn from the public URL, then report hashes.
