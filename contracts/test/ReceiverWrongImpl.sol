// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ReceiverWrongImpl is IERC721Receiver  {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        return "0x12";
    }
}