// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { Ownable } from "../Ownable.sol";

contract MockOwnable is Ownable {
    event Success(address indexed sender, address indexed owner);

    function unprotected() external {
        emit Success(msg.sender, owner);
    }

    function protected() external onlyOwner {
        emit Success(msg.sender, owner);
    }
}
