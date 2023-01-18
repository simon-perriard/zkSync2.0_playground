require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
import fs from "fs";

const GOERLI_ENDPOINT = fs.readFileSync(require.resolve('../../.goerli_endpoint')).toString();

module.exports = {
  zksolc: {
    version: "1.2.3",
    compilerSource: "binary",
    settings: {
      optimizer: {
        enabled: true,
      },
      experimental: {
      },
    },
  },
  defaultNetwork: "zkTestnet",
  networks: {
    zkTestnet: {
      url: "https://zksync2-testnet.zksync.dev", // URL of the zkSync network RPC
      ethNetwork: GOERLI_ENDPOINT, // Can also be the RPC URL of the Ethereum network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
      zksync: true
    }
  },
  solidity: {
    version: "0.8.16",
  },
};