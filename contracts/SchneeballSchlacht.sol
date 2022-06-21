pragma solidity 0.8.15;

import "./ERC721Round/ERC721Round.sol";
import "./ISchneeballSchlacht.sol";

// TODO: payout
// TODO: maybe event
// TODO: refactor transfer to throw func
// TODO: refactor
// TODO: calc ban hit when throwing snowball
contract SchneeballSchlacht is ISchneeballSchlacht, ERC721Round {
    uint8 private constant MAX_LEVEL = 20;
    uint256 private constant MINT_FEE = 0.1 ether;
    uint256 private constant TRANSFER_FEE = 0.001 ether;

    // Mapping from snowball ID to snowball
    mapping(uint256 => mapping(uint256 => Snowball)) private _snowballs;

    struct Snowball {
        uint8 level;
        uint256[] partners;
        uint256 parentSnowballId;
    }

    modifier checkFee(uint256 tokenId) {
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        require(msg.value == TRANSFER_FEE * level, "Insufficient fee!");
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        uint256 roundId = getRoundId();
        uint8 level = _snowballs[roundId][tokenId].level;
        uint256 amountOfPartners = _snowballs[roundId][tokenId].partners.length;
        require(
            level != MAX_LEVEL || amountOfPartners <= level + 1,
            "Cannot transfer"
        );
        uint256[] memory partners = _snowballs[roundId][tokenId].partners;
        for (uint256 index = 0; index < partners.length; index++) {
            require(ownerOf(partners[index]) != to, "No double transfer!");
        }
        _;
    }

    event LevelUp(uint256 indexed roundId, uint256 indexed tokenId);

    constructor() ERC721Round("SchneeballSchlacht", "Schneeball") {}

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

    function mint(address to) public payable checkDeadline {
        require(msg.value == MINT_FEE, "Insufficient fee!");
        uint256 roundId = getRoundId();
        uint256 tokenId = getTokenId();
        incrementTokenId();
        _safeMint(to, tokenId);
        Snowball memory snowball = Snowball({
            level: 1,
            partners: new uint256[](0),
            parentSnowballId: 0
        });
        _snowballs[roundId][tokenId] = snowball;
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
    function getLevel(uint256 tokenId) public view returns (uint8) {
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
        public
        payable
        checkDeadline
        checkFee(tokenId)
        checkToken(tokenId)
        isTransferable(tokenId, to)
    {
        require(
            ownerOf(tokenId) == msg.sender,
            "ERC721: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721: transfer to the zero address");
        uint256 roundId = getRoundId();
        uint256 newTokenId = getTokenId();
        incrementTokenId();

        _safeMint(to, newTokenId);

        _snowballs[roundId][newTokenId] = Snowball({
            level: _snowballs[roundId][tokenId].level,
            parentSnowballId: tokenId,
            partners: new uint256[](0)
        });
        _snowballs[roundId][tokenId].partners.push(newTokenId);

        if (
            _snowballs[roundId][tokenId].partners.length ==
            _snowballs[roundId][tokenId].level + 1
        ) {
            levelup(tokenId);
        }
    }

    // TODO: When level up increment tokenId => mint new token
    function levelup(uint256 tokenId) internal {
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
        if (_snowballs[roundId][randToken].level < MAX_LEVEL) {
            Snowball memory upgradedSnowball = Snowball({
                level: _snowballs[roundId][randToken].level++,
                partners: new uint256[](0),
                parentSnowballId: _snowballs[roundId][randToken]
                    .parentSnowballId
            });
            _snowballs[roundId][randToken] = upgradedSnowball;
            emit LevelUp(roundId, randToken);
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

    function startRound() external override(ERC721Round, ISchneeballSchlacht) {}

    function endRound() external override(ERC721Round, ISchneeballSchlacht) {}

    function totalSupply()
        external
        view
        override(ERC721Round, ISchneeballSchlacht)
        returns (uint256)
    {}
}
