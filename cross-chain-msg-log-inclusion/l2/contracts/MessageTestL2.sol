//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.16;

contract MessageTestL2 {

    function L2Test(bool shouldFail) external pure {
        require(!shouldFail);
    }
    
}
