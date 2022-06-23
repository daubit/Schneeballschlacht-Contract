// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.15;

import "./ERC721Round/ERC721Round.sol";
import "./ISchneeballSchlacht.sol";
import "./PullPaymentRound.sol";

// TODO: payout
// TODO: maybe event
// TODO: refactor transfer to throw func
// TODO: refactor
// TODO: calc ban hit when throwing snowball
contract SchneeballSchlacht is
    ISchneeballSchlacht,
    ERC721Round,
    PullPaymentRound
{
    uint8 private constant MAX_LEVEL = 5;
    uint256 private constant MINT_FEE = 0.1 ether;
    uint256 private constant TRANSFER_FEE = 0.001 ether;
    bool private _isLocked;
    bool private _finished;

    // Mapping roundId to snowball ID to snowball
    mapping(uint256 => mapping(uint256 => Snowball)) private _snowballs;

    // Mapping roundId to totalThrows
    mapping(uint256 => uint256) private _tosses;

    event LevelUp(uint256 indexed roundId, uint256 indexed tokenId);

    constructor() ERC721Round("SchneeballSchlacht", "Schneeball") {
        lock();
        _finished = false;
    }

    modifier checkToken(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= getTokenId(), "Invalid token ID!");
        _;
    }

    modifier checkFee(uint256 tokenId) {
        require(
            msg.value == TRANSFER_FEE * _snowballs[getRoundId()][tokenId].level,
            "Insufficient fee!"
        );
        _;
    }

    modifier onlyUnlocked() {
        string memory message = "No round is running!";
        if (block.number >= getEndHeight()) {
            lock();
            message = "End height has been reached! Round is over!";
        } else if (_finished) {
            message = "Round has finished";
        }
        require(!_isLocked, message);
        _;
    }

    modifier onlyLocked() {
        require(_isLocked, "Round is still running!");
        _;
    }

    modifier onlyFinished() {
        require(_finished, "No game has finished!");
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        require(level != MAX_LEVEL, "Max level reached!");
        require(amountOfPartners < level + 1, "No throws left");
        uint256[] memory partners = _snowballs[roundId][tokenId].partners;
        for (uint256 index = 0; index < partners.length; index++) {
            require(ownerOf(partners[index]) != to, "No double transfer!");
        }
        _;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        uint256 roundId = getRoundId();
        return
            string(
                abi.encodePacked(_baseURI(), _snowballs[roundId][tokenId].level)
            );
    }

    function tokenURI(uint256 roundId, uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(_baseURI(), _snowballs[roundId][tokenId].level)
            );
    }

    function _mint(address to) internal {
        uint256 roundId = getRoundId();
        uint256 tokenId = newTokenId();
        _safeMint(to, tokenId);
        _snowballs[roundId][tokenId] = Snowball({
            level: 1,
            partners: new uint256[](0),
            parentSnowballId: 0
        });
    }

    function mint(address to) public payable onlyUnlocked {
        require(msg.value == MINT_FEE, "Insufficient fee!");
        _mint(to);
    }

    function getPartnerTokenIds(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        uint256 roundId = getRoundId();
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        uint256[] memory partners = new uint256[](amountOfPartners);
        for (uint256 i = 0; i < amountOfPartners; i++) {
            partners[i] = _snowballs[roundId][tokenId].partners[i];
        }
        return partners;
    }

    function getPartnerTokenIds(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        uint256[] memory partners = new uint256[](amountOfPartners);
        for (uint256 i = 0; i < amountOfPartners; i++) {
            partners[i] = _snowballs[roundId][tokenId].partners[i];
        }
        return partners;
    }

    /**
     * @dev Returns level from the current round.
     */
    function getLevel(uint256 tokenId) external view returns (uint8) {
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        return level;
    }

    function getLevel(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint8)
    {
        uint8 level = _snowballs[roundId][tokenId].level;
        return level;
    }

    function toss(address to, uint256 tokenId)
        external
        payable
        onlyUnlocked
        checkToken(tokenId)
        checkFee(tokenId)
        isTransferable(tokenId, to)
    {
        require(
            ownerOf(tokenId) == msg.sender,
            "ERC721: transfer from incorrect owner"
        );
        require(to != msg.sender, "Cannot toss to yourself!");
        require(to != address(0), "ERC721: transfer to the zero address");

        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;

        uint256 newToken = newTokenId();
        _safeMint(to, newToken);

        _snowballs[roundId][newToken] = Snowball({
            level: level,
            parentSnowballId: tokenId,
            partners: new uint256[](0)
        });
        _snowballs[roundId][tokenId].partners.push(newToken);
        _tosses[roundId]++;

        if (
            level + 1 < MAX_LEVEL &&
            _snowballs[roundId][tokenId].partners.length == level + 1
        ) {
            levelup(to, tokenId);
        } else if (
            level < MAX_LEVEL &&
            _snowballs[roundId][tokenId].partners.length == level + 1
        ) {
            uint256 winnerTokenId = newTokenId();
            _safeMint(msg.sender, winnerTokenId);
            _snowballs[roundId][winnerTokenId] = Snowball({
                level: 20,
                parentSnowballId: tokenId,
                partners: new uint256[](0)
            });
            // End Game
            finish();
        }
    }

    function levelup(address to, uint256 tokenId) internal {
        uint256 roundId = getRoundId();
        uint256 amountOldPartners = _snowballs[roundId][tokenId]
            .partners
            .length;
        uint256[] memory partners = new uint256[](amountOldPartners + 1);
        for (uint256 i = 0; i < amountOldPartners; i++) {
            partners[i] = _snowballs[roundId][tokenId].partners[i];
        }
        partners[partners.length - 1] = tokenId;

        uint256 randIndex = randomIndex(partners.length);
        uint256 randToken = partners[randIndex];
        uint8 randLevel = _snowballs[roundId][randToken].level;
        if (randLevel + 1 < MAX_LEVEL) {
            uint256 upgradedTokenId = newTokenId();
            _safeMint(to, upgradedTokenId);
            _snowballs[roundId][upgradedTokenId] = Snowball({
                level: randLevel + 1,
                partners: new uint256[](0),
                parentSnowballId: tokenId
            });
            emit LevelUp(roundId, upgradedTokenId);
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

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Round) onlyUnlocked {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Round) onlyUnlocked {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721Round) onlyUnlocked {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function startRound()
        public
        override(ERC721Round, ISchneeballSchlacht)
        onlyLocked
    {
        unlock();
        ERC721Round.startRound();
        _mint(msg.sender);
        _finished = false;
    }

    function endRound()
        public
        override(ERC721Round, ISchneeballSchlacht)
        onlyFinished
    {
        ERC721Round.endRound();
    }

    function totalSupply()
        public
        view
        override(ERC721Round, ISchneeballSchlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply();
    }

    function totalSupply(uint256 roundId)
        public
        view
        override(ERC721Round, ISchneeballSchlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply(roundId);
    }

    function totalTosses() public view returns (uint256) {
        uint256 roundId = getRoundId();
        return _tosses[roundId];
    }

    function totalTosses(uint256 roundId) public view returns (uint256) {
        return _tosses[roundId];
    }

    function lock() internal {
        _isLocked = true;
    }

    function unlock() internal {
        _isLocked = false;
    }

    function getSnowballsOfAddress(uint256 round, address addr)
        public
        view
        virtual
        returns (Snowball[] memory)
    {
        uint256 amount = balanceOf(round, addr);
        Snowball[] memory ret = new Snowball[](amount);

        for (uint256 index = 0; index < amount; index++) {
            ret[index] = _snowballs[round][getTokenOwner(round, addr, index)];
        }

        return ret;
    }

    function getSnowballsOfAddress(address addr)
        external
        view
        virtual
        returns (Snowball[] memory)
    {
        return getSnowballsOfAddress(getRoundId(), addr);
    }

    mapping(uint256 => Escrow) _escrow;

    function _processPayout()
        internal
        override
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 round = getRoundId();
        Escrow escrow = new Escrow(round, ISchneeballSchlacht(address(this)));
        _addEscrow(round, escrow);

        uint256 totalLevels = 0;

        for (uint256 index = 0; index < totalSupply(round); index++) {
            totalLevels += _snowballs[round][index].level;
        }

        // max totalLevels wei are leftover each round for the next round
        uint256 payoutPerLevel = address(this).balance / totalLevels;
        // because there is leftover wei we need to make sure we only transfer to escrow what is needed
        uint256 totalPayout = totalLevels * payoutPerLevel;
        escrow.deposit{value: totalPayout}();

        return (totalLevels, totalPayout, payoutPerLevel);
    }

    function finish() internal {
        lock();
        _finished = true;
        setWinner(msg.sender);
    }
}
