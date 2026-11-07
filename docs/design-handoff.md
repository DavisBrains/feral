# Day 1 handoff

No implementation was attempted. The mandatory code changes skill requires all nontrivial repository coding to go through a Cursor cloud agent. This task explicitly restricts everything to the box. Starting a cloud agent would violate that constraint, and implementing locally would violate the mandatory skill. No cloud agent was launched. This is a known workflow restriction, not a missing GitHub connection. No repo was created, locally or remotely.

Research drafts are saved outside a repository at /workspace/near/plan/feral-day1. They can be handed to an authorized coding workflow later. No unit tests, contract build, sandbox integration tests, EVM tests or model evaluation were run. paper-arithmetic.txt records arithmetic checks only.

The Nov 9 WAT gate is at risk until the local versus mandatory cloud coding workflow conflict is resolved, the current Rust toolchain compatibility is checked and sandbox binaries are available. Birth callback recovery and the distinction between death transitions and panicking actor actions need explicit implementation tests. Real caption output and live model decisions remain unproven. NFT behaviour is optional and unimplemented.

External actions needed only after local proofs and specific David approval include NEAR testnet account creation and faucet funding, deployments and funded child creation, an MPC sign call, a Sepolia relayer account with faucet ETH, test ERC20 and treasury deployments and funding, voucher redemption, an approved inference route if no local model is installed, and eventual public GitHub repo creation and push. Repo publication, demo posting and submission each require separate approval. None is needed merely to continue local proofs under a permitted coding workflow.
