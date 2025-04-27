// run with npx tsx trustee-pubkey.ts

import * as secp from "@noble/secp256k1";

async function main() {
  // This is the Hardhat Account #0 private key
  const privateKey = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // ❌ NO "0x" prefix when using with noble-secp
  const compressedPubKey = secp.getPublicKey(privateKey, true);
  
  console.log("✅ Trustee Public Key:");
  console.log("0x" + Buffer.from(compressedPubKey).toString("hex"));
}

main();