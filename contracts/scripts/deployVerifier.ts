// scripts/deploy-verifier.ts
import { ethers } from "hardhat";

async function main() {
  console.log("--- Deploying Groth16Verifier ---");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
  const verifierContract = await VerifierFactory.deploy();
  await verifierContract.waitForDeployment();

  const verifierAddress = await verifierContract.getAddress();
  console.log(`✅ Groth16Verifier deployed at: ${verifierAddress}`);

  console.log("\n--- Deployment Completed ---");
  console.log(`\n📝 Save this address for frontend:`);
  console.log(`NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS=${verifierAddress}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
