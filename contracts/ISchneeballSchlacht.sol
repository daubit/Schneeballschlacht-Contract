pragma solidity ^0.8.0;

import "./ERC721Levelable/IERC721Levelable.sol";

struct RoundData {
    uint32 RoundNumber;
    uint256 RoundLength;
    address Winner;
    uint256 TotalThrows;
    uint256 TotalBalls;
    uint256 TotalPayout;
    uint256 PayoutPerLevel;
}

interface ISchneeballSchlacht is IERC721Levelable {

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

    function endRound() external;

    function getRoundData(uint32 round) external view returns (RoundData memory);
    
    function getTokensOfAddress(uint32 round, address addr) external view returns (uint256[] memory);
}
