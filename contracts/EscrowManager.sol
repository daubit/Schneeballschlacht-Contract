// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity 0.8.16;

import "./Escrow.sol";
import "./IEscrowManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EscrowManager is IEscrowManager, AccessControl {
    mapping(uint256 => IEscrow) private _escrow;

    bytes32 public constant ESCROW_ROLE = keccak256("ESCROW_ROLE");

    function withdraw(uint256 round, address payable payee) external {
        _escrow[round].withdraw(payee);
    }

    function depositsOf(uint256 round, address payee)
        external
        view
        returns (uint256)
    {
        return _escrow[round].depositsOf(payee);
    }

    function getEscrow(uint256 round) external view returns (IEscrow) {
        return _escrow[round];
    }

    function createEscrow(uint256 round, ISchneeballschlacht schneeballschlacht) external onlyRole(ESCROW_ROLE) returns (IEscrow) {
        require(
            _escrow[round] == IEscrow(address(0x0)),
            "Escrow already exists"
        );

        _escrow[round] = new Escrow(round, schneeballschlacht);

        return _escrow[round];
    }
}
