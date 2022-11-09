//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@matterlabs/zksync-contracts/l1/contracts/zksync/interfaces/IMailbox.sol";
import "@matterlabs/zksync-contracts/l1/contracts/zksync/interfaces/IZkSync.sol";

contract MessageTestL1 {
    address public owner;
    uint256 constant ERGS_LIMIT = 2097152;
    IMailbox immutable mailbox;
    address constant BOOTLOADER_ADDRESS = 0x0000000000000000000000000000000000008001; // address(SYSTEM_CONTRACTS_OFFSET + 0x01);

    constructor(address _mailbox) {
        owner = msg.sender;
        mailbox = IMailbox(_mailbox);
    }

    function callZkSync(
        address l2ContractAddr,
        bytes calldata data
    ) external payable {
        require(msg.sender == owner, "Only owner is allowed");

        mailbox.requestL2Transaction{value: msg.value}(l2ContractAddr, 0, data, ERGS_LIMIT, new bytes[](0));
    }

    function checkLog( 
        bool _isService,
        uint16 _txNumberInBlock,
        bytes32 _l2TxHash,
        uint256 _l2BlockNumber,
        uint256 _l2MessageIndex,
        bytes32[] calldata _merkleProof
    ) external view returns(bool success){
        require(msg.sender == owner, "Only owner is allowed");
        L2Log memory l2Log = L2Log({
            l2ShardId: uint8(0),
            isService: _isService,
            txNumberInBlock: _txNumberInBlock,
            sender: BOOTLOADER_ADDRESS,
            key: _l2TxHash,
            value: bytes32(0)
            });
        success = mailbox.proveL2LogInclusion(
            _l2BlockNumber,
            _l2MessageIndex,
            l2Log,
            _merkleProof
        );
    }
}
