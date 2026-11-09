# Hosting plan

Page on GitHub Pages. Keeper on a Hugging Face Docker Space (free CPU basic: 2 vCPU, 16 GB RAM) with the local Qwen model. No card. David creates the Space himself; secrets go in the Space settings afterwards.

Checked on 9 Nov 2026. Free tiers change often, so check again before signing up.

## Live set

1. Page: GitHub Pages from `DavisBrains/feral`. Public URL: `https://davisbrains.github.io/feral/`.
   - Live now from the `gh-pages` branch (interim), because the box `gh` token lacks the `workflow` scope needed to push `.github/workflows/pages.yml`.
   - The Actions workflow is committed locally on master (not pushed). After `gh auth refresh -s workflow`, push it and switch Pages source back to GitHub Actions.
2. Keeper: Hugging Face Docker Space from `hosting/hf-space/` (run `./hosting/hf-space/assemble.sh` before the first Space push).
3. Model order on the Space: NEAR AI Cloud if `NEAR_AI_KEY` is set, otherwise local Qwen (`FERAL_LOCAL_MODEL=1`, baked into the image), otherwise the labelled fixed policy.

### Hugging Face free CPU, the honest tradeoffs
- Free CPU Spaces sleep after about 48 hours with no visitors. Cold start loads Qwen and can take a few minutes. The page shows **Waking the terrarium**, then falls back to the recorded proof run if it never answers.
- Space disk is ephemeral. The chain keeps every balance, job and creature, so play carries on, but the page's turn log, the model reasons and new card files from before the restart are lost.
- The pinned Qwen2.5 1.5B Instruct weights are downloaded at image build time so wake skips that download.

## Secret env vars for the keeper (Space → Settings → Variables and secrets)

| Name | Required | What it is | Where the value lives on this box (path only) | How the keeper loads it |
| --- | --- | --- | --- | --- |
| `FERAL_KEEPER_KEY` | yes | Private key of the **function-call** access key for `keeper.feral-039832.testnet` (limited to arena game methods). Never a full-access key. | `/home/box/.feral-keeper/fc-key.json` field `private_key` | `near.mjs` `loadKey()` reads `process.env.FERAL_KEEPER_KEY`, else `FERAL_KEEPER_KEY_FILE` (default `~/.feral-keeper/fc-key.json`) |
| `NEAR_AI_KEY` | no | NEAR AI Cloud API key. Optional on this Space. Local Qwen is the main brain. | `/home/box/.secrets/near-ai.env` name `NEAR_AI_KEY` | `server.mjs` calls `loadEnvFile` for that path on this box; on the Space set the secret directly |

Do **not** upload `/home/box/.near-credentials/testnet/keeper.feral-039832.testnet.json`. That file is a full-access credential and must never go on the Space.

## Non-secret env (set in the Space Dockerfile)

- `HOST=0.0.0.0`
- `PORT=7860` (Space `app_port`)
- `FERAL_ALLOW_ORIGIN=https://davisbrains.github.io`
- `FERAL_TRUST_PROXY=1`
- `FERAL_TRANSLATION_DEMAND=1`
- `FERAL_LOCAL_MODEL=1`
- `FERAL_MODEL_URL=http://127.0.0.1:11436`
- `FERAL_DATA=/tmp/feral-data` (ephemeral)

## GitHub Pages build

- Workflow builds with `VITE_BASE=/feral/` and `VITE_KEEPER_URL` from the repo variable `FERAL_KEEPER_URL`.
- Until that variable is set to the Space URL, live mode shows that the keeper is not linked and the recorded proof run still works.
- After the Space is live at `https://<user>-<space>.hf.space`, set repo variable `FERAL_KEEPER_URL` to that origin (no trailing slash) and rebuild Pages.

## Steps for David

1. Create a Hugging Face account (or sign in) and a new **Docker** Space.
2. From this repo run `./hosting/hf-space/assemble.sh`, then push `hosting/hf-space` to the Space git remote.
3. In Space settings, add secrets `FERAL_KEEPER_KEY` (and optional `NEAR_AI_KEY`).
4. Confirm `https://<user>-<space>.hf.space/healthz` returns `ok` and `/api/state` shows the model route (`local-qwen` or NEAR AI).
5. Set GitHub repo variable `FERAL_KEEPER_URL` to that origin and refresh the Pages build.
6. Open `https://davisbrains.github.io/feral/` and play one visitor turn from the public address.
