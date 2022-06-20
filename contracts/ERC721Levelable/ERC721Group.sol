// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (token/ERC721/ERC721.sol)

pragma solidity ^0.8.0;

import "./IERC721Levelable.sol";
import "./IERC721MetadataLevelable.sol";
import "../ISchneeballSchlacht.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
 * the Metadata extension, but not including the Enumerable extension, which is available separately as
 * {ERC721Enumerable}.
 */
abstract contract ERC721Group is
    ISchneeballSchlacht,
    Context,
    ERC165,
    IERC721Levelable,
    IERC721MetadataLevelable
{
    using Address for address;
    using Strings for uint256;
    using Counters for Counters.Counter;

    uint8 private constant MAX_LEVEL = 20;
    uint256 private constant MINT_FEE = 0.1 ether;
    uint256 private constant TRANSFER_FEE = 0.001 ether;

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    Counters.Counter private _roundIdCounter;
    Counters.Counter private _tokenIdCounter;

    // Mapping from round ID to Round
    mapping(uint256 => Round) private _rounds;

    // Mapping from round to mapping from token ID to owner address
    mapping(uint256 => mapping(uint256 => address)) private _owners;

    // Mapping owner address to token count
    mapping(uint256 => mapping(address => uint256)) private _balances;

    // Mapping from snowball ID to snowball
    mapping(uint256 => mapping(uint256 => Snowball)) private _snowballs;

    // Mapping from owner to operator approvals
    mapping(uint256 => mapping(address => mapping(address => bool)))
        private _operatorApprovals;

    // Mapping from token ID to approved address
    mapping(uint256 => mapping(uint256 => address)) private _tokenApprovals;

    struct Round {
        address winner;
        uint256 payout;
        uint256 startHeight;
        uint256 endHeight;
    }

    struct Snowball {
        uint8 level;
        uint256[] partners;
        uint256 parentSnowballId;
    }

    modifier checkToken(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= totalSupply(), "Invalid token ID!");
        _;
    }

    modifier checkDeadline() {
        uint256 roundId = _roundIdCounter.current();
        uint256 endHeight = _rounds[roundId].endHeight;
        require(block.number < endHeight, "Deadline has been reached!");
        _;
    }

    modifier checkFee(uint256 tokenId) {
        uint256 roundId = _roundIdCounter.current();
        uint8 level = _snowballs[roundId][tokenId].level;
        require(msg.value == TRANSFER_FEE * level, "Insufficient fee!");
        _;
    }

    modifier isTransferable(uint256 tokenId, address to) {
        uint256 roundId = _roundIdCounter.current();
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

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor(string memory name_, string memory symbol_) {
        _roundIdCounter.increment();
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Levelable).interfaceId ||
            interfaceId == type(IERC721MetadataLevelable).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner)
        public
        view
        virtual
        override
        returns (uint256)
    {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        uint256 roundId = _roundIdCounter.current();
        return _balances[roundId][owner];
    }

    function balanceOf(uint32 roundId, address owner)
        external
        view
        returns (uint256)
    {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        return _balances[roundId][owner];
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        uint256 roundId = _roundIdCounter.current();
        address owner = _owners[roundId][tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function ownerOf(uint256 roundId, uint256 tokenId)
        external
        view
        returns (address)
    {
        address owner = _owners[roundId][tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        returns (string memory)
    {
        uint256 roundId = _roundIdCounter.current();
        return
            string(
                abi.encodePacked(_baseURI(), _snowballs[roundId][tokenId].level)
            );
    }

    function tokenURI(uint256 roundId, uint256 tokenId)
        external
        view
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(_baseURI(), _snowballs[roundId][tokenId].level)
            );
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721Group.ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not token owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        _requireMinted(tokenId);
        uint256 roundId = _roundIdCounter.current();
        return _tokenApprovals[roundId][tokenId];
    }

    function getApproved(uint256 roundId, uint256 tokenId)
        external
        view
        returns (address)
    {
        _requireMinted(tokenId);
        return _tokenApprovals[roundId][tokenId];
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        virtual
        override
        returns (bool)
    {
        uint256 roundId = _roundIdCounter.current();
        return _operatorApprovals[roundId][owner][operator];
    }

    function isApprovedForAll(
        uint32 roundId,
        address owner,
        address operator
    ) external view returns (bool) {
        return _operatorApprovals[roundId][owner][operator];
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
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
    ) public virtual override {
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
    ) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        _safeTransfer(from, to, tokenId, data);
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(
            _checkOnERC721Received(from, to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        uint256 roundId = _roundIdCounter.current();
        return _owners[roundId][tokenId] != address(0);
    }

    /**
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal
        view
        virtual
        returns (bool)
    {
        address owner = ERC721Group.ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    function mint(address to) public payable checkDeadline {
        require(msg.value == MINT_FEE, "Insufficient fee!");
        uint256 roundId = _roundIdCounter.current();
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        Snowball memory snowball = Snowball({
            level: 1,
            partners: new uint256[](0),
            parentSnowballId: 0
        });
        _snowballs[roundId][tokenId] = snowball;
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    /**
     * @dev Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            _checkOnERC721Received(address(0), to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");
        uint256 roundId = _roundIdCounter.current();
        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[roundId][to] += 1;
        _owners[roundId][tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = ERC721Group.ownerOf(tokenId);
        uint256 roundId = _roundIdCounter.current();

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[roundId][owner] -= 1;
        delete _owners[roundId][tokenId];

        emit Transfer(owner, address(0), tokenId);

        _afterTokenTransfer(owner, address(0), tokenId);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(
            ERC721Group.ownerOf(tokenId) == from,
            "ERC721: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721: transfer to the zero address");
        uint256 roundId = _roundIdCounter.current();
        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[roundId][from] -= 1;
        _balances[roundId][to] += 1;
        _owners[roundId][tokenId] = to;

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function _approve(address to, uint256 tokenId) internal virtual {
        uint256 roundId = _roundIdCounter.current();
        _tokenApprovals[roundId][tokenId] = to;
        emit Approval(ERC721Group.ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits an {ApprovalForAll} event.
     */
    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        uint256 roundId = _roundIdCounter.current();
        _operatorApprovals[roundId][owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    /**
     * @dev Reverts if the `tokenId` has not been minted yet.
     */
    function _requireMinted(uint256 tokenId) internal view virtual {
        require(_exists(tokenId), "ERC721: invalid token ID");
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try
                IERC721Receiver(to).onERC721Received(
                    _msgSender(),
                    from,
                    tokenId,
                    data
                )
            returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert(
                        "ERC721: transfer to non ERC721Receiver implementer"
                    );
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    function getPartnerTokenIds(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        uint256 roundId = _roundIdCounter.current();
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
        uint256 roundId = _roundIdCounter.current();
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

    function getEndHeight() public view returns (uint256) {
        uint256 roundId = _roundIdCounter.current();
        return _rounds[roundId].endHeight;
    }

    function getEndHeight(uint256 roundId) external view returns (uint256) {
        return _rounds[roundId].endHeight;
    }

    function startRound() external {
        uint256 endHeight = block.number + (31 days / 2 seconds);
        Round memory round = Round({
            startHeight: block.number,
            endHeight: endHeight,
            winner: address(0),
            payout: 0
        });
        uint256 roundId = _roundIdCounter.current();
        _rounds[roundId] = round;
    }

    function endRound() external {
        require(
            block.number >= getEndHeight(),
            "The end height havent arrived yet"
        );

        uint256 total = totalSupply();
        _tokenIdCounter.reset();

        // for (uint256 i = 1; i < total; i++) {
        //     _partners[i] = new uint256[](0);
        //     _levels[i] = 0;
        // }

        // _reset(total);

        // _endTime = block.number + (31 days / 2 seconds);
    }

    function toss(address to, uint256 tokenId)
        public
        payable
        checkToken(tokenId)
        checkFee(tokenId)
        checkDeadline
        isTransferable(tokenId, to)
    {
        require(
            ownerOf(tokenId) == msg.sender,
            "ERC721: transfer from incorrect owner"
        );
        require(to != address(0), "ERC721: transfer to the zero address");
        uint256 roundId = _roundIdCounter.current();
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

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

    function levelup(uint256 tokenId) internal {
        uint256 roundId = _roundIdCounter.current();
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
}
