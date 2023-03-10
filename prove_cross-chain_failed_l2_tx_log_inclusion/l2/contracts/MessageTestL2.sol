//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.16;

import "@matterlabs/zksync-contracts/l2/contracts/vendor/AddressAliasHelper.sol";

contract MessageTestL2 {

    address immutable L1_MESSENGER;
    event Success(address);

    constructor(address _l1_messenger) {
        L1_MESSENGER = _l1_messenger;
    }

    function L2Test(bool shouldFail) external {
        require(AddressAliasHelper.undoL1ToL2Alias(msg.sender) == L1_MESSENGER);
        require(!shouldFail);
        emit Success(AddressAliasHelper.undoL1ToL2Alias(msg.sender));
    }
    
}
