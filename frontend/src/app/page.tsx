'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Header from '@/app/_components/Header'
import Footer from '@/app/_components/Footer'
import VotingScreen from '@/app/_components/VotingScreen'
import VerifyScreen from '@/app/_components/VerifyScreen'

export default function Home() {
  const [account, setAccount] = useState<string | null>(null)
  const [electionEnded, setElectionEnded] = useState<boolean>(false)

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed!')
      return
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const accounts = await provider.send('eth_requestAccounts', [])
    setAccount(accounts[0])
  }

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0])
      } else {
        setAccount(null)
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('electionEnded')
    if (stored === 'true') {
      setElectionEnded(true)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'electionEnded') {
        setElectionEnded(event.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-[#0D132D] text-white">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-96px)] px-4 py-12">
        {!account ? (
          <>
            <h1 className="text-sm tracking-widest mb-6 text-gray-400 uppercase">
              United States Election Portal
            </h1>
            <button
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Connect Wallet
            </button>
          </>
        ) : (
          electionEnded ? <VerifyScreen /> : <VotingScreen account={account} />
        )}
      </main>

      <Footer />
    </div>
  )
}
