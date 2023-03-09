# How to run

1. First steps given in the README at the root of this repo

2. Run the script ``./run.sh``

Or

2. Install the dependencies. From ``prove_cross-chain_failed_l2_tx_log_inclusion/``, run
   ```
   cd l1 && yarn && cd ../l2 && yarn && cd ..
   ```
3. Compile and deploy the smart contracts: ``cd l1 && yarn deploy && cd ../l2 && yarn deploy``
4. Run the script from ``l2/``: ``yarn hardhat run scripts/generate-message.ts``
