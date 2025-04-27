#!/bin/bash
set -e

(cd ../contracts && npx hardhat run scripts/decryptVotesGenerateInput.ts --network localhost)