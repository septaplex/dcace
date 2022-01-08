// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";

contract Vault {
    IERC20 public from;
    IERC20 public to;

    constructor(IERC20 from_, IERC20 to_) {
        from = from_;
        to = to_;
    }
}
