import * as ethers from "ethers";
import { Provider, utils, Wallet } from "zksync-web3";
import fs from 'fs';

const TEST_PRIVATE_KEY = fs.readFileSync(require.resolve('../../.private_key')).toString();
const GOERLI_ENDPOINT = fs.readFileSync(require.resolve('../../.goerli_endpoint')).toString();

const MESSAGE = "Some L2->L1 message";

const l2Provider = new Provider("https://zksync2-testnet.zksync.dev");
const l1Provider = ethers.providers.getDefaultProvider(GOERLI_ENDPOINT);

const WALLET = new Wallet(TEST_PRIVATE_KEY, l2Provider, l1Provider);

async function sendMessageToL1(text: string) {
  console.log(`Sending message to L1 with text ${text}`);
  const textBytes = ethers.utils.toUtf8Bytes(MESSAGE);
  const wallet = new Wallet(TEST_PRIVATE_KEY, l2Provider, l1Provider);

  const messengerContract = new ethers.Contract(utils.L1_MESSENGER_ADDRESS, utils.L1_MESSENGER, wallet);
  const tx = await messengerContract.sendToL1(textBytes);
  await tx.wait();
  console.log("L2 trx hash is ", tx.hash);
  return tx;
}

async function getL2MessageProof(blockNumber: ethers.BigNumberish) {
  console.log(`Getting L2 message proof for block ${blockNumber}`);
  return await l2Provider.getMessageProof(blockNumber, WALLET.address, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(MESSAGE)));
}

async function proveL2MessageInclusion(l1BatchNumber: ethers.BigNumberish, proof: any, trxIndex: number) {
  const zkAddress = await l2Provider.getMainContractAddress();

  const mailboxL1Contract = new ethers.Contract(zkAddress, utils.ZKSYNC_MAIN_ABI, l1Provider);
  // all the information of the message sent from L2
  const messageInfo = {
    txNumberInBlock: trxIndex,
    sender: WALLET.address,
    data: ethers.utils.toUtf8Bytes(MESSAGE),
  };

  console.log(`Retrieving proof for batch ${l1BatchNumber}, transaction index ${trxIndex} and proof id ${proof.id}`);

  const res = await mailboxL1Contract.proveL2MessageInclusion(l1BatchNumber, proof.id, messageInfo, proof.proof);

  return res;
}

/**
 * Full end-to-end of an L2-L1 messaging with proof validation.
 * Recommended to run in 3 steps:
 * 1. Send message.
 * 2. Wait for transaction to finalize and block verified
 * 3. Wait for block to be verified and validate proof
 */
async function main() {
  // Step 1: send message
  const l2Trx = await sendMessageToL1(MESSAGE);

  console.log("Waiting for transaction to finalize...");

  // Step 2: waiting to finalize can take a few minutes.
  const l2Receipt = await l2Trx.waitFinalize();
  console.log("L2 Tx receipt: ", l2Receipt);

  // Step 3: get and validate proof (block must be verified)
  const proof = await getL2MessageProof(l2Receipt.blockNumber);

  console.log(`Proof is: `, proof);

  const trx = await l2Provider.getTransaction(l2Receipt.transactionHash);

  const {l1BatchNumber, l1BatchTxIndex} = await l2Provider.getTransactionReceipt(l2Receipt.transactionHash);

  // @ts-ignore
  console.log("trx.transactionIndex :>> ", trx.transactionIndex);

  // @ts-ignore
  const block = await l2Provider.getBlock(trx.blockNumber);

  console.log("L1 Batch for block :>> ", block.l1BatchNumber);

  // IMPORTANT: This method requires that the block is verified
  // and sent to L1!
  const result = await proveL2MessageInclusion(
    l1BatchNumber,
    proof,
    // @ts-ignore
    l1BatchTxIndex
  );

  console.log("Result is :>> ", result);
  process.exit();
}

try {
  main();
} catch (error) {
  console.error(error);
}
