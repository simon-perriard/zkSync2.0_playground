//SPDX-License-Identifier: Unlicense

pragma solidity 0.8.16;

import "./Forwarder2.sol";

contract Forwarder1 {

    address payable immutable public f2;

    event GasLeft1(uint256);

    constructor() {
        f2 = payable(address(new Forwarder2(msg.sender)));
    }

    receive() external payable {
        emit GasLeft1(gasleft());
        f2.transfer(address(this).balance);
    }
}