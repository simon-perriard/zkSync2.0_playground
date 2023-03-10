import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { Provider, utils } from 'zksync-web3';
import fs from 'fs';

const MESSAGE_TEST_L2_ABI = JSON.parse(fs.readFileSync(require.resolve('../artifacts-zk/contracts/MessageTestL2.sol/MessageTestL2.json')).toString()).abi;

const MESSAGE_TEST_L2_ADDRESS = fs.readFileSync(require.resolve('../../l2_deployment_address')).toString();
const REFUND_TEST_L2_ADDRESS = fs.readFileSync(require.resolve('../../l2_deployment_address_refund')).toString();

const PRIV_KEY = fs.readFileSync(require.resolve('../../../.private_key')).toString();

// Ethereum L1 provider
const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');

async function main() {
    const L2wallet = new Wallet(PRIV_KEY, l2Provider);
    
    console.log(MESSAGE_TEST_L2_ADDRESS, (await l2Provider.getBalance(MESSAGE_TEST_L2_ADDRESS)).toString());
    console.log(REFUND_TEST_L2_ADDRESS, (await l2Provider.getBalance(REFUND_TEST_L2_ADDRESS)).toString());
    process.exit();
}

try {
    main();
} catch (error) {
    console.error(error);
}