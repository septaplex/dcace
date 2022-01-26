// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./interfaces/IERC20.sol";
import { IExchange } from "./interfaces/IExchange.sol";

library Errors {
    string internal constant _AmountZero = "Amount can't be 0";
    string internal constant _DurationZero = "Duration can't be 0";
}

contract CronSwapper {
    struct Allocation {
        uint256 id;
        uint256 amount;
        uint256 startDay;
        uint256 endDay;
        address owner;
    }

    IERC20 public immutable toSell;
    IERC20 public immutable toBuy;
    IExchange public immutable exchange;

    uint256 public dailyAmount;
    uint256 public lastExecution;
    uint256 public nextAllocationId;
    mapping(uint256 => uint256) public removeAmount;
    mapping(uint256 => Allocation) public allocations;

    event Enter(uint256 indexed id, address indexed sender, uint256 indexed amount, uint256 startDay, uint256 endDay);

    constructor(
        IERC20 toSell_,
        IERC20 toBuy_,
        IExchange exchange_
    ) {
        toSell = toSell_;
        toBuy = toBuy_;
        exchange = exchange_;
        lastExecution = _today();
    }

    function enter(uint256 amount, uint256 duration) external returns (uint256) {
        require(amount > 0, Errors._AmountZero);
        require(duration > 0, Errors._DurationZero);

        uint256 total = amount * duration;
        IERC20(toSell).transferFrom(msg.sender, address(this), total);

        uint256 startDay = _today();

        if (lastExecution == startDay) {
            startDay += 1;
        }

        // We have to subtract 1 from the `duration` given that we'll also swap
        //  on the `startDay`
        // If we have a duration of 1, the `endDay` should be the `startDay`
        // If we have a duration of 2, the `endDay` should be the `startDay` + 1
        // ...
        uint256 endDay = startDay + duration - 1;
        dailyAmount += amount;
        removeAmount[endDay] += amount;

        uint256 id = nextAllocationId;
        nextAllocationId++;

        allocations[id] = Allocation({ id: id, amount: amount, startDay: startDay, endDay: endDay, owner: msg.sender });

        emit Enter(id, msg.sender, amount, startDay, endDay);

        return id;
    }

    function _today() private view returns (uint256) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp / 1 days;
    }
}
