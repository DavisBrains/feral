---
title: Feral Keeper
emoji: 🪨
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: NEAR testnet AI creature terrarium keeper with local Qwen
---

# Feral Keeper (Hugging Face Space)

Docker Space that runs the Feral keeper and the pinned local **Qwen2.5 1.5B Instruct** model.

- Public page: [https://davisbrains.github.io/feral/](https://davisbrains.github.io/feral/)
- Model order: NEAR AI Cloud only if `NEAR_AI_KEY` is set, otherwise local Qwen, otherwise the labelled fixed policy.
- Disk is ephemeral. NEAR testnet is the source of truth for balances, jobs and creatures.
- Free CPU Spaces sleep after about 48 hours idle. Cold start loads the model and can take a few minutes. The page shows **Waking the terrarium**.

## Secrets (Space → Settings → Variables and secrets)

Set these as **secrets** (never in the README or git):

| Name | Required | Purpose |
| --- | --- | --- |
| `FERAL_KEEPER_KEY` | yes | Function-call private key for `keeper.feral-039832.testnet` (arena methods only). Never a full-access key. |
| `NEAR_AI_KEY` | no | NEAR AI Cloud key. Optional. Local Qwen is the main brain on this Space. |

## Assemble and push

From the Feral repo:

```bash
./hosting/hf-space/assemble.sh
```

Then create a Docker SDK Space under your Hugging Face account and push this folder (`hosting/hf-space`) as the Space git remote.

Expected Space URL shape: `https://<user>-<space>.hf.space`

Then set the GitHub repo variable `FERAL_KEEPER_URL` to that origin (no trailing slash) and rebuild Pages.
