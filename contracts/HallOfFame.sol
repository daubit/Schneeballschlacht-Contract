// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./common/meta-transactions/ContentMixin.sol";
import "./common/meta-transactions/NativeMetaTransaction.sol";
import "./IHallOfFame.sol";
import "./OpenSeaPolygonProxy.sol";

contract HallOfFame is
    ERC721,
    AccessControl,
    NativeMetaTransaction,
    ContextMixin,
    IHallOfFame
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _totalSupply;

    string private _contractURI;
    string private _baseURIS;

    address private _proxyRegistryAddress;

    constructor(
        string memory contractURI_,
        string memory baseURI,
        address proxyRegistryAddress
    ) ERC721("HallOfFame", "Trophy") {
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _contractURI = contractURI_;
        _baseURIS = baseURI;
        _proxyRegistryAddress = proxyRegistryAddress;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIS;
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    /**
     * @dev Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return
            ERC721.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }

    function mint(address to) external onlyRole(MINTER_ROLE) {
        _totalSupply++;
        _safeMint(to, _totalSupply);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI)) : "";
    }

    /**
     * @dev This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender() internal view override returns (address sender) {
        return ContextMixin.msgSender();
    }
}
