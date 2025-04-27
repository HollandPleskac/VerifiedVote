import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, getBytes, hexlify, randomBytes, BytesLike, Wallet } from "ethers";
import { createCipheriv, createDecipheriv } from "crypto";
import * as secp from "@noble/secp256k1";
import { ZKBinaryElection } from "../typechain-types"; // Adjust path if needed

// Hardhat default private keys (ensure they match your Hardhat node)
const hardhatPrivateKeys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account #0 (Deployer/Trustee)
    "0x59c6995e998f97a5a0044976f8e02bf21c197c651e834308c4a7d7d6bfa5a83e", // Account #1 (Voter 1)
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2 (Voter 2)
    "0x7c8521182946a3a5271d5cce64707c5f2dcd4c03aa054a84b9b0aa893f7f173d", // Account #3 (Voter 3)
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Account #4 (Voter 4)
    // Add more if needed
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
];

// --- Configuration ---
const ELECTION_ID_STRING = "election2025-local";
const INITIAL_ROOT_STRING = "initial-root-local";
const VOTES_TO_SIMULATE = [1, 0, 1, 1, 0]; // Example votes for voters 1-5

async function main() {
    console.log("--- Starting Election Simulation ---");

    // === 1. Get Signers ===
    const [deployerSigner, ...voterSigners] = await ethers.getSigners();
    const trusteePrivateKey = hardhatPrivateKeys[0]; // Deployer is Trustee
    const voterPrivateKeys = hardhatPrivateKeys.slice(1, 1 + VOTES_TO_SIMULATE.length);

    // Ensure we have enough signers/keys for the simulation
    if (voterPrivateKeys.length < VOTES_TO_SIMULATE.length) {
        throw new Error(`Need at least ${VOTES_TO_SIMULATE.length} voter private keys, found ${voterPrivateKeys.length}`);
    }

    console.log(`Deployer/Trustee Address: ${deployerSigner.address}`);
    console.log(`Trustee Private Key (Keep Secure!): ${trusteePrivateKey}`); // For decryption later
    voterPrivateKeys.forEach((key, index) => {
        const voterWallet = new Wallet(key);
        console.log(`Voter ${index + 1} Address: ${voterWallet.address}`);
    });

    // === 2. Deploy Dependencies & Main Contract ===
    console.log("\n--- Deploying Contracts ---");

    // Deploy PoseidonT3 Library
    const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
    const poseidonLib = await PoseidonT3Factory.connect(deployerSigner).deploy();
    await poseidonLib.waitForDeployment();
    const poseidonLibAddress = await poseidonLib.getAddress();
    console.log(`PoseidonT3 Library deployed at: ${poseidonLibAddress}`);

    // Deploy Verifier Mock (for registration and voting)
    const VerifierMockFactory = await ethers.getContractFactory("VerifierMock");
    const verifierMock = await VerifierMockFactory.connect(deployerSigner).deploy();
    await verifierMock.waitForDeployment();
    const verifierMockAddress = await verifierMock.getAddress();
    console.log(`VerifierMock deployed at: ${verifierMockAddress}`);

    // Prepare Election Contract Deployment Arguments
    const electionId = keccak256(toUtf8Bytes(ELECTION_ID_STRING));
    const initRoot = keccak256(toUtf8Bytes(INITIAL_ROOT_STRING));
    const trusteeAddress = deployerSigner.address;

    // Deploy ZKBinaryElection Contract (linking PoseidonT3)
    const ZKBinaryElectionFactory = await ethers.getContractFactory("ZKBinaryElection", {
        libraries: {
            PoseidonT3: poseidonLibAddress,
        },
        signer: deployerSigner // Ensure deployer pays for deployment
    });

    const electionContract = (await ZKBinaryElectionFactory.deploy(
        electionId,
        initRoot,
        verifierMockAddress, // Using Mock for Registration Verifier
        verifierMockAddress, // Using Mock for Vote Verifier
        trusteeAddress
    )) as ZKBinaryElection; // Cast to specific type

    await electionContract.waitForDeployment();
    const electionContractAddress = await electionContract.getAddress();
    console.log(`ZKBinaryElection Contract deployed at: ${electionContractAddress}`);
    console.log(`Election ID: ${electionId}`);

    // === 3. Simulate Voting ===
console.log("\n--- Simulating Votes ---");

// Ensure we have enough signers/keys for the simulation
if (voterSigners.length < VOTES_TO_SIMULATE.length) {
    throw new Error(`Need at least ${VOTES_TO_SIMULATE.length} voter signers from Hardhat, found ${voterSigners.length}`);
}
if (voterPrivateKeys.length < VOTES_TO_SIMULATE.length) {
    throw new Error(`Need at least ${VOTES_TO_SIMULATE.length} voter private keys, found ${voterPrivateKeys.length}`);
}


const trusteePubKey = secp.getPublicKey(trusteePrivateKey.slice(2), true); // Get compressed trustee pubkey

for (let i = 0; i < VOTES_TO_SIMULATE.length; i++) {
    const voterPrivateKey = voterPrivateKeys[i]; // Key for crypto
    const voterSigner = voterSigners[i];         // Signer for transaction sending
    const voteValue = VOTES_TO_SIMULATE[i];

    console.log(`\nSimulating vote for Voter ${i + 1} (Address: ${voterSigner.address})`);
    console.log(` -> Vote value: ${voteValue}`);

    // a) Generate Voter's Ephemeral Keypair for ElGamal-like part (using the private key)
    const voterPubKeyCompressed = secp.getPublicKey(voterPrivateKey.slice(2), true);
    const c1Hex = hexlify(voterPubKeyCompressed);

    // b) Derive Shared Secret (ECDH) (using the private key)
    const sharedSecret = await secp.getSharedSecret(
        voterPrivateKey.slice(2), // Voter's private key
        trusteePubKey,           // Trustee's public key
        true
    );

    // c) Derive AES Key from Shared Secret
    const aesKey = Buffer.from(sharedSecret.slice(1), "hex").slice(0, 32);

    // d) Encrypt the Vote using AES-GCM
    const plaintextVote = Buffer.from([voteValue]);
    const iv = Buffer.from(randomBytes(12));
    const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintextVote), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // e) Pack IV + AuthTag + Ciphertext into c2
    const c2 = Buffer.concat([iv, authTag, encrypted]);
    const c2Hex = hexlify(c2);

    // f) Generate Dummy Nullifier and Proof
    const nullifier = hexlify(randomBytes(32));
    const proof = hexlify(randomBytes(128));

    console.log(` -> c1 (Voter PubKey): ${c1Hex}`);
    console.log(` -> Nullifier: ${nullifier}`);

    // g) Submit Vote Transaction using the Signer from getSigners()
    try {
         // IMPORTANT: Connect using the voterSigner obtained from getSigners()
        const tx = await electionContract.connect(voterSigner).vote(
            c1Hex,
            c2Hex,
            nullifier,
            proof
        );
        await tx.wait();
        console.log(` -> Vote submitted successfully! Tx Hash: ${tx.hash}`);
    } catch (error) {
        console.error(` -> Vote submission failed for Voter ${i + 1}:`, error);
    }
}

    // === 4. Fetch and Decrypt Ballots (Trustee Action) ===
    console.log("\n--- Fetching and Decrypting Ballots (Trustee View) ---");

    const totalVotes = await electionContract.ballotCount();
    console.log(`Total ballots stored in contract: ${totalVotes.toString()}`);

    const decryptedVotes: { voterIndex: number, vote: number | string }[] = [];

    for (let i = 0; i < totalVotes; i++) {
        console.log(`\nDecrypting Ballot #${i}...`);
        const ballot = await electionContract.ballots(i);
        const storedC1 = ballot.c1; // Voter's compressed public key (bytes)
        const storedC2 = ballot.c2; // IV + AuthTag + EncryptedVote (bytes)

        const storedC1Hex = hexlify(storedC1);
         // console.log(`  Stored c1: ${storedC1Hex}`); // Uncomment if needed
         // console.log(`  Stored c2: ${hexlify(storedC2)}`); // Uncomment if needed


        try {
            // a) Trustee derives the shared secret using THEIR private key and the voter's public key (c1)
            const trusteeSharedSecret = await secp.getSharedSecret(
                trusteePrivateKey.slice(2), // Trustee's private key
                storedC1Hex.slice(2),       // Voter's public key from ballot (remove '0x')
                true                        // Use compressed format
            );

            // b) Derive AES Key (must match the voter's derivation method)
            const trusteeAesKey = Buffer.from(trusteeSharedSecret.slice(1), "hex").slice(0, 32);

            // c) Parse c2 = IV(12) + AuthTag(16) + EncryptedData(*)
            const c2Buffer = Buffer.from(hexlify(storedC2).slice(2), "hex"); // Convert bytes to Buffer
            const ivDec = c2Buffer.slice(0, 12);
            const authTagDec = c2Buffer.slice(12, 28);
            const encryptedVote = c2Buffer.slice(28);

            // d) Decrypt using AES-GCM
            const decipher = createDecipheriv("aes-256-gcm", trusteeAesKey, ivDec);
            decipher.setAuthTag(authTagDec); // Provide the auth tag for verification

            const decrypted = Buffer.concat([
                decipher.update(encryptedVote),
                decipher.final() // This will throw an error if auth tag is invalid
            ]);

            // e) Extract final vote (should be 0 or 1)
            const finalVote = decrypted[0];
            console.log(`  🔓 Decrypted Vote: ${finalVote}`);
            // Find which original voter this might correspond to for clarity (optional)
            // This is simple because we submitted in order, real systems wouldn't know easily
            const likelyVoterIndex = i + 1;
            decryptedVotes.push({ voterIndex: likelyVoterIndex, vote: finalVote });

        } catch (error) {
            console.error(`  ❌ Failed to decrypt Ballot #${i}:`, error);
             const likelyVoterIndex = i + 1;
             decryptedVotes.push({ voterIndex: likelyVoterIndex, vote: "Decryption Failed" });
        }
    }

    // === 5. Print Final Results ===
    console.log("\n--- Final Decrypted Vote Summary ---");
    console.table(decryptedVotes);

    const voteCounts = decryptedVotes.reduce((acc, item) => {
        if (typeof item.vote === 'number') {
            acc[item.vote] = (acc[item.vote] || 0) + 1;
        } else {
             acc["Failed"] = (acc["Failed"] || 0) + 1;
        }
        return acc;
    }, {} as Record<string | number, number>);

    console.log("\n--- Vote Tallies ---");
    console.log(`Votes for 1: ${voteCounts[1] || 0}`);
    console.log(`Votes for 0: ${voteCounts[0] || 0}`);
    if (voteCounts["Failed"]) {
         console.log(`Failed Decryptions: ${voteCounts["Failed"]}`);
    }
    console.log("------------------------------------");


}

main().catch((error) => {
    console.error("Script failed:", error);
    process.exitCode = 1;
});