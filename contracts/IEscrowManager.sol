// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "./IEscrow.sol";
import "./ISchneeballschlacht.sol";

interface IEscrowManager {
    function withdraw(uint256 round, address payable payee) external;
    function depositsOf(uint256 round, address payee)
        external
        view
        returns (uint256);
    function getEscrow(uint256 round) external view returns (IEscrow);
    function createEscrow(uint256 round, ISchneeballschlacht schneeballschlacht) external returns (IEscrow);
}