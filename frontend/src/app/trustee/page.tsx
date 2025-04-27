'use client'

import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function TrusteePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [electionEnded, setElectionEnded] = useState<boolean>(false);

  const trusteeAddress = process.env.NEXT_PUBLIC_TRUSTEE_ADDRESS?.toLowerCase(); // ✅ Make sure this is in your .env

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  useEffect(() => {
    // 🧠 On load, read from localStorage
    const stored = localStorage.getItem('electionEnded');
    if (stored === 'true') {
      setElectionEnded(true);
    }
  }, []);

  useEffect(() => {
    // 🧠 Save electionEnded state to localStorage whenever it changes
    localStorage.setItem('electionEnded', electionEnded.toString());
  }, [electionEnded]);

  function endElection() {
    if (!account || account.toLowerCase() !== trusteeAddress) {
      alert("Only the trustee can end the election!");
      return;
    }
    setElectionEnded(true);
    alert("✅ Election has been ended!");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold">Trustee Dashboard</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <div className="text-center">
            <p>Connected as:</p>
            <p className="font-mono">{account}</p>
          </div>

          {account.toLowerCase() === trusteeAddress ? (
            <>
              <button
                onClick={endElection}
                disabled={electionEnded}
                className={`px-6 py-3 rounded-lg text-white transition ${
                  electionEnded ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {electionEnded ? "Election Ended" : "End Election"}
              </button>
            </>
          ) : (
            <p className="text-red-500">❌ You are not the trustee.</p>
          )}
        </>
      )}
    </div>
  );
}
