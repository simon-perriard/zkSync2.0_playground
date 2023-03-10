import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { Provider, utils } from 'zksync-web3';
import fs from 'fs';
import { BOOTLOADER_FORMAL_ADDRESS, sleep } from 'zksync-web3/build/src/utils';

const MESSAGE_TEST_L1_ABI = JSON.parse(fs.readFileSync(require.resolve('../../l1/artifacts/contracts/MessageTestL1.sol/MessageTestL1.json')).toString()).abi;
const MESSAGE_TEST_L2_ABI = JSON.parse(fs.readFileSync(require.resolve('../artifacts-zk/contracts/MessageTestL2.sol/MessageTestL2.json')).toString()).abi;

const MESSAGE_TEST_L1_ADDRESS = fs.readFileSync(require.resolve('../../l1_deployment_address')).toString();
const MESSAGE_TEST_L2_ADDRESS = fs.readFileSync(require.resolve('../../l2_deployment_address')).toString();
const REFUND_TEST_L2_ADDRESS = fs.readFileSync(require.resolve('../../l2_deployment_address_refund')).toString();

const PRIV_KEY = fs.readFileSync(require.resolve('../../../.private_key')).toString();
const GOERLI_ENDPOINT = fs.readFileSync(require.resolve('../../../.goerli_endpoint')).toString();

// Ethereum L1 provider
const l1Provider = ethers.providers.getDefaultProvider(GOERLI_ENDPOINT);
const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');

const L1wallet = new Wallet(PRIV_KEY, l1Provider);
const L2wallet = new Wallet(PRIV_KEY, l2Provider);

const l1_contract = new Contract(
    MESSAGE_TEST_L1_ADDRESS,
    MESSAGE_TEST_L1_ABI,
    L1wallet
);

// Getting the current address of the zkSync L1 bridge
let zkSyncAddress: string;
// Getting the `Contract` object of the zkSync bridge
let zkSyncContract: Contract;

const SHOULD_FAIL = true;
const BRIDGED_AMOUNT = BigNumber.from(1);

async function zkSyncAddressSetup() {
    zkSyncAddress = await l2Provider.getMainContractAddress();
    zkSyncContract = new Contract(
        zkSyncAddress,
        utils.ZKSYNC_MAIN_ABI,
        L1wallet
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
        REFUND_TEST_L2_ADDRESS,
        data,
        {
            // Passing the necessary ETH `value` to cover the fee for the operation
            value: BRIDGED_AMOUNT,
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
        console.log("Waiting a bit more for the proof to be generated...");
        await sleep(1000*30);
        proof = await l2Provider.getLogProof(l2TxHash);
    }
    return proof;
}

async function directProofToMailboxOfL2LogInclusion(l1BatchNumber: ethers.BigNumberish, l2TxHash: ethers.BigNumberish, proof: any, trxIndex: number) {

    const mailboxL1Contract = new ethers.Contract(zkSyncAddress, utils.ZKSYNC_MAIN_ABI, l1Provider);

    const L2Log = {
        l2ShardId: 0,
        isService: true,
        txNumberInBlock: trxIndex,
        sender: BOOTLOADER_FORMAL_ADDRESS,
        key: l2TxHash,
        value: '0x0000000000000000000000000000000000000000000000000000000000000000'
    };

    let res = await mailboxL1Contract.proveL2LogInclusion(l1BatchNumber, proof.id, L2Log, proof.proof);
  
    return res;
}

async function main() {
    await zkSyncAddressSetup();

    const refundBalance_pre = await l2Provider.getBalance(REFUND_TEST_L2_ADDRESS);
    if (SHOULD_FAIL) {
        console.log("Balance of refund address before call: ", refundBalance_pre);
    }
    
    const l1TxResponse = await triggerFromL1();
    
    // Getting the TransactionResponse object for the L2 transaction corresponding to the 
    // execution call
    const l2TxResponse = await l2Provider.getL2TransactionFromPriorityOp(l1TxResponse);
    console.log("L2 Tx Response: ", l2TxResponse);
    
    const l2TxHash = l2TxResponse.hash;

    if (SHOULD_FAIL) {
        const refundBalance_post = await l2Provider.getBalance(REFUND_TEST_L2_ADDRESS);
        console.log("Delta of refund address balance: ", refundBalance_post.sub(refundBalance_pre).toNumber());
    }
    
    // /!\ POTENTIAL BUG
    // /!\ CANNOT USE waitFinalize() as it will return with an error because the Tx reverts on L2
    // The receipt of the L2 transaction corresponding to the call to the MessageTestL2 contract
    //const l2TxReceipt = await l2TxResponse.waitFinalize();
    //console.log("L2 Tx Receipt: ", l2TxReceipt);

    // Wait for the proof to be generated
    let proof = await getProof(l2TxHash);
    console.log("Proof is: ", proof);

    const {l1BatchNumber, l1BatchTxIndex} = await l2Provider.getTransactionReceipt(l2TxHash);

    // We need to wait for our target block to be verified on L1
    // We may have the proof but the block must be submitted to L1 for the verification request to work
    let executedSoFar = (await zkSyncContract.getTotalBlocksExecuted()).toNumber();

    while(executedSoFar < l1BatchNumber) {
        console.log("Waiting for block execution on L1...");
        await sleep(10000);
        executedSoFar = (await zkSyncContract.getTotalBlocksExecuted()).toNumber();
    }

    // Try to prove directly through the mailbox
    const resDirect = await directProofToMailboxOfL2LogInclusion(l1BatchNumber, l2TxHash, proof, l1BatchTxIndex);

    console.log("Result of direct proof: ", resDirect);

    // Try to prove through our smart contract
    const resSC = await l1_contract.checkLog(
        l2TxHash,
        l1BatchNumber,
        proof.id,
        l1BatchTxIndex,
        proof.proof,
    );

    console.log("Result from smart contract", resSC);

    process.exit();
}

try {
    main();
} catch (error) {
    console.error(error);
}