# #!/bin/bash

set -e

chmod +x scripts/bashinit.sh

echo "🧹 Cleaning old files..."
rm -rf proof.json public.json verification_key.json winner_0000.zkey winner_final.zkey witness.wtns Verifier.sol Winner.r1cs Winner.sym Winner_js pot12_0000.ptau pot12_0001.ptau pot12_final.ptau

echo "📜 Re-generating Powers of Tau..."
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
cp pot12_0001.ptau pot12_final.ptau
npx snarkjs powersoftau prepare phase2 pot12_final.ptau pot12_final.ptau -v

echo "🏗 Compiling Winner.circom..."
npx circom Winner.circom --r1cs --wasm --sym -l ./node_modules/circomlib

echo "🧠 Generating witness..."
node Winner_js/generate_witness.js Winner_js/Winner.wasm input.json witness.wtns

echo "🛠 Setting up proving key..."
npx snarkjs groth16 setup Winner.r1cs pot12_final.ptau winner_0000.zkey
npx snarkjs zkey contribute winner_0000.zkey winner_final.zkey --name="Final contribution" -v
npx snarkjs zkey export verificationkey winner_final.zkey verification_key.json

echo "✅ Creating proof and public signals..."
npx snarkjs groth16 prove winner_final.zkey witness.wtns proof.json public.json

echo "📝 Exporting Solidity verifier..."
# npx snarkjs zkey export solidityverifier winner_final.zkey Verifier.sol
npx snarkjs zkey export solidityverifier winner_final.zkey ../contracts/contracts/Verifier.sol

echo "Deploying Verifier Contract"
(cd ../contracts && npx hardhat run scripts/deployVerifier.ts --network localhost)

echo "🎉 All done!"

echo "Checking if proof works"
npx snarkjs groth16 verify verification_key.json public.json proof.json