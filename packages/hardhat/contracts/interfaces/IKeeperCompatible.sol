// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

// Adaption of https://tinyurl.com/yck327nn
interface IKeeperCompatible {
    function performUpkeep(bytes calldata performData) external;

    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
}
