// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // We get the contract to deploy
  const MessagesTestL1 = await ethers.getContractFactory("MessageTestL1");
  const contract = await MessagesTestL1.deploy(['0xd8792D39bDDb4622cBadd62004A067E72206ca98']);
  await contract.deployed();

  console.log(`MessageTestL1 contract was successfully deployed at ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
