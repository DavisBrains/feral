# Hosting plan

Page on GitHub Pages. Keeper on a Render free web service. No card. David signs into Render with GitHub himself; the Blueprint and secrets list below are ready for the dashboard afterwards.

Checked on 9 Nov 2026. Free tiers change often, so check again before signing up.

## Live set

1. Page: GitHub Pages from `DavisBrains/feral`. Public URL: `https://davisbrains.github.io/feral/`.
   - Live now from the `gh-pages` branch (interim), because the box `gh` token lacks the `workflow` scope needed to push `.github/workflows/pages.yml`.
   - The Actions workflow is committed locally on master (not pushed). After `gh auth refresh -s workflow`, push it and switch Pages source back to GitHub Actions.
2. Keeper: Render free web service from Blueprint `render.yaml` at the repo root (rootDir `keeper`, plan free).
3. Model order on Render: NEAR AI Cloud if `NEAR_AI_KEY` is set, otherwise the labelled fixed policy. Local Qwen stays off unless `FERAL_LOCAL_MODEL` is set (it needs about 4 GB and will not fit on 512 MB).

### Render free, the honest tradeoffs
- It sleeps after 15 minutes with no visitors and takes about a minute to wake. The page shows **Waking the terrarium**, then falls back to the recorded proof run if it never answers.
- Its disk is wiped on every restart, deploy or sleep. The chain keeps every balance, job and creature, so play carries on, but the page's turn log, the model reasons and new card files from before the restart are lost. The NEAR AI no credit wait also resets, so after a restart the keeper makes one call to learn it again.
- 750 free hours a month, enough for one service running all month.
- Render may restart a free service at any time.

## Secret env vars for the keeper (Render dashboard, sync: false)

| Name | Required | What it is | Where the value lives on this box (path only) | How the keeper loads it |
| --- | --- | --- | --- | --- |
| `FERAL_KEEPER_KEY` | yes | Private key of the **function-call** access key for `keeper.feral-039832.testnet` (limited to arena game methods). Never a full-access key. | `/home/box/.feral-keeper/fc-key.json` field `private_key` | `near.mjs` `loadKey()` reads `process.env.FERAL_KEEPER_KEY`, else `FERAL_KEEPER_KEY_FILE` (default `~/.feral-keeper/fc-key.json`) |
| `NEAR_AI_KEY` | no | NEAR AI Cloud API key. Without it (or with no credits) the page labels **Fixed policy**. | `/home/box/.secrets/near-ai.env` name `NEAR_AI_KEY` | `server.mjs` calls `loadEnvFile` for that path on this box; on Render set the env var directly |

Do **not** upload `/home/box/.near-credentials/testnet/keeper.feral-039832.testnet.json`. That file is a full-access credential and must never go on Render.

## Non-secret env (already in `render.yaml`)

- `HOST=0.0.0.0`
- `PORT` from Render
- `FERAL_ALLOW_ORIGIN=https://davisbrains.github.io`
- `FERAL_TRUST_PROXY=1`
- `FERAL_TRANSLATION_DEMAND=1`
- Leave `FERAL_LOCAL_MODEL` unset on Render

## GitHub Pages build

- Workflow builds with `VITE_BASE=/feral/` and `VITE_KEEPER_URL` from the repo variable `FERAL_KEEPER_URL`.
- Until that variable is set to the Render URL, live mode shows that the keeper is not linked and the recorded proof run still works.
- After Render gives a URL like `https://feral-keeper.onrender.com`, set repo variable `FERAL_KEEPER_URL` to that origin (no trailing slash) and re-run the Pages workflow.

## Steps for David and the dashboard

1. David signs into Render with GitHub (no card).
2. New Blueprint from `DavisBrains/feral`, path `render.yaml` (or New Web Service, root `keeper`, build `npm install --omit=dev`, start `node server.mjs`, plan free).
3. Paste `FERAL_KEEPER_KEY` (and optional `NEAR_AI_KEY`) in the Render env UI.
4. Confirm `https://<service>.onrender.com/healthz` returns `ok` and `/api/state` shows the model route.
5. Set GitHub repo variable `FERAL_KEEPER_URL` to that origin and wait for Pages to redeploy.
6. Open `https://davisbrains.github.io/feral/` and play one visitor turn from the public address.
