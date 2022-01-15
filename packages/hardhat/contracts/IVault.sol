// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";
import { IExchange } from "./IExchange.sol";

interface IVault {
    event Deposit(address indexed sender, uint256 indexed amount);

    event Withdraw(address indexed sender, IERC20 token, uint256 indexed amount);

    event Allocate(address indexed sender, uint256 indexed amountPerDay);

    event Buy(uint256 indexed fromSold, uint256 indexed toBought);

    function deposit(uint256 amount) external;

    function withdraw(IERC20 token, uint256 amount) external;

    function allocate(uint256 amountPerDay) external;

    function buy() external returns (uint256);

    function from() external view returns (IERC20);

    function to() external view returns (IERC20);

    function exchange() external view returns (IExchange);
}
