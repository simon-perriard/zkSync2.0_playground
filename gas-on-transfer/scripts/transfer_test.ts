import { Wallet, utils } from 'ethers';
import { Provider } from 'zksync-web3';
import fs from 'fs';

const FORWARDER1_ADDRESS = "0x5AD349deDd5fe1E9D2778b9d7Bc7844bE73aac0a"
const FORWARDER2_ADDRESS = "0x92a39aa13923Ab62AA897675B2A810aCD0Bd275e"

const PRIV_KEY = fs.readFileSync("../.private_key").toString();

async function main() {
    // Initialize the wallet.
    const l2Provider = new Provider('https://zksync2-testnet.zksync.dev');
    const wallet = new Wallet(PRIV_KEY, l2Provider);

    const tx = await wallet.sendTransaction({to: FORWARDER1_ADDRESS, value: 1});

    const receipt = await tx.wait();

    //console.log(receipt);

    const gasLeftevent1 = receipt.logs.filter((l) => l.address == FORWARDER1_ADDRESS).map((l) => l.data)[0]
    const gasLeftevent2 = receipt.logs.filter((l) => l.address == FORWARDER2_ADDRESS).map((l) => l.data)[0]
    
    console.log("gas left forwarder1", utils.hexlify(gasLeftevent1));
    console.log("gas left forwarder2", utils.hexlify(gasLeftevent2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
