import { Wallet } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import fs from "fs";

const PRIV_KEY = fs.readFileSync(require.resolve('../../../.private_key')).toString();
const MESSAGE_TEST_L1_ADDRESS = fs.readFileSync(require.resolve('../../l1_deployment_address')).toString();

// Initialize the wallet.
const wallet = new Wallet(PRIV_KEY);


async function deployL2MessageTestL2(deployer: Deployer) {
  const artifact = await deployer.loadArtifact("MessageTestL2");

  const contract = await deployer.deploy(artifact, [MESSAGE_TEST_L1_ADDRESS]);

  // Show the contract info.
  const contractAddress = contract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);

  // Write the deployment address in the target file
  fs.writeFileSync("../l2_deployment_address", contractAddress);
}

async function deployRefundRecipient(deployer: Deployer) {
  const artifact = await deployer.loadArtifact("RefundRecipient");

  const contract = await deployer.deploy(artifact, [MESSAGE_TEST_L1_ADDRESS]);

  // Show the contract info.
  const contractAddress = contract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);

  // Write the deployment address in the target file
  fs.writeFileSync("../l2_deployment_address_refund", contractAddress);
}


// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {


  console.log(`Running deploy script for the MessageTestL2 contract`);

  // Create deployer object and load the artifact of the contract we want to deploy.
  const deployer = new Deployer(hre, wallet);

  await deployL2MessageTestL2(deployer);
  await deployRefundRecipient(deployer);
  
}
