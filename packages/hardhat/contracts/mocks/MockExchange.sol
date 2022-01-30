// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "../interfaces/IERC20.sol";
import { IExchange } from "../interfaces/IExchange.sol";

contract MockExchange is IExchange {
    function swap(
        IERC20 from,
        IERC20 to,
        uint256 amount
    ) public override returns (uint256) {
        from.transferFrom(msg.sender, address(this), amount);

        address beneficiary = msg.sender;
        uint256 received = amount * 2;

        // uint256 fromDecimals = from.decimals();
        // uint256 toDecimals = to.decimals();

        // if (fromDecimals < toDecimals) {
        //     received = received * 10**(toDecimals - fromDecimals);
        // } else if (fromDecimals > toDecimals) {
        //     received = received / 10**(fromDecimals - toDecimals);
        // }
        // TODO: It should return twice the amount scaled by the `to` token decimals
        //  so if the `from` token has e6 and the amount is 10e6, the `to` token has e8, then the amount should be 10e8

        to.transfer(beneficiary, received);

        emit Swap(from, to, amount, received);

        return received;
    }
}

// function scalePrice(
//     int256 _price,
//     uint8 _priceDecimals,
//     uint8 _decimals
// ) internal pure returns (int256) {
//     if (_priceDecimals < _decimals) {
//         return _price * int256(10**uint256(_decimals - _priceDecimals));
//     } else if (_priceDecimals > _decimals) {
//         return _price / int256(10**uint256(_priceDecimals - _decimals));
//     }
//     return _price;
// }
