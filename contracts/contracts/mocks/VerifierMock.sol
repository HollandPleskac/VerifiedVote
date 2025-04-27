// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../IVerifier.sol";

contract VerifierMock is IVerifier {
    function verify(bytes calldata, bytes calldata) external pure override returns (bool) {
        return true; // Always accept proofs in test
    }
}