// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

// Adaption of https://tinyurl.com/ycwnwxaw
abstract contract ReentrancyGuard {
    uint256 private _locked = 1;

    modifier nonReentrant() {
        require(_locked == 1, "Reentrancy");

        _locked = 2;
        _;
        _locked = 1;
    }
}
