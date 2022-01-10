// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";

interface IExchange {
    event Swap(IERC20 indexed from, IERC20 indexed to, uint256 amount);

    function swap(
        IERC20 from,
        IERC20 to,
        uint256 amount
    ) external;
}
