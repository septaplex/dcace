// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

// Adaption of https://tinyurl.com/ycks8aep
abstract contract Ownable {
    address public owner;

    event TransferOwnership(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(owner == msg.sender, "Only Owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address owner_) public virtual onlyOwner {
        address oldOwner = owner;
        address newOwner = owner_;

        owner = owner_;

        emit TransferOwnership(oldOwner, newOwner);
    }
}
