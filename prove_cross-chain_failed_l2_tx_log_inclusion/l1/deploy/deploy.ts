// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { Provider } from 'zksync-web3';
import fs from "fs";

async function main() {

  const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');
  const MAILBOX_L1 = await l2Provider.getMainContractAddress();

  // We get the contract to deploy
  const MessagesTestL1 = await ethers.getContractFactory("MessageTestL1");
  const contract = await MessagesTestL1.deploy(MAILBOX_L1);
  await contract.deployed();

  // Write the deployment address in the target file
  fs.writeFileSync("../l1_deployment_address", contract.address);

  console.log(`MessageTestL1 contract was successfully deployed at ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
