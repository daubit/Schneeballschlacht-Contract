// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../SnowballStructs.sol";

interface IERC721EnumerableRound {
    function getTokensOfAddress(address addr)
        external
        view
        returns (uint256[] memory);

    function getTokensOfAddress(uint256 round, address addr)
        external
        view
        returns (uint256[] memory);
}
