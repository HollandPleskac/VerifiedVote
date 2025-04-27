'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask not installed');
      return;
    }

    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        console.log('Connected account:', accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    // Cleanup listener
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
      <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
        {account ? 'Connected' : 'Connect Wallet'}
      </button>

      {account && (
        <p style={{ marginTop: '20px', fontFamily: 'monospace' }}>
          Current Account: {account}
        </p>
      )}
    </main>
  );
}