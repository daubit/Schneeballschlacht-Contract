// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.15;

import "../Schneeballschlacht.sol";

contract SchneeballSchlachtTimeoutTest is Schneeballschlacht {
    constructor(address hof) Schneeballschlacht(hof) {
    }
    
    function hasStone(uint8 level) internal override view returns (bool) {
        return true;
    }
}