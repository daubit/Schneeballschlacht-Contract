// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../ISchneeballschlacht.sol";

contract SchneeballSchlachtTest is ISchneeballschlacht {
    function toss(address to, uint256 tokenId) external payable {}

    function mint(address to) external payable {}

    function getPartnerTokenIds(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {}

    function getPartnerTokenIds(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {}

    function getLevel(uint256 tokenId) external view returns (uint8) {}

    function getLevel(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint8)
    {}

    function totalTosses() external view returns (uint256) {}

    function totalTosses(uint256 roundId) external view returns (uint256) {}

    function totalSupply() external view returns (uint256) {}

    function totalSupply(uint256 roundId) external view returns (uint256) {}

    function startRound() external {}

    function endRound() external {}

    function getTokensOfAddress(address addr)
        external
        view
        returns (uint256[] memory)
    {}

    function getTokensOfAddress(uint256 round, address addr)
        external
        view
        returns (uint256[] memory)
    {}

    function getSnowballsOfAddress(address addr)
        external
        view
        returns (Snowball[] memory)
    {}

    mapping(uint256 => mapping(address => Snowball[])) _snowballs;

    function getSnowballsOfAddress(uint256 round, address addr)
        external
        view
        returns (Snowball[] memory)
    {
        return _snowballs[round][addr];
    }

    function setSnowballsOfAddress(
        uint256 round,
        address addr,
        Snowball[] calldata snowballs
    ) external {
        for (uint256 index = 0; index < snowballs.length; index++) {
            _snowballs[round][addr].push(snowballs[index]);
        }
    }

    function getRoundId() external view returns (uint256) {}

    function getEndHeight() external view returns (uint256) {}

    function getEndHeight(uint256 roundId) external view returns (uint256) {}

    mapping(uint256 => uint256) private _payoutPerLevel;

    function getPayoutPerLevel(uint256 roundId)
        external
        view
        returns (uint256)
    {
        return _payoutPerLevel[roundId];
    }

    function setPayoutPerLevel(uint256 roundId, uint256 amount) external {
        _payoutPerLevel[roundId] = amount;
    }
}
