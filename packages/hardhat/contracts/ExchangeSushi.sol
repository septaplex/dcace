// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";
import { IExchange } from "./IExchange.sol";

// Adaption of https://etherscan.io/address/0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F#code
interface IUniswapV2Pair {
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    function token0() external view returns (address);
}

contract ExchangeSushi is IExchange {
    IUniswapV2Pair public immutable pair;

    constructor(IUniswapV2Pair pair_) {
        pair = pair_;
    }

    function swap(
        IERC20 from,
        IERC20 to,
        uint256 amount
    ) public override {
        from.transferFrom(msg.sender, address(this), amount);
        from.transfer(address(pair), amount);

        address beneficiary = msg.sender;
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();

        if (pair.token0() == address(from)) {
            uint256 x = reserve0;
            uint256 y = reserve1;
            uint256 deltaX = amount * 997; // 3% fee
            uint256 deltaY = (y * deltaX) / ((x * 1000) + deltaX);
            pair.swap(0, deltaY, beneficiary, new bytes(0));
        } else {
            uint256 x = reserve1;
            uint256 y = reserve0;
            uint256 deltaX = amount * 997; // 3% fee
            uint256 deltaY = (y * deltaX) / ((x * 1000) + deltaX);
            pair.swap(deltaY, 0, beneficiary, new bytes(0));
        }

        emit Swap(from, to, amount);
    }
}
