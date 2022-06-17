//SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PonziDAO is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    uint8 private constant MAX_LEVEL = 10;
    uint256 private constant MINT_FEE = 0.1 ether;

    // TokenId => Level
    mapping(uint256 => uint8) private _levels;

    // TokenId => List of sent addresses
    mapping(uint256 => address[]) private _partners;

    constructor() ERC721("PonziDAO", "Ponzi") {
        address(this).balance;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return string(abi.encodePacked(_baseURI(), _levels[tokenId]));
    }

    function safeMint(address to) public payable {
        require(msg.value == MINT_FEE, "Insufficient fee!");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);

        _levels[tokenId] = 1;
        _partners[tokenId] = new address[](2);
    }
}
