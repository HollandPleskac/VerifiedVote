import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, getBytes } from "ethers";
import { createCipheriv, createDecipheriv } from "crypto";
import * as secp from "@noble/secp256k1";

const hardhatPrivateKeys = [
    "0x59c6995e998f97a5a0044976f8e02bf21c197c651e834308c4a7d7d6bfa5a83e", // deployer/trustee
    "0x8b3a350cf5c34c9194ca966a5ad5c8d81b0e7d1026a8dd8f2e9c1e1c7afaf6e3", // voter1
    "0x5d8623b5d76fcf979ec9ab061f2f054e0cd0c4a96522132f67d41f0b68cfaa99", // voter2
    "0x81799ae74d0d8fd1ad3395fc43957b1c6a86f4ae1d84ed14dbb3a3b62cc88be4", // voter3
    "0x7c8521182946a3a5271d5cce64707c5f2dcd4c03aa054a84b9b0aa893f7f173d"  // voter4
  ];
  


describe("ZKBinaryElectionVote", function () {
  let election: any;
  let verifierMock: any;
  let deployer: any;
  const TREE_DEPTH = 20;


  beforeEach(async () => {
    [deployer] = await ethers.getSigners();
  
    const VerifierMock = await ethers.getContractFactory("VerifierMock");
    verifierMock = await VerifierMock.deploy();
    await verifierMock.waitForDeployment();
  
    const PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
    const poseidon = await PoseidonT3.deploy();
    await poseidon.waitForDeployment();
  
    const electionId = keccak256(toUtf8Bytes("election2025"));
    const initRoot = keccak256(toUtf8Bytes("initial"));
  
    const ZKBinaryElection = await ethers.getContractFactory("ZKBinaryElection", {
      libraries: {
        PoseidonT3: await poseidon.getAddress(), // 👈 required linking
      },
    });
  
    election = await ZKBinaryElection.deploy(
      electionId,
      initRoot,
      verifierMock.getAddress(),
      verifierMock.getAddress(),
      deployer.address
    );
  
    await election.waitForDeployment();

    // 👇👇 ADD THESE PRINTS
    console.log("\n==== Deployment Info ====");
    console.log("Election Contract Address:", await election.getAddress ? await election.getAddress() : election.target || election.address);
    console.log("Trustee (deployer) Private Key:", deployer.privateKey);
    console.log("==========================\n");
  });

  it("should register a voter with valid zk proof", async () => {
    const leaf = keccak256(toUtf8Bytes("voter1"));
    const sibs = Array(TREE_DEPTH).fill(leaf);
    const idx = Array(TREE_DEPTH).fill(0);
    const proof = getBytes("0x1234");

    await election.register(leaf, sibs, idx, proof);
    const newRoot = await election.merkleRoot();
    expect(newRoot).to.not.equal(ethers.ZeroHash);
  });

  it("should allow a voter to submit a private vote", async () => {
    const c1 = keccak256(toUtf8Bytes("ciphertext1"));
    const c2 = keccak256(toUtf8Bytes("ciphertext2"));
    const nullifier = keccak256(toUtf8Bytes("nullifier1"));
    const proof = getBytes("0x1234");

    await election.vote(c1, c2, nullifier, proof);
    const count = await election.ballotCount();
    expect(count).to.equal(1);
  });

  it("should reject double voting using same nullifier", async () => {
    const c1 = keccak256(toUtf8Bytes("ciphertext1"));
    const c2 = keccak256(toUtf8Bytes("ciphertext2"));
    const nullifier = keccak256(toUtf8Bytes("nullifier1"));
    const proof = getBytes("0x1234");

    await election.vote(c1, c2, nullifier, proof);
    await expect(election.vote(c1, c2, nullifier, proof)).to.be.revertedWith("double vote");
  });

  it("should reflect that a voter has voted via hasVoted()", async () => {
    const c1 = keccak256(toUtf8Bytes("ciphertext1"));
    const c2 = keccak256(toUtf8Bytes("ciphertext2"));
    const nullifier = keccak256(toUtf8Bytes("nullifier123"));
    const proof = getBytes("0x1234");
  
    // initially hasVoted should be false
    const before = await election.hasVoted(nullifier);
    expect(before).to.be.false;
  
    await election.vote(c1, c2, nullifier, proof);
  
    // after vote, should be true
    const after = await election.hasVoted(nullifier);
    expect(after).to.be.true;
  });

  it("should collect and count encrypted votes correctly", async function () {
    expect(await election.ballotCount()).to.equal(0);

    // Simulate 3 voters casting encrypted votes
    for (let i = 0; i < 3; i++) {
      const fakeC1 = ethers.hexlify(ethers.randomBytes(32));
      const fakeC2 = ethers.hexlify(ethers.randomBytes(32));
      const fakeNullifier = ethers.hexlify(ethers.randomBytes(32));
      const fakeProof = ethers.randomBytes(128); // dummy bytes for proof

      await election.vote(
        fakeC1,
        fakeC2,
        fakeNullifier,
        fakeProof
      );
    }

    expect(await election.ballotCount()).to.equal(3);
  });


  it("should fetch and print encrypted ballots using default getter", async function () {
    // Simulate 2 dummy encrypted votes
    for (let i = 0; i < 2; i++) {
      const fakeC1 = ethers.hexlify(ethers.randomBytes(32));
      const fakeC2 = ethers.hexlify(ethers.randomBytes(32));
      const fakeNullifier = ethers.hexlify(ethers.randomBytes(32));
      const fakeProof = ethers.randomBytes(128);

      await election.vote(fakeC1, fakeC2, fakeNullifier, fakeProof);
    }

    const totalVotes = await election.ballotCount();
    console.log(`Total Encrypted Votes Collected: ${totalVotes.toString()}`);

    for (let i = 0; i < totalVotes; i++) {
      const ballot = await election.ballots(i); // ← using default Solidity getter
      console.log(`Ballot #${i}:`);
      console.log(`  c1: ${ballot.c1}`);
      console.log(`  c2: ${ballot.c2}`);
    }
  });




  it("should encrypt ballots, decrypt them, print their votes", async function () {
    const trusteePrivateKey = "0x59c6995e998f97a5a0044976f8e02bf21c197c651e834308c4a7d7d6bfa5a83e"; // Hardhat default deployer key
    const voterPrivateKey = "0x8b3a350cf5c34c9194ca966a5ad5c8d81b0e7d1026a8dd8f2e9c1e1c7afaf6e3";  // Hardhat second account

    
    // Trustee public key
const trusteePubKey = secp.getPublicKey(trusteePrivateKey.slice(2), true);

// Voter public key
const voterPubKeyCompressed = secp.getPublicKey(voterPrivateKey.slice(2), true); // compressed public key
const c1Hex = ethers.hexlify(voterPubKeyCompressed); // submit full compressed public key!


// Shared secret
const sharedSecret = await secp.getSharedSecret(
  voterPrivateKey.slice(2),
  trusteePubKey,
  true
);

// Derive AES encryption key
const key = Buffer.from(sharedSecret.slice(1), "hex").slice(0, 32);

// Encrypt one vote (example: vote = 1)
const plaintextVote = Buffer.from([1]); // 👈 your vote (1 or 0)
const iv = Buffer.from(ethers.randomBytes(12)); // 12-byte IV for AES-GCM
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([cipher.update(plaintextVote), cipher.final()]);
const authTag = cipher.getAuthTag();

// Pack IV + AuthTag + Ciphertext together
const c2 = Buffer.concat([iv, authTag, encrypted]);

const c2Hex = ethers.hexlify(c2); // encrypted payload

const nullifier = ethers.hexlify(ethers.randomBytes(32)); // random unique nullifier
const proof = ethers.randomBytes(128); // dummy zk proof bytes

// 🛠 Submit the encrypted ballot to the contract
await election.vote(c1Hex, c2Hex, nullifier, proof);

console.log(`✅ Vote submitted!`);

// Fetch ballot
const ballot = await election.ballots(0);
const storedC1 = ballot.c1;
const storedC2 = ballot.c2;

// 🔥 Hexlify storedC1 properly
const storedC1Hex = ethers.hexlify(storedC1);

// Derive shared secret
const trusteeSharedSecret = await secp.getSharedSecret(
    trusteePrivateKey.slice(2),
    storedC1Hex.slice(2), // ✅ remove "0x" prefix
    true
  );


  // 🔥 Derive AES key from shared secret
const trusteeKey = Buffer.from(trusteeSharedSecret.slice(1), "hex").slice(0, 32);

// 🔥 Decode storedC2
const storedC2Hex = ethers.hexlify(storedC2); // storedC2 is bytes, make it hex
const c2Buffer = Buffer.from(storedC2Hex.slice(2), "hex"); // remove 0x

// 🧠 Remember: your c2 = IV(12 bytes) + AuthTag(16 bytes) + EncryptedData

const ivDec = c2Buffer.slice(0, 12); // First 12 bytes = IV
const authTagDec = c2Buffer.slice(12, 28); // Next 16 bytes = AuthTag
const encryptedVote = c2Buffer.slice(28); // Remaining = actual encrypted vote

// 🔥 Decrypt
const decipher = createDecipheriv("aes-256-gcm", trusteeKey, ivDec);
decipher.setAuthTag(authTagDec);

const decrypted = Buffer.concat([
  decipher.update(encryptedVote),
  decipher.final()
]);

// ✅ Decrypted vote
const finalVote = decrypted[0]; // 0 or 1
console.log(`🔓 Decrypted Vote: ${finalVote}`);

  });


  it("should encrypt multiple ballots, decrypt them, and print their votes", async function () {
    const trusteePrivateKey = "0x59c6995e998f97a5a0044976f8e02bf21c197c651e834308c4a7d7d6bfa5a83e"; // Hardhat deployer key
    const voterPrivateKey = "0x8b3a350cf5c34c9194ca966a5ad5c8d81b0e7d1026a8dd8f2e9c1e1c7afaf6e3";  // Hardhat second account
  
    // Trustee public key
    const trusteePubKey = secp.getPublicKey(trusteePrivateKey.slice(2), true);
  
    // Voter public key (compressed)
    const voterPubKeyCompressed = secp.getPublicKey(voterPrivateKey.slice(2), true);
    const c1Hex = ethers.hexlify(voterPubKeyCompressed);
  
    // Shared secret
    const sharedSecret = await secp.getSharedSecret(
      voterPrivateKey.slice(2),
      trusteePubKey,
      true
    );
    const aesKey = Buffer.from(sharedSecret.slice(1), "hex").slice(0, 32);
  
    const votesToSubmit = [1, 0, 1, 0, 1]; // Example votes (you can randomize)
  
    // 🛠 Submit 5 encrypted votes
    for (const voteValue of votesToSubmit) {
      const plaintextVote = Buffer.from([voteValue]);
      const iv = Buffer.from(ethers.randomBytes(12));
      const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
      const encrypted = Buffer.concat([cipher.update(plaintextVote), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const c2 = Buffer.concat([iv, authTag, encrypted]);
      const c2Hex = ethers.hexlify(c2);
  
      const nullifier = ethers.hexlify(ethers.randomBytes(32)); // unique nullifier
      const proof = ethers.randomBytes(128); // dummy zk proof
  
      await election.vote(c1Hex, c2Hex, nullifier, proof);
    }
  
    console.log(`✅ ${votesToSubmit.length} votes submitted!`);
  
    // 🧠 Fetch and decrypt all ballots
    const ballotsCount = await election.ballotCount();
    console.log(`Found ${ballotsCount.toString()} ballots.`);
  
    const decryptedVotes: number[] = [];
  
    for (let i = 0; i < ballotsCount; i++) {
      const ballot = await election.ballots(i);
      const storedC1 = ballot.c1;
      const storedC2 = ballot.c2;
  
      const storedC1Hex = ethers.hexlify(storedC1);
  
      const trusteeSharedSecret = await secp.getSharedSecret(
        trusteePrivateKey.slice(2),
        storedC1Hex.slice(2),
        true
      );
  
      const trusteeKey = Buffer.from(trusteeSharedSecret.slice(1), "hex").slice(0, 32);
  
      const storedC2Hex = ethers.hexlify(storedC2);
      const c2Buffer = Buffer.from(storedC2Hex.slice(2), "hex");
  
      const ivDec = c2Buffer.slice(0, 12);
      const authTagDec = c2Buffer.slice(12, 28);
      const encryptedVote = c2Buffer.slice(28);
  
      const decipher = createDecipheriv("aes-256-gcm", trusteeKey, ivDec);
      decipher.setAuthTag(authTagDec);
  
      const decrypted = Buffer.concat([
        decipher.update(encryptedVote),
        decipher.final()
      ]);
  
      const finalVote = decrypted[0];
      decryptedVotes.push(finalVote);
  
      console.log(`🔓 Decrypted Vote #${i}: ${finalVote}`);
    }
  
    console.log("\n==== Final Decrypted Votes Array ====");
    console.log(decryptedVotes);
    console.log("====================\n");
  });


  it("should encrypt ballots with 5 different voters, decrypt them, and print their votes", async function () {
    const trusteePrivateKey = "0x59c6995e998f97a5a0044976f8e02bf21c197c651e834308c4a7d7d6bfa5a83e"; // Hardhat deployer key
  
    // Trustee public key
    const trusteePubKey = secp.getPublicKey(trusteePrivateKey.slice(2), true);
  
    const votesToSubmit = [1, 0, 1, 0, 1]; // Example votes
  
    // 🛠 Submit 5 encrypted votes from 5 different voters
    for (const voteValue of votesToSubmit) {
      // Generate random voter keypair
      const voterPrivateKey = Buffer.from(secp.utils.randomPrivateKey());
      const voterPubKeyCompressed = secp.getPublicKey(voterPrivateKey, true);
      const c1Hex = ethers.hexlify(voterPubKeyCompressed);
  
      // Derive shared secret between voter and trustee
      const sharedSecret = await secp.getSharedSecret(
        voterPrivateKey.toString("hex"),
        trusteePubKey,
        true
      );
      const aesKey = Buffer.from(sharedSecret.slice(1), "hex").slice(0, 32);
  
      // Encrypt the vote
      const plaintextVote = Buffer.from([voteValue]);
      const iv = Buffer.from(ethers.randomBytes(12));
      const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
      const encrypted = Buffer.concat([cipher.update(plaintextVote), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const c2 = Buffer.concat([iv, authTag, encrypted]);
      const c2Hex = ethers.hexlify(c2);
  
      const nullifier = ethers.hexlify(ethers.randomBytes(32)); // unique nullifier
      const proof = ethers.randomBytes(128); // dummy zk proof
  
      await election.vote(c1Hex, c2Hex, nullifier, proof);
    }
  
    console.log(`✅ ${votesToSubmit.length} votes submitted by 5 different voters!`);
  
    // 🧠 Fetch and decrypt all ballots
    const ballotsCount = await election.ballotCount();
    console.log(`Found ${ballotsCount.toString()} ballots.`);
  
    const decryptedVotes: number[] = [];
  
    for (let i = 0; i < ballotsCount; i++) {
      const ballot = await election.ballots(i);
      const storedC1 = ballot.c1;
      const storedC2 = ballot.c2;
  
      const storedC1Hex = ethers.hexlify(storedC1);
  
      // Derive shared secret using trustee's private key and voter's public key
      const trusteeSharedSecret = await secp.getSharedSecret(
        trusteePrivateKey.slice(2),
        storedC1Hex.slice(2),
        true
      );
  
      const trusteeKey = Buffer.from(trusteeSharedSecret.slice(1), "hex").slice(0, 32);
  
      const storedC2Hex = ethers.hexlify(storedC2);
      const c2Buffer = Buffer.from(storedC2Hex.slice(2), "hex");
  
      const ivDec = c2Buffer.slice(0, 12);
      const authTagDec = c2Buffer.slice(12, 28);
      const encryptedVote = c2Buffer.slice(28);
  
      const decipher = createDecipheriv("aes-256-gcm", trusteeKey, ivDec);
      decipher.setAuthTag(authTagDec);
  
      const decrypted = Buffer.concat([
        decipher.update(encryptedVote),
        decipher.final()
      ]);
  
      const finalVote = decrypted[0];
      decryptedVotes.push(finalVote);
  
      console.log(`🔓 Decrypted Vote #${i}: ${finalVote}`);
    }
  
    console.log("\n==== Final Decrypted Votes Array ====");
    console.log(decryptedVotes);
    console.log("====================\n");
  });


  




});

