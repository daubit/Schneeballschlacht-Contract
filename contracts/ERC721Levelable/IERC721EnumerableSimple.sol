pragma solidity ^0.8.0;

import "./SnowballStructs.sol";

interface IERC721EnumerableSimple {
    function getTokensOfAddress(address addr) external returns (uint256[] memory);
    function getSnowballsOfAddress(address addr) external returns (Snowball[] memory);
}