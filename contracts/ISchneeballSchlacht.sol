pragma solidity 0.8.15;

interface ISchneeballSchlacht {
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

    function startRound() external;

    function endRound() external;
}
