//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.16;

contract RefundRecipient {

    event RefundReceived(address indexed,uint256);

    address payable immutable owner;
    address immutable L1_MESSENGER;

    constructor(address _l1_messenger) {
        owner = payable(msg.sender);
        L1_MESSENGER = _l1_messenger;
    }
    
    receive() payable external {
        emit RefundReceived(msg.sender,msg.value);
    }

    function sweep() external {
        owner.transfer(address(this).balance);
    }
}