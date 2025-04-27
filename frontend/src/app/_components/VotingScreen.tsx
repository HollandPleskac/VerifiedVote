'use client'

import { electionAbi } from "@/lib/electionABI";
import { generateVoteCipher } from "@/lib/voteEncryption";
import { ethers } from "ethers";
import { useState } from "react";

export default function VotingScreen({ account }: { account: string }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

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

      setHasVoted(true);
      setTxHash(tx.hash);
    } catch (err: any) {
      console.error(err);
      alert(`❌ Voting failed: ${err.message}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-96px)] px-4 pt-8 bg-[#0D132D] text-white">
      {hasVoted ? (
        <div className="flex flex-col items-center justify-center gap-8 mt-20 text-center">
          <h1 className="text-3xl font-serif text-green-500 flex items-center gap-2">
            ✅ Thank You for Voting!
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Your vote has been securely and anonymously submitted.<br />
            Check back soon to see the results of the election!
          </p>

          {txHash && (
            <div className="mt-6 px-6 py-3 bg-[#101828] border border-gray-600 rounded-md text-sm text-gray-400 font-mono break-words text-center">
              <div className="uppercase text-xs text-gray-500 mb-1">Transaction ID:</div>
              {txHash}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Page Title */}
          <h1 className="text-2xl font-serif text-gray-100 mb-2 text-center">Cast Your Vote</h1>
          <p className="text-gray-400 text-center mb-10 text-sm">
            Select the candidate you want to vote for. Your vote will be submitted securely and privately.
          </p>

          {/* Card */}
          <div className="bg-[#101828] border border-gray-600 rounded-none p-8 w-full max-w-md flex flex-col items-center gap-8">
            {/* Connected Wallet Info */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-400 uppercase text-xs">Connected Wallet:</p>
              <div className="bg-gray-800 text-gray-100 px-4 py-2 rounded-lg font-mono text-sm max-w-full break-words text-center">
                {account}
              </div>
            </div>

            {/* Voting Buttons */}
            <div className="flex flex-col items-center gap-6">
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
        </>
      )}
    </div>
  );
}
