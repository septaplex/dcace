// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./interfaces/IERC20.sol";
import { IExchange } from "./interfaces/IExchange.sol";

contract CronSwapper {
    IERC20 public immutable toSell;
    IERC20 public immutable toBuy;
    IExchange public immutable exchange;

    constructor(
        IERC20 toSell_,
        IERC20 toBuy_,
        IExchange exchange_
    ) {
        toSell = toSell_;
        toBuy = toBuy_;
        exchange = exchange_;
    }
}
