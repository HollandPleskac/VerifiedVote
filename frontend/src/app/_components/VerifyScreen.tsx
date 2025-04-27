'use client'

import { useState } from "react";
import { ethers } from "ethers";

export default function VerifyScreen() {
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [publicFile, setPublicFile] = useState<File | null>(null);
    const [contractAddress, setContractAddress] = useState<string>('');
    const [verificationResult, setVerificationResult] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [winner, setWinner] = useState<string | null>(null); // 🆕 winner state
  
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'proof' | 'public') => {
      if (fileType === 'proof') {
        setProofFile(event.target.files ? event.target.files[0] : null);
      } else {
        setPublicFile(event.target.files ? event.target.files[0] : null);
      }
    };
  
    const verifyProof = async () => {
      if (!proofFile || !publicFile || !contractAddress) {
        alert('Please ensure all fields are filled.');
        return;
      }
  
      setLoading(true);
      setVerificationResult(null);
      setWinner(null);
  
      try {
        const proofJson = await proofFile.text();
        const publicJson = await publicFile.text();
        const proof = JSON.parse(proofJson);
        const publicSignals = JSON.parse(publicJson);
  
        const a: [string, string] = [proof.pi_a[0], proof.pi_a[1]];
        const b: [[string, string], [string, string]] = [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ];
        const c: [string, string] = [proof.pi_c[0], proof.pi_c[1]];
        const input: string[] = publicSignals;
  
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, [
          {
            "inputs": [
              { "internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]" },
              { "internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]" },
              { "internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]" },
              { "internalType": "uint256[1]", "name": "_pubSignals", "type": "uint256[1]" }
            ],
            "name": "verifyProof",
            "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
            "stateMutability": "view",
            "type": "function"
          }
        ], signer);
  
        const isValid = await contract.verifyProof(a, b, c, input);
  
        if (isValid) {
          setVerificationResult('Proof is valid!');
  
          // Determine the winner from public signals
          if (publicSignals[0] === "0") {
            setWinner("Donald Trump 🇺🇸");
          } else if (publicSignals[0] === "1") {
            setWinner("Joe Biden 🇺🇸");
          } else {
            setWinner(null); // unknown value
          }
  
        } else {
          setVerificationResult('❌ Proof is invalid');
        }
      } catch (error) {
        console.error('Verification failed:', error);
        setVerificationResult('❌ Verification failed');
      } finally {
        setLoading(false);
      }
    };

  return (
<div className="flex flex-col items-center justify-start min-h-[calc(100vh-96px)] px-4 pt-4 pb-12 bg-[#0D132D] text-white">
{/* Optional: Seal */}
      {/* <img src="/seal.png" alt="Official Seal" className="h-12 mb-4" /> */}

      {/* Heading */}
      <h1 className="text-2xl font-serif text-gray-100 mb-2 text-center">Confirm the True Election Results</h1>
      <p className="text-gray-400 text-center mb-10 text-sm">
        Verify that every vote was counted fairly. Upload the election files and check the results yourself — trust, but verify!
      </p>

      {/* Card */}
      <div className="bg-[#101828] border border-gray-600 rounded-none p-8 w-full max-w-md">
        <div className="space-y-6">
          {/* Proof File */}
          <div>
            <label className="block text-sm font-medium mb-1">Proof File (proof.json)</label>
            <input 
              type="file" 
              accept=".json" 
              onChange={(e) => handleFileChange(e, 'proof')} 
              className="w-full bg-[#0F172A] text-white px-4 py-2 border border-gray-600"
            />
          </div>

          {/* Public File */}
          <div>
            <label className="block text-sm font-medium mb-1">Public Signals File (public.json)</label>
            <input 
              type="file" 
              accept=".json" 
              onChange={(e) => handleFileChange(e, 'public')} 
              className="w-full bg-[#0F172A] text-white px-4 py-2 border border-gray-600"
            />
          </div>

          {/* Verifier Address */}
          <div>
            <label className="block text-sm font-medium mb-1">Verifier Contract Address</label>
            <input 
              type="text" 
              placeholder="Enter contract address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full bg-[#0F172A] text-white px-4 py-2 border border-gray-600"
            />
          </div>

          {/* Verify Button */}
          <button 
            onClick={verifyProof}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 font-bold py-3 text-white transition transform hover:scale-105"
          >
            {loading ? 'Verifying...' : 'Verify Proof'}
          </button>

          {/* Verification result */}
         
{verificationResult && (
  <div className="text-center mt-4 space-y-2">
    <div className="font-bold text-green-400">
      ✅ {verificationResult}
    </div>
    {winner && (
      <p className={`mt-0 text-lg font-bold ${
        winner.includes('Trump') ? 'text-blue-400' : 'text-blue-400'
      }`}>
        🎉 {winner} won the election!
      </p>
    )}
  </div>
)}
        </div>
      </div>
    </div>
  );
}
