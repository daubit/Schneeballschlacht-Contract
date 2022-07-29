// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../Schneeballschlacht.sol";

contract SchneeballSchlachtMaxLevel3 is Schneeballschlacht {
    constructor(address hof) Schneeballschlacht(hof, 3) {}
}