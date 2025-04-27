// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "poseidon-solidity/PoseidonT3.sol";
import "./IVerifier.sol";

contract ZKBinaryElection {
    uint8 public constant TREE_DEPTH = 20;
    bytes32 public immutable ELECTION_ID;

    struct Cipher {
        bytes c1;
        bytes c2;
    }

    address public owner;
    address public trustee;
    bytes32 public merkleRoot;

    mapping(uint256 => bool) public nullifierSeen;
    Cipher[] public ballots;

    IVerifier public vReg;
    IVerifier public vVote;

    event Registered(bytes32 leaf, bytes32 newRoot);
    event Voted(bytes32 nullifier, uint256 idx);

    constructor(
        bytes32 _electionId,
        bytes32 _initRoot,
        address _verReg,
        address _verVote,
        address _trustee
    ) {
        owner = msg.sender;
        trustee = _trustee;
        ELECTION_ID = _electionId;
        merkleRoot = _initRoot;
        vReg = IVerifier(_verReg);
        vVote = IVerifier(_verVote);
    }

    function register(
        bytes32 leaf,
        bytes32[TREE_DEPTH] calldata sib,
        uint8[TREE_DEPTH] calldata idx,
        bytes calldata proof
    ) external {
        bytes32 newRoot = _calcRoot(leaf, sib, idx);
        require(
            vReg.verify(abi.encodePacked(leaf, merkleRoot, newRoot), proof),
            "invalid registration proof"
        );
        merkleRoot = newRoot;
        emit Registered(leaf, newRoot);
    }

    function vote(
        bytes calldata c1,
        bytes calldata c2,
        bytes32 nullifier,
        bytes calldata proof
    ) external {
        require(!nullifierSeen[uint256(nullifier)], "double vote");

        bytes memory pubIn = abi.encodePacked(
            merkleRoot, nullifier, keccak256(c1), keccak256(c2), ELECTION_ID
        );
        require(vVote.verify(pubIn, proof), "invalid vote proof");

        nullifierSeen[uint256(nullifier)] = true;
        ballots.push(Cipher(c1,c2));
        emit Voted(nullifier, ballots.length - 1);
    }

    function ballotCount() external view returns (uint256) {
        return ballots.length;
    }

    function _calcRoot(
        bytes32 leaf,
        bytes32[TREE_DEPTH] memory sib,
        uint8[TREE_DEPTH] memory idx
    ) internal pure returns (bytes32 h) {
        h = leaf;
        for (uint8 i; i < TREE_DEPTH; ++i) {
            bytes32 left = idx[i] == 0 ? h : sib[i];
            bytes32 right = idx[i] == 0 ? sib[i] : h;
            uint256[2] memory input = [uint256(left), uint256(right)];
            h = bytes32(PoseidonT3.hash(input));
        }
    }

    function hasVoted(bytes32 nullifier) external view returns (bool) {
        return nullifierSeen[uint256(nullifier)];
    }
}