# Feral public testnet evidence

The parent created feral-039832.testnet with the official faucet. The supplied creation transaction is [BMudVUSoFqYhvXV7JkAqkyZkAjfGJbS5yTob9hEDohT3](https://testnet.nearblocks.io/txns/BMudVUSoFqYhvXV7JkAqkyZkAjfGJbS5yTob9hEDohT3). This hash is parent supplied, not a transaction submitted by this executor.

The executor ran only public RPC views and local tests. The dry run observed 10 NEAR and estimates 5.15 NEAR maximum outlay with a conservative fee allowance. It created no deployment, registration, payment, death or birth transaction. There are no public loop links to claim yet.

The parent can run scripts/testnet-run.sh with its explicit execute flag. See docs/TESTNET-RUNNER.md for the command and stop or resume rules. The script then replaces this placeholder with every captured transaction hash and nearblocks link, also recording nested birth receipt identifiers in JSON.

Local sandbox hashes in terrarium-run.json, native-reconciliation.json and mock-mpc.json are not public chain evidence. Public MPC calls, Sepolia, GitHub and posting are not included.
