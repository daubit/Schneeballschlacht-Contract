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
    uint8 private constant MAX_LEVEL = 20;
    uint256 private constant MINT_FEE = 0.05 ether;
    uint256 private constant TOSS_FEE = 0.01 ether;
    bool private _finished;

    HallOfFame private _hof;

    // Mapping roundId to tokenId ID to snowball
    mapping(uint256 => mapping(uint256 => Snowball)) private _snowballs;

    // Mapping roundId to totalTosses
    mapping(uint256 => uint256) private _tosses;

    event Mint(address indexed to);

    event Toss(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    event LevelUp(uint256 indexed roundId, uint256 indexed tokenId);

    constructor(address hof) ERC721Round("Schneeballschlacht", "Schneeball") {
        _pause();
        _hof = HallOfFame(hof);
        _finished = false;
    }

    modifier whenFinished() {
        require(_finished, "Finished");
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        uint256 roundId = getRoundId();
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

    /**
     * @dev External function to return list of partner tokenIds
     *
     * @param tokenId uint256 ID of the token to be transferred
     */
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

    /**
     * @dev External function to return list of snowballs owned by addr
     *
     * @param addr address of the owner to view
     */
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
        uint256 total = totalSupply(roundId);
        uint256 from = amount * page + 1;
        require(from < total, "Out of bounds!");
        uint256 to = from + amount <= total ? from + amount : total;
        uint256 i;
        Query[] memory result = new Query[](to - from + 1);
        for (uint256 tokenId = from; tokenId <= to; tokenId++) {
            uint8 level = _snowballs[roundId][tokenId].level;
            address player = ownerOf(tokenId);
            Query memory query = Query({
                player: player,
                tokenId: tokenId,
                level: level
            });
            result[i++] = query;
        }
        return result;
    }

    /**
     * @dev Function to mint a snowball
     *
     * @param to address to send the snowball to
     */
    function mint(address to) public payable whenNotPaused {
        require(msg.value == MINT_FEE, "Insufficient fee!");
        _mint(to);
        emit Mint(to);
    }

    /**
     * @dev Function to initialize a new round. Reverts when a round is already running.
     * The address calling the function is granted a free snowball.
     */
    function startRound() public override(ISchneeballschlacht) whenPaused {
        _unpause();
        _startRound();
        _mint(msg.sender);
    }

    /**
     * @dev Function to end a round. Reverts when a round is not finished.
     * endRound
     */
    function endRound() public override(ISchneeballschlacht) whenFinished {
        _finished = false;
        uint256 totalPayout;
        uint256 bonusLevels;
        uint256 payoutPerToss;
        (totalPayout, bonusLevels, payoutPerToss) = _processPayout();
        _endRound(totalPayout, bonusLevels, payoutPerToss);
    }

    /**
     * @dev Function to toss a snowball to a different address.
     * Calling conditions:
     *  - The correct amount of fee must be present
     *  - The tokenId must be owned by the sender
     *  - The address to toss to must be different from previous address tossed to
     *
     * If a snowball of level n has been thrown at n + 1 unique addresses,
     * then a random address is chosen to mint an upgraded snowball to.
     * The random address is chosen by the partners including the thrower.
     *
     * If a snowball would be upgrading to max level,
     * then after the sender receives the final snowball the game finishes
     * and the mint, toss and transfer functions are paused.
     *
     *
     * @param to address to toss the snowball to.
     * @param tokenId snowball to toss
     */
    function toss(address to, uint256 tokenId)
        external
        payable
        whenNotPaused
        isTransferable(tokenId, to)
    {
        require(ownerOf(tokenId) == msg.sender, "Error: Invalid address");
        require(to != msg.sender, "Error: Self Toss");
        require(to != address(0), "Error: zero address");
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        require(msg.value == TOSS_FEE * level, "Insufficient fee!");

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
        require(amountOfPartners < level + 1, "No throws left");

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
        emit Toss(msg.sender, to, tokenId);
    }

    /**
     * @dev Each transfer function from ERC721 has been overridden so it will be paused when a round is finished.
     *
     * @param from address
     * @param to address
     * @param tokenId uint256
     */
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

    /**
     * @dev Returns the amount of tosses made in the current round
     */
    function totalTosses() public view returns (uint256) {
        uint256 roundId = getRoundId();
        return _tosses[roundId];
    }

    /**
     * @dev Returns the amount of tosses made in the round
     *
     * @param roundId uint256
     */
    function totalTosses(uint256 roundId) public view returns (uint256) {
        return _tosses[roundId];
    }

    /**
     * @dev Returns the total supply of the current round
     */
    function totalSupply()
        public
        view
        override(ERC721Round, ISchneeballschlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply();
    }

    /**
     * @dev Returns the total supply of the give roundId
     *
     * @param roundId uint256
     */
    function totalSupply(uint256 roundId)
        public
        view
        override(ERC721Round, ISchneeballschlacht)
        returns (uint256)
    {
        return ERC721Round.totalSupply(roundId);
    }

    /**
     * @dev Returns the URI of the token based of its level
     *
     * @param tokenId uint256
     */
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

    /**
     * @dev Returns the URI of the token based of its level
     *
     * @param tokenId uint256
     * @param roundId uint256
     */
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

    /**
     * @dev Internal function for handling mint
     *
     * @param to address
     */
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

    /**
     * @dev Internal function for handling level up
     * Function will level up as long as the next level is not max level,
     * because it has to be garanteed that the address achieving max level gets the max level snowball
     *
     * @param to address
     * @param tokenId uint256
     */
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
        // toss handles level up to max since it ends the game
        // otherwise level up in here
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

    /**
     * @dev Pseudo-random generator.
     *
     * @param length uint256
     */
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

    /**
     * @dev Internal function for handling the payout to each address owning a snowball
     * Payout is based on the tosses made by a snowball
     */
    function _processPayout()
        internal
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 round = getRoundId();
        Escrow escrow = new Escrow(round, this);
        _addEscrow(round, escrow);
        uint256 total = _tosses[round];
        // 1% of total is bonus for the winner
        uint256 bonusForWinner = total / 100;
        total += bonusForWinner;
        // max total wei are leftover each round for the next round
        uint256 payoutPerToss = address(this).balance / total;
        // because there is leftover wei we need to make sure we only transfer to escrow what is needed
        uint256 totalPayout = total * payoutPerToss;
        escrow.deposit{value: totalPayout}();
        return (totalPayout, bonusForWinner, payoutPerToss);
    }

    /**
     * @dev Internal function for handling the end of a round.
     * Winner is minted a reward NFT
     */
    function _finish() internal {
        _pause();
        _finished = true;
        _setWinner(msg.sender);
        // _hof.mint(msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }
}
