// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.16;

import "../Schneeballschlacht.sol";

contract SchneeballSchlachtTimeoutTest is Schneeballschlacht {
    constructor(address hof) Schneeballschlacht(hof, 20, "ipfs://", 15, 60) {
    }
    
    function hasStone(uint8 level) internal override view returns (bool) {
        return true;
    }
}