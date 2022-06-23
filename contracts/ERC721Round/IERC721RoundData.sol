// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

interface IERC721RoundData {
    function getRoundId() external view returns (uint256);
    function getEndHeight() external view returns (uint256);
    function getEndHeight(uint256 roundId) external view returns (uint256);
    function getPayoutPerLevel(uint256 roundId) external view returns (uint256);
}