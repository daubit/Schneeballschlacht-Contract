//SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./ERC721Payable/ERC721Payable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PonziDAO is ERC721Payable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    uint256 private _endTime;
    uint8 private constant MAX_LEVEL = 10;
    uint256 private constant MINT_FEE = 0.1 ether;
    uint256 private constant TRANSFER_FEE = 0.01 ether;

    // TokenId => Level
    mapping(uint256 => uint8) private _levels;

    // TokenId => sent tokenIds to partners
    mapping(uint256 => uint256[]) private _partners;

    event LevelUp(uint256 indexed tokenId);

    constructor() ERC721Payable("PonziDAO", "Ponzi") {
        _endTime = block.number + (31 days / 2 seconds);
        //_tokenIdCounter.increment();
    }

    modifier hasSufficientFee(uint256 tokenId) {
        require(
            msg.value == TRANSFER_FEE * _levels[tokenId],
            "Insufficient fee!"
        );
        _;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
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
        require(block.number < _endTime, "The End Times have arrived");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);

        _levels[tokenId] = 1;
        _partners[tokenId] = new uint256[](0);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override hasSufficientFee(tokenId) {
        //solhint-disable-next-line max-line-length
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );

        _transfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override hasSufficientFee(tokenId) {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public payable override hasSufficientFee(tokenId) {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        _safeTransfer(from, to, tokenId, data);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        require(
            ERC721Payable.ownerOf(tokenId) == from,
            "ERC721: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721: transfer to the zero address");
        require(block.number < _endTime, "The End Times have arrived");

        _beforeTokenTransfer(from, to, tokenId);

        isTransferable(tokenId, to);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _createPartner(to, newTokenId);

        _levels[newTokenId] = _levels[tokenId];
        _partners[newTokenId] = new uint256[](0);

        _partners[tokenId].push(newTokenId);

        if (_partners[tokenId].length == _levels[tokenId] + 1) {
            levelup(tokenId);
        }

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    function isTransferable(uint256 tokenId, address to) internal view {
        require(
            _levels[tokenId] != MAX_LEVEL ||
                _partners[tokenId].length != MAX_LEVEL + 1,
            "Cannot transfer"
        );
        uint256[] memory partners = _partners[tokenId];
        for (uint256 index = 0; index < partners.length; index++) {
            require(ownerOf(partners[index]) == to, "No double transfer!");
        }
    }

    function levelup(uint256 tokenId) internal {
        uint256[] memory partners = new uint256[](
            _partners[tokenId].length + 1
        );
        for (uint256 i = 0; i < _partners[tokenId].length; i++) {
            partners[i] = _partners[tokenId][i];
        }
        partners[partners.length - 1] = tokenId;

        uint256 index = randomIndex(partners.length);
        uint256 token = partners[index];
        if (_levels[token] < MAX_LEVEL) {
            _levels[token]++;
            _partners[token] = new uint256[](0);

            emit LevelUp(token);
        }
    }

    function randomIndex(uint256 length) public view returns (uint256) {
        bytes32 hashValue = keccak256(
            abi.encodePacked(
                msg.sender,
                blockhash(block.number - 1),
                block.number,
                block.timestamp,
                block.difficulty
            )
        );
        return uint256(hashValue) % length;
    }

    function getPartnerTokenIds(uint256 tokenId)
        public
        view
        returns (uint256[] memory)
    {
        uint256 amountOfPartners = _partners[tokenId].length;
        uint256[] memory partners = new uint256[](amountOfPartners);
        for (uint256 i = 0; i < amountOfPartners; i++) {
            partners[i] = _partners[tokenId][i];
        }
        return partners;
    }

    function getLevel(uint256 tokenId) public view returns (uint8) {
        return _levels[tokenId];
    }

    function getEndTime() public view returns(uint256){
        return _endTime;
    }


    function endTimes() public {
        require(block.number >= _endTime, "The End Times havent arrived yet");

        // TODO: payout
        // TODO: maybe event

        uint256 lastId = _tokenIdCounter.current() - 1;
        _tokenIdCounter.reset();

        for (uint256 i = 0; i <= lastId; i++) {
            _partners[i] = new uint[](0);
            _levels[i] = 0;
        }

        _reset(lastId);

        _endTime = block.number + (31 days / 2 seconds);
    }

}
