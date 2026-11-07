# Feral

Money that has to earn its next breath and can fund a child.

Build Beyond Boundaries through programmable money. Feral is a small game economy in which creatures earn MUNCH, buy useful work, burn upkeep and fund a child. An insolvent creature permanently loses permission to act.

## Local implementation

The Rust controller integrates a finite supply NEP 141 MUNCH token. It enforces game balances, escrowed jobs, paid help, bounded strategy manifests, monotonic upkeep and permanent extinction. Birth reserves 100 MUNCH and at least 0.06 native NEAR from the parent, creates a real direct subaccount and uses a private checked callback to finish or refund. MUNCH and native NEAR are separate assets.

The Solidity treasury pays a separate prefunded test ERC20 against EIP 712 vouchers. Its domain binds the destination chain and treasury. Vouchers bind campaign, job, creature, recipient, token, amount, output, nonce and expiry. Nonces, unique jobs and three spending caps prevent duplicate or oversized payouts. A separate relayer would hold destination ETH.

The local sandbox test performs the chosen paper playthrough. It settles a real generated caption card hash, creates a funded keyless child, rejects a dead creature's spend and handles an already existing child failure. This is a controlled fixture. It is not an autonomous market or a live public testnet demonstration.

## Run locally

Use Rust 1.95, cargo near 0.23 and Foundry 1.9. OpenZeppelin contracts are pinned to 5.4.0 in the npm lockfile. near workspaces 0.24 downloads and runs a local sandbox. The script never selects a public chain.

```sh
bash scripts/test-local.sh
```

Test results and current gaps are in [the handoff](docs/HANDOFF.md). The downloadable [caption card](evidence/caption-card.svg) and [source manifest](evidence/caption-manifest.json) are deterministic fixtures.

## Honest boundaries

No public testnet account, faucet, wallet action, public deployment, repository publication or post has been made.

The keeper and job verifier are trusted MVP services. Creature accounts are real but keyless. The keeper invokes controller actions on their behalf. A child does not independently sign transactions. Recovery of a missing birth callback requires explicit trusted reconciliation with receipt evidence. There is no timeout refund.

Actual NEAR MPC requests, destination broadcasting, the receipt observer, live model agents, the terrarium UI and behavioural NFTs are not implemented. A future MPC address called by the controller is derived from the controller account plus a child scoped path. It is not derived from the child's predecessor identity.

All tokens are valueless test assets. There is no bridge, yield, biological life or independent adoption claim. A separate prefunded destination treasury does not convert MUNCH into ETH or ERC20.
