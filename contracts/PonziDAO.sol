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
        _tokenIdCounter.increment();
    }

    modifier checkToken(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= totalSupply(), "Invalid token ID!");
        _;
    }

    modifier checkFee(uint256 tokenId) {
        require(
            msg.value == TRANSFER_FEE * _levels[tokenId],
            "Insufficient fee!"
        );
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        require(
            _levels[tokenId] != MAX_LEVEL ||
                _partners[tokenId].length != MAX_LEVEL + 1,
            "Cannot transfer"
        );
        uint256[] memory partners = _partners[tokenId];
        for (uint256 index = 0; index < partners.length; index++) {
            require(ownerOf(partners[index]) == to, "No double transfer!");
        }
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

    function mint(address to) external payable {
        safeMint(to);
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

    function transfer(address to, uint256 tokenId) public payable {
        _transfer(msg.sender, to, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override {
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
    ) public payable override {
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
    ) public payable override {
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
    )
        internal
        virtual
        override
        checkToken(tokenId)
        checkFee(tokenId)
        isTransferable(tokenId, to)
    {
        require(
            ownerOf(tokenId) == from,
            "ERC721: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721: transfer to the zero address");
        require(block.number < _endTime, "The End Times have arrived");

        _beforeTokenTransfer(from, to, tokenId);

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

    function levelup(uint256 tokenId) internal {
        uint256[] memory partners = new uint256[](
            _partners[tokenId].length + 1
        );
        for (uint256 i = 0; i < _partners[tokenId].length; i++) {
            partners[i] = _partners[tokenId][i];
        }
        partners[partners.length - 1] = tokenId;

        uint256 randIndex = randomIndex(partners.length);
        uint256 randToken = partners[randIndex];
        if (_levels[randToken] < MAX_LEVEL) {
            _levels[randToken]++;
            _partners[randToken] = new uint256[](0);
            emit LevelUp(randToken);
        }
    }

    function randomIndex(uint256 length) internal view returns (uint256) {
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
        external
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

    function getLevel(uint256 tokenId) external view returns (uint8) {
        return _levels[tokenId];
    }

    function getEndTime() external view returns (uint256) {
        return _endTime;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    function endTimes() external {
        require(block.number >= _endTime, "The End Times havent arrived yet");

        // TODO: payout
        // TODO: maybe event

        uint256 total = totalSupply();
        _tokenIdCounter.reset();

        for (uint256 i = 1; i < total; i++) {
            _partners[i] = new uint256[](0);
            _levels[i] = 0;
        }

        _reset(total);

        _endTime = block.number + (31 days / 2 seconds);
    }
}
