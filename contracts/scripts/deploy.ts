// scripts/deploy.ts
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
  console.log("--- Starting Deployment ---");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with deployer: ${deployer.address}`);

  // 1. Deploy PoseidonT3 Library
  const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
  const poseidonLib = await PoseidonT3Factory.deploy();
  await poseidonLib.waitForDeployment();
  const poseidonLibAddress = await poseidonLib.getAddress();
  console.log(`✅ PoseidonT3 Library deployed at: ${poseidonLibAddress}`);

  // 2. Deploy VerifierMock (for registration + voting + winner proofs)
  const VerifierMockFactory = await ethers.getContractFactory("VerifierMock");
  const verifierMock = await VerifierMockFactory.deploy();
  await verifierMock.waitForDeployment();
  const verifierMockAddress = await verifierMock.getAddress();
  console.log(`✅ VerifierMock deployed at: ${verifierMockAddress}`);

  // 3. Deploy ZKBinaryElection contract
  const ELECTION_ID_STRING = "election2025-local";     // Customize as needed
  const INITIAL_ROOT_STRING = "initial-root-local";    // Customize as needed

  const electionId = keccak256(toUtf8Bytes(ELECTION_ID_STRING));
  const initialRoot = keccak256(toUtf8Bytes(INITIAL_ROOT_STRING));

  const ZKBinaryElectionFactory = await ethers.getContractFactory("ZKBinaryElection", {
    libraries: {
      PoseidonT3: poseidonLibAddress,
    },
  });

  const electionContract = await ZKBinaryElectionFactory.deploy(
    electionId,
    initialRoot,
    verifierMockAddress, // Registration verifier
    verifierMockAddress, // Vote verifier
    deployer.address     // Trustee is the deployer (could later transfer)
  );

  await electionContract.waitForDeployment();
  const electionAddress = await electionContract.getAddress();
  console.log(`✅ ZKBinaryElection Contract deployed at: ${electionAddress}`);

  console.log("\n--- Deployment Completed ---");
  console.log(`\n📝 Save this address for your frontend:`);
  console.log(`NEXT_PUBLIC_ELECTION_CONTRACT_ADDRESS=${electionAddress}`);
}

main().catch((error) => {
  console.error("Deployment script failed:", error);
  process.exitCode = 1;
});
