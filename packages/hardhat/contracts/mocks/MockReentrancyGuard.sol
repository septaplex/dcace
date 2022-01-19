// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { ReentrancyGuard } from "../ReentrancyGuard.sol";

contract MockReentrancyGuard is ReentrancyGuard {
    uint256 public invokeCount;

    function unprotected() public {
        invokeCount++;

        if (invokeCount > 1) return;

        unprotected();
    }

    function protected() public nonReentrant {
        invokeCount++;

        if (invokeCount > 1) return;

        protected();
    }
}
