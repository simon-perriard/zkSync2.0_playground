import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { Provider, utils } from 'zksync-web3';
import fs from 'fs';

const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');

const MESSAGE_TEST_L1_ABI = require('./message_test_l1.json');
const MESSAGE_TEST_L1_ADDRESS = '0x8B4D470acEa29158840C5CB6A4168558d347f206';
const MESSAGE_TEST_L2_ABI = require('./message_test_l2.json');
const MESSAGE_TEST_L2_ADDRESS = '0x5AD349deDd5fe1E9D2778b9d7Bc7844bE73aac0a';

const PRIV_KEY = fs.readFileSync("../../.private_key").toString();
const GOERLI_ENDPOINT = fs.readFileSync("../../.goerli_endpoint").toString();


async function main() {
    // Ethereum L1 provider
    const l1Provider = ethers.providers.getDefaultProvider(GOERLI_ENDPOINT);

    // Governor wallet
    const wallet = new Wallet(PRIV_KEY, l1Provider);

    const l1_contract = new Contract(
        MESSAGE_TEST_L1_ADDRESS,
        MESSAGE_TEST_L1_ABI,
        wallet
    );

    // Getting the current address of the zkSync L1 bridge
    const zkSyncAddress = await l2Provider.getMainContractAddress();
    // Getting the `Contract` object of the zkSync bridge
    const zkSyncContract = new Contract(
        zkSyncAddress,
        utils.ZKSYNC_MAIN_ABI,
        wallet
    );

    // Encoding the tx data the same way it is done on Ethereum.
    const l2Interface = new ethers.utils.Interface(MESSAGE_TEST_L2_ABI);
    const data = l2Interface.encodeFunctionData("L2Test(bool)", ['false']);

    // The price of the L1 transaction requests depends on the gas price used in the call
    const gasPrice = await l1Provider.getGasPrice();

    // Here we define the constant for ergs limit .
    const ergsLimit = BigNumber.from(2097152);
    // Getting the cost of the execution.
    const baseCost = await zkSyncContract.l2TransactionBaseCost(
        gasPrice,
        ergsLimit,
        ethers.utils.hexlify(data).length,
    );

    // Calling the L1 contract.
    const tx = await l1_contract.callZkSync(
        MESSAGE_TEST_L2_ADDRESS,
        data,
        {
            // Passing the necessary ETH `value` to cover the fee for the operation
            value: baseCost,
            gasPrice
        }
    );

    // Waiting until the L1 tx is complete.
    await tx.wait();
    console.log(tx);
    console.log("L1 TX FINISHED");
    // Getting the TransactionResponse object for the L2 transaction corresponding to the 
    // execution call
    const l2Response = await l2Provider.getL2TransactionFromPriorityOp(tx);
    console.log("WAITING FOR L2 RESPONSE")
    // The receipt of the L2 transaction corresponding to the call to the MessageTestL2 contract
    const l2Receipt = await l2Response.wait();
    console.log(l2Receipt);
    //const proof = await l2Provider.getMessageProof(l2Receipt.blockNumber, l2Receipt.topics[1], ethers.utils.id(data))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
