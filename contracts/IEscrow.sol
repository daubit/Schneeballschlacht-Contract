// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

interface IEscrow {
    event Withdraw(address indexed payee, uint256 weiAmount);

    function depositsOf(address payee) external view returns (uint256);
    function deposit() external payable;
    function withdraw(address payable payee) external;
}