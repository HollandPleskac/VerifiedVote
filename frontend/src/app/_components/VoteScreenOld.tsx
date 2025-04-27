'use client'

import { electionAbi } from "@/lib/electionABI";
import { generateVoteCipher } from "@/lib/voteEncryption";
import { ethers } from "ethers";

export default function VotingScreen({ account }: { account: string }) {
  async function vote(candidate: 0 | 1) {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      const { c1, c2, proof } = await generateVoteCipher(candidate);

      const nullifier = ethers.hexlify(ethers.randomBytes(32));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const electionContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_ELECTION_CONTRACT_ADDRESS!,
        electionAbi,
        signer
      );

      const tx = await electionContract.vote(c1, c2, nullifier, proof);
      await tx.wait();

      alert(`✅ Vote for candidate ${candidate} submitted! Tx Hash: ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      alert(`❌ Voting failed: ${err.message}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Connected Wallet Info */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-gray-400 uppercase text-xs">Connected Wallet:</p>
        <div className="bg-gray-800 text-gray-100 px-4 py-2 rounded-lg font-mono text-sm max-w-full break-words text-center">
          {account}
        </div>
      </div>

      {/* Voting Buttons */}
      <div className="flex flex-col items-center gap-6 mt-8">
        <p className="text-xl font-bold text-center">Vote for your Candidate:</p>

        <div className="flex flex-col sm:flex-row gap-6">
          <button
            onClick={() => vote(0)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 min-w-[200px]"
          >
            Donald J. Trump
          </button>

          <button
            onClick={() => vote(1)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 min-w-[200px]"
          >
            Joe Biden
          </button>
        </div>
      </div>
    </div>
  );
}
