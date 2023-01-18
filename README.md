# zkSync 2.0 Playground

## Proving a failed L1->L2 transaction on L1

Any L1->L2 transaction will be executed by the BOOTLOADER and will generate a L2Log output. From [zkSync 2.0 docs](https://v2-docs.zksync.io/dev/developer-guides/bridging/l1-l2.html):

* A **successful** transaction will generate a log entry s.t. : key = l2TxHash, and value = bytes32(1)
* A **failed** transaction will generate a log entry s.t. : key = l2TxHash, and value = bytes32(0)

An example of how to prove a failed L2 transaction on L1 is available [here](https://github.com/simon-perriard/zkSync2.0_playground/tree/main/prove_cross-chain_failed_l2_tx_log_inclusion).

## Proving an L2->L1 message has been included in a block

An example of how to prove that a L2->L1 message has been included is available [here](https://github.com/simon-perriard/zkSync2.0_playground/tree/main/prove_l2_message_inclusion_no_smart_contract). This example does not contains any custom smart contract and only relies on ZkSync API.

## How to run

Create two files at the root of this repo:

```
.goerli_endpoint
.private_key
```

Which contain the Goerli endpoint for RPC calls, and the private key that will be used for testing. The address associated with the private key must have some GoerliETH as well as zkSyncETH. The faucet for Goerli is [here](https://goerli-faucet.pk910.de/), the bridge to fund the zkSync 2.0 wallet is [here](https://portal.zksync.io/).

Further specific running information is given in each subfolder.