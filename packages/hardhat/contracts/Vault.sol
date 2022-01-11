// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./IERC20.sol";
import { IExchange } from "./IExchange.sol";

library Errors {
    string internal constant _AmountZero = "Amount can't be 0";
    string internal constant _WrongToken = "Token not allowed";
    string internal constant _ExceedsBalance = "Amount exceeds balance";
}

contract Vault {
    IERC20 public from;
    IERC20 public to;
    IExchange public exchange;
    address[] public participants;
    mapping(address => uint256) public amountPerDay;
    mapping(address => mapping(IERC20 => uint256)) public balances;

    event Deposit(address indexed sender, uint256 indexed amount);
    event Withdraw(address indexed sender, IERC20 token, uint256 indexed amount);
    event Allocate(address indexed sender, uint256 indexed amountPerDay);

    constructor(
        IERC20 from_,
        IERC20 to_,
        IExchange exchange_
    ) {
        from = from_;
        to = to_;
        exchange = exchange_;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, Errors._AmountZero);

        balances[msg.sender][from] += amount;

        if (!_isInArray(participants, msg.sender)) {
            participants.push(msg.sender);
        }

        IERC20(from).transferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount);
    }

    function withdraw(IERC20 token, uint256 amount) external {
        require(amount > 0, Errors._AmountZero);
        require(token == from || token == to, Errors._WrongToken);

        uint256 fromBalance = balances[msg.sender][from];
        uint256 toBalance = balances[msg.sender][to];
        require(amount <= fromBalance || amount <= toBalance, Errors._ExceedsBalance);

        balances[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);

        emit Withdraw(msg.sender, token, amount);
    }

    function allocate(uint256 amountPerDay_) external {
        require(amountPerDay_ > 0, Errors._AmountZero);
        require(amountPerDay_ <= balances[msg.sender][from], Errors._ExceedsBalance);

        amountPerDay[msg.sender] = amountPerDay_;

        emit Allocate(msg.sender, amountPerDay_);
    }

    function _isInArray(address[] storage haystack, address needle) private view returns (bool) {
        for (uint256 i = 0; i < haystack.length; i++) {
            if (haystack[i] == needle) return true;
        }
        return false;
    }
}
