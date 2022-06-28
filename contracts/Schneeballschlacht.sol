// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.15;

import "./ERC721Round/ERC721Round.sol";
import "./EscrowManager.sol";
import "./Escrow.sol";
import "./HallOfFame.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// TODO: calc ban hit when throwing snowball
contract Schneeballschlacht is
    ISchneeballschlacht,
    ERC721Round,
    EscrowManager,
    Pausable
{
    using Strings for uint8;
    uint8 private constant MAX_LEVEL = 5;
    uint256 private constant MINT_FEE = 0.05 ether;
    uint256 private constant TOSS_FEE = 0.01 ether;
    bool private _finished;

    HallOfFame private _HOF;

    // Mapping roundId to tokenId ID to snowball
    mapping(uint256 => mapping(uint256 => Snowball)) private _snowballs;

    // Mapping roundId to totalTosses
    mapping(uint256 => uint256) private _tosses;

    event LevelUp(uint256 indexed roundId, uint256 indexed tokenId);

    constructor(address HOF) ERC721Round("Schneeballschlacht", "Schneeball") {
        _pause();
        _HOF = HallOfFame(HOF);
        _finished = false;
    }

    modifier checkToken(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= getTokenId(), "Invalid token ID!");
        _;
    }

    modifier checkFee(uint256 tokenId) {
        require(
            msg.value == TOSS_FEE * _snowballs[getRoundId()][tokenId].level,
            "Insufficient fee!"
        );
        _;
    }

    modifier whenFinished() {
        require(_finished, "Finished");
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        require(level != MAX_LEVEL, "Max level reached!");
        require(amountOfPartners < level + 1, "No throws left");
        uint256[] memory partners = _snowballs[roundId][tokenId].partners;
        for (uint256 index; index < partners.length; index++) {
            require(ownerOf(partners[index]) != to, "No double transfer!");
        }
        _;
    }

    /**
     * @dev Returns level from the current round.
     */
    function getLevel(uint256 tokenId) external view returns (uint8) {
        uint256 roundId = getRoundId();
        return _snowballs[roundId][tokenId].level;
    }

    function getLevel(uint256 roundId, uint256 tokenId)
        external
        view
        returns (uint8)
    {
        return _snowballs[roundId][tokenId].level;
    }

    function getPartnerTokenIds(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        uint256 roundId = getRoundId();
        return getPartnerTokenIds(roundId, tokenId);
    }

    function getPartnerTokenIds(uint256 roundId, uint256 tokenId)
        public
        view
        returns (uint256[] memory)
    {
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        uint256[] memory partners = new uint256[](amountOfPartners);
        for (uint256 i; i < amountOfPartners; i++) {
            partners[i] = _snowballs[roundId][tokenId].partners[i];
        }
        return partners;
    }

    function getSnowballsOfAddress(address addr)
        external
        view
        returns (Snowball[] memory)
    {
        return getSnowballsOfAddress(getRoundId(), addr);
    }

    function getSnowballsOfAddress(uint256 round, address addr)
        public
        view
        returns (Snowball[] memory)
    {
        uint256 amount = balanceOf(round, addr);
        Snowball[] memory snowballs = new Snowball[](amount);

        for (uint256 index; index < amount; index++) {
            snowballs[index] = _snowballs[round][
                getTokenOwner(round, addr, index)
            ];
        }

        return snowballs;
    }

    function mint(address to) public payable whenNotPaused {
        require(msg.value == MINT_FEE, "Insufficient fee!");
        _mint(to);
    }

    function startRound()
        public
        override(ERC721Round, ISchneeballschlacht)
        whenPaused
    {
        _unpause();
        ERC721Round.startRound();
        _mint(msg.sender);
    }

    function endRound()
        public
        override(ERC721Round, ISchneeballschlacht)
        whenFinished
    {
        _finished = false;
        ERC721Round.endRound();
        _processPayout();
    }

    function toss(address to, uint256 tokenId)
        external
        payable
        whenNotPaused
        checkToken(tokenId)
        checkFee(tokenId)
        isTransferable(tokenId, to)
    {
        require(ownerOf(tokenId) == msg.sender, "Error: Invalid address");
        require(to != msg.sender, "Error: Self Toss");
        require(to != address(0), "Error: zero address");

        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;

        uint256 newTokenId = _newTokenId();
        _safeMint(to, newTokenId);

        _snowballs[roundId][newTokenId] = Snowball({
            level: level,
            parentSnowballId: tokenId,
            partners: new uint256[](0)
        });
        _snowballs[roundId][tokenId].partners.push(newTokenId);
        _tosses[roundId]++;
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        // Next level up also mints randomly
        if (level + 1 < MAX_LEVEL && amountOfPartners == level + 1) {
            _levelup(to, tokenId);
        }
        // Last snowball is minted => game is over
        else if (level < MAX_LEVEL && amountOfPartners == level + 1) {
            uint256 winnerTokenId = _newTokenId();
            _safeMint(msg.sender, winnerTokenId);
            _snowballs[roundId][winnerTokenId] = Snowball({
                level: MAX_LEVEL,
                parentSnowballId: tokenId,
                partners: new uint256[](0)
            });
            // End Game
            _finish();
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Round) whenNotPaused {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Round) whenNotPaused {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override(ERC721Round) whenNotPaused {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function totalTosses() public view returns (uint256) {
        uint256 roundId = getRoundId();
        return _tosses[roundId];
    }

    function totalTosses(uint256 roundId) public view returns (uint256) {
        return _tosses[roundId];
    }

    function totalSupply()
        public
        view
        override(ERC721Round, ISchneeballschlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply();
    }

    function totalSupply(uint256 roundId)
        public
        view
        override(ERC721Round, ISchneeballschlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply(roundId);
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
                abi.encodePacked(
                    _baseURI(),
                    _snowballs[roundId][tokenId].level.toString()
                )
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
                abi.encodePacked(
                    _baseURI(),
                    _snowballs[roundId][tokenId].level.toString()
                )
            );
    }

    function _mint(address to) internal {
        uint256 roundId = getRoundId();
        uint256 tokenId = _newTokenId();
        _safeMint(to, tokenId);
        _snowballs[roundId][tokenId] = Snowball({
            level: 1,
            partners: new uint256[](0),
            parentSnowballId: 0
        });
    }

    function _levelup(address to, uint256 tokenId) internal {
        uint256 roundId = getRoundId();
        uint256 amountOldPartners = _snowballs[roundId][tokenId]
            .partners
            .length;
        uint256[] memory partners = new uint256[](amountOldPartners + 1);
        for (uint256 i; i < amountOldPartners; i++) {
            partners[i] = _snowballs[roundId][tokenId].partners[i];
        }
        partners[partners.length - 1] = tokenId;

        uint256 randIndex = _randomIndex(partners.length);
        uint256 randToken = partners[randIndex];
        uint8 randLevel = _snowballs[roundId][randToken].level;
        if (randLevel + 1 < MAX_LEVEL) {
            uint256 upgradedTokenId = _newTokenId();
            _safeMint(to, upgradedTokenId);
            _snowballs[roundId][upgradedTokenId] = Snowball({
                level: randLevel + 1,
                partners: new uint256[](0),
                parentSnowballId: tokenId
            });
            emit LevelUp(roundId, upgradedTokenId);
        }
    }

    function _randomIndex(uint256 length) internal view returns (uint256) {
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

    function _processPayout() internal {
        uint256 round = getRoundId();
        Escrow escrow = new Escrow(round, this);
        _addEscrow(round, escrow);

        uint256 totalLevels;

        for (uint256 index = 1; index <= totalSupply(round); index++) {
            totalLevels += _snowballs[round][index].level;
        }

        // max totalLevels wei are leftover each round for the next round
        uint256 payoutPerLevel = address(this).balance / totalLevels;
        // because there is leftover wei we need to make sure we only transfer to escrow what is needed
        uint256 totalPayout = totalLevels * payoutPerLevel;
        escrow.deposit{value: totalPayout}();
        _setPayoutPerLevel(round, payoutPerLevel);
    }

    function _finish() internal {
        _pause();
        _finished = true;
        _setWinner(msg.sender);
        // _HOF.mint(msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function getTokens(uint256 page, uint256 amount)
        external
        view
        returns (Query[] memory)
    {
        uint256 roundId = getRoundId();
        return getTokens(roundId, page, amount);
    }

    function getTokens(
        uint256 roundId,
        uint256 page,
        uint256 amount
    ) public view returns (Query[] memory) {
        require(amount > 0, "");
        uint256 total = totalSupply(roundId);
        Query[] memory result = new Query[](0);
        uint256 from = amount * page + 1;
        require(from < total, "Out of bounds!");
        uint256 to = from + amount <= total ? from + amount : total;
        uint256 i;
        for (uint256 index = from; index <= to; index++) {
            uint8 level = _snowballs[roundId][index].level;
            address player = ownerOf(index);
            Query memory query = Query({
                player: player,
                tokenId: index,
                level: level
            });
            result[i++] = query;
        }
        return result;
    }
}
