# Hosting

The page lives on GitHub Pages and the keeper lives on a free Render web service. Checked on 9 Nov 2026. Free plans change often, so check again before you rely on one.

## Live links

| What | Where |
| --- | --- |
| Page | [davisbrains.github.io/feral](https://davisbrains.github.io/feral/) |
| Keeper | [feral-keeper.onrender.com](https://feral-keeper.onrender.com/healthz) |
| Keeper state | [feral-keeper.onrender.com/api/state](https://feral-keeper.onrender.com/api/state) |

## Page

The page is built with `VITE_BASE=/feral/` and `VITE_KEEPER_URL=https://feral-keeper.onrender.com` and pushed to the `gh-pages` branch. The repo variable `FERAL_KEEPER_URL` holds the same address.

The Actions workflow is kept in `hosting/github/pages.yml`. The box `gh` token has no workflow scope, so it is not in `.github/workflows` yet. Once that scope is added, move it there and switch Pages to GitHub Actions.

To rebuild by hand

```
cd app
VITE_BASE=/feral/ VITE_KEEPER_URL=https://feral-keeper.onrender.com npm run build
```

Then copy `app/dist` to the `gh-pages` branch with an empty `.nojekyll` file.

## Keeper

Render service `feral-keeper` in Frankfurt on the free plan. It builds from `master` with root folder `keeper`, runs `npm ci --omit=dev`, then `node server.mjs`, and checks `/healthz`.

### Plain settings

| Name | Value | Why |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen for Render |
| `FERAL_ALLOW_ORIGIN` | `https://davisbrains.github.io` | Only the page may call the keeper from a browser |
| `FERAL_TRUST_PROXY` | `1` | Rate limits use the real visitor address |
| `FERAL_LOCAL_MODEL` | `0` | No room for Qwen on 512 MB |
| `FERAL_NEAR_AI` | `0` | No NEAR AI credits yet |
| `FERAL_DATA` | `/tmp/feral-data` | Short lived disk. The chain keeps every balance |
| `FERAL_TRANSLATION_DEMAND` | `1` | Plain translation jobs are on |
| `FERAL_TURNS_PAUSED` | `1` for now | Visitors can watch but every move and turn is refused |
| `NODE_VERSION` | `22` | Same Node as the box |

### Secret

`FERAL_KEEPER_KEY` holds the private key of the function call key for `keeper.feral-039832.testnet`. That key can only call the arena game methods. The value comes from `/home/box/.feral-keeper/fc-key.json` and is set through the Render API, never printed. The full access key in `.near-credentials` never leaves the box.

### Pause

While `FERAL_TURNS_PAUSED` is `1` the keeper answers every move, season and turn with code 423 and the note "The terrarium opens soon". The page shows that note on its controls and the creatures stay put. Set it to `0` in Render to open play.

## Honest tradeoffs

The free Render plan sleeps after 15 quiet minutes. The first visit after that takes about a minute, and the page shows Waking the terrarium while it waits.

The public keeper uses the labelled fixed policy, and the page says so on every decision. Local Qwen runs on the box, and the demo video is recorded there.

The disk is wiped on each restart, so the page loses old turn notes. The chain keeps every balance, job and creature.

Hugging Face Spaces was the first plan. On 9 Nov 2026 it refused to create a Docker Space without a paid PRO plan, so `hosting/hf-space` stays here for later.

## Box operator path

The box keeper can take turns for the season pilot when it gets the header `x-feral-operator` with the token from `FERAL_OPERATOR_TOKEN`. It only works for requests from 127.0.0.1 with no forwarding header, and only when the token is at least 32 characters. This was added to film Ash's last turns from a fresh headless browser. Never set `FERAL_OPERATOR_TOKEN` on Render.

## Taking over an idle season

The chain keeps the visitor who started a season. The keeper keeps who holds it now. When the holder has made no move for 10 minutes (`FERAL_TAKEOVER_MS`), the page tells the next visitor "This season is free. Take over and play." Pressing Take over sends no transaction. The keeper writes the new holder to its own meta file and adds a line to the turn log. A visitor can start a new season only after the current one ends, or while holding it. On Render the disk is wiped on every deploy, so after a deploy the season is free again.
