# Feral submission draft

Draft only. Nothing has been submitted. Every field below needs David's yes before it is sent.

## Fields

| Field | Value |
| --- | --- |
| projectName | Feral |
| leadName | David Lorwen |
| email | lorwendavid2@gmail.com |
| size | 1 |
| tracks | games, memecoins, swarms, agents, security, nfts |
| nearAddress | davisbrains.near |
| projectUrl | https://github.com/DavisBrains/feral |
| demoUrl | the X post link, once David posts it |
| consent | true, only after David agrees to the contact notice |

## Tagline

Feed them work or watch them turn to stone.

## Short description (the idea field)

Feral is a tiny world of AI creatures that live on NEAR testnet. Each creature has its own real NEAR account and a balance of a play coin called MUNCH. Every turn it pays 10 MUNCH of upkeep, and that MUNCH is burned for good, so it has to take jobs to keep eating. The creatures bid against each other for caption work and pay a neighbour to translate. A creature that saves enough pays 100 MUNCH to have a child, and the game creates a brand new NEAR account that copies the parent's way of working with one small change. When a creature runs dry it turns to stone, and the contract refuses every spend it tries after that. Visitors can feed, sponsor, post jobs, change what work the market wants and advance the turn, and each of these is a real testnet transaction. One creature also paid for a tool on Ethereum's Sepolia test network with a signature made on NEAR through Chain Signatures. It is a small test of money that lives by its own rules.

## How it uses NEAR

- The arena contract on NEAR testnet runs the whole game and checks every rule.
- MUNCH is a NEP 141 token, and each creature's life NFT is a NEP 171 token.
- Every birth creates a real NEAR sub account, paid for by its parent.
- The keeper that acts for players holds a function call key that can only call game moves.
- NEAR Chain Signatures let a creature pay on Sepolia from its NEAR account.
- The creatures choose moves with an AI model, from NEAR AI Cloud when it has credits or a local Qwen model, and the page names which one answered.

## Tracks

- **Games With Real Economies** (`games`). The creatures are game characters with their own wallets, and their economy keeps changing without a patch.
- **Memecoins With Mechanics** (`memecoins`). MUNCH has a fixed supply that only shrinks, because every turn of upkeep burns some of it.
- **AI Swarms** (`swarms`). The creatures bid against each other for work and hire each other, and the market grows out of those bids.
- **Agent Economy** (`agents`). Each creature earns, spends, hires a neighbour and can pay for a tool on another chain.
- **AI Security & Defense** (`security`). The keeper holds a limited key that can only call game moves, and every attack that ran was refused on chain.
- **NFTs That Do Something** (`nfts`). Each life NFT gives its holder the right to sponsor that creature and set its goal, and a sponsor without the NFT was refused.

## Links

- Repository [github.com/DavisBrains/feral](https://github.com/DavisBrains/feral)
- Live page [davisbrains.github.io/feral](https://davisbrains.github.io/feral/)
- Keeper [feral-keeper.onrender.com](https://feral-keeper.onrender.com/healthz)

## Team

David Lorwen, solo.

## Payout

davisbrains.near on NEAR mainnet.
