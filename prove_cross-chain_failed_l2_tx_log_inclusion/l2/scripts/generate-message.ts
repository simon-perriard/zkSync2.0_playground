import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { Provider, utils } from 'zksync-web3';
import fs from 'fs';
import { BOOTLOADER_FORMAL_ADDRESS, sleep } from 'zksync-web3/build/src/utils';

const MESSAGE_TEST_L1_ABI = require('./message_test_l1.json');
const MESSAGE_TEST_L1_ADDRESS = '0xABb87d458c0a9B1c3C82f95e417cb7df10C3fcDf';
const MESSAGE_TEST_L2_ABI = require('./message_test_l2.json');
const MESSAGE_TEST_L2_ADDRESS = '0xceD8E23AD0aD6042B19F369311F9B4E7d660bB5F';

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

async function getProof(l2TxHash) {
    // Wait for the proof to be generated
    let proof = await l2Provider.getLogProof(l2TxHash);
    while (proof == null){
        console.log("Waiting a bit more...");
        await sleep(1000*30);
        proof = await l2Provider.getLogProof(l2TxHash);
    }
    return proof;
}

async function directProofToMailboxOfL2LogInclusion(l1BatchNumber: ethers.BigNumberish, l2TxHash: ethers.BigNumberish, proof: any, trxIndex: number) {
    const zkAddress = await l2Provider.getMainContractAddress();

    const mailboxL1Contract = new ethers.Contract(zkAddress, utils.ZKSYNC_MAIN_ABI, l1Provider);

    const L2Log = {
        l2ShardId: 0,
        isService: true,
        txNumberInBlock: trxIndex,
        sender: BOOTLOADER_FORMAL_ADDRESS,
        key: l2TxHash,
        value: SHOULD_FAIL ? '0x0000000000000000000000000000000000000000000000000000000000000000' : '0x0000000000000000000000000000000000000000000000000000000000000001'
    };

    const res = await mailboxL1Contract.proveL2LogInclusion(l1BatchNumber, proof.id, L2Log, proof.proof);

    return res;
}

async function main() {
    await zkSyncAddressSetup();
    
    const l1TxResponse = await triggerFromL1();
    
    // Getting the TransactionResponse object for the L2 transaction corresponding to the 
    // execution call
    const l2TxResponse = await l2Provider.getL2TransactionFromPriorityOp(l1TxResponse);
    console.log("L2 Tx Response: ", l2TxResponse);
    
    const l2TxHash = l2TxResponse.hash;
    
    // /!\ POTENTIAL BUG
    // /!\ CANNOT USE waitFinalize() as it will return with an error because the Tx reverts on L2
    // The receipt of the L2 transaction corresponding to the call to the MessageTestL2 contract
    //const l2TxReceipt = await l2TxResponse.waitFinalize();
    //console.log("L2 Tx Receipt: ", l2TxReceipt);

    // Wait for the proof to be generated
    let proof = await getProof(l2TxHash);
    console.log("Proof is: ", proof);

    const {l1BatchNumber, l1BatchTxIndex} = await l2Provider.getTransactionReceipt(l2TxHash);

    // Try to prove directly through the mailbox
    const res1 = await directProofToMailboxOfL2LogInclusion(l1BatchNumber, l2TxHash, proof, l1BatchTxIndex);

    console.log("Result of direct proof: ", res1);

    // Try to prove through our smart contract
    /*const res = await l1_contract.checkLog(
        txHash,
        receipt.blockNumber,
        proof?.id,
        receipt.transactionIndex,
        proof?.proof,
    );

    console.log(res.wait())*/
    process.exit();
}

try {
    main();
} catch (error) {
    console.error(error);
}