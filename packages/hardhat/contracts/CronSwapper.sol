// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { IERC20 } from "./interfaces/IERC20.sol";
import { IExchange } from "./interfaces/IExchange.sol";

import { console } from "hardhat/console.sol"; // TODO: Remove

library Errors {
    string internal constant _AmountZero = "Amount can't be 0";
    string internal constant _DurationZero = "Duration can't be 0";
    string internal constant _NothingToSell = "Nothing to sell";
    string internal constant _FunctionCalledToday = "Function already called today";
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
    mapping(uint256 => uint256) public toBuyPriceCumulative;

    event Swap(uint256 indexed toSellSold, uint256 toBuyBought, uint256 toBuyPrice);
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

    function swap() external returns (uint256, uint256) {
        uint256 today = _today();
        require(lastExecution < today, Errors._FunctionCalledToday);
        require(dailyAmount > 0, Errors._NothingToSell);

        toSell.approve(address(exchange), dailyAmount);
        uint256 toBuyBought = exchange.swap(toSell, toBuy, dailyAmount);
        uint256 toSellSold = dailyAmount;

        // uint256 toBuyPrice = toBuyBought / dailyAmount;

        // uint256 scaledToBuyBought = toBuyBought; // * 10**uint256(toBuy.decimals());
        // uint256 scaledDailyAmouny = dailyAmount * 10**uint256(toBuy.decimals() - toSell.decimals());
        // uint256 toBuyPrice = scaledToBuyBought / scaledDailyAmouny;

        // uint256 toBuyPrice = (toBuyBought * 10**uint256(toBuy.decimals() - toSell.decimals())) / dailyAmount;

        // TODO: This works (kind of)
        // uint256 toBuyPrice = ((toSellSold * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought) *
        //     10**uint256(toSell.decimals());
        // uint256 toBuyPrice = (toSellSold * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought;

        // TODO: Similar solution to the one above but based on the insights from below
        // uint256 toBuyPrice = ((((toSellSold * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought)) *
        //     10**uint256(toSell.decimals() - 6));

        // TODO: This is the result of the `toBuyPrice` in wei (don't touch)
        // TODO: Try to simplify (e.g. remove the rescaling)
        // uint256 toBuyPrice =
        //     ((((toSellSold * 1e18 * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought) *
        //         1e18) * 10**uint256(toSell.decimals() - 6)) / 1e18;

        // TODO: Test this by buing USDC with WETH (it should also be denominated in 1e18)
        // uint256 toBuyPrice = (
        //     (((toSellSold * 1e18 * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought) * 1e18)
        // ) / 1e18;

        // uint256 toBuyPrice = (
        //     (((toSellSold * 1e18 * 10**uint256(toBuy.decimals() - toSell.decimals())) / toBuyBought) * 1e18)
        // ) /
        //     1e18 /
        //     1e12;

        // uint256 toBuyPrice = (toSellSold * 1e18) / toBuyBought;
        uint256 toBuyPrice = (toSellSold * 10**uint256(toBuy.decimals())) / toBuyBought; // <-- simplest solution

        console.log("toBuyBought: %s", toBuyBought);
        console.log("toSellSold: %s", toSellSold);
        console.log("toBuyPrice: %s", toBuyPrice);

        //5000000000000000000000

        toBuyPriceCumulative[today] += toBuyPriceCumulative[lastExecution] + toBuyPrice;

        uint256 amountToRemove = _calcAmountToRemove();
        dailyAmount -= amountToRemove;

        lastExecution = today;

        emit Swap(toSellSold, toBuyBought, toBuyPrice);

        return (toBuyBought, toBuyPrice);
    }

    function toBuyBalance(uint256 id) external view returns (uint256) {
        Allocation memory allocation = allocations[id];
        // uint256 cumulativePrice = toBuyPriceCumulative[lastDay] - toBuyPriceCumulative[startDay];
        uint256 cumulativePrice = _findNearestCumulativeToBuyPrice(allocation.startDay, allocation.endDay);
        // TODO: Find
        console.log("cumulativePrice: %s", cumulativePrice); // TODO:
        // TODO: do we need to divide by 1e18 here given that the USDC value in in wei?
        return cumulativePrice * allocation.amount;
    }

    function _today() private view returns (uint256) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp / 1 days;
    }

    // NOTE: The number of iterations is "bound" given that a (large) gap between
    //  executions should be a rare occasion
    function _findNearestCumulativeToBuyPrice(uint256 startDay, uint256 endDay) private view returns (uint256) {
        uint256 i;
        uint256 cumulativePrice;
        while (cumulativePrice == 0 && startDay != endDay) {
            cumulativePrice = toBuyPriceCumulative[endDay - i];
            i += 1;
        }
        return cumulativePrice;
    }

    // NOTE: The number of iterations is "bound" given that a (large) gap between
    //  executions should be a rare occasion
    function _calcAmountToRemove() private view returns (uint256) {
        uint256 amountToRemove;
        uint256 today = _today();
        uint256 dayDiff = today - lastExecution;
        for (uint256 i = 0; i < dayDiff; i++) {
            amountToRemove += removeAmount[today - i];
        }
        return amountToRemove;
    }
}
