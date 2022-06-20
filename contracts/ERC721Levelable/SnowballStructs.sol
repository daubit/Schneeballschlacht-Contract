pragma solidity ^0.8.0;

struct Round {
    address winner;
    uint256 totalPayout;
    uint256 payoutPerLevel;
    uint256 startHeight;
    uint256 endHeight;
    uint256 totalThrows;
    uint256 totalBalls;
}
struct Snowball {
    uint8 level;
    uint256[] partners;
    uint256 parentSnowballId;
}