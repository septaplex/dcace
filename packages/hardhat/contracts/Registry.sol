// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

contract Registry {
    bool public isDeployed;

    constructor() {
        isDeployed = true;
    }
}
