import { expect } from "chai";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

// Define the shape of your Verifier contract
interface VerifierContract {
  verifyProof(
    a: [bigint, bigint],
    b: [[bigint, bigint], [bigint, bigint]],
    c: [bigint, bigint],
    input: [bigint]
  ): Promise<boolean>;
}

describe("SimpleWinnerVerifier", function () {
  it("should verify a valid zk proof", async function () {
    /* ----------------------------------------------------------------
       1. Load proof.json and public.json
    ---------------------------------------------------------------- */
    const proofPath = path.join(__dirname, "..", "proof.json");
    const publicPath = path.join(__dirname, "..", "public.json");

    if (!fs.existsSync(proofPath) || !fs.existsSync(publicPath)) {
      throw new Error("proof.json or public.json not found. Run build.sh first!");
    }

    /* ----------------------------------------------------------------
       2. Generate calldata using snarkjs zkesc (spawn a subprocess)
    ---------------------------------------------------------------- */
    const calldataResult = spawnSync("npx", ["snarkjs", "zkesc", "public.json", "proof.json"], {
      encoding: "utf-8"
    });

    if (calldataResult.error) {
      throw calldataResult.error;
    }
    if (calldataResult.status !== 0) {
      console.error(calldataResult.stderr);
      throw new Error(`snarkjs zkesc failed with code ${calldataResult.status}`);
    }

    const calldataRaw = calldataResult.stdout;

    // Clean and parse calldata
    const argv = calldataRaw
      .replace(/["[\]\s]/g, "")
      .split(",")
      .filter(Boolean)
      .map((x: string) => ethers.toBigInt(x)); // ethers.js v6 style

    // Force correct types
    const a: [bigint, bigint] = [argv[0], argv[1]];
    const b: [[bigint, bigint], [bigint, bigint]] = [
      [argv[2], argv[3]],
      [argv[4], argv[5]]
    ];
    const c: [bigint, bigint] = [argv[6], argv[7]];
    const input: [bigint] = [argv[8]];

    /* ----------------------------------------------------------------
       3. Deploy Verifier.sol and cast manually
    ---------------------------------------------------------------- */
    const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
    const verifierContract = await VerifierFactory.deploy();
    await verifierContract.waitForDeployment();
    const verifier = verifierContract as unknown as VerifierContract;

    /* ----------------------------------------------------------------
       4. Finally, check proof verifies
    ---------------------------------------------------------------- */
    expect(await verifier.verifyProof(a, b, c, input)).to.equal(true);
  });
});
