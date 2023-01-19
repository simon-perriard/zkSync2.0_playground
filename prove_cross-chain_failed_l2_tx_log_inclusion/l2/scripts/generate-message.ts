import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { Provider, utils } from 'zksync-web3';
import fs from 'fs';

const MESSAGE_TEST_L1_ABI = JSON.parse(fs.readFileSync(require.resolve('../../l1/artifacts/contracts/MessageTestL1.sol/MessageTestL1.json')).toString()).abi;
const MESSAGE_TEST_L2_ABI = JSON.parse(fs.readFileSync(require.resolve('../artifacts-zk/contracts/MessageTestL2.sol/MessageTestL2.json')).toString()).abi;

const MESSAGE_TEST_L1_ADDRESS = fs.readFileSync(require.resolve('../../l1_deployment_address')).toString();
const MESSAGE_TEST_L2_ADDRESS = fs.readFileSync(require.resolve('../../l2_deployment_address')).toString();

const PRIV_KEY = fs.readFileSync(require.resolve('../../../.private_key')).toString();
const GOERLI_ENDPOINT = fs.readFileSync(require.resolve('../../../.goerli_endpoint')).toString();

// Ethereum L1 provider
const l1Provider = ethers.providers.getDefaultProvider(GOERLI_ENDPOINT);
const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');

const wallet = new Wallet(PRIV_KEY, l1Provider);

const l1_contract = new Contract(
    MESSAGE_TEST_L1_ADDRESS,
    MESSAGE_TEST_L1_ABI,
    wallet
);

// Getting the current address of the zkSync L1 bridge
let zkSyncAddress: string;
// Getting the `Contract` object of the zkSync bridge
let zkSyncContract: Contract;

const SHOULD_FAIL = true

async function zkSyncAddressSetup() {
    zkSyncAddress = await l2Provider.getMainContractAddress();
    zkSyncContract = new Contract(
        zkSyncAddress,
        utils.ZKSYNC_MAIN_ABI,
        wallet
    );
}

async function triggerFromL1() {

    // Encoding the tx data the same way it is done on Ethereum.
    const l2Interface = new ethers.utils.Interface(MESSAGE_TEST_L2_ABI);
    const data = l2Interface.encodeFunctionData("L2Test(bool)", [SHOULD_FAIL]);
    console.log("DATA:", data)
    // The price of the L1 transaction requests depends on the gas price used in the call
    const gasPrice = await l1Provider.getGasPrice();

    // Here we define the constant for ergs limit .
    const ergsLimit = BigNumber.from(2097152);
    
    // Getting the cost of the execution.
    // For now, hardcoded 0 in testnet
    const baseCost = 0;/*await zkSyncContract.l2TransactionBaseCost(
        gasPrice,
        ergsLimit,
        ethers.utils.hexlify(data).length,
    );*/

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
    console.log("L1 Tx response: ", tx);
    return tx;
}

async function main() {
    await zkSyncAddressSetup();
    
    const l1TxResponse = await triggerFromL1();
    
    // Getting the TransactionResponse object for the L2 transaction corresponding to the 
    // execution call
    const l2TxResponse = await l2Provider.getL2TransactionFromPriorityOp(l1TxResponse);
    console.log("L2 Tx Response: ", l2TxResponse);
        
    // /!\ CANNOT USE waitFinalize() as it will return with an error because the Tx reverts on L2
    // The receipt of the L2 transaction corresponding to the call to the MessageTestL2 contract
    await l2TxResponse.waitFinalize();
}

try {
    main();
} catch (error) {
    console.error(error);
}