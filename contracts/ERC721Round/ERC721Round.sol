// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.6.0) (token/ERC721/ERC721.sol)

pragma solidity ^0.8.0;

import "./IERC721Round.sol";
import "./IERC721MetadataRound.sol";
import "./IERC721EnumerableRound.sol";
import "../SnowballStructs.sol";
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
abstract contract ERC721Round is
    Context,
    ERC165,
    IERC721Round,
    IERC721MetadataRound,
    IERC721EnumerableRound
{
    using Address for address;
    using Strings for uint256;
    using Counters for Counters.Counter;

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    Counters.Counter private _roundIdCounter;
    Counters.Counter private _tokenIdCounter;

    // Mapping from round id to Round struct
    mapping(uint256 => Round) private _rounds;

    // Mapping from round id to mapping from token id to owner address
    mapping(uint256 => mapping(uint256 => address)) private _owners;

    // Mapping owner address to token amount
    mapping(uint256 => mapping(address => uint256)) private _balances;

    // Mapping owner address to index to token id
    mapping(uint256 => mapping(address => mapping(uint256 => uint256)))
        private _tokenOwners;

    // Mapping token id to token index in _tokenOwners
    mapping(uint256 => mapping(uint256 => uint256)) private _tokenOwnersIndex;

    // Mapping from round id to owner to operator approvals
    mapping(uint256 => mapping(address => mapping(address => bool)))
        private _operatorApprovals;

    // Mapping from token id to approved address
    mapping(uint256 => mapping(uint256 => address)) private _tokenApprovals;

    event Winner(uint256 indexed roundId, address indexed player);

    modifier roundIsValid(uint256 roundId) {
        uint256 _roundId = getRoundId();
        require(roundId > 0 && roundId <= _roundId , "No Round started yet!");
        _;
    }

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor(string memory name_, string memory symbol_) {
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
            interfaceId == type(IERC721Round).interfaceId ||
            interfaceId == type(IERC721MetadataRound).interfaceId ||
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
        require(owner != address(0), "Error: zero address");
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        return _balances[roundId][owner];
    }

    function balanceOf(uint256 roundId, address owner)
        public
        view
        virtual
        roundIsValid(roundId)
        returns (uint256)
    {
        require(owner != address(0), "Error: zero address");
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
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        address owner = _owners[roundId][tokenId];
        require(owner != address(0), "Error: Invalid token");
        return owner;
    }

    function ownerOf(uint256 roundId, uint256 tokenId)
        external
        view
        roundIsValid(roundId)
        returns (address)
    {
        address owner = _owners[roundId][tokenId];
        require(owner != address(0), "Error: Invalid token");
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
        returns (string memory);

    function tokenURI(uint256, uint256 tokenId)
        external
        view
        virtual
        returns (string memory);

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual returns (string memory);

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721Round.ownerOf(tokenId);
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
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        _requireMinted(tokenId);
        return _tokenApprovals[roundId][tokenId];
    }

    function getApproved(uint256 roundId, uint256 tokenId)
        external
        view
        roundIsValid(roundId)
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
        uint256 roundId = getRoundId();
        return _operatorApprovals[roundId][owner][operator];
    }

    function isApprovedForAll(
        uint256 roundId,
        address owner,
        address operator
    ) external view roundIsValid(roundId) returns (bool) {
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
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "Error: Unauthorized!"
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
            "Error: Unauthorized!"
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
        uint256 roundId = getRoundId();
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
        address owner = ERC721Round.ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
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
        uint256 roundId = getRoundId();
        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[roundId][to] += 1;
        _owners[roundId][tokenId] = to;
        _rounds[roundId].totalSupply++;

        _addTokenOwner(to, tokenId);
        _afterTokenTransfer(address(0), to, tokenId);
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
        require(ERC721Round.ownerOf(tokenId) == from, "Error: Unauthorized");
        require(to != address(0), "Error: zero address");
        uint256 roundId = getRoundId();
        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _removeOwner(from, tokenId);

        _balances[roundId][from] -= 1;
        _balances[roundId][to] += 1;
        _owners[roundId][tokenId] = to;

        _addTokenOwner(to, tokenId);

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function _approve(address to, uint256 tokenId) internal virtual {
        uint256 roundId = getRoundId();
        _tokenApprovals[roundId][tokenId] = to;
        emit Approval(ERC721Round.ownerOf(tokenId), to, tokenId);
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
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
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

    function _addTokenOwner(address to, uint256 tokenId) internal {
        // assumes that balanceOf was already increased
        uint256 length = balanceOf(to) - 1;
        uint32 round = uint32(_roundIdCounter.current());
        _tokenOwners[round][to][length] = tokenId;
        _tokenOwnersIndex[round][tokenId] = length;
    }

    // adapted from from _removeTokenFromOwnerEnumeration (https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/extensions/ERC721Enumerable.sol)
    function _removeOwner(address from, uint256 tokenId) internal {
        // To prevent a gap in from's tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        // assumes balance was not already decremented
        uint256 lastTokenIndex = balanceOf(from) - 1;
        uint32 round = uint32(_roundIdCounter.current());
        uint256 tokenIndex = _tokenOwnersIndex[round][tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _tokenOwners[round][from][lastTokenIndex];

            _tokenOwners[round][from][tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
            _tokenOwnersIndex[round][lastTokenId] = tokenIndex; // Update the moved token's index
        }

        // This also deletes the contents at the last position of the array
        delete _tokenOwnersIndex[round][tokenId];
        delete _tokenOwners[round][from][lastTokenIndex];
    }

    function totalSupply() public view virtual returns (uint256) {
        return getTokenId();
    }

    function totalSupply(uint256 roundId)
        public
        view
        virtual
        returns (uint256)
    {
        require(roundId > 0 && roundId <= getRoundId(), "Invalid id");
        return _rounds[roundId].totalSupply;
    }

    function getRoundId() public view returns (uint256) {
        return _roundIdCounter.current();
    }

    function _newRoundId() internal returns (uint256) {
        _roundIdCounter.increment();
        return _roundIdCounter.current();
    }

    function getTokenId() internal view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function _newTokenId() internal returns (uint256) {
        _tokenIdCounter.increment();
        return _tokenIdCounter.current();
    }

    function getStartHeight() public view returns (uint256) {
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        return _rounds[roundId].startHeight;
    }

    function getStartHeight(uint256 roundId) external view roundIsValid(roundId) returns (uint256) {
        return _rounds[roundId].startHeight;
    }

    // TODO: this seem like it would always be 0x0 except for the time between rounds
    function getEndHeight() public view returns (uint256) {
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        return _rounds[roundId].endHeight;
    }

    function getEndHeight(uint256 roundId) external view roundIsValid(roundId) returns (uint256) {
        return _rounds[roundId].endHeight;
    }

    // TODO: this seem like it would always be 0x0 except for the time between rounds
    function getWinner() public view returns (address) {
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        return _rounds[roundId].winner;
    }

    function getWinner(uint256 roundId) public view roundIsValid(roundId) returns (address) {
        return _rounds[roundId].winner;
    }

    function getWinnerBonus(uint256 roundId) public view roundIsValid(roundId) returns (uint256) {
        return _rounds[roundId].winnerBonus;
    }

    function _setWinner(address winner) internal {
        require(winner != address(0), "null address");
        uint256 roundId = getRoundId();
        _rounds[roundId].winner = winner;
        emit Winner(roundId, winner);
    }

    function getPayoutPerToss(uint256 roundId) external view roundIsValid(roundId) returns (uint256) {
        return _rounds[roundId].payoutPerToss;
    }

    function _startRound() internal {
        uint256 endHeight = block.number + (31 days / 2 seconds);
        uint256 newRound = _newRoundId();
        _rounds[newRound] = Round({
            startHeight: block.number,
            endHeight: endHeight,
            winner: address(0),
            totalSupply: 0,
            payoutPerToss: 0,
            totalPayout: 0,
            winnerBonus: 0
        });
        _tokenIdCounter.reset();
    }

    function _endRound(
        uint256 totalPayout,
        uint256 winnerBonus,
        uint256 payoutPerToss
    ) internal {
        uint256 total = getTokenId();
        uint256 roundId = getRoundId();

        for (uint256 tokenId = 1; tokenId <= total; tokenId++) {
            emit Transfer(ownerOf(tokenId), address(0), tokenId);
        }
        _rounds[roundId].totalPayout = totalPayout;
        _rounds[roundId].totalSupply = total;
        _rounds[roundId].winnerBonus = winnerBonus;
        _rounds[roundId].payoutPerToss = payoutPerToss;
    }

    function getTokensOfAddress(uint256 round, address addr)
        public
        view
        virtual
        returns (uint256[] memory)
    {
        uint256 amount = balanceOf(round, addr);
        uint256[] memory ret = new uint256[](amount);

        for (uint256 index; index < amount; index++) {
            ret[index] = _tokenOwners[round][addr][index];
        }

        return ret;
    }

    function getTokensOfAddress(address addr)
        external
        view
        virtual
        returns (uint256[] memory)
    {
        return getTokensOfAddress(_roundIdCounter.current(), addr);
    }

    function getTokenOwner(
        uint256 roundId,
        address addr,
        uint256 index
    ) public view virtual roundIsValid(roundId) returns (uint256) {
        return _tokenOwners[roundId][addr][index];
    }

    function getPayout() external view returns (uint256) {
        uint256 roundId = getRoundId();
        require(roundId > 0, "No Round started yet!");
        return _rounds[roundId].totalPayout;
    }

    function getPayout(uint256 roundId) external view roundIsValid(roundId) returns (uint256) {
        return _rounds[roundId].totalPayout;
    }
}
