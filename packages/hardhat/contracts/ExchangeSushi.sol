// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";
import { IExchange } from "./IExchange.sol";

// Adaption of https://etherscan.io/address/0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F#code
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract ExchangeSushi is IExchange {
    IUniswapV2Router02 public immutable router;

    constructor(IUniswapV2Router02 router_) {
        router = router_;
    }

    function swap(
        IERC20 from,
        IERC20 to,
        uint256 amount
    ) public override returns (uint256) {
        from.transferFrom(msg.sender, address(this), amount);
        from.approve(address(router), amount);

        // solhint-disable-next-line not-rely-on-time
        uint256 deadline = block.timestamp;
        address beneficiary = msg.sender;

        address[] memory path = new address[](2);
        path[0] = address(from);
        path[1] = address(to);

        uint256[] memory amounts = router.swapExactTokensForTokens(amount, 0, path, beneficiary, deadline);

        uint256 received = amounts[path.length - 1];

        emit Swap(from, to, amount, received);

        return received;
    }
}
