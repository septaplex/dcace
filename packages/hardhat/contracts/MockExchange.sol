// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./interfaces/IERC20.sol";
import { IExchange } from "./interfaces/IExchange.sol";

contract MockExchange is IExchange {
    function swap(
        IERC20 from,
        IERC20 to,
        uint256 amount
    ) public override returns (uint256) {
        from.transferFrom(msg.sender, address(this), amount);

        address beneficiary = msg.sender;
        uint256 received = amount * 2;

        to.transfer(beneficiary, received);

        emit Swap(from, to, amount, received);

        return received;
    }
}
