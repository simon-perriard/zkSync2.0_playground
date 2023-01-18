//SPDX-License-Identifier: Unlicense

pragma solidity 0.8.16;

contract Forwarder2 {

    address payable immutable owner;

    event GasLeft2(uint256);

    constructor(address _owner) {
        owner = payable(_owner);
    }

    receive() external payable {
        emit GasLeft2(gasleft());
    }

    function sweep() external {
        owner.transfer(address(this).balance);
    }
}