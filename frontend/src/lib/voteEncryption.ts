// src/lib/voteEncryption.ts
import { ethers } from "ethers";
import * as secp from "@noble/secp256k1";
import { createCipheriv } from "crypto";

function getRandomBytes(length: number): Uint8Array {
  return ethers.randomBytes(length);
}

export async function generateVoteCipher(candidate: 0 | 1) {
  // 1. Ephemeral Key Pair (voter's one-time key)
  const ephemeralPrivateKey = getRandomBytes(32);
  const ephemeralPublicKey = secp.getPublicKey(ephemeralPrivateKey, true);
  const c1 = ethers.hexlify(ephemeralPublicKey);

  // 2. Trustee Public Key
  const trusteePubKeyHex = process.env.NEXT_PUBLIC_TRUSTEE_PUBKEY!;
  const trusteePubKeyBytes = ethers.getBytes(trusteePubKeyHex);

  // 3. Shared Secret
  const sharedSecret = await secp.getSharedSecret(
    ethers.hexlify(ephemeralPrivateKey).slice(2),
    trusteePubKeyBytes,
    true
  );

  const aesKey = Buffer.from(sharedSecret.slice(1), "hex").slice(0, 32);

  // 4. Encrypt the vote using AES-GCM
  const plaintextVote = Buffer.from([candidate]); // your vote is 1 byte

  const iv = Buffer.from(getRandomBytes(12)); // 12-byte IV
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextVote), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const c2Full = Buffer.concat([iv, authTag, encrypted]);
  const c2 = ethers.hexlify(c2Full);

  // 5. Dummy zk proof
  const proof = ethers.hexlify(getRandomBytes(128));

  return { c1, c2, proof };
}