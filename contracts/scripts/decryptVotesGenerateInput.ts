import { ethers, artifacts } from "hardhat";
import { createDecipheriv } from "crypto";
import * as secp from "@noble/secp256k1";
import * as fs from "fs";
import * as path from "path";

// 👉 Replace these
const electionAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const trusteePrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const poseidonT3Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 👈 must also pass Poseidon address!

async function main() {
  console.log("\n🔵 Starting decryption script...");

  // ✅ Instead of getContractAt(), manually get artifact and connect
  const ZKBinaryElectionArtifact = await artifacts.readArtifact("ZKBinaryElection");

  const electionFactory = await ethers.getContractFactoryFromArtifact(ZKBinaryElectionArtifact, {
    libraries: {
      PoseidonT3: poseidonT3Address,
    }
  });

  const election = electionFactory.attach(electionAddress);

  const ballotsCount = await election.ballotCount();
  console.log(`Found ${ballotsCount.toString()} ballots.`);

  const decryptedVotes: number[] = [];

  for (let i = 0; i < ballotsCount; i++) {
    const ballot = await election.ballots(i);
    const storedC1 = ballot.c1;
    const storedC2 = ballot.c2;
  
    const storedC1Hex = ethers.hexlify(storedC1);
  
    // 🛠 No prefixing. Use storedC1Hex as is.
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

  // ✏️ Write into circuit/input.json
  const circuitDir = path.join(__dirname, "..", "..", "circuit"); 
  const outputPath = path.join(circuitDir, "input.json");

  // Ensure the circuit directory exists
  if (!fs.existsSync(circuitDir)) {
    fs.mkdirSync(circuitDir);
  }

  const inputJson = { votes: decryptedVotes };

  fs.writeFileSync(outputPath, JSON.stringify(inputJson, null, 2));

  console.log("\n✅ input.json written successfully!");
  console.log(`📄 Location: ${outputPath}`);
  console.log("====================\n");
}

main().catch((error) => {
  console.error("Decryption script failed:", error);
  process.exitCode = 1;
});
