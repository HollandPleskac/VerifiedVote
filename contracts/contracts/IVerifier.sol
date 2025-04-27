// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifier {
    function verify(bytes calldata publicInputs, bytes calldata proof)
        external
        view
        returns (bool);
}
