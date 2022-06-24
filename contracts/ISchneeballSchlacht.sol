// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "./ERC721Round/SnowballStructs.sol";
import "./ERC721Round/IERC721RoundData.sol";
import "./ERC721Round/IERC721EnumerableRound.sol";

interface ISchneeballschlacht is IERC721RoundData, IERC721EnumerableRound {
    function toss(address to, uint256 tokenId) external payable;

    function mint(address to) external payable;

    function getPartnerTokenIds(uint256 tokenId)
        external
        view
        returns (uint256[] memory);

    function getPartnerTokenIds(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint256[] memory);

    function getLevel(uint256 tokenId) external view returns (uint8);

    function getLevel(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint8);

    function totalSupply() external view returns (uint256);

    function totalSupply(uint256 roundId) external view returns (uint256);

    function startRound() external;

    function endRound() external;
}
