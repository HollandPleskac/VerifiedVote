'use client'

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';

const Verify = () => {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [publicFile, setPublicFile] = useState<File | null>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Handle file selection for proof.json and public.json
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'proof' | 'public') => {
    if (fileType === 'proof') {
      setProofFile(event.target.files ? event.target.files[0] : null);
    } else {
      setPublicFile(event.target.files ? event.target.files[0] : null);
    }
  };

  // Verify the proof
  const verifyProof = async () => {
    if (!proofFile || !publicFile || !contractAddress) {
      alert('Please ensure all fields are filled.');
      return;
    }
  
    setLoading(true);
    setVerificationResult(null);
  
    try {
      const proofJson = await proofFile.text();
      const publicJson = await publicFile.text();
  
      if (!proofJson || !publicJson) {
        alert('Invalid JSON files');
        return;
      }
  
      const proof = JSON.parse(proofJson);
      const publicSignals = JSON.parse(publicJson);
  
      // 🧠 Flatten the proof manually (same style snarkjs zkesc would)
      const a: [string, string] = [proof.pi_a[0], proof.pi_a[1]];
      const b: [[string, string], [string, string]] = [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // ⬅️ notice ORDER reversed!
        [proof.pi_b[1][1], proof.pi_b[1][0]]  // ⬅️
      ];
      const c: [string, string] = [proof.pi_c[0], proof.pi_c[1]];
      const input: string[] = publicSignals; // no wrapping, assuming publicSignals = [val]
  
      console.log("Prepared calldata:", { a, b, c, input });
  
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
  
      setVerificationResult(isValid ? '✅ Proof is valid!' : '❌ Proof is invalid');
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult('❌ Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-6">
      <h1 className="text-2xl font-bold">Verify zkSNARK Proof</h1>

      <div className="flex flex-col items-center gap-4">
        <label>
          Proof File (proof.json):
          <input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'proof')} />
        </label>
        <label>
          Public Signals File (public.json):
          <input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'public')} />
        </label>
        <label>
          Verifier Contract Address:
          <input
            type="text"
            placeholder="Enter contract address"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={verifyProof}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mt-8"
        disabled={loading}
      >
        {loading ? 'Verifying...' : 'Verify Proof'}
      </button>

      {verificationResult && (
        <div className="mt-6 text-lg font-bold">
          {verificationResult}
        </div>
      )}
    </div>
  );
};

export default Verify;