// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

struct Round {
    address winner;
    uint256 totalPayout;
    uint256 payoutPerToss;
    uint256 startHeight;
    uint256 endHeight;
    uint256 totalSupply;
    uint256 winnerBonus;
}

struct Snowball {
    bool hasStone;
    uint8 level;
    uint256[] partners;
    uint256 parentSnowballId;
}

struct Query {
    address player;
    uint8 level;
    uint8 partnerCount;
    bool hasStone;
    uint256 tokenId;
}
