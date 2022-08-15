// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../Schneeballschlacht.sol";

contract SchneeballSchlachtMaxLevel3 is Schneeballschlacht {
    constructor(address hof) Schneeballschlacht(hof, 3, "ipfs://", 15, 60) {}

    /**
     * @dev Function to mint a snowball
     *
     * @param to address to send the snowball to
     */
    function mint(address to, uint256 amount) external {
        for (uint256 i; i < amount; i++) {
            _mint(to, 1, 0);
        }
    }
}
